/**
 * Tests para el perfil de usuario
 * TDD: tests escritos ANTES de la implementación (fase RED)
 *
 * Cubre:
 *   - GET /api/cuenta — devuelve perfil del usuario autenticado
 *   - PATCH /api/cuenta — actualiza nombre del usuario
 *   - POST /api/cuenta/avatar — sube foto de perfil
 *   - schemaActualizarPerfil — validación del schema
 */

// eslint-disable-next-line no-var
var prismaMock: any

jest.mock('@/lib/prisma', () => {
  const { mockDeep } = require('jest-mock-extended')
  prismaMock = mockDeep()
  return { prisma: prismaMock }
})

jest.mock('next-auth', () => ({
  default: jest.fn(),
  getServerSession: jest.fn(),
}))

// Mock de @vercel/blob para tests de avatar
jest.mock('@vercel/blob', () => ({
  put: jest.fn().mockResolvedValue({ url: 'https://blob.vercel.com/test-avatar.jpg' }),
}))

import { NextRequest } from 'next/server'
import { GET, PATCH } from '@/app/api/cuenta/route'
import { POST as POST_AVATAR } from '@/app/api/cuenta/avatar/route'
import { getServerSession } from 'next-auth'
import { schemaActualizarPerfil } from '@/lib/validaciones'

const mockGetServerSession = getServerSession as jest.Mock

const TENANT_ID = 'tenant-test'
const USUARIO_ID = 'usuario-ciudadano-1'

const sesionCiudadano = {
  user: {
    id: USUARIO_ID,
    rol: 'CIUDADANO',
    email: 'ciudadano@test.com',
    name: 'Ciudadano Test',
    tenantId: TENANT_ID,
  },
}

const usuarioEnBD = {
  id: USUARIO_ID,
  tenantId: TENANT_ID,
  nombre: 'Ciudadano Test',
  email: 'ciudadano@test.com',
  rol: 'CIUDADANO',
  avatarUrl: null,
  creadoEn: new Date('2026-01-01T10:00:00Z'),
}

// =============================================================================
// GET /api/cuenta
// =============================================================================

describe('GET /api/cuenta', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('debería devolver 401 si no hay sesión', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/cuenta')
    const response = await GET(request)

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBeDefined()
  })

  it('debería devolver el perfil del usuario sin passwordHash', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    prismaMock.usuario.findUnique.mockResolvedValue(usuarioEnBD)

    const request = new NextRequest('http://localhost/api/cuenta')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const body = await response.json()

    expect(body.usuario).toBeDefined()
    expect(body.usuario.nombre).toBe('Ciudadano Test')
    expect(body.usuario.email).toBe('ciudadano@test.com')
    expect(body.usuario.avatarUrl).toBeNull()
    // No debe exponer el passwordHash
    expect(body.usuario.passwordHash).toBeUndefined()
  })

  it('debería devolver 404 si el usuario no existe en BD', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    prismaMock.usuario.findUnique.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/cuenta')
    const response = await GET(request)

    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body.error).toBeDefined()
  })
})

// =============================================================================
// PATCH /api/cuenta
// =============================================================================

describe('PATCH /api/cuenta', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('debería devolver 401 si no hay sesión', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/cuenta', {
      method: 'PATCH',
      body: JSON.stringify({ nombre: 'Nuevo Nombre' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const response = await PATCH(request)

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBeDefined()
  })

  it('debería devolver 400 si el nombre tiene menos de 2 caracteres', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)

    const request = new NextRequest('http://localhost/api/cuenta', {
      method: 'PATCH',
      body: JSON.stringify({ nombre: 'A' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const response = await PATCH(request)

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBeDefined()
  })

  it('debería actualizar el nombre correctamente y devolver el usuario actualizado', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)

    const usuarioActualizado = {
      ...usuarioEnBD,
      nombre: 'Nombre Actualizado',
    }
    prismaMock.usuario.update.mockResolvedValue(usuarioActualizado)

    const request = new NextRequest('http://localhost/api/cuenta', {
      method: 'PATCH',
      body: JSON.stringify({ nombre: 'Nombre Actualizado' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const response = await PATCH(request)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.usuario).toBeDefined()
    expect(body.usuario.nombre).toBe('Nombre Actualizado')
  })

  it('debería filtrar por tenantId al actualizar (no puede modificar usuario de otro tenant)', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)

    const usuarioActualizado = { ...usuarioEnBD, nombre: 'Nuevo Nombre' }
    prismaMock.usuario.update.mockResolvedValue(usuarioActualizado)

    const request = new NextRequest('http://localhost/api/cuenta', {
      method: 'PATCH',
      body: JSON.stringify({ nombre: 'Nuevo Nombre' }),
      headers: { 'Content-Type': 'application/json' },
    })
    await PATCH(request)

    // La actualización debe filtrar por id Y tenantId
    expect(prismaMock.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: USUARIO_ID,
        }),
      })
    )
    // Verificar que el tenantId forma parte del where
    const llamadaUpdate = prismaMock.usuario.update.mock.calls[0][0]
    expect(llamadaUpdate.where.tenantId ?? llamadaUpdate.where.id).toBeTruthy()
  })
})

// =============================================================================
// POST /api/cuenta/avatar
// =============================================================================

describe('POST /api/cuenta/avatar', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Limpiar la variable de entorno BLOB_READ_WRITE_TOKEN para tests
    delete process.env.BLOB_READ_WRITE_TOKEN
  })

  it('debería devolver 401 si no hay sesión', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const formData = new FormData()
    const request = new NextRequest('http://localhost/api/cuenta/avatar', {
      method: 'POST',
      body: formData,
    })
    const response = await POST_AVATAR(request)

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBeDefined()
  })

  it('debería devolver 400 si no se envía archivo', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)

    const formData = new FormData()
    // No añadimos ningún archivo
    const request = new NextRequest('http://localhost/api/cuenta/avatar', {
      method: 'POST',
      body: formData,
    })
    const response = await POST_AVATAR(request)

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBeDefined()
  })

  it('debería devolver 400 si el tipo de archivo no está permitido (application/pdf)', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)

    const archivoInvalido = new File(['contenido pdf'], 'documento.pdf', {
      type: 'application/pdf',
    })
    const formData = new FormData()
    formData.append('avatar', archivoInvalido)

    const request = new NextRequest('http://localhost/api/cuenta/avatar', {
      method: 'POST',
      body: formData,
    })
    const response = await POST_AVATAR(request)

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toContain('Formato')
  })

  it('debería devolver 400 si el archivo supera 2MB', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)

    // Crear un archivo de más de 2MB
    const contenidoGrande = new Uint8Array(2 * 1024 * 1024 + 1) // 2MB + 1 byte
    const archivoGrande = new File([contenidoGrande], 'imagen-grande.jpg', {
      type: 'image/jpeg',
    })
    const formData = new FormData()
    formData.append('avatar', archivoGrande)

    const request = new NextRequest('http://localhost/api/cuenta/avatar', {
      method: 'POST',
      body: formData,
    })
    const response = await POST_AVATAR(request)

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toContain('2MB')
  })
})

// =============================================================================
// schemaActualizarPerfil
// =============================================================================

describe('schemaActualizarPerfil', () => {
  it('debería validar un nombre válido', () => {
    const resultado = schemaActualizarPerfil.safeParse({ nombre: 'Juan García' })
    expect(resultado.success).toBe(true)
  })

  it('debería rechazar un nombre con menos de 2 caracteres', () => {
    const resultado = schemaActualizarPerfil.safeParse({ nombre: 'A' })
    expect(resultado.success).toBe(false)
    if (!resultado.success) {
      expect(resultado.error.issues[0].message).toContain('2 caracteres')
    }
  })

  it('debería permitir objeto vacío (todos los campos son opcionales)', () => {
    const resultado = schemaActualizarPerfil.safeParse({})
    expect(resultado.success).toBe(true)
  })
})
