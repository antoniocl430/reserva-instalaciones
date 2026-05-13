// Tests TDD para suspensión manual de usuarios
// Cubre: PATCH /api/admin/usuarios/[id]/suspender
//        PATCH /api/admin/usuarios/[id]/levantar-suspension
//        Creación de reserva con usuario suspendido

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

jest.mock("@/lib/email", () => ({
  enviarEmailReserva: jest.fn().mockResolvedValue(undefined),
  enviarEmailCancelacion: jest.fn().mockResolvedValue(undefined),
  enviarEmailSuspension: jest.fn().mockResolvedValue(undefined),
  enviarEmailNotificacionAdmins: jest.fn().mockResolvedValue(undefined),
  enviarEmailCancelacionAdmins: jest.fn().mockResolvedValue(undefined),
}))

jest.mock("@/lib/push", () => ({
  enviarPushCancelacion: jest.fn().mockResolvedValue(undefined),
}))

import { getServerSession } from "next-auth"
import { NextRequest } from "next/server"
import { PATCH as suspender_PATCH } from "@/app/api/admin/usuarios/[id]/suspender/route"
import { PATCH as levantarSuspension_PATCH } from "@/app/api/admin/usuarios/[id]/levantar-suspension/route"
import { POST as reservas_POST } from "@/app/api/reservas/route"
import { enviarEmailSuspension } from "@/lib/email"

const TENANT_ID = "tenant-test-suspension-001"
const OTRO_TENANT_ID = "tenant-otro-suspension-002"
const ADMIN_ID = "admin-id-001"
const CIUDADANO_ID = "ciudadano-id-001"

const sesionAdmin = {
  user: { id: ADMIN_ID, rol: "ADMIN", tenantId: TENANT_ID, email: "admin@test.es", name: "Admin" },
}

const ciudadanoBase = {
  id: CIUDADANO_ID,
  tenantId: TENANT_ID,
  email: "ciudadano@test.es",
  nombre: "Ciudadano Test",
  rol: "CIUDADANO",
  activo: true,
  noShows: 0,
  suspendidoHasta: null,
  motivoSuspension: null,
}

// Fecha futura (mañana)
function fechaFutura(): Date {
  const d = new Date()
  d.setDate(d.getDate() + 10)
  return d
}

// Fecha pasada (ayer)
function fechaPasada(): Date {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d
}

describe("PATCH /api/admin/usuarios/[id]/suspender", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prismaMock.$transaction.mockImplementation((fn: any) => fn(prismaMock))
  })

  it("debería devolver 401 cuando no hay sesión", async () => {
    ;(getServerSession as jest.Mock).mockResolvedValueOnce(null)

    const request = new NextRequest(
      `http://localhost:3000/api/admin/usuarios/${CIUDADANO_ID}/suspender`,
      {
        method: "PATCH",
        body: JSON.stringify({
          suspendidoHasta: fechaFutura().toISOString(),
          motivoSuspension: "Prueba manual",
        }),
        headers: { "Content-Type": "application/json" },
      }
    )
    const response = await suspender_PATCH(request, { params: { id: CIUDADANO_ID } })

    expect(response.status).toBe(401)
  })

  it("debería devolver 403 cuando el usuario no es ADMIN", async () => {
    ;(getServerSession as jest.Mock).mockResolvedValueOnce({
      user: { id: CIUDADANO_ID, rol: "CIUDADANO", tenantId: TENANT_ID },
    })

    const request = new NextRequest(
      `http://localhost:3000/api/admin/usuarios/${CIUDADANO_ID}/suspender`,
      {
        method: "PATCH",
        body: JSON.stringify({
          suspendidoHasta: fechaFutura().toISOString(),
          motivoSuspension: "Prueba manual",
        }),
        headers: { "Content-Type": "application/json" },
      }
    )
    const response = await suspender_PATCH(request, { params: { id: CIUDADANO_ID } })

    expect(response.status).toBe(403)
  })

  it("debería devolver 403 cuando el admin es de otro tenant", async () => {
    ;(getServerSession as jest.Mock).mockResolvedValueOnce({
      user: { id: ADMIN_ID, rol: "ADMIN", tenantId: OTRO_TENANT_ID },
    })

    // Usuario no encontrado en el tenant del admin
    prismaMock.usuario.findFirst.mockResolvedValueOnce(null)

    const request = new NextRequest(
      `http://localhost:3000/api/admin/usuarios/${CIUDADANO_ID}/suspender`,
      {
        method: "PATCH",
        body: JSON.stringify({
          suspendidoHasta: fechaFutura().toISOString(),
          motivoSuspension: "Prueba manual",
        }),
        headers: { "Content-Type": "application/json" },
      }
    )
    const response = await suspender_PATCH(request, { params: { id: CIUDADANO_ID } })

    expect(response.status).toBe(404)
  })

  it("debería devolver 400 cuando suspendidoHasta es una fecha pasada", async () => {
    ;(getServerSession as jest.Mock).mockResolvedValueOnce(sesionAdmin)

    prismaMock.usuario.findFirst.mockResolvedValueOnce(ciudadanoBase)

    const request = new NextRequest(
      `http://localhost:3000/api/admin/usuarios/${CIUDADANO_ID}/suspender`,
      {
        method: "PATCH",
        body: JSON.stringify({
          suspendidoHasta: fechaPasada().toISOString(),
          motivoSuspension: "Fecha pasada test",
        }),
        headers: { "Content-Type": "application/json" },
      }
    )
    const response = await suspender_PATCH(request, { params: { id: CIUDADANO_ID } })

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toContain("futura")
  })

  it("debería suspender manualmente el usuario con campos correctos y enviar email", async () => {
    ;(getServerSession as jest.Mock).mockResolvedValueOnce(sesionAdmin)

    prismaMock.usuario.findFirst.mockResolvedValueOnce(ciudadanoBase)

    const fechaSuspension = fechaFutura()
    const motivoSuspension = "Mal comportamiento reiterado"

    prismaMock.usuario.update.mockResolvedValueOnce({
      ...ciudadanoBase,
      suspendidoHasta: fechaSuspension,
      motivoSuspension,
    })

    const request = new NextRequest(
      `http://localhost:3000/api/admin/usuarios/${CIUDADANO_ID}/suspender`,
      {
        method: "PATCH",
        body: JSON.stringify({
          suspendidoHasta: fechaSuspension.toISOString(),
          motivoSuspension,
        }),
        headers: { "Content-Type": "application/json" },
      }
    )
    const response = await suspender_PATCH(request, { params: { id: CIUDADANO_ID } })

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.ok).toBe(true)

    expect(prismaMock.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          suspendidoHasta: expect.any(Date),
          motivoSuspension,
        }),
      })
    )
    expect(enviarEmailSuspension).toHaveBeenCalledWith(
      ciudadanoBase.email,
      ciudadanoBase.nombre,
      expect.any(Date),
      motivoSuspension
    )
  })
})

describe("PATCH /api/admin/usuarios/[id]/levantar-suspension", () => {
  beforeEach(() => {
    // resetAllMocks limpia implementaciones Y retornos acumulados (más completo que clearAllMocks)
    jest.resetAllMocks()
    prismaMock.$transaction.mockImplementation((fn: any) => fn(prismaMock))
  })

  it("debería devolver 401 sin sesión", async () => {
    ;(getServerSession as jest.Mock).mockResolvedValueOnce(null)

    const request = new NextRequest(
      `http://localhost:3000/api/admin/usuarios/${CIUDADANO_ID}/levantar-suspension`,
      { method: "PATCH" }
    )
    const response = await levantarSuspension_PATCH(request, { params: { id: CIUDADANO_ID } })

    expect(response.status).toBe(401)
  })

  it("debería devolver 404 cuando el usuario no pertenece al tenant del admin", async () => {
    ;(getServerSession as jest.Mock).mockResolvedValueOnce({
      user: { id: ADMIN_ID, rol: "ADMIN", tenantId: OTRO_TENANT_ID },
    })
    // El findFirst filtra por tenantId = OTRO_TENANT_ID → no encuentra al usuario
    prismaMock.usuario.findFirst.mockResolvedValueOnce(null)

    const request = new NextRequest(
      `http://localhost:3000/api/admin/usuarios/${CIUDADANO_ID}/levantar-suspension`,
      { method: "PATCH" }
    )
    const response = await levantarSuspension_PATCH(request, { params: { id: CIUDADANO_ID } })

    expect(response.status).toBe(404)
  })

  it("debería levantar suspensión: suspendidoHasta y motivoSuspension quedan null", async () => {
    ;(getServerSession as jest.Mock).mockResolvedValueOnce(sesionAdmin)

    prismaMock.usuario.findFirst.mockResolvedValueOnce({ id: CIUDADANO_ID })
    prismaMock.usuario.update.mockResolvedValueOnce({
      ...ciudadanoBase,
      suspendidoHasta: null,
      motivoSuspension: null,
    })

    const request = new NextRequest(
      `http://localhost:3000/api/admin/usuarios/${CIUDADANO_ID}/levantar-suspension`,
      { method: "PATCH" }
    )
    const response = await levantarSuspension_PATCH(request, { params: { id: CIUDADANO_ID } })

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.ok).toBe(true)

    expect(prismaMock.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { suspendidoHasta: null, motivoSuspension: null },
      })
    )
  })
})

describe("POST /api/reservas — usuario suspendido", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prismaMock.$transaction.mockImplementation((fn: any) => fn(prismaMock))
  })

  it("debería devolver 403 cuando el ciudadano tiene suspensión vigente", async () => {
    const ciudadanoSuspendido = {
      ...ciudadanoBase,
      suspendidoHasta: fechaFutura(),
      motivoSuspension: "Suspensión automática por no-shows",
    }
    ;(getServerSession as jest.Mock).mockResolvedValueOnce({
      user: {
        id: CIUDADANO_ID,
        rol: "CIUDADANO",
        tenantId: TENANT_ID,
        email: "ciudadano@test.es",
        name: "Ciudadano Test",
      },
    })

    // Mock configuración tenant (para slots)
    prismaMock.tenant.findUnique.mockResolvedValueOnce({ configuracion: null })

    // Mock de la instalación
    prismaMock.instalacion.findFirst.mockResolvedValueOnce({
      id: "instalacion-001",
      tenantId: TENANT_ID,
      nombre: "Pádel 1",
      tipo: "PADEL",
      activa: true,
    })

    // Mock del usuario con suspensión vigente — se busca para verificar suspensión
    prismaMock.usuario.findUnique.mockResolvedValueOnce(ciudadanoSuspendido)

    // Fecha futura para el slot
    const manana = new Date()
    manana.setDate(manana.getDate() + 1)
    const fechaStr = manana.toISOString().split("T")[0]

    const request = new NextRequest("http://localhost:3000/api/reservas", {
      method: "POST",
      body: JSON.stringify({
        instalacionId: "instalacion-001",
        fecha: fechaStr,
        horaInicio: "08:00",
      }),
      headers: { "Content-Type": "application/json" },
    })
    const response = await reservas_POST(request)

    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.error).toContain("suspendida")
  })
})
