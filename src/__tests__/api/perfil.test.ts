/**
 * Tests para GET /api/perfil y PATCH /api/perfil
 * TDD: tests escritos ANTES de la implementación (fase RED)
 *
 * Cubre:
 *   - GET /api/perfil — devuelve perfil del usuario autenticado sin passwordHash
 *   - PATCH /api/perfil — actualiza nombre y/o contraseña del usuario autenticado
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

// bcryptjs se mockeará individualmente en cada bloque donde haga falta
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}))

import { NextRequest } from 'next/server'
import { GET, PATCH } from '@/app/api/perfil/route'
import { getServerSession } from 'next-auth'
import bcrypt from 'bcryptjs'

const mockGetServerSession = getServerSession as jest.Mock
const mockBcryptCompare = bcrypt.compare as jest.Mock
const mockBcryptHash = bcrypt.hash as jest.Mock

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
  passwordHash: '$2a$12$hash.almacenado.en.bd',
  rol: 'CIUDADANO',
  noShows: 0,
  suspendidoHasta: null,
  motivoSuspension: null,
  creadoEn: new Date('2026-01-01T10:00:00Z'),
}

// =============================================================================
// GET /api/perfil
// =============================================================================

describe('GET /api/perfil', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('debería devolver 401 si no hay sesión', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/perfil')
    const response = await GET(request)

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBeDefined()
  })

  it('debería devolver los datos del usuario sin passwordHash', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    prismaMock.usuario.findUnique.mockResolvedValue(usuarioEnBD)

    const request = new NextRequest('http://localhost/api/perfil')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const body = await response.json()

    expect(body.id).toBe(USUARIO_ID)
    expect(body.nombre).toBe('Ciudadano Test')
    expect(body.email).toBe('ciudadano@test.com')
    expect(body.rol).toBe('CIUDADANO')
    expect(body.noShows).toBe(0)
    expect(body.suspendidoHasta).toBeNull()
    expect(body.motivoSuspension).toBeNull()
    expect(body.creadoEn).toBeDefined()
    // NO debe incluir passwordHash
    expect(body.passwordHash).toBeUndefined()
  })

  it('debería devolver 404 si el usuario no existe en BD', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    prismaMock.usuario.findUnique.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/perfil')
    const response = await GET(request)

    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body.error).toBeDefined()
  })
})

// =============================================================================
// PATCH /api/perfil
// =============================================================================

describe('PATCH /api/perfil', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('debería devolver 401 si no hay sesión', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/perfil', {
      method: 'PATCH',
      body: JSON.stringify({ nombre: 'Nuevo Nombre' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const response = await PATCH(request)

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBeDefined()
  })

  it('debería devolver 400 si el nombre está vacío', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)

    const request = new NextRequest('http://localhost/api/perfil', {
      method: 'PATCH',
      body: JSON.stringify({ nombre: '' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const response = await PATCH(request)

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBeDefined()
  })

  it('debería actualizar el nombre correctamente y devolver 200', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)

    const usuarioActualizado = { id: USUARIO_ID, nombre: 'Nombre Actualizado', email: 'ciudadano@test.com' }
    prismaMock.usuario.update.mockResolvedValue(usuarioActualizado)

    const request = new NextRequest('http://localhost/api/perfil', {
      method: 'PATCH',
      body: JSON.stringify({ nombre: 'Nombre Actualizado' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const response = await PATCH(request)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.ok).toBe(true)
    expect(body.usuario.nombre).toBe('Nombre Actualizado')
  })

  it('debería devolver 400 si se envía passwordNueva sin passwordActual', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)

    const request = new NextRequest('http://localhost/api/perfil', {
      method: 'PATCH',
      body: JSON.stringify({ passwordNueva: 'NuevoPass1' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const response = await PATCH(request)

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBeDefined()
  })

  it('debería devolver 400 si la contraseña actual no coincide', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    prismaMock.usuario.findUnique.mockResolvedValue(usuarioEnBD)
    mockBcryptCompare.mockResolvedValue(false)

    const request = new NextRequest('http://localhost/api/perfil', {
      method: 'PATCH',
      body: JSON.stringify({ passwordActual: 'ContraseñaErronea', passwordNueva: 'NuevoPass1' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const response = await PATCH(request)

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toContain('incorrecta')
  })

  it('debería cambiar la contraseña correctamente y devolver 200', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    prismaMock.usuario.findUnique.mockResolvedValue(usuarioEnBD)
    mockBcryptCompare.mockResolvedValue(true)
    mockBcryptHash.mockResolvedValue('$2a$12$nuevo.hash.generado')

    const usuarioActualizado = { id: USUARIO_ID, nombre: 'Ciudadano Test', email: 'ciudadano@test.com' }
    prismaMock.usuario.update.mockResolvedValue(usuarioActualizado)

    const request = new NextRequest('http://localhost/api/perfil', {
      method: 'PATCH',
      body: JSON.stringify({ passwordActual: 'ContraseñaCorrecta', passwordNueva: 'NuevoPass1' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const response = await PATCH(request)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.ok).toBe(true)

    // Verificar que se guardó el nuevo hash en BD
    expect(prismaMock.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: USUARIO_ID }),
        data: expect.objectContaining({ passwordHash: '$2a$12$nuevo.hash.generado' }),
      })
    )
  })

  it('debería devolver 400 si no se envía ningún campo válido para actualizar', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)

    const request = new NextRequest('http://localhost/api/perfil', {
      method: 'PATCH',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })
    const response = await PATCH(request)

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBeDefined()
  })
})
