/**
 * Tests para el sistema de valoraciones de instalaciones deportivas
 * TDD: tests escritos ANTES de implementar los endpoints
 *
 * Endpoints cubiertos:
 *   POST /api/valoraciones        — ciudadano crea una valoración de una reserva pasada
 *   GET  /api/admin/valoraciones  — admin obtiene todas las valoraciones del tenant
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

jest.mock("@/lib/auth", () => ({
  opcionesAuth: {},
}))

// Mocks de dependencias transitivas que se cargan al importar las rutas
jest.mock("@/lib/email", () => ({
  enviarEmailReserva: jest.fn().mockResolvedValue(undefined),
  enviarEmailNotificacionAdmins: jest.fn().mockResolvedValue(undefined),
  enviarEmailComunicadoMasivo: jest.fn().mockResolvedValue(0),
}))

jest.mock("web-push", () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn().mockResolvedValue({ statusCode: 201 }),
}))

jest.mock("@/lib/push", () => ({
  enviarPushReservaConfirmada: jest.fn().mockResolvedValue(undefined),
  enviarPushComunicadoMasivo: jest.fn().mockResolvedValue(0),
}))

import { getServerSession } from "next-auth"
import { NextRequest } from "next/server"

import { POST } from "@/app/api/valoraciones/route"
import { GET as GET_ADMIN } from "@/app/api/admin/valoraciones/route"

const mockGetServerSession = getServerSession as jest.Mock

const TENANT_ID = "tenant-test"

// Sesiones reutilizables
const sesionCiudadano = {
  user: { id: "ciudadano-1", rol: "CIUDADANO", tenantId: TENANT_ID },
}
const sesionAdmin = {
  user: { id: "admin-1", rol: "ADMIN", tenantId: TENANT_ID },
}

// Reserva pasada válida para valorar (horaFin en el pasado)
const reservaPasadaValida = {
  id: "reserva-1",
  tenantId: TENANT_ID,
  usuarioId: "ciudadano-1",
  instalacionId: "inst-1",
  fecha: new Date("2026-01-10T00:00:00.000Z"),
  horaInicio: new Date("2026-01-10T09:00:00.000Z"),
  horaFin: new Date("2026-01-10T10:00:00.000Z"),  // pasado — valorable
  estado: "ACTIVA",
  valoracion: null,
}

// Reserva futura — no se puede valorar aún
const reservaFutura = {
  id: "reserva-futura",
  tenantId: TENANT_ID,
  usuarioId: "ciudadano-1",
  instalacionId: "inst-1",
  fecha: new Date("2099-12-31T00:00:00.000Z"),
  horaInicio: new Date("2099-12-31T09:00:00.000Z"),
  horaFin: new Date("2099-12-31T10:00:00.000Z"),  // futuro — no valorable
  estado: "ACTIVA",
  valoracion: null,
}

// Valoración de ejemplo para tests de admin
const valoracionMock = {
  id: "val-1",
  tenantId: TENANT_ID,
  usuarioId: "ciudadano-1",
  instalacionId: "inst-1",
  reservaId: "reserva-1",
  puntuacion: 4,
  comentario: "Muy buenas pistas",
  creadoEn: new Date("2026-01-10T11:00:00.000Z"),
  instalacion: { nombre: "Pista 1" },
  usuario: { nombre: "Juan García", email: "juan@test.es" },
}

// Helper para construir NextRequest
function req(url: string, method = "GET", body?: object) {
  return new NextRequest(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  })
}

// ─── POST /api/valoraciones ───────────────────────────────────────────────────

describe("POST /api/valoraciones", () => {
  beforeEach(() => jest.resetAllMocks())

  it("devuelve 401 si no hay sesión", async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await POST(
      req("http://localhost/api/valoraciones", "POST", {
        reservaId: "reserva-1",
        puntuacion: 4,
      })
    )
    expect(res.status).toBe(401)
  })

  it("devuelve 403 si el rol es ADMIN (solo CIUDADANO puede valorar)", async () => {
    mockGetServerSession.mockResolvedValue(sesionAdmin)
    const res = await POST(
      req("http://localhost/api/valoraciones", "POST", {
        reservaId: "reserva-1",
        puntuacion: 4,
      })
    )
    expect(res.status).toBe(403)
  })

  it("devuelve 400 si puntuacion es 0 (fuera de rango)", async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    const res = await POST(
      req("http://localhost/api/valoraciones", "POST", {
        reservaId: "reserva-1",
        puntuacion: 0,
      })
    )
    expect(res.status).toBe(400)
  })

  it("devuelve 400 si puntuacion es 6 (fuera de rango)", async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    const res = await POST(
      req("http://localhost/api/valoraciones", "POST", {
        reservaId: "reserva-1",
        puntuacion: 6,
      })
    )
    expect(res.status).toBe(400)
  })

  it("devuelve 400 si comentario supera 500 caracteres", async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    const res = await POST(
      req("http://localhost/api/valoraciones", "POST", {
        reservaId: "reserva-1",
        puntuacion: 3,
        comentario: "a".repeat(501),
      })
    )
    expect(res.status).toBe(400)
  })

  it("devuelve 404 si la reservaId no pertenece al ciudadano o al tenant", async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    // findFirst devuelve null — reserva no encontrada o de otro usuario/tenant
    prismaMock.reserva.findFirst.mockResolvedValue(null)

    const res = await POST(
      req("http://localhost/api/valoraciones", "POST", {
        reservaId: "reserva-ajena",
        puntuacion: 4,
      })
    )
    expect(res.status).toBe(404)
  })

  it("devuelve 422 si la reserva aún no ha terminado (horaFin > now)", async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    prismaMock.reserva.findFirst.mockResolvedValue(reservaFutura)

    const res = await POST(
      req("http://localhost/api/valoraciones", "POST", {
        reservaId: "reserva-futura",
        puntuacion: 5,
      })
    )
    expect(res.status).toBe(422)
  })

  it("devuelve 409 si la reserva ya tiene una valoración (constraint @unique)", async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    prismaMock.reserva.findFirst.mockResolvedValue(reservaPasadaValida)

    // Simular error de unique constraint de Prisma (P2002)
    const errorP2002 = Object.assign(new Error("Unique constraint failed"), { code: "P2002" })
    prismaMock.valoracion.create.mockRejectedValue(errorP2002)

    const res = await POST(
      req("http://localhost/api/valoraciones", "POST", {
        reservaId: "reserva-1",
        puntuacion: 4,
      })
    )
    expect(res.status).toBe(409)
  })

  it("devuelve 201 y la valoración creada cuando todo es válido", async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    prismaMock.reserva.findFirst.mockResolvedValue(reservaPasadaValida)

    const valoracionCreada = {
      id: "val-nueva",
      tenantId: TENANT_ID,
      usuarioId: "ciudadano-1",
      instalacionId: "inst-1",
      reservaId: "reserva-1",
      puntuacion: 4,
      comentario: "Muy buenas pistas",
      creadoEn: new Date(),
    }
    prismaMock.valoracion.create.mockResolvedValue(valoracionCreada)

    const res = await POST(
      req("http://localhost/api/valoraciones", "POST", {
        reservaId: "reserva-1",
        puntuacion: 4,
        comentario: "Muy buenas pistas",
      })
    )
    expect(res.status).toBe(201)

    const data = await res.json()
    expect(data.valoracion).toBeDefined()
    expect(data.valoracion.puntuacion).toBe(4)
    expect(data.valoracion.comentario).toBe("Muy buenas pistas")
    expect(data.valoracion.reservaId).toBe("reserva-1")
  })
})

// ─── GET /api/admin/valoraciones ─────────────────────────────────────────────

describe("GET /api/admin/valoraciones", () => {
  beforeEach(() => jest.resetAllMocks())

  it("devuelve 401 si no hay sesión", async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await GET_ADMIN(req("http://localhost/api/admin/valoraciones"))
    expect(res.status).toBe(401)
  })

  it("devuelve 403 si el rol no es ADMIN", async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    const res = await GET_ADMIN(req("http://localhost/api/admin/valoraciones"))
    expect(res.status).toBe(403)
  })

  it("devuelve 200 con la lista de valoraciones del tenant incluyendo instalacion y usuario", async () => {
    mockGetServerSession.mockResolvedValue(sesionAdmin)
    prismaMock.valoracion.findMany.mockResolvedValue([valoracionMock])

    const res = await GET_ADMIN(req("http://localhost/api/admin/valoraciones"))
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.valoraciones).toHaveLength(1)

    const v = data.valoraciones[0]
    expect(v.id).toBe("val-1")
    expect(v.puntuacion).toBe(4)
    expect(v.comentario).toBe("Muy buenas pistas")
    expect(v.instalacion).toBeDefined()
    expect(v.instalacion.nombre).toBe("Pista 1")
    expect(v.usuario).toBeDefined()
    expect(v.usuario.nombre).toBe("Juan García")
    expect(v.usuario.email).toBe("juan@test.es")

    // Verificar filtro por tenant y orden
    expect(prismaMock.valoracion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TENANT_ID },
        orderBy: { creadoEn: "desc" },
      })
    )
  })
})
