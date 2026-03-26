/**
 * Tests para GET /api/instalaciones
 * Ruta pública — no requiere autenticación pero sí el header x-tenant-id (inyectado por middleware)
 */

// Usamos var para evitar la Temporal Dead Zone con el hoisting de jest.mock
// eslint-disable-next-line no-var
var prismaMock: any

jest.mock('@/lib/prisma', () => {
  const { mockDeep } = require('jest-mock-extended')
  prismaMock = mockDeep()
  return { prisma: prismaMock }
})

jest.mock('next-auth', () => ({ default: jest.fn() }))

import { GET } from '@/app/api/instalaciones/route'
import { NextRequest } from 'next/server'

// ID de tenant de prueba (el middleware lo inyecta en producción)
const TENANT_ID = 'tenant-test'

// Helper para crear request con el header de tenant inyectado
function crearRequest(url = 'http://localhost/api/instalaciones') {
  return new NextRequest(url, {
    headers: { 'x-tenant-id': TENANT_ID },
  })
}

describe('GET /api/instalaciones', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('debería devolver la lista de instalaciones activas sin requerir autenticación', async () => {
    const instalacionesFake = [
      { id: 'inst-1', nombre: 'Pista 1', tipo: 'PADEL', descripcion: 'Pista cubierta', activa: true, horario: 'Lun-Dom: 8:00-13:00 y 16:45-20:30' },
      { id: 'inst-2', nombre: 'Pista 2', tipo: 'PADEL', descripcion: 'Pista exterior', activa: true, horario: 'Lun-Dom: 8:00-13:00 y 16:45-20:30' },
    ]
    prismaMock.instalacion.findMany.mockResolvedValue(instalacionesFake)

    const res = await GET(crearRequest())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toHaveProperty('instalaciones')
    expect(body.instalaciones).toHaveLength(2)
    expect(body.instalaciones[0].nombre).toBe('Pista 1')
  })

  it('debería incluir el campo horario en la respuesta', async () => {
    const instalacionesFake = [
      { id: 'inst-1', nombre: 'Pista 1', tipo: 'PADEL', descripcion: 'Pista cubierta', activa: true, horario: 'Lun-Dom: 8:00-13:00 y 16:45-20:30' },
    ]
    prismaMock.instalacion.findMany.mockResolvedValue(instalacionesFake)

    const res = await GET(crearRequest())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.instalaciones[0]).toHaveProperty('horario')
    expect(body.instalaciones[0].horario).toBe('Lun-Dom: 8:00-13:00 y 16:45-20:30')
  })

  it('debería devolver un array vacío cuando no hay instalaciones activas', async () => {
    prismaMock.instalacion.findMany.mockResolvedValue([])

    const res = await GET(crearRequest())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.instalaciones).toHaveLength(0)
  })

  it('debería llamar a findMany filtrando por instalaciones activas y tenantId', async () => {
    prismaMock.instalacion.findMany.mockResolvedValue([])

    await GET(crearRequest())

    expect(prismaMock.instalacion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TENANT_ID, activa: true },
      })
    )
  })

  it('debería devolver 400 si falta el header x-tenant-id', async () => {
    // Request sin header de tenant (no debería llegar en producción, pero se protege igual)
    const requestSinTenant = new NextRequest('http://localhost/api/instalaciones')
    const res = await GET(requestSinTenant)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('Tenant')
  })
})
