/**
 * Tests para los endpoints de /api/admin/festivos
 * TDD: tests escritos ANTES de implementar los endpoints
 *
 * Endpoints cubiertos:
 *   GET    /api/admin/festivos          — solo ADMIN, lista festivos del tenant
 *   POST   /api/admin/festivos          — solo ADMIN, crea festivo
 *   DELETE /api/admin/festivos/[id]     — solo ADMIN, elimina festivo
 *   POST   /api/admin/festivos/importar — solo ADMIN, importa festivos nacionales
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

import { GET, POST } from "@/app/api/admin/festivos/route"
import { DELETE } from "@/app/api/admin/festivos/[id]/route"
import { POST as IMPORTAR } from "@/app/api/admin/festivos/importar/route"

const mockGetServerSession = getServerSession as jest.Mock

const TENANT_ID = "tenant-test"

const sesionAdmin = {
  user: { id: "admin-1", rol: "ADMIN", email: "admin@test.es", tenantId: TENANT_ID },
}
const sesionCiudadano = {
  user: { id: "ciudadano-1", rol: "CIUDADANO", email: "c@test.es", tenantId: TENANT_ID },
}

const festivoMock = {
  id: "festivo-1",
  tenantId: TENANT_ID,
  fecha: new Date("2026-12-25T00:00:00.000Z"),
  nombre: "Navidad",
  repetirAnual: false,
  creadoEn: new Date("2026-01-01T00:00:00.000Z"),
}

function req(url: string, method = "GET", body?: object) {
  return new NextRequest(url, {
    method,
    headers: { "Content-Type": "application/json", "x-tenant-slug": "test" },
    body: body ? JSON.stringify(body) : undefined,
  })
}

// ─── GET /api/admin/festivos ──────────────────────────────────────────────────

describe("GET /api/admin/festivos", () => {
  it("devuelve 401 si no hay sesión", async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await GET(req("http://localhost/api/admin/festivos"))
    expect(res.status).toBe(401)
  })

  it("devuelve 403 si el rol no es ADMIN", async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    const res = await GET(req("http://localhost/api/admin/festivos"))
    expect(res.status).toBe(403)
  })

  it("devuelve la lista de festivos del tenant", async () => {
    mockGetServerSession.mockResolvedValue(sesionAdmin)
    prismaMock.festivo.findMany.mockResolvedValue([festivoMock])

    const res = await GET(req("http://localhost/api/admin/festivos"))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.festivos).toHaveLength(1)
    expect(data.festivos[0].nombre).toBe("Navidad")
  })

  it("filtra por año si se pasa ?año=2026", async () => {
    mockGetServerSession.mockResolvedValue(sesionAdmin)
    prismaMock.festivo.findMany.mockResolvedValue([festivoMock])

    const res = await GET(req("http://localhost/api/admin/festivos?año=2026"))
    expect(res.status).toBe(200)
    expect(prismaMock.festivo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: TENANT_ID }),
      })
    )
  })
})

// ─── POST /api/admin/festivos ─────────────────────────────────────────────────

describe("POST /api/admin/festivos", () => {
  it("devuelve 401 si no hay sesión", async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await POST(req("http://localhost/api/admin/festivos", "POST", { fecha: "2026-12-25", nombre: "Navidad" }))
    expect(res.status).toBe(401)
  })

  it("devuelve 403 si el rol no es ADMIN", async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    const res = await POST(req("http://localhost/api/admin/festivos", "POST", { fecha: "2026-12-25", nombre: "Navidad" }))
    expect(res.status).toBe(403)
  })

  it("devuelve 400 si falta la fecha", async () => {
    mockGetServerSession.mockResolvedValue(sesionAdmin)
    const res = await POST(req("http://localhost/api/admin/festivos", "POST", { nombre: "Navidad" }))
    expect(res.status).toBe(400)
  })

  it("devuelve 400 si falta el nombre", async () => {
    mockGetServerSession.mockResolvedValue(sesionAdmin)
    const res = await POST(req("http://localhost/api/admin/festivos", "POST", { fecha: "2026-12-25" }))
    expect(res.status).toBe(400)
  })

  it("devuelve 400 si la fecha tiene formato inválido", async () => {
    mockGetServerSession.mockResolvedValue(sesionAdmin)
    const res = await POST(req("http://localhost/api/admin/festivos", "POST", { fecha: "25/12/2026", nombre: "Navidad" }))
    expect(res.status).toBe(400)
  })

  it("crea el festivo y devuelve 201", async () => {
    mockGetServerSession.mockResolvedValue(sesionAdmin)
    prismaMock.festivo.create.mockResolvedValue(festivoMock)

    const res = await POST(req("http://localhost/api/admin/festivos", "POST", { fecha: "2026-12-25", nombre: "Navidad" }))
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.festivo.nombre).toBe("Navidad")
  })

  it("devuelve 409 si ya existe un festivo en esa fecha", async () => {
    mockGetServerSession.mockResolvedValue(sesionAdmin)
    const error = new Error("Unique constraint failed")
    ;(error as any).code = "P2002"
    prismaMock.festivo.create.mockRejectedValue(error)

    const res = await POST(req("http://localhost/api/admin/festivos", "POST", { fecha: "2026-12-25", nombre: "Navidad" }))
    expect(res.status).toBe(409)
  })

  it("crea festivo recurrente si repetirAnual es true", async () => {
    mockGetServerSession.mockResolvedValue(sesionAdmin)
    prismaMock.festivo.create.mockResolvedValue({ ...festivoMock, repetirAnual: true })

    const res = await POST(
      req("http://localhost/api/admin/festivos", "POST", { fecha: "2026-12-25", nombre: "Navidad", repetirAnual: true })
    )
    expect(res.status).toBe(201)
    expect(prismaMock.festivo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ repetirAnual: true }),
      })
    )
  })
})

// ─── DELETE /api/admin/festivos/[id] ─────────────────────────────────────────

describe("DELETE /api/admin/festivos/[id]", () => {
  it("devuelve 401 si no hay sesión", async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await DELETE(req("http://localhost/api/admin/festivos/festivo-1", "DELETE"), { params: { id: "festivo-1" } })
    expect(res.status).toBe(401)
  })

  it("devuelve 403 si el rol no es ADMIN", async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    const res = await DELETE(req("http://localhost/api/admin/festivos/festivo-1", "DELETE"), { params: { id: "festivo-1" } })
    expect(res.status).toBe(403)
  })

  it("devuelve 404 si el festivo no existe o es de otro tenant", async () => {
    mockGetServerSession.mockResolvedValue(sesionAdmin)
    prismaMock.festivo.findFirst.mockResolvedValue(null)

    const res = await DELETE(req("http://localhost/api/admin/festivos/no-existe", "DELETE"), { params: { id: "no-existe" } })
    expect(res.status).toBe(404)
  })

  it("elimina el festivo y devuelve 200", async () => {
    mockGetServerSession.mockResolvedValue(sesionAdmin)
    prismaMock.festivo.findFirst.mockResolvedValue(festivoMock)
    prismaMock.festivo.delete.mockResolvedValue(festivoMock)

    const res = await DELETE(req("http://localhost/api/admin/festivos/festivo-1", "DELETE"), { params: { id: "festivo-1" } })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
  })
})

// ─── POST /api/admin/festivos/importar ───────────────────────────────────────

describe("POST /api/admin/festivos/importar", () => {
  it("devuelve 401 si no hay sesión", async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await IMPORTAR(req("http://localhost/api/admin/festivos/importar", "POST", { año: 2026 }))
    expect(res.status).toBe(401)
  })

  it("devuelve 403 si el rol no es ADMIN", async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    const res = await IMPORTAR(req("http://localhost/api/admin/festivos/importar", "POST", { año: 2026 }))
    expect(res.status).toBe(403)
  })

  it("devuelve 400 si no se proporciona año", async () => {
    mockGetServerSession.mockResolvedValue(sesionAdmin)
    const res = await IMPORTAR(req("http://localhost/api/admin/festivos/importar", "POST", {}))
    expect(res.status).toBe(400)
  })

  it("importa los festivos nacionales del año indicado", async () => {
    mockGetServerSession.mockResolvedValue(sesionAdmin)
    prismaMock.festivo.upsert.mockResolvedValue(festivoMock)

    const res = await IMPORTAR(req("http://localhost/api/admin/festivos/importar", "POST", { año: 2026 }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.importados).toBeGreaterThan(0) // 10 festivos (9 fijos + Viernes Santo)
    expect(prismaMock.festivo.upsert).toHaveBeenCalled()
  })
})
