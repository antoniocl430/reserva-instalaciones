/**
 * Tests para los endpoints de /api/admin/comunicados
 * TDD: tests escritos ANTES de implementar los endpoints
 *
 * Endpoints cubiertos:
 *   GET  /api/admin/comunicados — admin, lista de comunicados del tenant ordenados por enviadoEn desc
 *   POST /api/admin/comunicados — admin, crear y enviar comunicado masivo
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

jest.mock("@/lib/auth", () => ({
  opcionesAuth: {},
}))

jest.mock("@/lib/email", () => ({
  enviarEmailComunicadoMasivo: jest.fn().mockResolvedValue(3),
}))

jest.mock("@/lib/push", () => ({
  enviarPushComunicadoMasivo: jest.fn().mockResolvedValue(5),
}))

jest.mock("web-push", () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn().mockResolvedValue({ statusCode: 201 }),
}))

import { getServerSession } from "next-auth"
import { NextRequest } from "next/server"
import { enviarEmailComunicadoMasivo } from "@/lib/email"
import { enviarPushComunicadoMasivo } from "@/lib/push"

import { GET, POST } from "@/app/api/admin/comunicados/route"

const mockGetServerSession = getServerSession as jest.Mock
const mockEnviarEmail = enviarEmailComunicadoMasivo as jest.Mock
const mockEnviarPush = enviarPushComunicadoMasivo as jest.Mock

const TENANT_ID = "tenant-test"

const sesionAdmin = {
  user: { id: "admin-1", rol: "ADMIN", tenantId: TENANT_ID },
}
const sesionCiudadano = {
  user: { id: "ciudadano-1", rol: "CIUDADANO", tenantId: TENANT_ID },
}

const comunicadoMock = {
  id: "comunicado-1",
  tenantId: TENANT_ID,
  titulo: "Aviso importante",
  cuerpo: "Las pistas estarán cerradas el lunes.",
  canal: "EMAIL",
  enviadoEn: new Date("2026-05-14T10:00:00.000Z"),
}

function req(url: string, method = "GET", body?: object) {
  return new NextRequest(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  })
}

// ─── GET /api/admin/comunicados ───────────────────────────────────────────────

describe("GET /api/admin/comunicados", () => {
  beforeEach(() => jest.resetAllMocks())

  it("devuelve 401 si no hay sesión", async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await GET(req("http://localhost/api/admin/comunicados"))
    expect(res.status).toBe(401)
  })

  it("devuelve 403 si el rol no es ADMIN", async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    const res = await GET(req("http://localhost/api/admin/comunicados"))
    expect(res.status).toBe(403)
  })

  it("devuelve la lista de comunicados del tenant ordenados por enviadoEn desc", async () => {
    mockGetServerSession.mockResolvedValue(sesionAdmin)
    prismaMock.comunicado.findMany.mockResolvedValue([comunicadoMock])

    const res = await GET(req("http://localhost/api/admin/comunicados"))
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.comunicados).toHaveLength(1)
    expect(data.comunicados[0].id).toBe("comunicado-1")

    // Verificar que se filtra por tenantId y se ordena correctamente
    expect(prismaMock.comunicado.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TENANT_ID },
        orderBy: { enviadoEn: "desc" },
      })
    )
  })
})

// ─── POST /api/admin/comunicados ──────────────────────────────────────────────

describe("POST /api/admin/comunicados", () => {
  beforeEach(() => jest.resetAllMocks())

  it("devuelve 401 si no hay sesión", async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await POST(req("http://localhost/api/admin/comunicados", "POST", {
      titulo: "Aviso",
      cuerpo: "Texto",
      canal: "EMAIL",
    }))
    expect(res.status).toBe(401)
  })

  it("devuelve 403 si el rol no es ADMIN", async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    const res = await POST(req("http://localhost/api/admin/comunicados", "POST", {
      titulo: "Aviso",
      cuerpo: "Texto",
      canal: "EMAIL",
    }))
    expect(res.status).toBe(403)
  })

  it("devuelve 400 si faltan campos requeridos", async () => {
    mockGetServerSession.mockResolvedValue(sesionAdmin)
    const res = await POST(req("http://localhost/api/admin/comunicados", "POST", {
      // titulo falta
      cuerpo: "Texto",
      canal: "EMAIL",
    }))
    expect(res.status).toBe(400)
  })

  it("devuelve 400 si el canal no es válido", async () => {
    mockGetServerSession.mockResolvedValue(sesionAdmin)
    const res = await POST(req("http://localhost/api/admin/comunicados", "POST", {
      titulo: "Aviso",
      cuerpo: "Texto",
      canal: "SMS",
    }))
    expect(res.status).toBe(400)
  })

  it("con canal EMAIL: llama a enviarEmailComunicadoMasivo y no a push", async () => {
    mockGetServerSession.mockResolvedValue(sesionAdmin)
    prismaMock.tenant.findUnique.mockResolvedValue({ nombre: "Ayuntamiento de Sevilla" })
    prismaMock.usuario.findMany.mockResolvedValue([
      { email: "c1@test.es", preferenciaNotificaciones: [] },
      { email: "c2@test.es", preferenciaNotificaciones: [] },
    ])
    prismaMock.comunicado.create.mockResolvedValue({ ...comunicadoMock, canal: "EMAIL" })

    mockEnviarEmail.mockResolvedValue(2)

    const res = await POST(req("http://localhost/api/admin/comunicados", "POST", {
      titulo: "Aviso importante",
      cuerpo: "Las pistas estarán cerradas el lunes.",
      canal: "EMAIL",
    }))

    expect(res.status).toBe(201)
    expect(mockEnviarEmail).toHaveBeenCalledTimes(1)
    expect(mockEnviarPush).not.toHaveBeenCalled()

    const data = await res.json()
    expect(data.comunicado).toBeDefined()
    expect(data.enviados.email).toBe(2)
    expect(data.enviados.push).toBe(0)
  })

  it("con canal PUSH: llama a enviarPushComunicadoMasivo y no a email", async () => {
    mockGetServerSession.mockResolvedValue(sesionAdmin)
    prismaMock.tenant.findUnique.mockResolvedValue({ nombre: "Ayuntamiento de Sevilla" })
    prismaMock.comunicado.create.mockResolvedValue({ ...comunicadoMock, canal: "PUSH" })

    mockEnviarPush.mockResolvedValue(5)

    const res = await POST(req("http://localhost/api/admin/comunicados", "POST", {
      titulo: "Aviso importante",
      cuerpo: "Las pistas estarán cerradas el lunes.",
      canal: "PUSH",
    }))

    expect(res.status).toBe(201)
    expect(mockEnviarPush).toHaveBeenCalledTimes(1)
    expect(mockEnviarEmail).not.toHaveBeenCalled()

    const data = await res.json()
    expect(data.enviados.push).toBe(5)
    expect(data.enviados.email).toBe(0)
  })

  it("con canal AMBOS: llama a ambas funciones", async () => {
    mockGetServerSession.mockResolvedValue(sesionAdmin)
    prismaMock.tenant.findUnique.mockResolvedValue({ nombre: "Ayuntamiento de Sevilla" })
    prismaMock.usuario.findMany.mockResolvedValue([
      { email: "c1@test.es", preferenciaNotificaciones: [] },
    ])
    prismaMock.comunicado.create.mockResolvedValue({ ...comunicadoMock, canal: "AMBOS" })

    mockEnviarEmail.mockResolvedValue(1)
    mockEnviarPush.mockResolvedValue(3)

    const res = await POST(req("http://localhost/api/admin/comunicados", "POST", {
      titulo: "Aviso importante",
      cuerpo: "Las pistas estarán cerradas el lunes.",
      canal: "AMBOS",
    }))

    expect(res.status).toBe(201)
    expect(mockEnviarEmail).toHaveBeenCalledTimes(1)
    expect(mockEnviarPush).toHaveBeenCalledTimes(1)

    const data = await res.json()
    expect(data.enviados.email).toBe(1)
    expect(data.enviados.push).toBe(3)
  })

  it("guarda el comunicado en BD y devuelve 201 con enviados", async () => {
    mockGetServerSession.mockResolvedValue(sesionAdmin)
    prismaMock.tenant.findUnique.mockResolvedValue({ nombre: "Ayuntamiento de Sevilla" })
    prismaMock.usuario.findMany.mockResolvedValue([
      { email: "c1@test.es", preferenciaNotificaciones: [] },
    ])
    prismaMock.comunicado.create.mockResolvedValue(comunicadoMock)

    mockEnviarEmail.mockResolvedValue(1)

    const res = await POST(req("http://localhost/api/admin/comunicados", "POST", {
      titulo: "Aviso importante",
      cuerpo: "Las pistas estarán cerradas el lunes.",
      canal: "EMAIL",
    }))

    expect(res.status).toBe(201)

    // Verificar que se creó el comunicado con los datos correctos
    expect(prismaMock.comunicado.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          titulo: "Aviso importante",
          cuerpo: "Las pistas estarán cerradas el lunes.",
          canal: "EMAIL",
        }),
      })
    )

    const data = await res.json()
    expect(data.comunicado.id).toBe("comunicado-1")
    expect(data.enviados).toBeDefined()
  })
})
