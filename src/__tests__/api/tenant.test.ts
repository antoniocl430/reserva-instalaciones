/**
 * Tests para el helper de tenant — src/lib/tenant.ts
 * TDD: estos tests se escriben ANTES de la implementación (fase RED)
 *
 * Cubre:
 *   - extraerSlugDelHost: extrae el slug del tenant desde el host HTTP
 *   - obtenerTenantIdPorSlug: consulta la BD para obtener el tenantId
 */

// ─── Mock de Prisma ───────────────────────────────────────────────────────────
// eslint-disable-next-line no-var
var prismaMock: any

jest.mock("@/lib/prisma", () => {
  const { mockDeep } = require("jest-mock-extended")
  prismaMock = mockDeep()
  return { prisma: prismaMock }
})

import { extraerSlugDelHost, obtenerTenantIdPorSlug } from "@/lib/tenant"

// ─── extraerSlugDelHost ───────────────────────────────────────────────────────

describe("extraerSlugDelHost", () => {
  it('devuelve "desarrollo" para "localhost:3000"', () => {
    expect(extraerSlugDelHost("localhost:3000")).toBe("desarrollo")
  })

  it('devuelve "desarrollo" para "localhost" sin puerto', () => {
    expect(extraerSlugDelHost("localhost")).toBe("desarrollo")
  })

  it('devuelve "desarrollo" para "127.0.0.1:3000"', () => {
    expect(extraerSlugDelHost("127.0.0.1:3000")).toBe("desarrollo")
  })

  it('devuelve "sevilla" para "reservas.ayto-sevilla.es"', () => {
    expect(extraerSlugDelHost("reservas.ayto-sevilla.es")).toBe("sevilla")
  })

  it('devuelve "malaga" para "reservas.ayto-malaga.es"', () => {
    expect(extraerSlugDelHost("reservas.ayto-malaga.es")).toBe("malaga")
  })

  it('devuelve "granada" para "reservas.ayto-granada.es"', () => {
    expect(extraerSlugDelHost("reservas.ayto-granada.es")).toBe("granada")
  })

  it('devuelve "desarrollo" para hosts no reconocidos', () => {
    expect(extraerSlugDelHost("ejemplo.com")).toBe("desarrollo")
  })

  it('devuelve "desarrollo" para host vacío', () => {
    expect(extraerSlugDelHost("")).toBe("desarrollo")
  })
})

// ─── obtenerTenantIdPorSlug ───────────────────────────────────────────────────

describe("obtenerTenantIdPorSlug", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("devuelve el id correcto para un slug existente con estado ACTIVO", async () => {
    prismaMock.tenant.findFirst.mockResolvedValue({
      id: "tenant-uuid-123",
      slug: "desarrollo",
      estado: "ACTIVO",
    })

    const id = await obtenerTenantIdPorSlug("desarrollo")
    expect(id).toBe("tenant-uuid-123")
  })

  it("devuelve null para un slug que no existe", async () => {
    prismaMock.tenant.findFirst.mockResolvedValue(null)

    const id = await obtenerTenantIdPorSlug("inexistente")
    expect(id).toBeNull()
  })

  it("devuelve null para un tenant con estado SUSPENDIDO", async () => {
    // El helper debe filtrar por estado ACTIVO — un tenant SUSPENDIDO devuelve null
    prismaMock.tenant.findFirst.mockResolvedValue(null)

    const id = await obtenerTenantIdPorSlug("suspendido")
    expect(id).toBeNull()

    // Verificar que la query incluye el filtro de estado ACTIVO
    expect(prismaMock.tenant.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          slug: "suspendido",
          estado: "ACTIVO",
        }),
      })
    )
  })

  it("consulta prisma con el slug y estado ACTIVO correctos", async () => {
    prismaMock.tenant.findFirst.mockResolvedValue({
      id: "tenant-uuid-456",
      slug: "sevilla",
      estado: "ACTIVO",
    })

    await obtenerTenantIdPorSlug("sevilla")

    expect(prismaMock.tenant.findFirst).toHaveBeenCalledWith({
      where: { slug: "sevilla", estado: "ACTIVO" },
      select: { id: true },
    })
  })
})
