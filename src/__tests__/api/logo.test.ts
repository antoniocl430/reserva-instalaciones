/**
 * Tests para el endpoint POST /api/admin/logo
 *
 * Sigue TDD estricto: los tests se escriben ANTES de la implementación (RED).
 *
 * Reglas de negocio cubiertas:
 *   1. 401 si no hay sesión autenticada
 *   2. 403 si el rol no es ADMIN
 *   3. 400 si no se incluye el campo "file" en el FormData
 *   4. 400 si el archivo supera el límite de 200 KB
 *   5. 400 si el MIME type no es image/*
 *   6. 200 con { logoUrl } en base64 si todo es correcto
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

import { POST } from "@/app/api/admin/logo/route"

const mockGetServerSession = getServerSession as jest.Mock

// ─── Constantes de prueba ──────────────────────────────────────────────────────

const TENANT_ID = "tenant-test-logo-001"

const sesionAdmin = {
  user: {
    id: "admin-logo-1",
    rol: "ADMIN",
    email: "admin@ayuntamiento.es",
    tenantId: TENANT_ID,
  },
}

const sesionCiudadano = {
  user: {
    id: "ciudadano-logo-1",
    rol: "CIUDADANO",
    email: "ciudadano@example.com",
    tenantId: TENANT_ID,
  },
}

/** Crea un archivo PNG mínimo de prueba con el tamaño indicado en bytes */
function crearArchivoImagen(nombre: string, tipo: string, tamanoBytes: number): File {
  // Rellena con ceros para alcanzar el tamaño deseado
  const buffer = Buffer.alloc(tamanoBytes)
  return new File([buffer], nombre, { type: tipo })
}

/** Construye una NextRequest multipart/form-data con el archivo dado */
function crearRequestConArchivo(archivo: File): NextRequest {
  const formData = new FormData()
  formData.append("file", archivo)
  return new NextRequest("http://localhost:3000/api/admin/logo", {
    method: "POST",
    body: formData,
  })
}

/** Construye una NextRequest multipart/form-data sin campo "file" */
function crearRequestSinArchivo(): NextRequest {
  const formData = new FormData()
  formData.append("otro-campo", "valor")
  return new NextRequest("http://localhost:3000/api/admin/logo", {
    method: "POST",
    body: formData,
  })
}

// ─── POST /api/admin/logo ──────────────────────────────────────────────────────

describe("POST /api/admin/logo", () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it("devuelve 401 si no hay sesión", async () => {
    mockGetServerSession.mockResolvedValueOnce(null)
    const archivo = crearArchivoImagen("logo.png", "image/png", 1024)
    const req = crearRequestConArchivo(archivo)

    const res = await POST(req)

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  it("devuelve 403 si el rol no es ADMIN", async () => {
    mockGetServerSession.mockResolvedValueOnce(sesionCiudadano)
    const archivo = crearArchivoImagen("logo.png", "image/png", 1024)
    const req = crearRequestConArchivo(archivo)

    const res = await POST(req)

    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  it("devuelve 400 si no hay campo 'file' en el FormData", async () => {
    mockGetServerSession.mockResolvedValueOnce(sesionAdmin)
    const req = crearRequestSinArchivo()

    const res = await POST(req)

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/archivo/i)
  })

  it("devuelve 400 si el archivo supera 200 KB", async () => {
    mockGetServerSession.mockResolvedValueOnce(sesionAdmin)
    // 200 KB + 1 byte = 204801 bytes
    const archivo = crearArchivoImagen("logo-grande.png", "image/png", 200 * 1024 + 1)
    const req = crearRequestConArchivo(archivo)

    const res = await POST(req)

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/tamaño|tamaño máximo|200/i)
  })

  it("devuelve 400 si el MIME type no es image/*", async () => {
    mockGetServerSession.mockResolvedValueOnce(sesionAdmin)
    const archivo = crearArchivoImagen("documento.pdf", "application/pdf", 1024)
    const req = crearRequestConArchivo(archivo)

    const res = await POST(req)

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/imagen|tipo/i)
  })

  it("devuelve 200 con logoUrl en base64 si todo es correcto", async () => {
    mockGetServerSession.mockResolvedValueOnce(sesionAdmin)

    const tamano = 500 // bytes pequeño para el test
    const archivo = crearArchivoImagen("logo.png", "image/png", tamano)
    const req = crearRequestConArchivo(archivo)

    // El endpoint llamará a prisma.tenant.update — lo mockeamos
    const dataUrlEsperada = expect.stringMatching(/^data:image\/png;base64,/)
    prismaMock.tenant.update.mockResolvedValueOnce({
      id: TENANT_ID,
      logoUrl: "data:image/png;base64,MOCK",
    })

    const res = await POST(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.logoUrl).toMatch(/^data:image\/png;base64,/)

    // Verificar que prisma.tenant.update se llamó con el tenantId correcto
    expect(prismaMock.tenant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: TENANT_ID },
        data: expect.objectContaining({
          logoUrl: dataUrlEsperada,
        }),
      })
    )
  })
})
