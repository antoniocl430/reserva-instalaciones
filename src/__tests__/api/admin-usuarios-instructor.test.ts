/**
 * Test: Creación de usuarios INSTRUCTOR en /api/admin/usuarios
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { prisma } from "@/lib/prisma"
import { POST, GET } from "@/app/api/admin/usuarios/route"
import { NextRequest } from "next/server"

// Mock de getServerSession
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(async () => ({
    user: {
      id: "admin-id",
      email: "admin@test.es",
      rol: "ADMIN",
      tenantId: "tenant-id",
    },
  })),
}))

// Mock de prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    usuario: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

describe("POST /api/admin/usuarios — Crear INSTRUCTOR", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("debería crear usuario con rol INSTRUCTOR", async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      id: "new-instructor-id",
      nombre: "Juan Instructor",
      email: "juan@test.es",
      rol: "INSTRUCTOR",
      creadoEn: new Date(),
    })

    vi.mocked(prisma.usuario).findFirst.mockResolvedValue(null)
    vi.mocked(prisma.usuario).create = mockCreate

    const request = new NextRequest("http://localhost/api/admin/usuarios", {
      method: "POST",
      body: JSON.stringify({
        nombre: "Juan Instructor",
        email: "juan@test.es",
        password: "Password123",
        rol: "INSTRUCTOR",
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.usuario.rol).toBe("INSTRUCTOR")
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          rol: "INSTRUCTOR",
        }),
      })
    )
  })

  it("debería aceptar rol ADMIN también", async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      id: "new-admin-id",
      nombre: "Carlos Admin",
      email: "carlos@test.es",
      rol: "ADMIN",
      creadoEn: new Date(),
    })

    vi.mocked(prisma.usuario).findFirst.mockResolvedValue(null)
    vi.mocked(prisma.usuario).create = mockCreate

    const request = new NextRequest("http://localhost/api/admin/usuarios", {
      method: "POST",
      body: JSON.stringify({
        nombre: "Carlos Admin",
        email: "carlos@test.es",
        password: "Password123",
        rol: "ADMIN",
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(201)

    const data = await response.json()
    expect(data.usuario.rol).toBe("ADMIN")
  })

  it("debería defaultear a ADMIN si no se especifica rol", async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      id: "new-admin-id",
      nombre: "Default Admin",
      email: "default@test.es",
      rol: "ADMIN",
      creadoEn: new Date(),
    })

    vi.mocked(prisma.usuario).findFirst.mockResolvedValue(null)
    vi.mocked(prisma.usuario).create = mockCreate

    const request = new NextRequest("http://localhost/api/admin/usuarios", {
      method: "POST",
      body: JSON.stringify({
        nombre: "Default Admin",
        email: "default@test.es",
        password: "Password123",
        // NO incluir rol
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(201)
  })
})

describe("GET /api/admin/usuarios — Listar ambos roles", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("debería listar tanto ADMIN como INSTRUCTOR", async () => {
    vi.mocked(prisma.usuario).findMany.mockResolvedValue([
      {
        id: "admin-1",
        nombre: "Admin User",
        email: "admin@test.es",
        rol: "ADMIN",
        creadoEn: new Date(),
      },
      {
        id: "instructor-1",
        nombre: "Instructor User",
        email: "instructor@test.es",
        rol: "INSTRUCTOR",
        creadoEn: new Date(),
      },
    ])

    const request = new NextRequest("http://localhost/api/admin/usuarios")
    const response = await GET(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.usuarios.length).toBe(2)
    expect(data.usuarios.some((u: any) => u.rol === "ADMIN")).toBe(true)
    expect(data.usuarios.some((u: any) => u.rol === "INSTRUCTOR")).toBe(true)
  })
})
