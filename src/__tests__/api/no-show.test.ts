// Tests TDD para PATCH /api/admin/reservas/[id]/no-show
// Cubre: marcado de no-show, validaciones, suspensión automática y control de acceso

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
}))

jest.mock("@/lib/push", () => ({
  enviarPushCancelacion: jest.fn().mockResolvedValue(undefined),
}))

import { getServerSession } from "next-auth"
import { NextRequest } from "next/server"
import { PATCH } from "@/app/api/admin/reservas/[id]/no-show/route"
import { enviarEmailSuspension } from "@/lib/email"

// Tenant y usuarios de referencia para los tests
const TENANT_ID = "tenant-test-no-show-001"
const OTRO_TENANT_ID = "tenant-otro-no-show-002"
const ADMIN_ID = "admin-id-001"
const CIUDADANO_ID = "ciudadano-id-001"
const RESERVA_ID = "reserva-id-001"

// Fecha pasada para reservas válidas (ayer)
function fechaAyer(): Date {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d
}

// Fecha futura para reservas inválidas (mañana)
function fechaManana(): Date {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d
}

// Sesión de admin estándar para los tests
const sesionAdmin = {
  user: { id: ADMIN_ID, rol: "ADMIN", tenantId: TENANT_ID },
}

// Reserva pasada válida para marcar no-show
const reservaPasadaActiva = {
  id: RESERVA_ID,
  tenantId: TENANT_ID,
  usuarioId: CIUDADANO_ID,
  estado: "ACTIVA",
  noShow: false,
  horaInicio: fechaAyer(),
  horaFin: fechaAyer(),
  instalacion: { nombre: "Pádel 1" },
  usuario: { id: CIUDADANO_ID, email: "ciudadano@test.es", nombre: "Ciudadano Test", noShows: 0, suspendidoHasta: null },
}

describe("PATCH /api/admin/reservas/[id]/no-show", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prismaMock.$transaction.mockImplementation((fn: any) => fn(prismaMock))
  })

  // ─── Control de acceso ───────────────────────────────────────────────────────

  it("debería devolver 401 cuando no hay sesión", async () => {
    ;(getServerSession as jest.Mock).mockResolvedValueOnce(null)

    const request = new NextRequest(`http://localhost:3000/api/admin/reservas/${RESERVA_ID}/no-show`, {
      method: "PATCH",
    })
    const response = await PATCH(request, { params: { id: RESERVA_ID } })

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBe("No autenticado")
  })

  it("debería devolver 403 cuando el usuario no es ADMIN", async () => {
    ;(getServerSession as jest.Mock).mockResolvedValueOnce({
      user: { id: CIUDADANO_ID, rol: "CIUDADANO", tenantId: TENANT_ID },
    })

    const request = new NextRequest(`http://localhost:3000/api/admin/reservas/${RESERVA_ID}/no-show`, {
      method: "PATCH",
    })
    const response = await PATCH(request, { params: { id: RESERVA_ID } })

    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.error).toContain("No tienes permiso")
  })

  it("debería devolver 403 cuando el admin es de otro tenant", async () => {
    ;(getServerSession as jest.Mock).mockResolvedValueOnce({
      user: { id: ADMIN_ID, rol: "ADMIN", tenantId: OTRO_TENANT_ID },
    })

    // La reserva pertenece a TENANT_ID pero el admin es de OTRO_TENANT_ID
    prismaMock.reserva.findFirst.mockResolvedValueOnce(null)

    const request = new NextRequest(`http://localhost:3000/api/admin/reservas/${RESERVA_ID}/no-show`, {
      method: "PATCH",
    })
    const response = await PATCH(request, { params: { id: RESERVA_ID } })

    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body.error).toContain("no encontrada")
  })

  // ─── Validaciones de negocio ─────────────────────────────────────────────────

  it("debería devolver 400 cuando la reserva es futura", async () => {
    ;(getServerSession as jest.Mock).mockResolvedValueOnce(sesionAdmin)

    const reservaFutura = {
      ...reservaPasadaActiva,
      horaInicio: fechaManana(),
    }
    prismaMock.reserva.findFirst.mockResolvedValueOnce(reservaFutura)

    const request = new NextRequest(`http://localhost:3000/api/admin/reservas/${RESERVA_ID}/no-show`, {
      method: "PATCH",
    })
    const response = await PATCH(request, { params: { id: RESERVA_ID } })

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toContain("futura")
  })

  it("debería devolver 409 cuando la reserva ya tiene no-show marcado", async () => {
    ;(getServerSession as jest.Mock).mockResolvedValueOnce(sesionAdmin)

    const reservaYaNoShow = {
      ...reservaPasadaActiva,
      noShow: true,
    }
    prismaMock.reserva.findFirst.mockResolvedValueOnce(reservaYaNoShow)

    const request = new NextRequest(`http://localhost:3000/api/admin/reservas/${RESERVA_ID}/no-show`, {
      method: "PATCH",
    })
    const response = await PATCH(request, { params: { id: RESERVA_ID } })

    expect(response.status).toBe(409)
    const body = await response.json()
    expect(body.error).toContain("ya está marcada")
  })

  // ─── Caso feliz: marcar no-show sin suspensión ────────────────────────────────

  it("debería marcar no-show correctamente: noShow:true y noShows incrementado", async () => {
    ;(getServerSession as jest.Mock).mockResolvedValueOnce(sesionAdmin)

    prismaMock.reserva.findFirst.mockResolvedValueOnce(reservaPasadaActiva)
    prismaMock.reserva.update.mockResolvedValueOnce({ ...reservaPasadaActiva, noShow: true })
    prismaMock.usuario.update.mockResolvedValueOnce({
      ...reservaPasadaActiva.usuario,
      noShows: 1,
      suspendidoHasta: null,
    })
    // Config del tenant sin penalizaciones personalizadas
    prismaMock.tenant.findUnique.mockResolvedValueOnce({ configuracion: null })

    const request = new NextRequest(`http://localhost:3000/api/admin/reservas/${RESERVA_ID}/no-show`, {
      method: "PATCH",
    })
    const response = await PATCH(request, { params: { id: RESERVA_ID } })

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.ok).toBe(true)
    expect(body.suspendido).toBe(false)
    // Verificar que se llamaron las actualizaciones correctas
    expect(prismaMock.reserva.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { noShow: true } })
    )
    expect(prismaMock.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ noShows: { increment: 1 } }),
      })
    )
  })

  // ─── Suspensión automática al alcanzar maxNoShows ────────────────────────────

  it("debería suspender al usuario al alcanzar maxNoShows (3 por defecto)", async () => {
    ;(getServerSession as jest.Mock).mockResolvedValueOnce(sesionAdmin)

    // El usuario ya tiene 2 no-shows → con éste llega a 3
    const ciudadanoConDosNoShows = {
      ...reservaPasadaActiva.usuario,
      noShows: 2,
    }
    const reservaConCiudadano2NS = {
      ...reservaPasadaActiva,
      usuario: ciudadanoConDosNoShows,
    }

    prismaMock.reserva.findFirst.mockResolvedValueOnce(reservaConCiudadano2NS)
    prismaMock.reserva.update.mockResolvedValueOnce({ ...reservaConCiudadano2NS, noShow: true })

    const usuarioActualizado = {
      ...ciudadanoConDosNoShows,
      noShows: 3,
      suspendidoHasta: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      motivoSuspension: "Suspensión automática por no presentarse a 3 reservas",
    }
    prismaMock.usuario.update.mockResolvedValueOnce(usuarioActualizado)

    // Config sin personalizar
    prismaMock.tenant.findUnique.mockResolvedValueOnce({ configuracion: null })

    const request = new NextRequest(`http://localhost:3000/api/admin/reservas/${RESERVA_ID}/no-show`, {
      method: "PATCH",
    })
    const response = await PATCH(request, { params: { id: RESERVA_ID } })

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.ok).toBe(true)
    expect(body.suspendido).toBe(true)
    expect(body.suspendidoHasta).toBeDefined()

    // Verificar que se envió el email de suspensión
    expect(enviarEmailSuspension).toHaveBeenCalled()

    // Verificar que se guardó la suspensión en el update del usuario
    expect(prismaMock.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          noShows: { increment: 1 },
          suspendidoHasta: expect.any(Date),
          motivoSuspension: expect.stringContaining("3"),
        }),
      })
    )
  })

  it("debería suspender al primer no-show cuando config tiene maxNoShows: 1", async () => {
    ;(getServerSession as jest.Mock).mockResolvedValueOnce(sesionAdmin)

    const ciudadanoCeroNoShows = {
      ...reservaPasadaActiva.usuario,
      noShows: 0,
    }
    const reservaCiudadanoCero = {
      ...reservaPasadaActiva,
      usuario: ciudadanoCeroNoShows,
    }

    prismaMock.reserva.findFirst.mockResolvedValueOnce(reservaCiudadanoCero)
    prismaMock.reserva.update.mockResolvedValueOnce({ ...reservaCiudadanoCero, noShow: true })

    const usuarioSuspendido = {
      ...ciudadanoCeroNoShows,
      noShows: 1,
      suspendidoHasta: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      motivoSuspension: "Suspensión automática por no presentarse a 1 reservas",
    }
    prismaMock.usuario.update.mockResolvedValueOnce(usuarioSuspendido)

    // Config con maxNoShows: 1 y diasSuspension: 7
    prismaMock.tenant.findUnique.mockResolvedValueOnce({
      configuracion: JSON.stringify({
        penalizaciones: { maxNoShows: 1, diasSuspension: 7 },
      }),
    })

    const request = new NextRequest(`http://localhost:3000/api/admin/reservas/${RESERVA_ID}/no-show`, {
      method: "PATCH",
    })
    const response = await PATCH(request, { params: { id: RESERVA_ID } })

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.ok).toBe(true)
    expect(body.suspendido).toBe(true)
    expect(enviarEmailSuspension).toHaveBeenCalled()
  })
})
