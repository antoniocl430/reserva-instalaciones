// Tests del Bloque 7 — Panel Superadmin
// TDD: estos tests se escriben ANTES del codigo de produccion

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

import { getServerSession } from "next-auth"
import { NextRequest } from "next/server"

// Importar handlers (se crearán despues)
import { GET as metricas_GET } from "@/app/api/superadmin/metricas/route"
import {
  GET as tenants_GET,
  POST as tenants_POST,
} from "@/app/api/superadmin/tenants/route"
import { PATCH as tenants_PATCH } from "@/app/api/superadmin/tenants/[id]/route"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SESION_SUPERADMIN = {
  user: { id: "superadmin-id", rol: "SUPERADMIN", tenantId: "tenant-dev" },
}

const SESION_ADMIN = {
  user: { id: "admin-id", rol: "ADMIN", tenantId: "tenant-dev" },
}

const SESION_CIUDADANO = {
  user: { id: "ciudadano-id", rol: "CIUDADANO", tenantId: "tenant-dev" },
}

function crearRequest(url: string, opciones?: { method?: string; body?: string; headers?: Record<string, string> }) {
  return new NextRequest(`http://localhost:3000${url}`, opciones)
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Panel Superadmin — Bloque 7", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prismaMock.$transaction.mockImplementation((fn: any) => fn(prismaMock))
  })

  // ==========================================================================
  // GET /api/superadmin/metricas
  // ==========================================================================

  describe("GET /api/superadmin/metricas", () => {
    it("devuelve 401 si no hay sesion", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce(null)

      const response = await metricas_GET(crearRequest("/api/superadmin/metricas"))
      expect(response.status).toBe(401)
    })

    it("devuelve 401 si el rol es ADMIN (no SUPERADMIN)", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce(SESION_ADMIN)

      const response = await metricas_GET(crearRequest("/api/superadmin/metricas"))
      expect(response.status).toBe(401)
    })

    it("devuelve 401 si el rol es CIUDADANO", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce(SESION_CIUDADANO)

      const response = await metricas_GET(crearRequest("/api/superadmin/metricas"))
      expect(response.status).toBe(401)
    })

    it("devuelve metricas globales con rol SUPERADMIN", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce(SESION_SUPERADMIN)

      // totalTenants
      prismaMock.tenant.count.mockResolvedValueOnce(3)
      // tenantsActivos
      prismaMock.tenant.count.mockResolvedValueOnce(2)
      // totalUsuarios
      prismaMock.usuario.count.mockResolvedValueOnce(50)
      // totalInstalaciones
      prismaMock.instalacion.count.mockResolvedValueOnce(12)
      // totalReservasHoy
      prismaMock.reserva.count.mockResolvedValueOnce(8)

      const response = await metricas_GET(crearRequest("/api/superadmin/metricas"))
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body).toEqual({
        totalTenants: 3,
        tenantsActivos: 2,
        totalUsuarios: 50,
        totalInstalaciones: 12,
        totalReservasHoy: 8,
      })
    })
  })

  // ==========================================================================
  // GET /api/superadmin/tenants
  // ==========================================================================

  describe("GET /api/superadmin/tenants", () => {
    it("devuelve 401 si no es SUPERADMIN", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce(SESION_ADMIN)

      const response = await tenants_GET(crearRequest("/api/superadmin/tenants"))
      expect(response.status).toBe(401)
    })

    it("devuelve lista de tenants con contadores", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce(SESION_SUPERADMIN)

      const tenantsMock = [
        {
          id: "t1",
          slug: "sevilla",
          nombre: "Ayto Sevilla",
          municipio: "Sevilla",
          estado: "ACTIVO",
          creadoEn: new Date("2026-01-01"),
          _count: { usuarios: 10, instalaciones: 3, reservas: 50 },
        },
        {
          id: "t2",
          slug: "malaga",
          nombre: "Ayto Malaga",
          municipio: "Malaga",
          estado: "SUSPENDIDO",
          creadoEn: new Date("2026-02-01"),
          _count: { usuarios: 5, instalaciones: 2, reservas: 20 },
        },
      ]

      prismaMock.tenant.findMany.mockResolvedValueOnce(tenantsMock)

      const response = await tenants_GET(crearRequest("/api/superadmin/tenants"))
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body.tenants).toHaveLength(2)
      expect(body.tenants[0].slug).toBe("sevilla")
      expect(body.tenants[0]._count.usuarios).toBe(10)
      expect(body.tenants[1].estado).toBe("SUSPENDIDO")
    })
  })

  // ==========================================================================
  // POST /api/superadmin/tenants
  // ==========================================================================

  describe("POST /api/superadmin/tenants", () => {
    it("devuelve 401 si no es SUPERADMIN", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce(SESION_ADMIN)

      const response = await tenants_POST(
        crearRequest("/api/superadmin/tenants", {
          method: "POST",
          body: JSON.stringify({
            slug: "nuevo",
            nombre: "Ayto Nuevo",
            municipio: "Nuevo",
            emailAdmin: "admin@nuevo.es",
            passwordAdmin: "Password123!",
          }),
        })
      )
      expect(response.status).toBe(401)
    })

    it("devuelve 400 si faltan campos obligatorios", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce(SESION_SUPERADMIN)

      const response = await tenants_POST(
        crearRequest("/api/superadmin/tenants", {
          method: "POST",
          body: JSON.stringify({ slug: "test" }), // faltan nombre, municipio, emailAdmin, passwordAdmin
        })
      )
      expect(response.status).toBe(400)
    })

    it("devuelve 400 si el slug tiene caracteres invalidos", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce(SESION_SUPERADMIN)

      const response = await tenants_POST(
        crearRequest("/api/superadmin/tenants", {
          method: "POST",
          body: JSON.stringify({
            slug: "MAYUSCULAS no permitidas",
            nombre: "Ayto Test",
            municipio: "Test",
            emailAdmin: "admin@test.es",
            passwordAdmin: "Password123!",
          }),
        })
      )
      expect(response.status).toBe(400)
    })

    it("devuelve 409 si el slug ya existe", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce(SESION_SUPERADMIN)

      prismaMock.tenant.findUnique.mockResolvedValueOnce({
        id: "existente",
        slug: "sevilla",
      })

      const response = await tenants_POST(
        crearRequest("/api/superadmin/tenants", {
          method: "POST",
          body: JSON.stringify({
            slug: "sevilla",
            nombre: "Ayto Sevilla",
            municipio: "Sevilla",
            emailAdmin: "admin@sevilla.es",
            passwordAdmin: "Password123!",
          }),
        })
      )
      expect(response.status).toBe(409)
    })

    it("devuelve 201 con tenant + instalacion + admin creados", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce(SESION_SUPERADMIN)

      // Slug no existe
      prismaMock.tenant.findUnique.mockResolvedValueOnce(null)

      // Tenant creado
      const tenantCreado = {
        id: "nuevo-tenant-id",
        slug: "cordoba",
        nombre: "Ayto Cordoba",
        municipio: "Cordoba",
        estado: "ACTIVO",
        creadoEn: new Date(),
      }
      prismaMock.tenant.create.mockResolvedValueOnce(tenantCreado)

      // Instalacion creada
      const instalacionCreada = {
        id: "inst-id",
        nombre: "Instalacion 1",
        tipo: "PADEL",
        tenantId: "nuevo-tenant-id",
      }
      prismaMock.instalacion.create.mockResolvedValueOnce(instalacionCreada)

      // Admin creado
      const adminCreado = {
        id: "admin-nuevo-id",
        email: "admin@cordoba.es",
        nombre: "Administrador",
        rol: "ADMIN",
        tenantId: "nuevo-tenant-id",
        passwordHash: "$2a$10$hash",
      }
      prismaMock.usuario.create.mockResolvedValueOnce(adminCreado)

      const response = await tenants_POST(
        crearRequest("/api/superadmin/tenants", {
          method: "POST",
          body: JSON.stringify({
            slug: "cordoba",
            nombre: "Ayto Cordoba",
            municipio: "Cordoba",
            emailAdmin: "admin@cordoba.es",
            passwordAdmin: "Password123!",
          }),
        })
      )

      expect(response.status).toBe(201)

      const body = await response.json()
      expect(body.tenant.slug).toBe("cordoba")
      expect(body.instalacion.nombre).toBe("Instalacion 1")
      expect(body.admin.email).toBe("admin@cordoba.es")
      // No debe exponer el password hash
      expect(body.admin.passwordHash).toBeUndefined()
    })

    it("incluye nombreAdmin si se proporciona", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce(SESION_SUPERADMIN)

      prismaMock.tenant.findUnique.mockResolvedValueOnce(null)
      prismaMock.tenant.create.mockResolvedValueOnce({
        id: "t-id",
        slug: "jaen",
        nombre: "Ayto Jaen",
        municipio: "Jaen",
        estado: "ACTIVO",
      })
      prismaMock.instalacion.create.mockResolvedValueOnce({
        id: "i-id",
        nombre: "Instalacion 1",
        tipo: "PADEL",
        tenantId: "t-id",
      })
      prismaMock.usuario.create.mockResolvedValueOnce({
        id: "u-id",
        email: "admin@jaen.es",
        nombre: "Juan Admin",
        rol: "ADMIN",
        tenantId: "t-id",
      })

      const response = await tenants_POST(
        crearRequest("/api/superadmin/tenants", {
          method: "POST",
          body: JSON.stringify({
            slug: "jaen",
            nombre: "Ayto Jaen",
            municipio: "Jaen",
            emailAdmin: "admin@jaen.es",
            passwordAdmin: "Password123!",
            nombreAdmin: "Juan Admin",
          }),
        })
      )

      expect(response.status).toBe(201)
      const body = await response.json()
      expect(body.admin.nombre).toBe("Juan Admin")
    })
  })

  // ==========================================================================
  // PATCH /api/superadmin/tenants/[id]
  // ==========================================================================

  describe("PATCH /api/superadmin/tenants/[id]", () => {
    const params = { params: { id: "tenant-id-1" } }

    it("devuelve 401 si no es SUPERADMIN", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce(SESION_ADMIN)

      const response = await tenants_PATCH(
        crearRequest("/api/superadmin/tenants/tenant-id-1", {
          method: "PATCH",
          body: JSON.stringify({ nombre: "Nuevo nombre" }),
        }),
        params
      )
      expect(response.status).toBe(401)
    })

    it("devuelve 404 si el tenant no existe", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce(SESION_SUPERADMIN)

      prismaMock.tenant.findUnique.mockResolvedValueOnce(null)

      const response = await tenants_PATCH(
        crearRequest("/api/superadmin/tenants/no-existe", {
          method: "PATCH",
          body: JSON.stringify({ nombre: "Nuevo nombre" }),
        }),
        { params: { id: "no-existe" } }
      )
      expect(response.status).toBe(404)
    })

    it("actualiza nombre, municipio y estado del tenant", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce(SESION_SUPERADMIN)

      prismaMock.tenant.findUnique.mockResolvedValueOnce({
        id: "tenant-id-1",
        slug: "sevilla",
        nombre: "Ayto Sevilla",
        municipio: "Sevilla",
        estado: "ACTIVO",
      })

      prismaMock.tenant.update.mockResolvedValueOnce({
        id: "tenant-id-1",
        slug: "sevilla",
        nombre: "Ayuntamiento de Sevilla",
        municipio: "Sevilla Capital",
        estado: "SUSPENDIDO",
      })

      const response = await tenants_PATCH(
        crearRequest("/api/superadmin/tenants/tenant-id-1", {
          method: "PATCH",
          body: JSON.stringify({
            nombre: "Ayuntamiento de Sevilla",
            municipio: "Sevilla Capital",
            estado: "SUSPENDIDO",
          }),
        }),
        params
      )

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.tenant.nombre).toBe("Ayuntamiento de Sevilla")
      expect(body.tenant.estado).toBe("SUSPENDIDO")
    })

    it("no permite cambiar el slug (inmutable)", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce(SESION_SUPERADMIN)

      prismaMock.tenant.findUnique.mockResolvedValueOnce({
        id: "tenant-id-1",
        slug: "sevilla",
        nombre: "Ayto Sevilla",
        municipio: "Sevilla",
        estado: "ACTIVO",
      })

      prismaMock.tenant.update.mockResolvedValueOnce({
        id: "tenant-id-1",
        slug: "sevilla", // slug no cambia
        nombre: "Ayto Sevilla",
        municipio: "Sevilla",
        estado: "ACTIVO",
      })

      const response = await tenants_PATCH(
        crearRequest("/api/superadmin/tenants/tenant-id-1", {
          method: "PATCH",
          body: JSON.stringify({ slug: "otro-slug", nombre: "Ayto Sevilla" }),
        }),
        params
      )

      expect(response.status).toBe(200)
      // Verificar que el update NO recibio slug
      const updateCall = prismaMock.tenant.update.mock.calls[0][0]
      expect(updateCall.data.slug).toBeUndefined()
    })
  })
})
