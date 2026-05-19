/**
 * Tests para DELETE /api/perfil/eliminar
 * TDD: tests escritos ANTES de la implementación (fase RED)
 *
 * Cubre:
 *   - Autenticación: 401 si no hay sesión
 *   - Cancelación de reservas activas del usuario
 *   - Eliminación de ListaEspera del usuario
 *   - Eliminación de SuscripcionPush del usuario
 *   - Eliminación de TokenRecuperacion del usuario
 *   - Anonimización del usuario (nombre, email, activo)
 *   - Respuesta { ok: true } con status 200
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

import { NextRequest } from 'next/server'
import { DELETE } from '@/app/api/perfil/eliminar/route'
import { getServerSession } from 'next-auth'

const mockGetServerSession = getServerSession as jest.Mock

const TENANT_ID = 'tenant-test'
const USUARIO_ID = 'usuario-ciudadano-1'

const sesionCiudadano = {
  user: {
    id: USUARIO_ID,
    rol: 'CIUDADANO',
    email: 'ciudadano@test.com',
    tenantId: TENANT_ID,
  },
}

// Helper: configura el mock de $transaction para ejecutar el callback con prismaMock
function mockTransaccion() {
  prismaMock.$transaction.mockImplementation(async (fn: Function) => {
    return fn(prismaMock)
  })
  prismaMock.reserva.updateMany.mockResolvedValue({ count: 0 })
  prismaMock.listaEspera.deleteMany.mockResolvedValue({ count: 0 })
  prismaMock.suscripcionPush.deleteMany.mockResolvedValue({ count: 0 })
  prismaMock.tokenRecuperacion.deleteMany.mockResolvedValue({ count: 0 })
  prismaMock.preferenciaNotificacion.deleteMany.mockResolvedValue({ count: 0 })
  prismaMock.usuario.update.mockResolvedValue({
    id: USUARIO_ID,
    nombre: 'Usuario eliminado',
    email: `eliminado-${USUARIO_ID}@eliminado.local`,
    activo: false,
  })
}

// =============================================================================
// DELETE /api/perfil/eliminar
// =============================================================================

describe('DELETE /api/perfil/eliminar', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // Test 1: 401 si no hay sesión
  it('debería devolver 401 si no hay sesión', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/perfil/eliminar', {
      method: 'DELETE',
    })
    const response = await DELETE(request)

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBeDefined()
  })

  // Test 2: cancela reservas activas
  it('debería cancelar las reservas activas del usuario', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    mockTransaccion()

    const request = new NextRequest('http://localhost/api/perfil/eliminar', {
      method: 'DELETE',
    })
    await DELETE(request)

    expect(prismaMock.reserva.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          usuarioId: USUARIO_ID,
          tenantId: TENANT_ID,
          estado: 'ACTIVA',
        }),
        data: expect.objectContaining({
          estado: 'CANCELADA',
        }),
      })
    )
  })

  // Test 3: elimina entradas de ListaEspera
  it('debería eliminar la lista de espera del usuario', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    mockTransaccion()

    const request = new NextRequest('http://localhost/api/perfil/eliminar', {
      method: 'DELETE',
    })
    await DELETE(request)

    expect(prismaMock.listaEspera.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          usuarioId: USUARIO_ID,
        }),
      })
    )
  })

  // Test 4: elimina SuscripcionPush
  it('debería eliminar las suscripciones push del usuario', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    mockTransaccion()

    const request = new NextRequest('http://localhost/api/perfil/eliminar', {
      method: 'DELETE',
    })
    await DELETE(request)

    expect(prismaMock.suscripcionPush.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          usuarioId: USUARIO_ID,
        }),
      })
    )
  })

  // Test 5: elimina TokenRecuperacion
  it('debería eliminar los tokens de recuperación del usuario', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    mockTransaccion()

    const request = new NextRequest('http://localhost/api/perfil/eliminar', {
      method: 'DELETE',
    })
    await DELETE(request)

    expect(prismaMock.tokenRecuperacion.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          usuarioId: USUARIO_ID,
        }),
      })
    )
  })

  // Test 6: anonimiza el usuario
  it('debería anonimizar el usuario con nombre, email e inactivarlo', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    mockTransaccion()

    const request = new NextRequest('http://localhost/api/perfil/eliminar', {
      method: 'DELETE',
    })
    await DELETE(request)

    expect(prismaMock.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: USUARIO_ID }),
        data: expect.objectContaining({
          nombre: 'Usuario eliminado',
          email: `eliminado-${USUARIO_ID}@eliminado.local`,
          activo: false,
        }),
      })
    )
  })

  // Test 7: responde { ok: true } con 200
  it('debería responder { ok: true } con status 200', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    mockTransaccion()

    const request = new NextRequest('http://localhost/api/perfil/eliminar', {
      method: 'DELETE',
    })
    const response = await DELETE(request)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.ok).toBe(true)
  })
})
