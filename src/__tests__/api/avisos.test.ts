/**
 * Tests para los endpoints de /api/avisos
 * Aplicando TDD: los tests se escriben ANTES de implementar los endpoints
 *
 * Endpoints cubiertos:
 *   GET    /api/avisos          — público, devuelve avisos activos del tenant
 *   POST   /api/avisos          — solo ADMIN, crea un aviso
 *   PATCH  /api/avisos/[id]     — solo ADMIN, edita un aviso del tenant
 *   DELETE /api/avisos/[id]     — solo ADMIN, elimina un aviso del tenant
 *
 * Fase 4 multi-tenant:
 *   - GET requiere header x-tenant-id (inyectado por middleware)
 *   - PATCH/DELETE usan findFirst con { id, tenantId } en lugar de findUnique
 *   - Las sesiones de admin incluyen tenantId (LESSON-016)
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

// El middleware inyecta x-tenant-slug (no x-tenant-id). Mockeamos el helper de tenant.
jest.mock("@/lib/tenant", () => ({
  obtenerTenantIdPorSlug: jest.fn().mockResolvedValue("tenant-test"),
  extraerSlugDelHost: jest.fn().mockReturnValue("test"),
}))

import { getServerSession } from "next-auth"
import { NextRequest } from "next/server"

import { GET, POST } from "@/app/api/avisos/route"
import { PATCH, DELETE } from "@/app/api/avisos/[id]/route"

const mockGetServerSession = getServerSession as jest.Mock

// ─── ID de tenant de prueba ───────────────────────────────────────────────────

const TENANT_ID = "tenant-test"

// ─── Datos de prueba ──────────────────────────────────────────────────────────

const sesionAdmin = {
  user: {
    id: "admin-1",
    rol: "ADMIN",
    email: "admin@ayuntamiento.es",
    tenantId: TENANT_ID,
  },
}
const sesionCiudadano = {
  user: {
    id: "ciudadano-1",
    rol: "CIUDADANO",
    email: "ciudadano@example.com",
    tenantId: TENANT_ID,
  },
}

const avisoMock = {
  id: "aviso-1",
  tenantId: TENANT_ID,
  titulo: "Mantenimiento pistas",
  descripcion: "Las pistas estarán cerradas el lunes de 8:00 a 10:00.",
  tipo: "AVISO",
  fecha: new Date("2026-04-01T10:00:00.000Z"),
  activo: true,
  creadoEn: new Date("2026-03-26T09:00:00.000Z"),
  actualizadoEn: new Date("2026-03-26T09:00:00.000Z"),
}

const bodyAvisoValido = {
  titulo: "Mantenimiento pistas",
  descripcion: "Las pistas estarán cerradas el lunes de 8:00 a 10:00.",
  tipo: "AVISO",
  fecha: "2026-04-01",
}

// ─── Helper para construir requests ──────────────────────────────────────────

function crearRequest(url: string, method: string, body?: object): NextRequest {
  return new NextRequest(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-tenant-slug": "test", // El middleware inyecta este header en producción
    },
    body: body ? JSON.stringify(body) : undefined,
  })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Avisos API Routes — Tablón de anuncios", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ==========================================================================
  // GET /api/avisos — ruta pública (requiere x-tenant-id header)
  // ==========================================================================

  describe("GET /api/avisos", () => {
    it("debería devolver 200 con solo avisos activos ordenados por fecha desc", async () => {
      prismaMock.aviso.findMany.mockResolvedValueOnce([avisoMock])

      const request = crearRequest("http://localhost:3000/api/avisos", "GET")
      const response = await GET(request)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(Array.isArray(body)).toBe(true)
      expect(body).toHaveLength(1)
      expect(body[0].id).toBe("aviso-1")

      // Debe haber consultado solo los avisos activos del tenant
      expect(prismaMock.aviso.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID, activo: true },
          orderBy: { fecha: "desc" },
        })
      )
    })

    it("debería devolver un array vacío cuando no hay avisos activos", async () => {
      prismaMock.aviso.findMany.mockResolvedValueOnce([])

      const request = crearRequest("http://localhost:3000/api/avisos", "GET")
      const response = await GET(request)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body).toEqual([])
    })

    it("debería ser accesible sin sesión (ruta pública)", async () => {
      // Sin sesión configurada (no-auth), el endpoint debe funcionar igualmente
      prismaMock.aviso.findMany.mockResolvedValueOnce([avisoMock])

      const request = crearRequest("http://localhost:3000/api/avisos", "GET")
      const response = await GET(request)

      expect(response.status).toBe(200)
    })
  })

  // ==========================================================================
  // POST /api/avisos — solo ADMIN
  // ==========================================================================

  describe("POST /api/avisos", () => {
    it("debería devolver 401 cuando no hay sesión", async () => {
      mockGetServerSession.mockResolvedValueOnce(null)

      const request = crearRequest("http://localhost:3000/api/avisos", "POST", bodyAvisoValido)
      const response = await POST(request)

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe("No autenticado")
    })

    it("debería devolver 403 cuando el usuario tiene rol CIUDADANO", async () => {
      mockGetServerSession.mockResolvedValueOnce(sesionCiudadano)

      const request = crearRequest("http://localhost:3000/api/avisos", "POST", bodyAvisoValido)
      const response = await POST(request)

      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.error).toContain("No tienes permiso")
    })

    it("debería crear el aviso y devolver 201 cuando el usuario es ADMIN", async () => {
      mockGetServerSession.mockResolvedValueOnce(sesionAdmin)
      prismaMock.aviso.create.mockResolvedValueOnce(avisoMock)

      const request = crearRequest("http://localhost:3000/api/avisos", "POST", bodyAvisoValido)
      const response = await POST(request)

      expect(response.status).toBe(201)
      const body = await response.json()
      expect(body.id).toBe("aviso-1")
      expect(body.titulo).toBe("Mantenimiento pistas")
      expect(prismaMock.aviso.create).toHaveBeenCalledTimes(1)
    })

    it("debería devolver 400 cuando falta el campo titulo", async () => {
      mockGetServerSession.mockResolvedValueOnce(sesionAdmin)

      const bodyInvalido = { ...bodyAvisoValido, titulo: "" }
      const request = crearRequest("http://localhost:3000/api/avisos", "POST", bodyInvalido)
      const response = await POST(request)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBeDefined()
    })

    it("debería devolver 400 cuando falta el campo descripcion", async () => {
      mockGetServerSession.mockResolvedValueOnce(sesionAdmin)

      const { descripcion: _, ...bodySinDescripcion } = bodyAvisoValido
      const request = crearRequest("http://localhost:3000/api/avisos", "POST", bodySinDescripcion)
      const response = await POST(request)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBeDefined()
    })

    it("debería devolver 400 cuando el tipo no es válido", async () => {
      mockGetServerSession.mockResolvedValueOnce(sesionAdmin)

      const bodyTipoInvalido = { ...bodyAvisoValido, tipo: "OTRO_TIPO" }
      const request = crearRequest("http://localhost:3000/api/avisos", "POST", bodyTipoInvalido)
      const response = await POST(request)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBeDefined()
    })

    it("debería devolver 400 cuando la fecha no es válida", async () => {
      mockGetServerSession.mockResolvedValueOnce(sesionAdmin)

      const bodyFechaInvalida = { ...bodyAvisoValido, fecha: "no-es-fecha" }
      const request = crearRequest("http://localhost:3000/api/avisos", "POST", bodyFechaInvalida)
      const response = await POST(request)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBeDefined()
    })

    it("debería devolver 400 cuando el titulo supera 100 caracteres", async () => {
      mockGetServerSession.mockResolvedValueOnce(sesionAdmin)

      const bodyTituloLargo = { ...bodyAvisoValido, titulo: "a".repeat(101) }
      const request = crearRequest("http://localhost:3000/api/avisos", "POST", bodyTituloLargo)
      const response = await POST(request)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBeDefined()
    })

    it("debería devolver 400 cuando la descripcion supera 500 caracteres", async () => {
      mockGetServerSession.mockResolvedValueOnce(sesionAdmin)

      const bodyDescLarga = { ...bodyAvisoValido, descripcion: "a".repeat(501) }
      const request = crearRequest("http://localhost:3000/api/avisos", "POST", bodyDescLarga)
      const response = await POST(request)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBeDefined()
    })
  })

  // ==========================================================================
  // PATCH /api/avisos/[id] — solo ADMIN
  // Usa findFirst con { id, tenantId } desde Fase 4 (LESSON-016)
  // ==========================================================================

  describe("PATCH /api/avisos/[id]", () => {
    it("debería devolver 401 cuando no hay sesión", async () => {
      mockGetServerSession.mockResolvedValueOnce(null)

      const request = crearRequest(
        "http://localhost:3000/api/avisos/aviso-1",
        "PATCH",
        { titulo: "Nuevo título" }
      )
      const response = await PATCH(request, { params: { id: "aviso-1" } })

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe("No autenticado")
    })

    it("debería devolver 403 cuando el usuario tiene rol CIUDADANO", async () => {
      mockGetServerSession.mockResolvedValueOnce(sesionCiudadano)

      const request = crearRequest(
        "http://localhost:3000/api/avisos/aviso-1",
        "PATCH",
        { titulo: "Nuevo título" }
      )
      const response = await PATCH(request, { params: { id: "aviso-1" } })

      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.error).toContain("No tienes permiso")
    })

    it("debería devolver 404 cuando el aviso no existe", async () => {
      mockGetServerSession.mockResolvedValueOnce(sesionAdmin)
      // La ruta usa findFirst con { id, tenantId } desde Fase 4
      prismaMock.aviso.findFirst.mockResolvedValueOnce(null)

      const request = crearRequest(
        "http://localhost:3000/api/avisos/aviso-inexistente",
        "PATCH",
        { titulo: "Nuevo título" }
      )
      const response = await PATCH(request, { params: { id: "aviso-inexistente" } })

      expect(response.status).toBe(404)
      const body = await response.json()
      expect(body.error).toBeDefined()
    })

    it("debería actualizar el aviso y devolver 200 cuando el usuario es ADMIN", async () => {
      mockGetServerSession.mockResolvedValueOnce(sesionAdmin)
      // La ruta usa findFirst con { id, tenantId } desde Fase 4
      prismaMock.aviso.findFirst.mockResolvedValueOnce(avisoMock)
      const avisoActualizado = { ...avisoMock, titulo: "Título actualizado" }
      prismaMock.aviso.update.mockResolvedValueOnce(avisoActualizado)

      const request = crearRequest(
        "http://localhost:3000/api/avisos/aviso-1",
        "PATCH",
        { titulo: "Título actualizado" }
      )
      const response = await PATCH(request, { params: { id: "aviso-1" } })

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.titulo).toBe("Título actualizado")
      expect(prismaMock.aviso.update).toHaveBeenCalledTimes(1)
    })
  })

  // ==========================================================================
  // DELETE /api/avisos/[id] — solo ADMIN
  // Usa findFirst con { id, tenantId } desde Fase 4 (LESSON-016)
  // ==========================================================================

  describe("DELETE /api/avisos/[id]", () => {
    it("debería devolver 401 cuando no hay sesión", async () => {
      mockGetServerSession.mockResolvedValueOnce(null)

      const request = crearRequest(
        "http://localhost:3000/api/avisos/aviso-1",
        "DELETE"
      )
      const response = await DELETE(request, { params: { id: "aviso-1" } })

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe("No autenticado")
    })

    it("debería devolver 403 cuando el usuario tiene rol CIUDADANO", async () => {
      mockGetServerSession.mockResolvedValueOnce(sesionCiudadano)

      const request = crearRequest(
        "http://localhost:3000/api/avisos/aviso-1",
        "DELETE"
      )
      const response = await DELETE(request, { params: { id: "aviso-1" } })

      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.error).toContain("No tienes permiso")
    })

    it("debería devolver 404 cuando el aviso no existe", async () => {
      mockGetServerSession.mockResolvedValueOnce(sesionAdmin)
      // La ruta usa findFirst con { id, tenantId } desde Fase 4
      prismaMock.aviso.findFirst.mockResolvedValueOnce(null)

      const request = crearRequest(
        "http://localhost:3000/api/avisos/aviso-inexistente",
        "DELETE"
      )
      const response = await DELETE(request, { params: { id: "aviso-inexistente" } })

      expect(response.status).toBe(404)
      const body = await response.json()
      expect(body.error).toBeDefined()
    })

    it("debería desactivar el aviso (soft delete) y devolver 200 cuando el usuario es ADMIN", async () => {
      mockGetServerSession.mockResolvedValueOnce(sesionAdmin)
      // La ruta usa findFirst con { id, tenantId } desde Fase 4
      prismaMock.aviso.findFirst.mockResolvedValueOnce(avisoMock)
      const avisoDesactivado = { ...avisoMock, activo: false }
      prismaMock.aviso.update.mockResolvedValueOnce(avisoDesactivado)

      const request = crearRequest(
        "http://localhost:3000/api/avisos/aviso-1",
        "DELETE"
      )
      const response = await DELETE(request, { params: { id: "aviso-1" } })

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.mensaje).toBeDefined()

      // El aviso se desactiva (activo: false) en lugar de borrarse
      expect(prismaMock.aviso.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "aviso-1" },
          data: expect.objectContaining({ activo: false }),
        })
      )
    })
  })
})
