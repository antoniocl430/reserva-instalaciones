/**
 * Tests para NextAuth con soporte multi-tenant
 * TDD: estos tests se escriben ANTES de la implementación (fase RED)
 *
 * Verifica que:
 *   - El token JWT incluye tenantId tras el login
 *   - La sesión expone tenantId al cliente
 *   - El login falla si el usuario no pertenece al tenant del request
 */

// ─── Mock de Prisma ───────────────────────────────────────────────────────────
// eslint-disable-next-line no-var
var prismaMock: any

jest.mock("@/lib/prisma", () => {
  const { mockDeep } = require("jest-mock-extended")
  prismaMock = mockDeep()
  return { prisma: prismaMock }
})

// Mockear rate-limit para que no interfiera en los tests de auth
jest.mock("@/lib/rate-limit", () => ({
  verificarRateLimit: jest.fn().mockReturnValue({ bloqueado: false }),
  resetearRateLimit: jest.fn(),
}))

import bcrypt from "bcryptjs"
import { opcionesAuth } from "@/lib/auth"

// Helper para obtener el provider de credenciales
const credentialsProvider = opcionesAuth.providers[0] as any
const authorize = credentialsProvider.options?.authorize ?? credentialsProvider.authorize

// ─── Tests del callback authorize ────────────────────────────────────────────

describe("NextAuth con tenantId — authorize", () => {
  const passwordPlana = "password123"
  let passwordHash: string

  beforeAll(async () => {
    passwordHash = await bcrypt.hash(passwordPlana, 12)
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("devuelve el tenantId en el objeto usuario tras login exitoso", async () => {
    const tenantId = "tenant-uuid-desarrollo"
    prismaMock.usuario.findFirst.mockResolvedValue({
      id: "usuario-uuid-1",
      email: "ciudadano@test.com",
      nombre: "Ciudadano Test",
      passwordHash,
      rol: "CIUDADANO",
      activo: true,
      tenantId,
      emailVerificado: true,
    })

    const req = {
      headers: { "x-tenant-id": tenantId },
    }

    const resultado = await authorize(
      { email: "ciudadano@test.com", password: passwordPlana },
      req
    )

    expect(resultado).not.toBeNull()
    expect(resultado?.tenantId).toBe(tenantId)
    expect(resultado?.id).toBe("usuario-uuid-1")
    expect(resultado?.rol).toBe("CIUDADANO")
  })

  it("devuelve null si el usuario no pertenece al tenant del request", async () => {
    // La BD devuelve null porque no hay usuario con ese email en ese tenant
    prismaMock.usuario.findFirst.mockResolvedValue(null)

    const req = {
      headers: { "x-tenant-id": "tenant-otro-ayuntamiento" },
    }

    const resultado = await authorize(
      { email: "ciudadano@test.com", password: passwordPlana },
      req
    )

    expect(resultado).toBeNull()
  })

  it("busca el usuario filtrando por email y tenantId simultáneamente", async () => {
    const tenantId = "tenant-uuid-sevilla"
    prismaMock.usuario.findFirst.mockResolvedValue(null)

    const req = {
      headers: { "x-tenant-id": tenantId },
    }

    await authorize(
      { email: "usuario@sevilla.es", password: "cualquier" },
      req
    )

    // Verificar que la query usa findFirst con ambos filtros (tenantId y email)
    expect(prismaMock.usuario.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          email: "usuario@sevilla.es",
          tenantId,
        }),
      })
    )
  })
})

// ─── Tests de los callbacks JWT y Session ────────────────────────────────────

describe("NextAuth con tenantId — callbacks JWT y Session", () => {
  const jwtCallback = opcionesAuth.callbacks!.jwt as Function
  const sessionCallback = opcionesAuth.callbacks!.session as Function

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("el token JWT incluye tenantId en el primer login", async () => {
    const tenantId = "tenant-uuid-desarrollo"
    const tokenBase = { sub: "usuario-uuid-1", iat: 0, exp: 0, jti: "jti" }
    const usuario = {
      id: "usuario-uuid-1",
      email: "test@test.com",
      name: "Test User",
      rol: "CIUDADANO",
      tenantId,
    }

    const tokenResultado = await jwtCallback({ token: tokenBase, user: usuario })

    expect(tokenResultado.tenantId).toBe(tenantId)
    expect(tokenResultado.id).toBe("usuario-uuid-1")
    expect(tokenResultado.rol).toBe("CIUDADANO")
  })

  it("la sesión expone tenantId al cliente", async () => {
    const tenantId = "tenant-uuid-desarrollo"
    const sesionBase = {
      user: { name: "Test User", email: "test@test.com", image: null },
      expires: "2099-01-01",
    }
    const tokenConTenant = {
      id: "usuario-uuid-1",
      rol: "CIUDADANO",
      tenantId,
      sub: "usuario-uuid-1",
    }

    // Mock del usuario activo para el refresh check
    prismaMock.usuario.findUnique.mockResolvedValue({ activo: true })

    const sesionResultado = await sessionCallback({
      session: sesionBase,
      token: tokenConTenant,
    })

    expect(sesionResultado.user.tenantId).toBe(tenantId)
    expect(sesionResultado.user.id).toBe("usuario-uuid-1")
    expect(sesionResultado.user.rol).toBe("CIUDADANO")
  })
})
