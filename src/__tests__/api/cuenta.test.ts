/**
 * Tests para DELETE /api/cuenta y GET /api/cuenta/exportar
 * TDD: tests escritos ANTES de la implementación (fase RED)
 *
 * Cubre:
 *   - DELETE /api/cuenta — eliminación de cuenta propia (solo CIUDADANO)
 *   - GET /api/cuenta/exportar — exportación de datos personales (RGPD)
 *   - schemaRegistro con campo aceptaPrivacidad
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
import { DELETE } from '@/app/api/cuenta/route'
import { GET as GET_EXPORTAR } from '@/app/api/cuenta/exportar/route'
import { getServerSession } from 'next-auth'
import { schemaRegistro } from '@/lib/validaciones'

const mockGetServerSession = getServerSession as jest.Mock

const TENANT_ID = 'tenant-test'
const USUARIO_ID = 'usuario-ciudadano-1'
const OTRO_USUARIO_ID = 'usuario-ciudadano-2'

const sesionCiudadano = {
  user: {
    id: USUARIO_ID,
    rol: 'CIUDADANO',
    email: 'ciudadano@test.com',
    tenantId: TENANT_ID,
  },
}

const sesionAdmin = {
  user: {
    id: 'admin-1',
    rol: 'ADMIN',
    email: 'admin@test.com',
    tenantId: TENANT_ID,
  },
}

const usuarioEnBD = {
  id: USUARIO_ID,
  tenantId: TENANT_ID,
  nombre: 'Ciudadano Test',
  email: 'ciudadano@test.com',
  passwordHash: 'hash123',
  rol: 'CIUDADANO',
  activo: true,
  creadoEn: new Date('2026-01-01T10:00:00Z'),
  actualizadoEn: new Date('2026-01-01T10:00:00Z'),
}

// =============================================================================
// DELETE /api/cuenta
// =============================================================================

describe('DELETE /api/cuenta', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('debería devolver 401 si no hay sesión', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/cuenta', {
      method: 'DELETE',
    })
    const response = await DELETE(request)

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBeDefined()
  })

  it('debería devolver 403 si el rol es ADMIN (no puede auto-eliminarse aquí)', async () => {
    mockGetServerSession.mockResolvedValue(sesionAdmin)

    const request = new NextRequest('http://localhost/api/cuenta', {
      method: 'DELETE',
    })
    const response = await DELETE(request)

    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.error).toBeDefined()
  })

  it('debería cancelar reservas activas del usuario antes de eliminarlo', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)

    // La transacción ejecuta múltiples operaciones
    prismaMock.$transaction.mockImplementation(async (fn: Function) => {
      return fn(prismaMock)
    })

    prismaMock.reserva.updateMany.mockResolvedValue({ count: 2 })
    prismaMock.tokenRecuperacion.deleteMany.mockResolvedValue({ count: 0 })
    prismaMock.usuario.delete.mockResolvedValue(usuarioEnBD)

    const request = new NextRequest('http://localhost/api/cuenta', {
      method: 'DELETE',
    })
    const response = await DELETE(request)

    expect(response.status).toBe(200)

    // Verificar que se cancelaron las reservas activas dentro de la transacción
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

  it('debería eliminar el usuario correctamente y devolver { ok: true }', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)

    prismaMock.$transaction.mockImplementation(async (fn: Function) => {
      return fn(prismaMock)
    })

    prismaMock.reserva.updateMany.mockResolvedValue({ count: 0 })
    prismaMock.tokenRecuperacion.deleteMany.mockResolvedValue({ count: 0 })
    prismaMock.usuario.delete.mockResolvedValue(usuarioEnBD)

    const request = new NextRequest('http://localhost/api/cuenta', {
      method: 'DELETE',
    })
    const response = await DELETE(request)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.ok).toBe(true)

    // Verificar que se eliminó el usuario correcto del tenant correcto
    expect(prismaMock.usuario.delete).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: USUARIO_ID,
        }),
      })
    )
  })

  it('no debería eliminar datos de otros usuarios (aislamiento)', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)

    prismaMock.$transaction.mockImplementation(async (fn: Function) => {
      return fn(prismaMock)
    })

    prismaMock.reserva.updateMany.mockResolvedValue({ count: 0 })
    prismaMock.tokenRecuperacion.deleteMany.mockResolvedValue({ count: 0 })
    prismaMock.usuario.delete.mockResolvedValue(usuarioEnBD)

    const request = new NextRequest('http://localhost/api/cuenta', {
      method: 'DELETE',
    })
    await DELETE(request)

    // La llamada a updateMany solo debe afectar al usuario autenticado
    const llamadaUpdateMany = prismaMock.reserva.updateMany.mock.calls[0][0]
    expect(llamadaUpdateMany.where.usuarioId).toBe(USUARIO_ID)
    expect(llamadaUpdateMany.where.usuarioId).not.toBe(OTRO_USUARIO_ID)

    // La llamada a delete solo debe afectar al usuario autenticado
    const llamadaDelete = prismaMock.usuario.delete.mock.calls[0][0]
    expect(llamadaDelete.where.id).toBe(USUARIO_ID)
  })
})

// =============================================================================
// GET /api/cuenta/exportar
// =============================================================================

describe('GET /api/cuenta/exportar', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('debería devolver 401 si no hay sesión', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/cuenta/exportar')
    const response = await GET_EXPORTAR(request)

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBeDefined()
  })

  it('debería devolver los datos del usuario sin passwordHash', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)

    prismaMock.usuario.findUnique.mockResolvedValue(usuarioEnBD)
    prismaMock.reserva.findMany.mockResolvedValue([])

    const request = new NextRequest('http://localhost/api/cuenta/exportar')
    const response = await GET_EXPORTAR(request)

    expect(response.status).toBe(200)
    const body = await response.json()

    // Debe contener los datos del usuario
    expect(body.usuario).toBeDefined()
    expect(body.usuario.nombre).toBe(usuarioEnBD.nombre)
    expect(body.usuario.email).toBe(usuarioEnBD.email)
    expect(body.usuario.creadoEn).toBeDefined()

    // NO debe contener el passwordHash
    expect(body.usuario.passwordHash).toBeUndefined()
    expect(body.usuario.id).toBeUndefined()
  })

  it('debería incluir las reservas del usuario en la exportación', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)

    prismaMock.usuario.findUnique.mockResolvedValue(usuarioEnBD)

    const reservasMock = [
      {
        id: 'reserva-1',
        tenantId: TENANT_ID,
        usuarioId: USUARIO_ID,
        instalacionId: 'inst-1',
        fecha: new Date('2026-03-27T00:00:00Z'),
        horaInicio: new Date('2026-03-27T10:30:00Z'),
        horaFin: new Date('2026-03-27T11:45:00Z'),
        estado: 'ACTIVA',
        creadoEn: new Date('2026-03-25T09:00:00Z'),
        canceladoEn: null,
        canceladoPor: null,
        instalacion: {
          nombre: 'Pista 1',
        },
      },
    ]
    prismaMock.reserva.findMany.mockResolvedValue(reservasMock)

    const request = new NextRequest('http://localhost/api/cuenta/exportar')
    const response = await GET_EXPORTAR(request)

    expect(response.status).toBe(200)
    const body = await response.json()

    expect(body.reservas).toBeDefined()
    expect(Array.isArray(body.reservas)).toBe(true)
    expect(body.reservas).toHaveLength(1)
    expect(body.reservas[0].instalacionNombre).toBe('Pista 1')
    expect(body.reservas[0].estado).toBe('ACTIVA')
  })

  it('no debería incluir datos de otros usuarios', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)

    prismaMock.usuario.findUnique.mockResolvedValue(usuarioEnBD)
    prismaMock.reserva.findMany.mockResolvedValue([])

    const request = new NextRequest('http://localhost/api/cuenta/exportar')
    await GET_EXPORTAR(request)

    // La consulta de reservas debe filtrar por el usuarioId y tenantId de la sesión
    expect(prismaMock.reserva.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          usuarioId: USUARIO_ID,
          tenantId: TENANT_ID,
        }),
      })
    )
  })

  it('debería incluir exportadoEn y cabecera Content-Disposition', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)

    prismaMock.usuario.findUnique.mockResolvedValue(usuarioEnBD)
    prismaMock.reserva.findMany.mockResolvedValue([])

    const request = new NextRequest('http://localhost/api/cuenta/exportar')
    const response = await GET_EXPORTAR(request)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.exportadoEn).toBeDefined()

    const contentDisposition = response.headers.get('content-disposition')
    expect(contentDisposition).toContain('attachment')
    expect(contentDisposition).toContain('mis-datos.json')
  })
})

// =============================================================================
// schemaRegistro con aceptaPrivacidad
// =============================================================================

describe('schemaRegistro — campo aceptaPrivacidad', () => {
  const datosBase = {
    nombre: 'Juan García',
    email: 'juan@test.com',
    password: 'Password1',
  }

  it('debería fallar si aceptaPrivacidad es false', () => {
    const resultado = schemaRegistro.safeParse({
      ...datosBase,
      aceptaPrivacidad: false,
    })
    expect(resultado.success).toBe(false)
    if (!resultado.success) {
      expect(resultado.error.issues[0].message).toContain('privacidad')
    }
  })

  it('debería fallar si aceptaPrivacidad está ausente', () => {
    const resultado = schemaRegistro.safeParse(datosBase)
    expect(resultado.success).toBe(false)
  })

  it('debería pasar si aceptaPrivacidad es true', () => {
    const resultado = schemaRegistro.safeParse({
      ...datosBase,
      aceptaPrivacidad: true,
    })
    expect(resultado.success).toBe(true)
  })
})
