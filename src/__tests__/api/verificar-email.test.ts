/**
 * Tests para el flujo de verificación de email
 * TDD: fase RED — se escriben ANTES de la implementación
 *
 * Cubre:
 *   - GET /api/verificar-email → token válido, expirado, inexistente
 *   - POST /api/reenviar-verificacion → usuario no verificado, ya verificado
 *   - POST /api/auth/registro → devuelve mensaje de verificación, sin signIn automático
 *   - lib/auth.ts authorize() → lanza error EMAIL_NO_VERIFICADO cuando emailVerificado=false
 */

// ─── Mock de Prisma ───────────────────────────────────────────────────────────
// eslint-disable-next-line no-var
var prismaMock: any

jest.mock("@/lib/prisma", () => {
  const { mockDeep } = require("jest-mock-extended")
  prismaMock = mockDeep()
  return { prisma: prismaMock }
})

// Mock del módulo tenant
jest.mock("@/lib/tenant", () => ({
  obtenerTenantIdPorSlug: jest.fn().mockResolvedValue("tenant-uuid-desarrollo"),
}))

// Mock del módulo email — evita llamadas reales a Resend en tests
jest.mock("@/lib/email", () => ({
  enviarEmailVerificacion: jest.fn().mockResolvedValue(undefined),
  enviarEmailReserva: jest.fn().mockResolvedValue(undefined),
  enviarEmailCancelacion: jest.fn().mockResolvedValue(undefined),
  enviarEmailRecuperacion: jest.fn().mockResolvedValue(undefined),
}))

// Mock de rate-limit para tests de auth
jest.mock("@/lib/rate-limit", () => ({
  verificarRateLimit: jest.fn().mockReturnValue({ bloqueado: false }),
  resetearRateLimit: jest.fn(),
}))

import { NextRequest } from "next/server"
import bcrypt from "bcryptjs"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function crearRequestVerificar(token: string): NextRequest {
  return new NextRequest(
    `http://localhost/api/verificar-email?token=${token}`,
    {
      method: "GET",
      headers: { "x-tenant-slug": "desarrollo" },
    }
  )
}

function crearRequestReenviar(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/reenviar-verificacion", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-tenant-slug": "desarrollo",
    },
    body: JSON.stringify(body),
  })
}

function crearRequestRegistro(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/auth/registro", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-tenant-slug": "desarrollo",
    },
    body: JSON.stringify(body),
  })
}

const BODY_REGISTRO_VALIDO = {
  nombre: "Ana García",
  email: "ana@ejemplo.com",
  password: "Password1",
  aceptaPrivacidad: true,
}

// ─── Suite: GET /api/verificar-email ─────────────────────────────────────────

describe("GET /api/verificar-email", () => {
  beforeEach(() => {
    jest.resetAllMocks()
    const { obtenerTenantIdPorSlug } = require("@/lib/tenant")
    obtenerTenantIdPorSlug.mockResolvedValue("tenant-uuid-desarrollo")
  })

  it("devuelve { ok: true } cuando el token es válido y no ha expirado", async () => {
    const { GET } = await import("@/app/api/verificar-email/route")

    const expiraFutura = new Date(Date.now() + 60 * 60 * 1000) // 1h en el futuro
    prismaMock.usuario.findFirst.mockResolvedValue({
      id: "usuario-uuid-1",
      email: "ana@ejemplo.com",
      tokenVerificacion: "token-valido-xyz",
      tokenVerificacionExpira: expiraFutura,
      emailVerificado: false,
    })
    prismaMock.usuario.update.mockResolvedValue({
      id: "usuario-uuid-1",
      emailVerificado: true,
    })

    const req = crearRequestVerificar("token-valido-xyz")
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    // Verificar que se actualizó el usuario correctamente
    expect(prismaMock.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "usuario-uuid-1" },
        data: expect.objectContaining({
          emailVerificado: true,
          tokenVerificacion: null,
          tokenVerificacionExpira: null,
        }),
      })
    )
  })

  it("devuelve 400 cuando el token no existe", async () => {
    const { GET } = await import("@/app/api/verificar-email/route")

    prismaMock.usuario.findFirst.mockResolvedValue(null)

    const req = crearRequestVerificar("token-inexistente")
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBeDefined()
  })

  it("devuelve 400 cuando el token ha expirado", async () => {
    const { GET } = await import("@/app/api/verificar-email/route")

    const expiraPasada = new Date(Date.now() - 60 * 60 * 1000) // 1h en el pasado
    prismaMock.usuario.findFirst.mockResolvedValue({
      id: "usuario-uuid-2",
      email: "caducado@ejemplo.com",
      tokenVerificacion: "token-expirado",
      tokenVerificacionExpira: expiraPasada,
      emailVerificado: false,
    })

    const req = crearRequestVerificar("token-expirado")
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toMatch(/caducado/i)
    // No debe llamar a update cuando el token ha expirado
    expect(prismaMock.usuario.update).not.toHaveBeenCalled()
  })

  it("devuelve 400 cuando falta el parámetro token", async () => {
    const { GET } = await import("@/app/api/verificar-email/route")

    const req = new NextRequest("http://localhost/api/verificar-email", {
      method: "GET",
      headers: { "x-tenant-slug": "desarrollo" },
    })
    const res = await GET(req)

    expect(res.status).toBe(400)
  })
})

// ─── Suite: POST /api/reenviar-verificacion ───────────────────────────────────

describe("POST /api/reenviar-verificacion", () => {
  beforeEach(() => {
    jest.resetAllMocks()
    const { obtenerTenantIdPorSlug } = require("@/lib/tenant")
    obtenerTenantIdPorSlug.mockResolvedValue("tenant-uuid-desarrollo")
  })

  it("genera nuevo token y envía email cuando el usuario no está verificado", async () => {
    const { POST } = await import("@/app/api/reenviar-verificacion/route")
    const { enviarEmailVerificacion } = require("@/lib/email")

    prismaMock.usuario.findFirst.mockResolvedValue({
      id: "usuario-uuid-1",
      email: "sin-verificar@ejemplo.com",
      nombre: "Sin Verificar",
      emailVerificado: false,
    })
    prismaMock.usuario.update.mockResolvedValue({
      id: "usuario-uuid-1",
      emailVerificado: false,
    })

    const req = crearRequestReenviar({ email: "sin-verificar@ejemplo.com" })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.mensaje).toBeDefined()
    expect(prismaMock.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "usuario-uuid-1" },
        data: expect.objectContaining({
          tokenVerificacion: expect.any(String),
          tokenVerificacionExpira: expect.any(Date),
        }),
      })
    )
    expect(enviarEmailVerificacion).toHaveBeenCalledTimes(1)
  })

  it("devuelve 400 cuando el usuario ya está verificado", async () => {
    const { POST } = await import("@/app/api/reenviar-verificacion/route")

    prismaMock.usuario.findFirst.mockResolvedValue({
      id: "usuario-uuid-2",
      email: "ya-verificado@ejemplo.com",
      nombre: "Ya Verificado",
      emailVerificado: true,
    })

    const req = crearRequestReenviar({ email: "ya-verificado@ejemplo.com" })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toMatch(/ya está verificada/i)
  })

  it("devuelve 404 cuando el email no existe (mensaje genérico)", async () => {
    const { POST } = await import("@/app/api/reenviar-verificacion/route")

    prismaMock.usuario.findFirst.mockResolvedValue(null)

    const req = crearRequestReenviar({ email: "no-existe@ejemplo.com" })
    const res = await POST(req)

    expect(res.status).toBe(404)
  })

  it("devuelve 400 cuando falta el campo email", async () => {
    const { POST } = await import("@/app/api/reenviar-verificacion/route")

    const req = crearRequestReenviar({})
    const res = await POST(req)

    expect(res.status).toBe(400)
  })
})

// ─── Suite: POST /api/auth/registro con verificación de email ─────────────────

describe("POST /api/auth/registro — verificación de email", () => {
  beforeEach(() => {
    jest.resetAllMocks()
    const { obtenerTenantIdPorSlug } = require("@/lib/tenant")
    obtenerTenantIdPorSlug.mockResolvedValue("tenant-uuid-desarrollo")
  })

  it("devuelve mensaje de verificación (no signIn automático) tras registro válido", async () => {
    const { POST } = await import("@/app/api/auth/registro/route")
    const { enviarEmailVerificacion } = require("@/lib/email")

    prismaMock.usuario.findFirst.mockResolvedValue(null)
    prismaMock.usuario.create.mockResolvedValue({
      id: "nuevo-usuario-uuid",
      email: "ana@ejemplo.com",
      nombre: "Ana García",
    })
    prismaMock.usuario.update.mockResolvedValue({
      id: "nuevo-usuario-uuid",
      tokenVerificacion: "token-generado",
    })

    const req = crearRequestRegistro(BODY_REGISTRO_VALIDO)
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(201)
    // La respuesta debe ser un mensaje de verificación, NO { ok: true, email }
    expect(body.mensaje).toBeDefined()
    expect(body.ok).toBeUndefined()
    // Debe enviar email de verificación
    expect(enviarEmailVerificacion).toHaveBeenCalledTimes(1)
    // Debe guardar el token de verificación en BD
    expect(prismaMock.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tokenVerificacion: expect.any(String),
          tokenVerificacionExpira: expect.any(Date),
        }),
      })
    )
  })

  it("el token de verificación expira en 24 horas", async () => {
    const { POST } = await import("@/app/api/auth/registro/route")

    prismaMock.usuario.findFirst.mockResolvedValue(null)
    prismaMock.usuario.create.mockResolvedValue({
      id: "nuevo-usuario-uuid-2",
      email: "ana2@ejemplo.com",
      nombre: "Ana García 2",
    })
    prismaMock.usuario.update.mockResolvedValue({
      id: "nuevo-usuario-uuid-2",
      tokenVerificacion: "token-generado-2",
    })

    const ahora = Date.now()
    const req = crearRequestRegistro({ ...BODY_REGISTRO_VALIDO, email: "ana2@ejemplo.com" })
    await POST(req)

    const llamadaUpdate = prismaMock.usuario.update.mock.calls[0][0]
    const expira: Date = llamadaUpdate.data.tokenVerificacionExpira
    const diferenciaMs = expira.getTime() - ahora

    // Debe ser aproximadamente 24 horas (con margen de 1 minuto)
    expect(diferenciaMs).toBeGreaterThan(23 * 60 * 60 * 1000)
    expect(diferenciaMs).toBeLessThan(25 * 60 * 60 * 1000)
  })
})

// ─── Suite: lib/auth.ts — bloqueo por email no verificado ────────────────────

describe("lib/auth.ts — authorize() con emailVerificado", () => {
  let authorize: Function
  let passwordHash: string

  beforeAll(async () => {
    passwordHash = await bcrypt.hash("Password1", 12)
    const { opcionesAuth } = await import("@/lib/auth")
    const provider = opcionesAuth.providers[0] as any
    authorize = provider.options?.authorize ?? provider.authorize
  })

  beforeEach(() => {
    jest.resetAllMocks()
    const { verificarRateLimit } = require("@/lib/rate-limit")
    verificarRateLimit.mockReturnValue({ bloqueado: false })
  })

  it("lanza error EMAIL_NO_VERIFICADO cuando emailVerificado es false", async () => {
    prismaMock.usuario.findFirst.mockResolvedValue({
      id: "usuario-uuid-no-verificado",
      email: "sin-verificar@test.com",
      nombre: "Sin Verificar",
      passwordHash,
      rol: "CIUDADANO",
      activo: true,
      tenantId: "tenant-uuid-desarrollo",
      emailVerificado: false,
    })

    const req = { headers: { "x-tenant-id": "tenant-uuid-desarrollo" } }

    await expect(
      authorize({ email: "sin-verificar@test.com", password: "Password1" }, req)
    ).rejects.toThrow("EMAIL_NO_VERIFICADO")
  })

  it("permite login cuando emailVerificado es true", async () => {
    prismaMock.usuario.findFirst.mockResolvedValue({
      id: "usuario-uuid-verificado",
      email: "verificado@test.com",
      nombre: "Verificado",
      passwordHash,
      rol: "CIUDADANO",
      activo: true,
      tenantId: "tenant-uuid-desarrollo",
      emailVerificado: true,
    })

    const req = { headers: { "x-tenant-id": "tenant-uuid-desarrollo" } }

    const resultado = await authorize(
      { email: "verificado@test.com", password: "Password1" },
      req
    )

    expect(resultado).not.toBeNull()
    expect(resultado.id).toBe("usuario-uuid-verificado")
  })
})
