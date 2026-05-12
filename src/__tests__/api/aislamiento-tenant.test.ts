/**
 * Tests de aislamiento entre tenants — Fase 4 Bloque 5
 *
 * Verifica que NINGUNA API Route devuelve datos de un tenant distinto al del request.
 * Aplica el patrón TDD: estos tests se escriben antes de que las rutas filtren por tenantId.
 *
 * Tenants simulados:
 *   - TENANT_A_ID: "tenant-ayto-a"  (el tenant del request)
 *   - TENANT_B_ID: "tenant-ayto-b"  (otro tenant, cuyos datos NO deben aparecer)
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

jest.mock("@/lib/email", () => ({
  enviarEmailReserva: jest.fn().mockResolvedValue(undefined),
  enviarEmailCancelacion: jest.fn().mockResolvedValue(undefined),
  enviarEmailRecuperacion: jest.fn().mockResolvedValue(undefined),
}))

// El middleware inyecta x-tenant-slug (no x-tenant-id). Mapeamos dos slugs a dos tenants distintos.
jest.mock("@/lib/tenant", () => ({
  obtenerTenantIdPorSlug: jest.fn().mockImplementation((slug: string) => {
    if (slug === "slug-a") return Promise.resolve("tenant-ayto-a")
    if (slug === "slug-b") return Promise.resolve("tenant-ayto-b")
    return Promise.resolve(null)
  }),
  extraerSlugDelHost: jest.fn().mockReturnValue("slug-a"),
}))

import { getServerSession } from "next-auth"
import { NextRequest } from "next/server"

import { GET as instalaciones_GET } from "@/app/api/instalaciones/route"
import { GET as avisos_GET } from "@/app/api/avisos/route"
import { PATCH, DELETE } from "@/app/api/avisos/[id]/route"
import { GET as mis_reservas_GET } from "@/app/api/reservas/mis-reservas/route"
import { PATCH as cancelar_PATCH } from "@/app/api/reservas/[id]/cancelar/route"
import { GET as admin_reservas_GET } from "@/app/api/admin/reservas/route"
import { GET as admin_metricas_GET } from "@/app/api/admin/metricas/route"

const mockGetServerSession = getServerSession as jest.Mock

// ─── IDs de tenants de prueba ─────────────────────────────────────────────────

const TENANT_A_ID = "tenant-ayto-a"
const TENANT_B_ID = "tenant-ayto-b"

// ─── Sesiones simuladas ───────────────────────────────────────────────────────

const sesionAdminTenantA = {
  user: {
    id: "admin-a",
    rol: "ADMIN",
    email: "admin@ayto-a.es",
    tenantId: TENANT_A_ID,
  },
}

const sesionCiudadanoTenantA = {
  user: {
    id: "ciudadano-a",
    rol: "CIUDADANO",
    email: "ciudadano@ayto-a.es",
    tenantId: TENANT_A_ID,
  },
}

// ─── Datos de prueba de distintos tenants ─────────────────────────────────────

const instalacionTenantA = {
  id: "inst-a-1",
  tenantId: TENANT_A_ID,
  nombre: "Pádel Tenant A",
  tipo: "PADEL",
  descripcion: null,
  horario: "Lun-Dom: 8:00-22:00",
  activa: true,
}

const instalacionTenantB = {
  id: "inst-b-1",
  tenantId: TENANT_B_ID,
  nombre: "Pádel Tenant B",
  tipo: "PADEL",
  descripcion: null,
  horario: "Lun-Dom: 8:00-22:00",
  activa: true,
}

const avisoTenantA = {
  id: "aviso-a-1",
  tenantId: TENANT_A_ID,
  titulo: "Aviso Tenant A",
  descripcion: "Descripción A",
  tipo: "INFO",
  fecha: new Date("2026-03-01"),
  activo: true,
}

const avisoTenantB = {
  id: "aviso-b-1",
  tenantId: TENANT_B_ID,
  titulo: "Aviso Tenant B",
  descripcion: "Descripción B",
  tipo: "INFO",
  fecha: new Date("2026-03-01"),
  activo: true,
}

const reservaTenantA = {
  id: "res-a-1",
  tenantId: TENANT_A_ID,
  usuarioId: "ciudadano-a",
  instalacionId: "inst-a-1",
  fecha: new Date("2099-12-30T00:00:00.000Z"),
  horaInicio: new Date("2099-12-30T09:00:00.000Z"),
  horaFin: new Date("2099-12-30T10:15:00.000Z"),
  estado: "ACTIVA",
  creadoEn: new Date(),
  canceladoEn: null,
  canceladoPor: null,
  instalacion: { id: "inst-a-1", nombre: "Pádel Tenant A" },
  usuario: { nombre: "Ciudadano A", email: "ciudadano@ayto-a.es" },
}

const reservaTenantB = {
  id: "res-b-1",
  tenantId: TENANT_B_ID,
  usuarioId: "ciudadano-b",
  instalacionId: "inst-b-1",
  fecha: new Date("2099-12-30T00:00:00.000Z"),
  horaInicio: new Date("2099-12-30T09:00:00.000Z"),
  horaFin: new Date("2099-12-30T10:15:00.000Z"),
  estado: "ACTIVA",
  creadoEn: new Date(),
  canceladoEn: null,
  canceladoPor: null,
  instalacion: { id: "inst-b-1", nombre: "Pádel Tenant B" },
  usuario: { nombre: "Ciudadano B", email: "ciudadano@ayto-b.es" },
}

// ─── Suite principal ──────────────────────────────────────────────────────────

describe("Aislamiento entre tenants", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prismaMock.$transaction.mockImplementation((fn: any) => fn(prismaMock))
    // Mockear usuario.findMany para notificaciones de admins (Bloque 8)
    prismaMock.usuario.findMany.mockResolvedValue([])
  })

  // ── 1. GET /api/instalaciones ───────────────────────────────────────────────

  describe("GET /api/instalaciones", () => {
    it("solo devuelve instalaciones del tenant del request (x-tenant-slug header)", async () => {
      // Solo instalaciones del tenant A deben devolverse cuando el slug apunta a A
      prismaMock.instalacion.findMany.mockResolvedValueOnce([instalacionTenantA])

      const request = new NextRequest("http://localhost:3000/api/instalaciones", {
        headers: { "x-tenant-slug": "slug-a" },
      })
      const response = await instalaciones_GET(request)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.instalaciones).toHaveLength(1)
      expect(body.instalaciones[0].tenantId).toBe(TENANT_A_ID)

      // Verificar que la query filtra por tenantId
      expect(prismaMock.instalacion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT_A_ID }),
        })
      )
    })

    it("no devuelve instalaciones de otro tenant aunque existan en la BD", async () => {
      // La ruta debe filtrar — la BD solo devuelve lo que se le pide
      prismaMock.instalacion.findMany.mockResolvedValueOnce([])

      const request = new NextRequest("http://localhost:3000/api/instalaciones", {
        headers: { "x-tenant-slug": "slug-a" },
      })
      const response = await instalaciones_GET(request)
      const body = await response.json()

      expect(response.status).toBe(200)
      // La query incluye tenantId — el mock devuelve vacío porque no hay datos del tenant A
      const llamada = prismaMock.instalacion.findMany.mock.calls[0][0]
      expect(llamada.where).toMatchObject({ tenantId: TENANT_A_ID })
      expect(body.instalaciones).toHaveLength(0)
    })
  })

  // ── 2. GET /api/avisos ──────────────────────────────────────────────────────

  describe("GET /api/avisos", () => {
    it("solo devuelve avisos del tenant del request", async () => {
      prismaMock.aviso.findMany.mockResolvedValueOnce([avisoTenantA])

      const request = new NextRequest("http://localhost:3000/api/avisos", {
        headers: { "x-tenant-slug": "slug-a" },
      })
      const response = await avisos_GET(request)
      const body = await response.json()

      expect(response.status).toBe(200)
      // Verificar que la query filtra por tenantId
      expect(prismaMock.aviso.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT_A_ID }),
        })
      )
    })

    it("no incluye avisos de otro tenant en la respuesta", async () => {
      // Si la ruta filtra correctamente, solo llega lo del tenant A
      prismaMock.aviso.findMany.mockResolvedValueOnce([avisoTenantA])

      const request = new NextRequest("http://localhost:3000/api/avisos", {
        headers: { "x-tenant-slug": "slug-a" },
      })
      const response = await avisos_GET(request)
      const body = await response.json()

      // Ningún aviso del tenant B debe estar en la respuesta
      const tieneAvisoB = body.some((a: any) => a.tenantId === TENANT_B_ID)
      expect(tieneAvisoB).toBe(false)
    })
  })

  // ── 3. GET /api/reservas/mis-reservas ──────────────────────────────────────

  describe("GET /api/reservas/mis-reservas", () => {
    it("solo devuelve reservas del usuario en su propio tenant", async () => {
      mockGetServerSession.mockResolvedValueOnce(sesionCiudadanoTenantA)
      prismaMock.reserva.findMany
        .mockResolvedValueOnce([reservaTenantA])
        .mockResolvedValueOnce([])

      const response = await mis_reservas_GET()
      const body = await response.json()

      expect(response.status).toBe(200)

      // Las queries deben filtrar por tenantId Y usuarioId
      const llamadas = prismaMock.reserva.findMany.mock.calls
      llamadas.forEach((llamada: any[]) => {
        expect(llamada[0].where).toMatchObject({
          usuarioId: sesionCiudadanoTenantA.user.id,
          tenantId: TENANT_A_ID,
        })
      })
    })

    it("no devuelve reservas de otro tenant aunque compartan userId", async () => {
      mockGetServerSession.mockResolvedValueOnce(sesionCiudadanoTenantA)
      // La query filtra por tenantId, así que la BD nunca devuelve datos del tenant B
      prismaMock.reserva.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])

      const response = await mis_reservas_GET()
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.activas).toHaveLength(0)
      expect(body.historial).toHaveLength(0)
    })
  })

  // ── 4. PATCH /api/reservas/[id]/cancelar ───────────────────────────────────

  describe("PATCH /api/reservas/[id]/cancelar", () => {
    it("devuelve 404 si la reserva pertenece a otro tenant", async () => {
      mockGetServerSession.mockResolvedValueOnce(sesionCiudadanoTenantA)

      // La búsqueda con { id, tenantId } no encuentra nada porque la reserva es del tenant B
      prismaMock.reserva.findFirst.mockResolvedValueOnce(null)

      const request = new NextRequest(
        "http://localhost:3000/api/reservas/res-b-1/cancelar",
        { method: "PATCH" }
      )
      const response = await cancelar_PATCH(request, { params: { id: "res-b-1" } })

      expect(response.status).toBe(404)
      const body = await response.json()
      expect(body.error).toContain("no encontrada")
    })

    it("cancela correctamente una reserva del propio tenant", async () => {
      mockGetServerSession.mockResolvedValueOnce(sesionCiudadanoTenantA)

      // findFirst con { id, tenantId } encuentra la reserva del tenant A
      prismaMock.reserva.findFirst.mockResolvedValueOnce({
        ...reservaTenantA,
        tenantId: TENANT_A_ID,
      })
      prismaMock.reserva.update.mockResolvedValueOnce({ ...reservaTenantA, estado: "CANCELADA" })

      const request = new NextRequest(
        "http://localhost:3000/api/reservas/res-a-1/cancelar",
        { method: "PATCH" }
      )
      const response = await cancelar_PATCH(request, { params: { id: "res-a-1" } })

      expect(response.status).toBe(200)
    })
  })

  // ── 5. GET /api/admin/reservas ─────────────────────────────────────────────

  describe("GET /api/admin/reservas", () => {
    it("solo devuelve reservas del tenant del admin autenticado", async () => {
      mockGetServerSession.mockResolvedValueOnce(sesionAdminTenantA)
      prismaMock.reserva.findMany.mockResolvedValueOnce([reservaTenantA])

      const request = new NextRequest("http://localhost:3000/api/admin/reservas")
      const response = await admin_reservas_GET(request)
      const body = await response.json()

      expect(response.status).toBe(200)
      // La query debe filtrar por tenantId del admin
      expect(prismaMock.reserva.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT_A_ID }),
        })
      )
    })

    it("no incluye reservas de otro tenant en la respuesta", async () => {
      mockGetServerSession.mockResolvedValueOnce(sesionAdminTenantA)
      // La BD solo devuelve las del tenant A porque la query filtra
      prismaMock.reserva.findMany.mockResolvedValueOnce([reservaTenantA])

      const request = new NextRequest("http://localhost:3000/api/admin/reservas")
      const response = await admin_reservas_GET(request)
      const body = await response.json()

      const tieneReservaB = body.reservas.some((r: any) => r.tenantId === TENANT_B_ID)
      expect(tieneReservaB).toBe(false)
    })
  })

  // ── 6. GET /api/admin/metricas ─────────────────────────────────────────────

  describe("GET /api/admin/metricas", () => {
    it("solo cuenta registros del tenant del admin autenticado", async () => {
      mockGetServerSession.mockResolvedValueOnce(sesionAdminTenantA)
      prismaMock.reserva.count.mockResolvedValue(3)
      prismaMock.instalacion.count.mockResolvedValue(2)

      const request = new NextRequest("http://localhost:3000/api/admin/metricas")
      const response = await admin_metricas_GET(request)

      expect(response.status).toBe(200)

      // Todas las llamadas a count deben incluir tenantId
      const llamadasCount = prismaMock.reserva.count.mock.calls
      llamadasCount.forEach((llamada: any[]) => {
        expect(llamada[0].where).toMatchObject({ tenantId: TENANT_A_ID })
      })

      const llamadasInstalacion = prismaMock.instalacion.count.mock.calls
      llamadasInstalacion.forEach((llamada: any[]) => {
        expect(llamada[0].where).toMatchObject({ tenantId: TENANT_A_ID })
      })
    })
  })

  // ── 7. PATCH /api/avisos/[id] ──────────────────────────────────────────────

  describe("PATCH /api/avisos/[id]", () => {
    it("devuelve 404 si el aviso pertenece a otro tenant", async () => {
      mockGetServerSession.mockResolvedValueOnce(sesionAdminTenantA)

      // findFirst con { id, tenantId } no encuentra el aviso del tenant B
      prismaMock.aviso.findFirst.mockResolvedValueOnce(null)

      const request = new NextRequest("http://localhost:3000/api/avisos/aviso-b-1", {
        method: "PATCH",
        body: JSON.stringify({ titulo: "Nuevo título", tipo: "INFO" }),
        headers: { "Content-Type": "application/json" },
      })
      const response = await PATCH(request, { params: { id: "aviso-b-1" } })

      expect(response.status).toBe(404)
      const body = await response.json()
      expect(body.error).toContain("no encontrado")
    })

    it("actualiza correctamente un aviso del propio tenant", async () => {
      mockGetServerSession.mockResolvedValueOnce(sesionAdminTenantA)

      // findFirst con { id, tenantId } encuentra el aviso del tenant A
      prismaMock.aviso.findFirst.mockResolvedValueOnce(avisoTenantA)
      prismaMock.aviso.update.mockResolvedValueOnce({
        ...avisoTenantA,
        titulo: "Título actualizado",
      })

      const request = new NextRequest("http://localhost:3000/api/avisos/aviso-a-1", {
        method: "PATCH",
        body: JSON.stringify({ titulo: "Título actualizado", tipo: "INFO" }),
        headers: { "Content-Type": "application/json" },
      })
      const response = await PATCH(request, { params: { id: "aviso-a-1" } })

      expect(response.status).toBe(200)
    })
  })

  // ── 8. DELETE /api/avisos/[id] ─────────────────────────────────────────────

  describe("DELETE /api/avisos/[id]", () => {
    it("devuelve 404 si el aviso pertenece a otro tenant", async () => {
      mockGetServerSession.mockResolvedValueOnce(sesionAdminTenantA)

      // findFirst con { id, tenantId } no encuentra el aviso del tenant B
      prismaMock.aviso.findFirst.mockResolvedValueOnce(null)

      const request = new NextRequest("http://localhost:3000/api/avisos/aviso-b-1", {
        method: "DELETE",
      })
      const response = await DELETE(request, { params: { id: "aviso-b-1" } })

      expect(response.status).toBe(404)
      const body = await response.json()
      expect(body.error).toContain("no encontrado")
    })

    it("desactiva correctamente un aviso del propio tenant", async () => {
      mockGetServerSession.mockResolvedValueOnce(sesionAdminTenantA)

      // findFirst con { id, tenantId } encuentra el aviso del tenant A
      prismaMock.aviso.findFirst.mockResolvedValueOnce(avisoTenantA)
      prismaMock.aviso.update.mockResolvedValueOnce({ ...avisoTenantA, activo: false })

      const request = new NextRequest("http://localhost:3000/api/avisos/aviso-a-1", {
        method: "DELETE",
      })
      const response = await DELETE(request, { params: { id: "aviso-a-1" } })

      expect(response.status).toBe(200)
    })
  })
})
