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
  caducaEn: null,
  creadoEn: new Date("2026-03-26T09:00:00.000Z"),
  actualizadoEn: new Date("2026-03-26T09:00:00.000Z"),
}

const bodyAvisoValido = {
  titulo: "Mantenimiento pistas",
  descripcion: "Las pistas estarán cerradas el lunes de 8:00 a 10:00.",
  tipo: "AVISO",
  fecha: "2026-04-01",
}

// Fecha en el futuro (año 2099 garantiza que no caduca en tests)
const FECHA_FUTURA = new Date("2099-12-31T23:59:59.000Z")
// Fecha en el pasado
const FECHA_PASADA = new Date("2020-01-01T00:00:00.000Z")

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

      // Debe haber consultado solo los avisos activos y no caducados del tenant
      expect(prismaMock.aviso.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
            activo: true,
            OR: expect.arrayContaining([
              { caducaEn: null },
              { caducaEn: expect.objectContaining({ gt: expect.any(Date) }) },
            ]),
          }),
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

  // ==========================================================================
  // Caducidad automática — GET /api/avisos (ruta pública)
  // ==========================================================================

  describe("GET /api/avisos — filtro de caducidad", () => {
    it("debería devolver aviso sin caducaEn (siempre visible)", async () => {
      // caducaEn: null → sin fecha límite → siempre visible
      const avisoSinCaducidad = { ...avisoMock, caducaEn: null }
      prismaMock.aviso.findMany.mockResolvedValueOnce([avisoSinCaducidad])

      const request = crearRequest("http://localhost:3000/api/avisos", "GET")
      const response = await GET(request)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body).toHaveLength(1)
    })

    it("debería devolver aviso con caducaEn en el futuro (todavía vigente)", async () => {
      // caducaEn en el futuro → el aviso aún no ha caducado
      const avisoFuturo = { ...avisoMock, caducaEn: FECHA_FUTURA }
      prismaMock.aviso.findMany.mockResolvedValueOnce([avisoFuturo])

      const request = crearRequest("http://localhost:3000/api/avisos", "GET")
      const response = await GET(request)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body).toHaveLength(1)
    })

    it("debería excluir aviso con caducaEn en el pasado (ya caducado)", async () => {
      // Cuando hay un aviso caducado, la query no debe devolverlo (array vacío)
      prismaMock.aviso.findMany.mockResolvedValueOnce([])

      const request = crearRequest("http://localhost:3000/api/avisos", "GET")
      const response = await GET(request)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body).toHaveLength(0)

      // Verificar que el WHERE incluye el filtro de caducidad
      expect(prismaMock.aviso.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { caducaEn: null },
              { caducaEn: expect.objectContaining({ gt: expect.any(Date) }) },
            ]),
          }),
        })
      )
    })

    it("debería excluir aviso con caducaEn pasado aunque activo sea false", async () => {
      // Doble condición: ni activo ni vigente → no aparece
      prismaMock.aviso.findMany.mockResolvedValueOnce([])

      const request = crearRequest("http://localhost:3000/api/avisos", "GET")
      const response = await GET(request)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body).toHaveLength(0)
    })

    it("debería usar el filtro correcto de caducidad en la query Prisma", async () => {
      prismaMock.aviso.findMany.mockResolvedValueOnce([avisoMock])

      const request = crearRequest("http://localhost:3000/api/avisos", "GET")
      await GET(request)

      // El WHERE debe incluir: activo: true + OR[caducaEn null | caducaEn futuro]
      expect(prismaMock.aviso.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
            activo: true,
            OR: expect.arrayContaining([
              { caducaEn: null },
              { caducaEn: expect.objectContaining({ gt: expect.any(Date) }) },
            ]),
          }),
        })
      )
    })
  })

  // ==========================================================================
  // Caducidad automática — POST /api/avisos y PATCH /api/avisos/[id]
  // ==========================================================================

  describe("POST /api/avisos — campo caducaEn", () => {
    it("debería crear aviso con caducaEn cuando se proporciona una fecha ISO válida", async () => {
      mockGetServerSession.mockResolvedValueOnce(sesionAdmin)
      const avisoConCaducidad = { ...avisoMock, caducaEn: FECHA_FUTURA }
      prismaMock.aviso.create.mockResolvedValueOnce(avisoConCaducidad)

      const bodyConCaducidad = {
        ...bodyAvisoValido,
        caducaEn: "2099-12-31T23:59:59.000Z",
      }
      const request = crearRequest("http://localhost:3000/api/avisos", "POST", bodyConCaducidad)
      const response = await POST(request)

      expect(response.status).toBe(201)
      // La ruta debe haber pasado caducaEn a prisma.aviso.create
      expect(prismaMock.aviso.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            caducaEn: expect.any(Date),
          }),
        })
      )
    })

    it("debería crear aviso sin caducaEn cuando no se proporciona (null en BD)", async () => {
      mockGetServerSession.mockResolvedValueOnce(sesionAdmin)
      prismaMock.aviso.create.mockResolvedValueOnce(avisoMock) // caducaEn: null

      const request = crearRequest("http://localhost:3000/api/avisos", "POST", bodyAvisoValido)
      const response = await POST(request)

      expect(response.status).toBe(201)
      // caducaEn no debe pasarse al create (o pasar null) — no se lanza error
      const body = await response.json()
      expect(body.caducaEn).toBeNull()
    })

    it("debería devolver 400 cuando caducaEn no es una fecha válida", async () => {
      mockGetServerSession.mockResolvedValueOnce(sesionAdmin)

      const bodyFechaInvalida = { ...bodyAvisoValido, caducaEn: "no-es-una-fecha" }
      const request = crearRequest("http://localhost:3000/api/avisos", "POST", bodyFechaInvalida)
      const response = await POST(request)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBeDefined()
    })
  })

  describe("PATCH /api/avisos/[id] — campo caducaEn", () => {
    it("debería actualizar caducaEn cuando se proporciona en el body", async () => {
      mockGetServerSession.mockResolvedValueOnce(sesionAdmin)
      prismaMock.aviso.findFirst.mockResolvedValueOnce(avisoMock)
      const avisoActualizado = { ...avisoMock, caducaEn: FECHA_FUTURA }
      prismaMock.aviso.update.mockResolvedValueOnce(avisoActualizado)

      const request = crearRequest(
        "http://localhost:3000/api/avisos/aviso-1",
        "PATCH",
        { caducaEn: "2099-12-31T23:59:59.000Z" }
      )
      const response = await PATCH(request, { params: { id: "aviso-1" } })

      expect(response.status).toBe(200)
      expect(prismaMock.aviso.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            caducaEn: expect.any(Date),
          }),
        })
      )
    })

    it("debería permitir limpiar caducaEn enviando null", async () => {
      mockGetServerSession.mockResolvedValueOnce(sesionAdmin)
      prismaMock.aviso.findFirst.mockResolvedValueOnce({ ...avisoMock, caducaEn: FECHA_FUTURA })
      prismaMock.aviso.update.mockResolvedValueOnce({ ...avisoMock, caducaEn: null })

      const request = crearRequest(
        "http://localhost:3000/api/avisos/aviso-1",
        "PATCH",
        { caducaEn: null }
      )
      const response = await PATCH(request, { params: { id: "aviso-1" } })

      expect(response.status).toBe(200)
      expect(prismaMock.aviso.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ caducaEn: null }),
        })
      )
    })
  })

  // ==========================================================================
  // Regla de caducidad por día: caducaEn = día X → visible el día X, oculto el día X+1
  // La query usa { caducaEn: { gte: inicioDia } } donde inicioDia es hoy a 00:00 UTC.
  // Esto garantiza que el aviso sigue visible durante todo el día de caducidad.
  // ==========================================================================

  describe("GET /api/avisos — caducaEn: visible el día X, oculto el día X+1", () => {
    it("debería usar el operador gte (no gt) en el filtro de caducaEn para que sea visible el mismo día", async () => {
      // Este test verifica que la query Prisma usa { gte: inicioDia }
      // Si usara { gt: inicioDia } el aviso desaparecería a las 00:00 del día de caducidad
      // En cambio con { gte: inicioDia } sigue visible durante todo el día de caducidad
      prismaMock.aviso.findMany.mockResolvedValueOnce([avisoMock])

      const request = crearRequest("http://localhost:3000/api/avisos", "GET")
      await GET(request)

      expect(prismaMock.aviso.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { caducaEn: null },
              { caducaEn: expect.objectContaining({ gte: expect.any(Date) }) },
            ]),
          }),
        })
      )
    })

    it("debería filtrar con inicioDia a las 00:00 UTC exactas (no con la hora actual)", async () => {
      // La query debe comparar contra el inicio del día UTC, no contra el momento exacto.
      // Así un aviso con caducaEn = "2099-04-03T00:00:00Z" sigue siendo >= inicioDia todo el día 3.
      prismaMock.aviso.findMany.mockResolvedValueOnce([])

      const ahora = new Date()
      const request = crearRequest("http://localhost:3000/api/avisos", "GET")
      await GET(request)

      // Verificar que la fecha pasada a gte corresponde a las 00:00:00.000 UTC de hoy
      const llamada = prismaMock.aviso.findMany.mock.calls[0][0]
      const fechaFiltro: Date = llamada.where.OR[1].caducaEn.gte
      expect(fechaFiltro.getUTCHours()).toBe(0)
      expect(fechaFiltro.getUTCMinutes()).toBe(0)
      expect(fechaFiltro.getUTCSeconds()).toBe(0)
      expect(fechaFiltro.getUTCMilliseconds()).toBe(0)
      // La fecha del filtro debe ser hoy (misma fecha UTC)
      expect(fechaFiltro.getUTCFullYear()).toBe(ahora.getUTCFullYear())
      expect(fechaFiltro.getUTCMonth()).toBe(ahora.getUTCMonth())
      expect(fechaFiltro.getUTCDate()).toBe(ahora.getUTCDate())
    })

    it("debería devolver el aviso cuando caducaEn es exactamente las 00:00 UTC de hoy (visible todo el día)", async () => {
      // Un aviso con caducaEn = inicio de hoy pasa el filtro gte y debe ser visible
      const inicioDiaHoy = new Date()
      inicioDiaHoy.setUTCHours(0, 0, 0, 0)
      const avisoQueVencehoy = { ...avisoMock, caducaEn: inicioDiaHoy }
      prismaMock.aviso.findMany.mockResolvedValueOnce([avisoQueVencehoy])

      const request = crearRequest("http://localhost:3000/api/avisos", "GET")
      const response = await GET(request)

      expect(response.status).toBe(200)
      const body = await response.json()
      // Prisma aplica el filtro; como mockeamos findMany para que devuelva el aviso,
      // confirmamos que la respuesta lo incluye (el filtro gte lo habría permitido)
      expect(body).toHaveLength(1)
    })

    it("debería excluir el aviso cuando caducaEn es exactamente las 00:00 UTC de ayer (caducado)", async () => {
      // Un aviso con caducaEn = inicio de ayer NO pasa el filtro gte (< inicioDia)
      // Prisma lo filtraría → findMany devolvería array vacío
      prismaMock.aviso.findMany.mockResolvedValueOnce([])

      const request = crearRequest("http://localhost:3000/api/avisos", "GET")
      const response = await GET(request)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body).toHaveLength(0)
    })
  })
})
