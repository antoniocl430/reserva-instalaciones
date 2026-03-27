/**
 * Tests para los endpoints de /api/admin/configuracion
 * y para los helpers de src/lib/tenant.ts (parsearConfiguracion, mergearConfiguracion)
 *
 * Aplicando TDD estricto: los tests se escriben ANTES de implementar.
 *
 * Endpoints cubiertos:
 *   GET   /api/admin/configuracion  — solo ADMIN, devuelve configuración del tenant
 *   PATCH /api/admin/configuracion  — solo ADMIN, actualiza con merge profundo
 *
 * Helpers cubiertos:
 *   parsearConfiguracion  — parsea JSON seguro desde el campo configuracion del Tenant
 *   mergearConfiguracion  — merge profundo de dos objetos ConfiguracionTenant
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

import { getServerSession } from "next-auth"
import { NextRequest } from "next/server"

import { GET, PATCH } from "@/app/api/admin/configuracion/route"
import { parsearConfiguracion, mergearConfiguracion } from "@/lib/tenant"

const mockGetServerSession = getServerSession as jest.Mock

// ─── Constantes de prueba ──────────────────────────────────────────────────────

const TENANT_ID = "tenant-test-001"

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

const tenantMock = {
  id: TENANT_ID,
  slug: "desarrollo",
  nombre: "Ayuntamiento de Desarrollo",
  municipio: "Desarrollo",
  logoUrl: null,
  configuracion: JSON.stringify({
    nombreServicio: "Reservas Deportivas",
    colores: {
      primario: "#2563eb",
      secundario: "#16a34a",
    },
    metadata: {
      title: "Reservas Deportivas — Desarrollo",
      description: "Sistema de reservas municipal",
    },
  }),
  estado: "ACTIVO",
  creadoEn: new Date("2026-01-01T00:00:00.000Z"),
  actualizadoEn: new Date("2026-03-01T00:00:00.000Z"),
}

// Helper para construir una NextRequest de prueba
function crearRequest(metodo: string, body?: object): NextRequest {
  return new NextRequest("http://localhost:3000/api/admin/configuracion", {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  })
}

// ─── GET /api/admin/configuracion ─────────────────────────────────────────────

describe("GET /api/admin/configuracion", () => {
  it("devuelve 401 sin sesión", async () => {
    mockGetServerSession.mockResolvedValueOnce(null)
    const req = crearRequest("GET")
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it("devuelve 403 con rol CIUDADANO", async () => {
    mockGetServerSession.mockResolvedValueOnce(sesionCiudadano)
    const req = crearRequest("GET")
    const res = await GET(req)
    expect(res.status).toBe(403)
  })

  it("devuelve la configuración del tenant del admin autenticado", async () => {
    mockGetServerSession.mockResolvedValueOnce(sesionAdmin)
    prismaMock.tenant.findUnique.mockResolvedValueOnce(tenantMock)

    const req = crearRequest("GET")
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.id).toBe(TENANT_ID)
    expect(json.slug).toBe("desarrollo")
    expect(json.nombre).toBe("Ayuntamiento de Desarrollo")
    expect(json.municipio).toBe("Desarrollo")
    expect(json.estado).toBe("ACTIVO")
    // La configuracion debe ser objeto parseado, no string
    expect(typeof json.configuracion).toBe("object")
    expect(json.configuracion.nombreServicio).toBe("Reservas Deportivas")
    expect(json.configuracion.colores.primario).toBe("#2563eb")
  })

  it("devuelve configuracion con valores por defecto si el campo es null", async () => {
    mockGetServerSession.mockResolvedValueOnce(sesionAdmin)
    prismaMock.tenant.findUnique.mockResolvedValueOnce({
      ...tenantMock,
      configuracion: null,
    })

    const req = crearRequest("GET")
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    // Configuracion vacía devuelve objeto, no null
    expect(typeof json.configuracion).toBe("object")
    expect(json.configuracion).not.toBeNull()
  })

  it("devuelve 500 si el tenant no se encuentra en BD", async () => {
    mockGetServerSession.mockResolvedValueOnce(sesionAdmin)
    prismaMock.tenant.findUnique.mockResolvedValueOnce(null)

    const req = crearRequest("GET")
    const res = await GET(req)
    expect(res.status).toBe(500)
  })
})

// ─── PATCH /api/admin/configuracion ───────────────────────────────────────────

describe("PATCH /api/admin/configuracion", () => {
  it("devuelve 401 sin sesión", async () => {
    mockGetServerSession.mockResolvedValueOnce(null)
    const req = crearRequest("PATCH", { nombre: "Nuevo Nombre" })
    const res = await PATCH(req)
    expect(res.status).toBe(401)
  })

  it("devuelve 403 con rol CIUDADANO", async () => {
    mockGetServerSession.mockResolvedValueOnce(sesionCiudadano)
    const req = crearRequest("PATCH", { nombre: "Nuevo Nombre" })
    const res = await PATCH(req)
    expect(res.status).toBe(403)
  })

  it("actualiza el nombre del municipio correctamente", async () => {
    mockGetServerSession.mockResolvedValueOnce(sesionAdmin)
    // Primera llamada: obtener tenant actual
    prismaMock.tenant.findUnique.mockResolvedValueOnce(tenantMock)
    // Segunda llamada: update devuelve tenant actualizado
    const tenantActualizado = { ...tenantMock, municipio: "Sevilla", nombre: "Ayuntamiento de Sevilla" }
    prismaMock.tenant.update.mockResolvedValueOnce(tenantActualizado)

    const req = crearRequest("PATCH", {
      nombre: "Ayuntamiento de Sevilla",
      municipio: "Sevilla",
    })
    const res = await PATCH(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.municipio).toBe("Sevilla")
    expect(json.nombre).toBe("Ayuntamiento de Sevilla")
  })

  it("hace merge de colores sin perder los existentes", async () => {
    mockGetServerSession.mockResolvedValueOnce(sesionAdmin)
    prismaMock.tenant.findUnique.mockResolvedValueOnce(tenantMock)

    // El update debe llamarse con la configuracion mergeada
    const tenantActualizado = {
      ...tenantMock,
      configuracion: JSON.stringify({
        nombreServicio: "Reservas Deportivas",
        colores: {
          primario: "#cc0000",      // actualizado
          secundario: "#16a34a",   // conservado del original
        },
        metadata: {
          title: "Reservas Deportivas — Desarrollo",
          description: "Sistema de reservas municipal",
        },
      }),
    }
    prismaMock.tenant.update.mockResolvedValueOnce(tenantActualizado)

    const req = crearRequest("PATCH", {
      configuracion: {
        colores: { primario: "#cc0000" },
      },
    })
    const res = await PATCH(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    // El color secundario debe conservarse
    expect(json.configuracion.colores.secundario).toBe("#16a34a")
    // El color primario debe actualizarse
    expect(json.configuracion.colores.primario).toBe("#cc0000")
  })

  it("devuelve 400 con color hex inválido", async () => {
    mockGetServerSession.mockResolvedValueOnce(sesionAdmin)
    const req = crearRequest("PATCH", {
      configuracion: {
        colores: { primario: "rojo" },
      },
    })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
  })

  it("devuelve 400 con logoUrl inválida", async () => {
    mockGetServerSession.mockResolvedValueOnce(sesionAdmin)
    const req = crearRequest("PATCH", {
      logoUrl: "esto-no-es-una-url",
    })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
  })

  it("no puede cambiar el slug ni el estado", async () => {
    mockGetServerSession.mockResolvedValueOnce(sesionAdmin)
    prismaMock.tenant.findUnique.mockResolvedValueOnce(tenantMock)
    prismaMock.tenant.update.mockResolvedValueOnce(tenantMock)

    const req = crearRequest("PATCH", {
      // slug y estado no están en el schema de actualización
      nombre: "Nombre Valido",
    })
    const res = await PATCH(req)

    // Verificar que el update NO incluye slug ni estado
    const llamadaUpdate = prismaMock.tenant.update.mock.calls[0]?.[0]
    expect(llamadaUpdate?.data?.slug).toBeUndefined()
    expect(llamadaUpdate?.data?.estado).toBeUndefined()

    expect(res.status).toBe(200)
  })
})

// ─── parsearConfiguracion ─────────────────────────────────────────────────────

describe("parsearConfiguracion", () => {
  it("devuelve objeto vacío para null", () => {
    const resultado = parsearConfiguracion(null)
    expect(resultado).toEqual({})
  })

  it("parsea JSON válido correctamente", () => {
    const config = {
      nombreServicio: "Reservas",
      colores: { primario: "#2563eb" },
    }
    const resultado = parsearConfiguracion(JSON.stringify(config))
    expect(resultado).toEqual(config)
  })

  it("devuelve objeto vacío para JSON malformado (nunca rompe)", () => {
    const resultado = parsearConfiguracion("{ esto no es json válido")
    expect(resultado).toEqual({})
  })
})

// ─── mergearConfiguracion ─────────────────────────────────────────────────────

describe("mergearConfiguracion", () => {
  it("mantiene claves existentes al hacer merge parcial", () => {
    const base = {
      nombreServicio: "Reservas Deportivas",
      colores: { primario: "#2563eb", secundario: "#16a34a" },
      metadata: { title: "Titulo Base", description: "Descripcion base" },
    }
    const override = {
      colores: { primario: "#cc0000" },
    }
    const resultado = mergearConfiguracion(base, override)
    // El secundario debe conservarse
    expect(resultado.colores?.secundario).toBe("#16a34a")
    // El titulo de metadata debe conservarse
    expect(resultado.metadata?.title).toBe("Titulo Base")
    // El nombreServicio debe conservarse
    expect(resultado.nombreServicio).toBe("Reservas Deportivas")
  })

  it("sobreescribe claves que llegan en el override", () => {
    const base = {
      nombreServicio: "Reservas Deportivas",
      colores: { primario: "#2563eb", secundario: "#16a34a" },
    }
    const override = {
      nombreServicio: "Reservas Sevilla",
      colores: { primario: "#cc0000" },
    }
    const resultado = mergearConfiguracion(base, override)
    expect(resultado.nombreServicio).toBe("Reservas Sevilla")
    expect(resultado.colores?.primario).toBe("#cc0000")
  })
})
