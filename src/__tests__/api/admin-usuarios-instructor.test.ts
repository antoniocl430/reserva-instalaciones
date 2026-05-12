/**
 * Test: Creación de usuarios INSTRUCTOR en /api/admin/usuarios
 */

// eslint-disable-next-line no-var
var prismaMock: any

jest.mock("@/lib/prisma", () => {
  const { mockDeep } = require("jest-mock-extended")
  prismaMock = mockDeep()
  return { prisma: prismaMock }
})

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}))

import { getServerSession } from "next-auth"
import { NextRequest } from "next/server"
import { POST, GET } from "@/app/api/admin/usuarios/route"

const mockGetServerSession = getServerSession as jest.Mock

const TENANT_ID = "tenant-test"

const sesionAdmin = {
  user: {
    id: "admin-id",
    email: "admin@test.es",
    rol: "ADMIN",
    tenantId: TENANT_ID,
  },
}

describe("POST /api/admin/usuarios — Crear INSTRUCTOR", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetServerSession.mockResolvedValueOnce(sesionAdmin)
  })

  it("debería crear usuario con rol INSTRUCTOR", async () => {
    const usuarioCreado = {
      id: "new-instructor-id",
      nombre: "Juan Instructor",
      email: "juan@test.es",
      rol: "INSTRUCTOR",
      creadoEn: new Date(),
    }

    prismaMock.usuario.findFirst.mockResolvedValueOnce(null)
    prismaMock.usuario.create.mockResolvedValueOnce(usuarioCreado)

    const request = new NextRequest("http://localhost/api/admin/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: "Juan Instructor",
        email: "juan@test.es",
        password: "Password123",
        rol: "INSTRUCTOR",
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data.usuario.rol).toBe("INSTRUCTOR")
  })

  it("debería aceptar rol ADMIN también", async () => {
    const usuarioCreado = {
      id: "new-admin-id",
      nombre: "Carlos Admin",
      email: "carlos@test.es",
      rol: "ADMIN",
      creadoEn: new Date(),
    }

    prismaMock.usuario.findFirst.mockResolvedValueOnce(null)
    prismaMock.usuario.create.mockResolvedValueOnce(usuarioCreado)

    const request = new NextRequest("http://localhost/api/admin/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    const usuarioCreado = {
      id: "new-admin-id",
      nombre: "Default Admin",
      email: "default@test.es",
      rol: "ADMIN",
      creadoEn: new Date(),
    }

    prismaMock.usuario.findFirst.mockResolvedValueOnce(null)
    prismaMock.usuario.create.mockResolvedValueOnce(usuarioCreado)

    const request = new NextRequest("http://localhost/api/admin/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: "Default Admin",
        email: "default@test.es",
        password: "Password123",
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(201)
  })
})

describe("GET /api/admin/usuarios — Listar ambos roles", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetServerSession.mockResolvedValueOnce(sesionAdmin)
  })

  it("debería listar tanto ADMIN como INSTRUCTOR", async () => {
    const usuarios = [
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
    ]

    prismaMock.usuario.findMany.mockResolvedValueOnce(usuarios)

    const request = new NextRequest("http://localhost/api/admin/usuarios", {
      method: "GET",
    })
    const response = await GET(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.usuarios.length).toBe(2)
    expect(data.usuarios.some((u: any) => u.rol === "ADMIN")).toBe(true)
    expect(data.usuarios.some((u: any) => u.rol === "INSTRUCTOR")).toBe(true)
  })
})
