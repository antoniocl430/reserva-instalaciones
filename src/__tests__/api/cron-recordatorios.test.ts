/**
 * Tests para GET /api/cron/recordatorios
 * Cron job protegido por CRON_SECRET que envía recordatorios push 1h antes de cada reserva.
 */

// eslint-disable-next-line no-var
var prismaMock: any

jest.mock('@/lib/prisma', () => {
  const { mockDeep } = require('jest-mock-extended')
  prismaMock = mockDeep()
  return { prisma: prismaMock }
})

// Mockear web-push para que no intente configurar VAPID
jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn().mockResolvedValue({ statusCode: 201 }),
}))

// Mockear las funciones de push para verificar que se llaman correctamente
jest.mock('@/lib/push', () => ({
  enviarRecordatorioReserva: jest.fn().mockResolvedValue(undefined),
}))

import { GET } from '@/app/api/cron/recordatorios/route'
import { enviarRecordatorioReserva } from '@/lib/push'
import { NextRequest } from 'next/server'

const mockEnviarRecordatorio = enviarRecordatorioReserva as jest.Mock

// Clave secreta de prueba para el entorno de test
const CRON_SECRET = 'cron-secret-test'

beforeAll(() => {
  process.env.CRON_SECRET = CRON_SECRET
})

afterAll(() => {
  delete process.env.CRON_SECRET
})

function crearRequest(authorization?: string) {
  return new NextRequest('http://localhost/api/cron/recordatorios', {
    headers: authorization ? { Authorization: authorization } : {},
  })
}

// Reserva activa de prueba
const reservaProxima = {
  id: 'reserva-1',
  tenantId: 'tenant-test',
  usuarioId: 'usuario-1',
  instalacionId: 'inst-1',
  fecha: new Date('2099-12-30T00:00:00.000Z'),
  horaInicio: new Date('2099-12-30T09:00:00.000Z'),
  horaFin: new Date('2099-12-30T10:00:00.000Z'),
  estado: 'ACTIVA',
  recordatorioEnviado: false,
  instalacion: { nombre: 'Padel 1' },
}

describe('GET /api/cron/recordatorios', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('debería devolver 401 si no hay header Authorization', async () => {
    const res = await GET(crearRequest())
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBeDefined()
  })

  it('debería devolver 401 si el CRON_SECRET no coincide', async () => {
    const res = await GET(crearRequest('Bearer clave-incorrecta'))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBeDefined()
  })

  it('debería devolver 200 con { enviados: 0 } si no hay reservas en la ventana', async () => {
    prismaMock.reserva.findMany.mockResolvedValue([])

    const res = await GET(crearRequest(`Bearer ${CRON_SECRET}`))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.enviados).toBe(0)
  })

  it('debería enviar recordatorio y marcar recordatorioEnviado=true para cada reserva', async () => {
    prismaMock.reserva.findMany.mockResolvedValue([reservaProxima])
    prismaMock.reserva.update.mockResolvedValue({ ...reservaProxima, recordatorioEnviado: true })

    const res = await GET(crearRequest(`Bearer ${CRON_SECRET}`))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.enviados).toBe(1)
    expect(mockEnviarRecordatorio).toHaveBeenCalledTimes(1)
    expect(mockEnviarRecordatorio).toHaveBeenCalledWith(
      expect.objectContaining({
        usuarioId: 'usuario-1',
        nombreInstalacion: 'Padel 1',
      })
    )
    expect(prismaMock.reserva.update).toHaveBeenCalledWith({
      where: { id: 'reserva-1' },
      data: { recordatorioEnviado: true },
    })
  })

  it('debería procesar múltiples reservas y devolver el total enviado', async () => {
    const reserva2 = { ...reservaProxima, id: 'reserva-2', usuarioId: 'usuario-2' }
    prismaMock.reserva.findMany.mockResolvedValue([reservaProxima, reserva2])
    prismaMock.reserva.update.mockResolvedValue({ count: 1 })

    const res = await GET(crearRequest(`Bearer ${CRON_SECRET}`))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.enviados).toBe(2)
    expect(mockEnviarRecordatorio).toHaveBeenCalledTimes(2)
  })

  it('debería buscar reservas en la ventana [ahora+55min, ahora+75min]', async () => {
    prismaMock.reserva.findMany.mockResolvedValue([])

    await GET(crearRequest(`Bearer ${CRON_SECRET}`))

    expect(prismaMock.reserva.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          estado: 'ACTIVA',
          recordatorioEnviado: false,
        }),
      })
    )
  })
})
