/**
 * Tests para los endpoints de /api/cuenta/preferencias-notificacion
 * Aplicando TDD: los tests se escriben ANTES de implementar los endpoints
 *
 * Endpoints cubiertos:
 *   GET    /api/cuenta/preferencias-notificacion        — obtener preferencias del usuario autenticado
 *   PATCH  /api/cuenta/preferencias-notificacion        — actualizar preferencias del usuario autenticado
 *
 * Reglas de negocio:
 *   - Solo usuarios CIUDADANO pueden acceder (rol CIUDADANO)
 *   - Cada usuario tiene exactamente una fila de preferencias (upsert)
 *   - Los cambios se registran en PreferenciaNotificacion (fecha de actualización)
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
}))

import { getServerSession } from "next-auth"
import { NextRequest } from "next/server"

import { GET, PATCH } from "@/app/api/cuenta/preferencias-notificacion/route"

const mockGetServerSession = getServerSession as jest.Mock

// ─── ID de tenant de prueba ───────────────────────────────────────────────────

const TENANT_ID = "tenant-test"

// ─── Datos de prueba ──────────────────────────────────────────────────────────

const sesionCiudadano = {
  user: {
    id: "ciudadano-1",
    rol: "CIUDADANO",
    email: "ciudadano@example.com",
    tenantId: TENANT_ID,
  },
}

const sesionAdmin = {
  user: {
    id: "admin-1",
    rol: "ADMIN",
    email: "admin@ayuntamiento.es",
    tenantId: TENANT_ID,
  },
}

const preferenciasNotificacionMock = {
  id: "pref-1",
  usuarioId: "ciudadano-1",
  tenantId: TENANT_ID,
  notificacionesEmail: true,
  notificacionesPush: true,
  recordatorioReserva: true,
  recordatorioCancel: true,
  notificacionesAviso: true,
  creadoEn: new Date("2026-03-26T09:00:00.000Z"),
  actualizadoEn: new Date("2026-03-26T09:00:00.000Z"),
}

const bodyPreferenciasValido = {
  notificacionesEmail: false,
  notificacionesPush: true,
  recordatorioReserva: true,
  recordatorioCancel: false,
  notificacionesAviso: true,
}

// ─── Helper para construir requests ──────────────────────────────────────────

function crearRequest(url: string, method: string, body?: object): NextRequest {
  return new NextRequest(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-tenant-slug": "test",
    },
    body: body ? JSON.stringify(body) : undefined,
  })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Preferencias de Notificación API Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ==========================================================================
  // GET /api/cuenta/preferencias-notificacion
  // ==========================================================================

  describe("GET /api/cuenta/preferencias-notificacion", () => {
    it("debería devolver 401 cuando no hay sesión", async () => {
      mockGetServerSession.mockResolvedValueOnce(null)

      const request = crearRequest(
        "http://localhost:3000/api/cuenta/preferencias-notificacion",
        "GET"
      )
      const response = await GET(request)

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe("No autenticado")
    })

    it("debería devolver 403 cuando el usuario tiene rol ADMIN", async () => {
      mockGetServerSession.mockResolvedValueOnce(sesionAdmin)

      const request = crearRequest(
        "http://localhost:3000/api/cuenta/preferencias-notificacion",
        "GET"
      )
      const response = await GET(request)

      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.error).toContain("No tienes permiso")
    })

    it("debería devolver 200 con las preferencias del usuario cuando existen", async () => {
      mockGetServerSession.mockResolvedValueOnce(sesionCiudadano)
      prismaMock.preferenciaNotificacion.findUnique.mockResolvedValueOnce(
        preferenciasNotificacionMock
      )

      const request = crearRequest(
        "http://localhost:3000/api/cuenta/preferencias-notificacion",
        "GET"
      )
      const response = await GET(request)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.usuarioId).toBe("ciudadano-1")
      expect(body.notificacionesEmail).toBe(true)
      expect(prismaMock.preferenciaNotificacion.findUnique).toHaveBeenCalledWith({
        where: { usuarioId_tenantId: { usuarioId: "ciudadano-1", tenantId: TENANT_ID } },
      })
    })

    it("debería devolver preferencias con valores por defecto cuando el usuario no tiene registradas", async () => {
      mockGetServerSession.mockResolvedValueOnce(sesionCiudadano)
      prismaMock.preferenciaNotificacion.findUnique.mockResolvedValueOnce(null)

      const request = crearRequest(
        "http://localhost:3000/api/cuenta/preferencias-notificacion",
        "GET"
      )
      const response = await GET(request)

      expect(response.status).toBe(200)
      const body = await response.json()
      // Valores por defecto esperados
      expect(body.notificacionesEmail).toBe(true)
      expect(body.notificacionesPush).toBe(true)
      expect(body.recordatorioReserva).toBe(true)
      expect(body.recordatorioCancel).toBe(true)
      expect(body.notificacionesAviso).toBe(true)
    })
  })

  // ==========================================================================
  // PATCH /api/cuenta/preferencias-notificacion
  // ==========================================================================

  describe("PATCH /api/cuenta/preferencias-notificacion", () => {
    it("debería devolver 401 cuando no hay sesión", async () => {
      mockGetServerSession.mockResolvedValueOnce(null)

      const request = crearRequest(
        "http://localhost:3000/api/cuenta/preferencias-notificacion",
        "PATCH",
        bodyPreferenciasValido
      )
      const response = await PATCH(request)

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe("No autenticado")
    })

    it("debería devolver 403 cuando el usuario tiene rol ADMIN", async () => {
      mockGetServerSession.mockResolvedValueOnce(sesionAdmin)

      const request = crearRequest(
        "http://localhost:3000/api/cuenta/preferencias-notificacion",
        "PATCH",
        bodyPreferenciasValido
      )
      const response = await PATCH(request)

      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.error).toContain("No tienes permiso")
    })

    it("debería crear las preferencias en la BD cuando no existen (upsert)", async () => {
      mockGetServerSession.mockResolvedValueOnce(sesionCiudadano)
      prismaMock.preferenciaNotificacion.findUnique.mockResolvedValueOnce(null)
      prismaMock.preferenciaNotificacion.upsert.mockResolvedValueOnce(
        preferenciasNotificacionMock
      )

      const request = crearRequest(
        "http://localhost:3000/api/cuenta/preferencias-notificacion",
        "PATCH",
        bodyPreferenciasValido
      )
      const response = await PATCH(request)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.usuarioId).toBe("ciudadano-1")
      expect(prismaMock.preferenciaNotificacion.upsert).toHaveBeenCalledTimes(1)
    })

    it("debería actualizar las preferencias existentes (upsert)", async () => {
      mockGetServerSession.mockResolvedValueOnce(sesionCiudadano)
      const preferenciasActualizadas = {
        ...preferenciasNotificacionMock,
        notificacionesEmail: false,
      }
      prismaMock.preferenciaNotificacion.upsert.mockResolvedValueOnce(
        preferenciasActualizadas
      )

      const request = crearRequest(
        "http://localhost:3000/api/cuenta/preferencias-notificacion",
        "PATCH",
        { notificacionesEmail: false }
      )
      const response = await PATCH(request)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.notificacionesEmail).toBe(false)
    })

    it("debería devolver 400 cuando el body contiene campos inválidos", async () => {
      mockGetServerSession.mockResolvedValueOnce(sesionCiudadano)

      const bodyInvalido = {
        notificacionesEmail: "no es booleano",
        campoDesconocido: true,
      }
      const request = crearRequest(
        "http://localhost:3000/api/cuenta/preferencias-notificacion",
        "PATCH",
        bodyInvalido
      )
      const response = await PATCH(request)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBeDefined()
    })

    it("debería permitir actualizar solo algunas preferencias (partial update)", async () => {
      mockGetServerSession.mockResolvedValueOnce(sesionCiudadano)
      const preferenciasActualizadas = {
        ...preferenciasNotificacionMock,
        recordatorioReserva: false,
      }
      prismaMock.preferenciaNotificacion.upsert.mockResolvedValueOnce(
        preferenciasActualizadas
      )

      const request = crearRequest(
        "http://localhost:3000/api/cuenta/preferencias-notificacion",
        "PATCH",
        { recordatorioReserva: false }
      )
      const response = await PATCH(request)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.recordatorioReserva).toBe(false)
    })

    it("debería registrar la actualización en actualizadoEn", async () => {
      mockGetServerSession.mockResolvedValueOnce(sesionCiudadano)
      const ahora = new Date()
      const preferenciasActualizadas = {
        ...preferenciasNotificacionMock,
        actualizadoEn: ahora,
      }
      prismaMock.preferenciaNotificacion.upsert.mockResolvedValueOnce(
        preferenciasActualizadas
      )

      const request = crearRequest(
        "http://localhost:3000/api/cuenta/preferencias-notificacion",
        "PATCH",
        bodyPreferenciasValido
      )
      const response = await PATCH(request)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.actualizadoEn).toBeDefined()
    })
  })
})
