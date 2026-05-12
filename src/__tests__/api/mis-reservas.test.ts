/**
 * Tests para GET /api/reservas/mis-reservas
 * Requiere autenticación — devuelve { activas, historial } del usuario autenticado
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

import { GET } from '@/app/api/reservas/mis-reservas/route'
import { getServerSession } from 'next-auth'

const mockGetServerSession = getServerSession as jest.Mock

describe('GET /api/reservas/mis-reservas', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('debería devolver 401 cuando el usuario no está autenticado', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body).toHaveProperty('error')
  })

  it('debería devolver 200 con activas e historial cuando el usuario está autenticado', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'usuario-1', rol: 'CIUDADANO' } })

    const reservaActiva = {
      id: 'res-1',
      usuarioId: 'usuario-1',
      instalacionId: 'inst-1',
      fecha: new Date('2099-12-30T00:00:00.000Z'),
      horaInicio: new Date('2099-12-30T10:00:00.000Z'),
      horaFin: new Date('2099-12-30T11:00:00.000Z'),
      estado: 'ACTIVA',
      creadoEn: new Date(),
      canceladoEn: null,
      canceladoPor: null,
      instalacion: { id: 'inst-1', nombre: 'Pista 1' },
    }

    const reservaHistorial = {
      id: 'res-2',
      usuarioId: 'usuario-1',
      instalacionId: 'inst-1',
      fecha: new Date('2025-01-10T00:00:00.000Z'),
      horaInicio: new Date('2025-01-10T10:00:00.000Z'),
      horaFin: new Date('2025-01-10T11:00:00.000Z'),
      estado: 'CANCELADA',
      creadoEn: new Date(),
      canceladoEn: new Date(),
      canceladoPor: 'usuario-1',
      instalacion: { id: 'inst-1', nombre: 'Pista 1' },
    }

    // Promise.all ejecuta dos findMany en paralelo
    prismaMock.reserva.findMany
      .mockResolvedValueOnce([reservaActiva])
      .mockResolvedValueOnce([reservaHistorial])

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toHaveProperty('activas')
    expect(body).toHaveProperty('historial')
    expect(body.activas).toHaveLength(1)
    expect(body.historial).toHaveLength(1)
  })

  it('debería devolver arrays vacíos cuando el usuario no tiene reservas', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'usuario-sin-reservas', rol: 'CIUDADANO' } })

    prismaMock.reserva.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.activas).toHaveLength(0)
    expect(body.historial).toHaveLength(0)
  })

  it('debería consultar únicamente las reservas del usuario autenticado', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'usuario-1', rol: 'CIUDADANO' } })
    prismaMock.reserva.findMany.mockResolvedValue([])

    await GET()

    const llamadas = prismaMock.reserva.findMany.mock.calls
    expect(llamadas.length).toBe(2)
    llamadas.forEach((llamada: any[]) => {
      expect(llamada[0]?.where).toMatchObject({ usuarioId: 'usuario-1' })
    })
  })
})
