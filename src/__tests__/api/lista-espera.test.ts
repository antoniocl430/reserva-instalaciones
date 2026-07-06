/**
 * Tests para los endpoints de /api/lista-espera
 * TDD: tests escritos ANTES de implementar los endpoints
 *
 * Endpoints cubiertos:
 *   GET    /api/lista-espera           — ciudadano, mis entradas con posición
 *   POST   /api/lista-espera           — ciudadano, apuntarse a un slot
 *   DELETE /api/lista-espera/[id]      — ciudadano, abandonar la lista
 *   POST   /api/lista-espera/[id]/confirmar — ciudadano, confirmar reserva (si NOTIFICADO)
 *   GET    /api/cron/lista-espera      — cron, avanzar entradas expiradas
 */

// eslint-disable-next-line no-var
var prismaMock: any

jest.mock("@/lib/prisma", () => {
  const { mockDeep } = require("jest-mock-extended")
  prismaMock = mockDeep()
  return { prisma: prismaMock }
})

jest.mock("next-auth", () => ({
  default: jest.fn(),
  getServerSession: jest.fn(),
}))

jest.mock("@/lib/tenant", () => ({
  obtenerTenantIdPorSlug: jest.fn().mockResolvedValue("tenant-test"),
  extraerSlugDelHost: jest.fn().mockReturnValue("test"),
  parsearConfiguracion: jest.fn().mockReturnValue({}),
}))

jest.mock("@/lib/lista-espera", () => ({
  notificarSiguienteEnEspera: jest.fn().mockResolvedValue(undefined),
}))

jest.mock("@/lib/email", () => ({
  enviarEmailSlotDisponible: jest.fn().mockResolvedValue(undefined),
  enviarEmailReserva: jest.fn().mockResolvedValue(undefined),
}))

jest.mock("@/lib/push", () => ({
  enviarPushSlotDisponible: jest.fn().mockResolvedValue(undefined),
  enviarPushReservaConfirmada: jest.fn().mockResolvedValue(undefined),
}))

jest.mock("web-push", () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn().mockResolvedValue({ statusCode: 201 }),
}))

import { getServerSession } from "next-auth"
import { NextRequest } from "next/server"

import { GET, POST } from "@/app/api/lista-espera/route"
import { DELETE } from "@/app/api/lista-espera/[id]/route"
import { POST as CONFIRMAR } from "@/app/api/lista-espera/[id]/confirmar/route"
import { GET as CRON } from "@/app/api/cron/lista-espera/route"

const mockGetServerSession = getServerSession as jest.Mock
const TENANT_ID = "tenant-test"

const sesionCiudadano = { user: { id: "ciudadano-1", rol: "CIUDADANO", tenantId: TENANT_ID, email: "c@test.es", name: "Ciudadano" } }
const sesionAdmin = { user: { id: "admin-1", rol: "ADMIN", tenantId: TENANT_ID } }

const entradaMock = {
  id: "espera-1",
  tenantId: TENANT_ID,
  usuarioId: "ciudadano-1",
  instalacionId: "inst-1",
  fecha: new Date("2099-06-15T00:00:00.000Z"),
  horaInicio: "10:00",
  estado: "ESPERANDO",
  expiraEn: null,
  creadoEn: new Date("2026-05-14T10:00:00.000Z"),
  instalacion: { nombre: "Pista 1", id: "inst-1" },
  usuario: { nombre: "Ciudadano", email: "c@test.es" },
}

const entradaNotificadaMock = {
  ...entradaMock,
  id: "espera-2",
  estado: "NOTIFICADO",
  expiraEn: new Date(Date.now() + 20 * 60 * 1000), // expira en 20 min
}

function req(url: string, method = "GET", body?: object, headers?: Record<string, string>) {
  return new NextRequest(url, {
    method,
    headers: { "Content-Type": "application/json", "x-tenant-slug": "test", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  })
}

// ─── GET /api/lista-espera ────────────────────────────────────────────────────

describe("GET /api/lista-espera", () => {
  beforeEach(() => jest.clearAllMocks())

  it("devuelve 401 si no hay sesión", async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await GET(req("http://localhost/api/lista-espera"))
    expect(res.status).toBe(401)
  })

  it("devuelve las entradas del ciudadano con posición calculada", async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    prismaMock.listaEspera.findMany.mockResolvedValue([entradaMock])
    prismaMock.listaEspera.count.mockResolvedValue(2) // 2 personas delante → posición 3

    const res = await GET(req("http://localhost/api/lista-espera"))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.entradas).toHaveLength(1)
    expect(data.entradas[0].posicion).toBe(3)
  })

  it("devuelve lista vacía si no hay entradas", async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    prismaMock.listaEspera.findMany.mockResolvedValue([])

    const res = await GET(req("http://localhost/api/lista-espera"))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.entradas).toHaveLength(0)
  })
})

// ─── POST /api/lista-espera ───────────────────────────────────────────────────

describe("POST /api/lista-espera", () => {
  beforeEach(() => jest.clearAllMocks())

  it("devuelve 401 si no hay sesión", async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await POST(req("http://localhost/api/lista-espera", "POST", { instalacionId: "inst-1", fecha: "2099-06-15", horaInicio: "10:00" }))
    expect(res.status).toBe(401)
  })

  it("devuelve 403 si el rol es ADMIN", async () => {
    mockGetServerSession.mockResolvedValue(sesionAdmin)
    const res = await POST(req("http://localhost/api/lista-espera", "POST", { instalacionId: "inst-1", fecha: "2099-06-15", horaInicio: "10:00" }))
    expect(res.status).toBe(403)
  })

  it("devuelve 400 si faltan campos", async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    const res = await POST(req("http://localhost/api/lista-espera", "POST", { instalacionId: "inst-1" }))
    expect(res.status).toBe(400)
  })

  it("devuelve 400 si la fecha es pasada", async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    prismaMock.instalacion.findFirst.mockResolvedValue({ id: "inst-1", activa: true })
    const res = await POST(req("http://localhost/api/lista-espera", "POST", { instalacionId: "inst-1", fecha: "2020-01-01", horaInicio: "10:00" }))
    expect(res.status).toBe(400)
  })

  it("devuelve 404 si la instalación no existe", async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    prismaMock.instalacion.findFirst.mockResolvedValue(null)
    const res = await POST(req("http://localhost/api/lista-espera", "POST", { instalacionId: "no-existe", fecha: "2099-06-15", horaInicio: "10:00" }))
    expect(res.status).toBe(404)
  })

  it("devuelve 400 si el slot no está ocupado (no tiene sentido apuntarse si está libre)", async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    prismaMock.instalacion.findFirst.mockResolvedValue({ id: "inst-1", activa: true })
    prismaMock.reserva.findFirst.mockResolvedValue(null) // slot libre
    const res = await POST(req("http://localhost/api/lista-espera", "POST", { instalacionId: "inst-1", fecha: "2099-06-15", horaInicio: "10:00" }))
    expect(res.status).toBe(400)
  })

  it("crea la entrada y devuelve 201", async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    prismaMock.instalacion.findFirst.mockResolvedValue({ id: "inst-1", activa: true })
    prismaMock.reserva.findFirst.mockResolvedValue({ id: "reserva-1" }) // slot ocupado
    prismaMock.usuario.findUnique.mockResolvedValue({ suspendidoHasta: null })
    prismaMock.listaEspera.create.mockResolvedValue(entradaMock)

    const res = await POST(req("http://localhost/api/lista-espera", "POST", { instalacionId: "inst-1", fecha: "2099-06-15", horaInicio: "10:00" }))
    expect(res.status).toBe(201)
  })

  it("devuelve 409 si el ciudadano ya está en la lista para ese slot", async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    prismaMock.instalacion.findFirst.mockResolvedValue({ id: "inst-1", activa: true })
    prismaMock.reserva.findFirst.mockResolvedValue({ id: "reserva-1" })
    prismaMock.usuario.findUnique.mockResolvedValue({ suspendidoHasta: null })
    const error = new Error("Unique constraint")
    ;(error as any).code = "P2002"
    prismaMock.listaEspera.create.mockRejectedValue(error)

    const res = await POST(req("http://localhost/api/lista-espera", "POST", { instalacionId: "inst-1", fecha: "2099-06-15", horaInicio: "10:00" }))
    expect(res.status).toBe(409)
  })
})

// ─── Regla: ciudadano con reserva activa en un slot no puede apuntarse a la lista de espera ──
// El chequeo de reserva propia ocurre tras verificar que el slot está ocupado.
// Flujo de findFirst: 1ª llamada = slot ocupado (devuelve reserva), 2ª llamada = reserva propia.

describe("POST /api/lista-espera — no apuntarse si ya tienes reserva en ese slot", () => {
  beforeEach(() => jest.clearAllMocks())

  it("devuelve 409 cuando el ciudadano ya tiene una reserva activa en ese slot exacto", async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    prismaMock.instalacion.findFirst.mockResolvedValue({ id: "inst-1", activa: true })
    // 1ª llamada a reserva.findFirst: el slot está ocupado (por otro usuario)
    prismaMock.reserva.findFirst.mockResolvedValueOnce({ id: "reserva-otro" })
    // 2ª llamada a reserva.findFirst: el ciudadano también tiene una reserva en ese slot
    prismaMock.reserva.findFirst.mockResolvedValueOnce({ id: "reserva-propia" })

    const res = await POST(
      req("http://localhost/api/lista-espera", "POST", {
        instalacionId: "inst-1",
        fecha: "2099-06-15",
        horaInicio: "10:00",
      })
    )

    expect(res.status).toBe(409)
    const data = await res.json()
    expect(data.error).toBe("Ya tienes una reserva activa para este slot")
  })

  it("devuelve 201 cuando el slot está ocupado pero el ciudadano NO tiene reserva en ese slot (camino feliz)", async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    prismaMock.instalacion.findFirst.mockResolvedValue({ id: "inst-1", activa: true })
    // 1ª llamada: slot ocupado por otro usuario
    prismaMock.reserva.findFirst.mockResolvedValueOnce({ id: "reserva-otro" })
    // 2ª llamada: el ciudadano no tiene reserva propia en ese slot
    prismaMock.reserva.findFirst.mockResolvedValueOnce(null)
    prismaMock.usuario.findUnique.mockResolvedValue({ suspendidoHasta: null })
    prismaMock.listaEspera.create.mockResolvedValue(entradaMock)

    const res = await POST(
      req("http://localhost/api/lista-espera", "POST", {
        instalacionId: "inst-1",
        fecha: "2099-06-15",
        horaInicio: "10:00",
      })
    )

    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data).toHaveProperty("entrada")
  })
})

// ─── DELETE /api/lista-espera/[id] ───────────────────────────────────────────

describe("DELETE /api/lista-espera/[id]", () => {
  beforeEach(() => jest.clearAllMocks())

  it("devuelve 401 si no hay sesión", async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await DELETE(req("http://localhost/api/lista-espera/espera-1", "DELETE"), { params: { id: "espera-1" } })
    expect(res.status).toBe(401)
  })

  it("devuelve 404 si la entrada no existe o no pertenece al usuario", async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    prismaMock.listaEspera.findFirst.mockResolvedValue(null)
    const res = await DELETE(req("http://localhost/api/lista-espera/no-existe", "DELETE"), { params: { id: "no-existe" } })
    expect(res.status).toBe(404)
  })

  it("elimina la entrada y devuelve 200", async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    prismaMock.listaEspera.findFirst.mockResolvedValue(entradaMock)
    prismaMock.listaEspera.update.mockResolvedValue({ ...entradaMock, estado: "CANCELADO" })

    const res = await DELETE(req("http://localhost/api/lista-espera/espera-1", "DELETE"), { params: { id: "espera-1" } })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
  })
})

// ─── POST /api/lista-espera/[id]/confirmar ────────────────────────────────────

describe("POST /api/lista-espera/[id]/confirmar", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prismaMock.$transaction.mockImplementation((fn: any) => fn(prismaMock))
  })

  it("devuelve 401 si no hay sesión", async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await CONFIRMAR(req("http://localhost/api/lista-espera/espera-2/confirmar", "POST"), { params: { id: "espera-2" } })
    expect(res.status).toBe(401)
  })

  it("devuelve 404 si la entrada no existe o no pertenece al usuario", async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    prismaMock.listaEspera.findFirst.mockResolvedValue(null)
    const res = await CONFIRMAR(req("http://localhost/api/lista-espera/no-existe/confirmar", "POST"), { params: { id: "no-existe" } })
    expect(res.status).toBe(404)
  })

  it("devuelve 409 si la entrada no está en estado NOTIFICADO", async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    prismaMock.listaEspera.findFirst.mockResolvedValue(entradaMock) // ESPERANDO
    const res = await CONFIRMAR(req("http://localhost/api/lista-espera/espera-1/confirmar", "POST"), { params: { id: "espera-1" } })
    expect(res.status).toBe(409)
  })

  it("devuelve 410 si la notificación ya expiró", async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    prismaMock.listaEspera.findFirst.mockResolvedValue({
      ...entradaNotificadaMock,
      expiraEn: new Date(Date.now() - 1000), // ya expiró
    })
    const res = await CONFIRMAR(req("http://localhost/api/lista-espera/espera-2/confirmar", "POST"), { params: { id: "espera-2" } })
    expect(res.status).toBe(410)
  })

  it("crea la reserva y devuelve 201 si la entrada es NOTIFICADO y no ha expirado", async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    prismaMock.listaEspera.findFirst.mockResolvedValue(entradaNotificadaMock)
    prismaMock.reserva.findFirst.mockResolvedValue(null) // slot libre
    prismaMock.reserva.count.mockResolvedValue(0) // no supera límite
    prismaMock.tenant.findUnique.mockResolvedValue({ configuracion: null })
    prismaMock.reserva.create.mockResolvedValue({ id: "reserva-nueva", instalacion: { nombre: "Pista 1" } })
    prismaMock.listaEspera.update.mockResolvedValue({ ...entradaNotificadaMock, estado: "CONFIRMADO" })

    const res = await CONFIRMAR(req("http://localhost/api/lista-espera/espera-2/confirmar", "POST"), { params: { id: "espera-2" } })
    expect(res.status).toBe(201)
  })

  it("devuelve 409 si el slot ya fue ocupado por otro mientras esperaba", async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    prismaMock.listaEspera.findFirst.mockResolvedValue(entradaNotificadaMock)
    prismaMock.reserva.findFirst.mockResolvedValue({ id: "otra-reserva" }) // ocupado
    prismaMock.tenant.findUnique.mockResolvedValue({ configuracion: null })

    const res = await CONFIRMAR(req("http://localhost/api/lista-espera/espera-2/confirmar", "POST"), { params: { id: "espera-2" } })
    expect(res.status).toBe(409)
  })
})

// ─── GET /api/cron/lista-espera ───────────────────────────────────────────────

describe("GET /api/cron/lista-espera", () => {
  beforeEach(() => jest.clearAllMocks())

  it("devuelve 401 si no hay cabecera Authorization", async () => {
    const res = await CRON(req("http://localhost/api/cron/lista-espera"))
    expect(res.status).toBe(401)
  })

  it("devuelve 200 y avanza las entradas expiradas", async () => {
    const entradaExpirada = { ...entradaNotificadaMock, expiraEn: new Date(Date.now() - 1000), instalacionId: "inst-1", fecha: new Date("2099-06-15T00:00:00.000Z"), horaInicio: "10:00", tenantId: TENANT_ID }
    prismaMock.listaEspera.findMany.mockResolvedValue([entradaExpirada])
    prismaMock.listaEspera.update.mockResolvedValue({ ...entradaExpirada, estado: "EXPIRADO" })

    const cronSecret = process.env.CRON_SECRET ?? "test-secret"
    const res = await CRON(req("http://localhost/api/cron/lista-espera", "GET", undefined, { Authorization: `Bearer ${cronSecret}` }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.procesadas).toBeGreaterThanOrEqual(0)
  })
})
