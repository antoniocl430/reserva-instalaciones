/**
 * Tests para POST /api/auth/registro
 * TDD: fase RED — se escriben antes de la implementación de persistencia RGPD
 *
 * Verifica que:
 *   - Un registro válido con aceptaPrivacidad:true persiste aceptaPrivacidadEn como Date
 *   - Un registro sin aceptaPrivacidad devuelve 400 (validación Zod)
 *   - Un email duplicado en el mismo tenant devuelve 409
 *   - Un registro válido devuelve 201 con { ok: true, email }
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

  // ── 4. Registro exitoso devuelve 201 con email ────────────────────────────
  it("devuelve 201 con ok:true y email cuando el registro es válido", async () => {
    prismaMock.usuario.findFirst.mockResolvedValue(null)
    prismaMock.usuario.create.mockResolvedValue({
      id: "usuario-uuid-2",
      email: "ana@ejemplo.com",
      nombre: "Ana García",
      aceptaPrivacidadEn: new Date(),
    })

    const req = crearRequest(BODY_VALIDO)
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.ok).toBe(true)
    expect(body.email).toBe("ana@ejemplo.com")
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
