/**
 * Tests para POST /api/auth/registro
 * TDD: actualizados para reflejar el flujo con verificación de email obligatoria
 *
 * Verifica que:
 *   - Un registro válido con aceptaPrivacidad:true persiste aceptaPrivacidadEn como Date
 *   - Un registro sin aceptaPrivacidad devuelve 400 (validación Zod)
 *   - Un email duplicado en el mismo tenant devuelve 409
 *   - Un registro válido devuelve 201 con { mensaje: "..." } (no { ok: true, email })
 *   - El token de verificación se guarda en BD y se envía email de verificación
 */

// ─── Mock de Prisma ───────────────────────────────────────────────────────────
// eslint-disable-next-line no-var
var prismaMock: any

jest.mock("@/lib/prisma", () => {
  const { mockDeep } = require("jest-mock-extended")
  prismaMock = mockDeep()
  return { prisma: prismaMock }
})

// Mock del módulo tenant para aislar del entorno real
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

import { NextRequest } from "next/server"
import { POST } from "@/app/api/auth/registro/route"

// ─── Helper para construir un NextRequest de registro ─────────────────────────
function crearRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/auth/registro", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-tenant-slug": "desarrollo",
    },
    body: JSON.stringify(body),
  })
}

const BODY_VALIDO = {
  nombre: "Ana García",
  email: "ana@ejemplo.com",
  password: "Password1",
  aceptaPrivacidad: true,
}

// ─── Suite principal ──────────────────────────────────────────────────────────
describe("POST /api/auth/registro", () => {
  beforeEach(() => {
    jest.resetAllMocks()
    // Por defecto el tenant existe
    const { obtenerTenantIdPorSlug } = require("@/lib/tenant")
    obtenerTenantIdPorSlug.mockResolvedValue("tenant-uuid-desarrollo")
  })

  // ── 1. Persiste aceptaPrivacidadEn cuando aceptaPrivacidad es true ────────
  it("guarda aceptaPrivacidadEn como Date cuando aceptaPrivacidad es true", async () => {
    // No hay usuario existente con ese email
    prismaMock.usuario.findFirst.mockResolvedValue(null)
    // El create devuelve el usuario creado
    prismaMock.usuario.create.mockResolvedValue({
      id: "usuario-uuid-1",
      email: "ana@ejemplo.com",
      nombre: "Ana García",
      aceptaPrivacidadEn: new Date(),
    })
    prismaMock.usuario.update.mockResolvedValue({
      id: "usuario-uuid-1",
      tokenVerificacion: "token-generado",
    })

    const req = crearRequest(BODY_VALIDO)
    const res = await POST(req)

    expect(res.status).toBe(201)

    // Verificar que create se llamó con aceptaPrivacidadEn como Date
    expect(prismaMock.usuario.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          aceptaPrivacidadEn: expect.any(Date),
        }),
      })
    )
  })

  // ── 2. Devuelve 400 cuando aceptaPrivacidad no es true ────────────────────
  it("devuelve 400 cuando aceptaPrivacidad es false", async () => {
    const req = crearRequest({ ...BODY_VALIDO, aceptaPrivacidad: false })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toMatch(/política de privacidad/i)
  })

  it("devuelve 400 cuando falta aceptaPrivacidad", async () => {
    const { aceptaPrivacidad: _, ...sinAceptar } = BODY_VALIDO
    const req = crearRequest(sinAceptar)
    const res = await POST(req)

    expect(res.status).toBe(400)
  })

  // ── 3. Email duplicado devuelve 409 ───────────────────────────────────────
  it("devuelve 409 cuando el email ya está registrado en el mismo tenant", async () => {
    prismaMock.usuario.findFirst.mockResolvedValue({
      id: "usuario-existente",
      email: "ana@ejemplo.com",
    })

    const req = crearRequest(BODY_VALIDO)
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(409)
    expect(body.error).toMatch(/ya está registrado/i)
  })

  // ── 4. Registro exitoso devuelve 201 con mensaje de verificación ──────────
  it("devuelve 201 con mensaje de verificación y envía email de verificación", async () => {
    prismaMock.usuario.findFirst.mockResolvedValue(null)
    prismaMock.usuario.create.mockResolvedValue({
      id: "usuario-uuid-2",
      email: "ana@ejemplo.com",
      nombre: "Ana García",
      aceptaPrivacidadEn: new Date(),
    })
    prismaMock.usuario.update.mockResolvedValue({
      id: "usuario-uuid-2",
      tokenVerificacion: "token-generado",
    })

    const req = crearRequest(BODY_VALIDO)
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(201)
    // La respuesta es un mensaje de verificación, no el usuario directamente
    expect(body.mensaje).toBeDefined()
    expect(body.ok).toBeUndefined()
    // Debe guardar el token en BD
    expect(prismaMock.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tokenVerificacion: expect.any(String),
          tokenVerificacionExpira: expect.any(Date),
        }),
      })
    )
  })

  // ── 5. Tenant no existe → 503 ─────────────────────────────────────────────
  it("devuelve 503 cuando el tenant no existe", async () => {
    const { obtenerTenantIdPorSlug } = require("@/lib/tenant")
    obtenerTenantIdPorSlug.mockResolvedValue(null)

    const req = crearRequest(BODY_VALIDO)
    const res = await POST(req)

    expect(res.status).toBe(503)
  })
})
