/**
 * Tests para PATCH /api/reservas/[id]/cancelar
 * Requiere autenticación — cancela una reserva propia (o cualquiera si es admin)
 *
 * Tras Fase 4 multi-tenant: la ruta usa findFirst con { id, tenantId } en lugar de
 * findUnique con solo { id }. Los mocks se actualizan en consecuencia (LESSON-016).
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

// Mockear el módulo de email para que los tests no dependan de RESEND_API_KEY
jest.mock('@/lib/email', () => ({
  enviarEmailCancelacion: jest.fn().mockResolvedValue(undefined),
  enviarEmailCancelacionAdmins: jest.fn().mockResolvedValue(undefined),
}))

// Mockear el módulo de push para que los tests no dependan de VAPID ni de suscripciones reales
jest.mock('@/lib/push', () => ({
  enviarPushCancelacion: jest.fn().mockResolvedValue(undefined),
}))

// Evitar que web-push intente configurar VAPID al importar transitivamente push.ts
jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn().mockResolvedValue({ statusCode: 201 }),
}))

import { PATCH } from '@/app/api/reservas/[id]/cancelar/route'
import { getServerSession } from 'next-auth'
import { NextRequest } from 'next/server'

const mockGetServerSession = getServerSession as jest.Mock

const TENANT_ID = 'tenant-test'

// Sesiones con tenantId (obligatorio desde Fase 4)
const sesionCiudadano = { user: { id: 'usuario-1', rol: 'CIUDADANO', tenantId: TENANT_ID } }
const sesionAdmin = { user: { id: 'admin-1', rol: 'ADMIN', tenantId: TENANT_ID } }

// Reserva activa con horaInicio muy en el futuro (más de 2 horas de margen garantizadas).
// Incluye instalacion y usuario porque la transacción usa include para obtenerlos (email).
const reservaActiva = {
  id: 'reserva-1',
  tenantId: TENANT_ID,
  usuarioId: 'usuario-1',
  instalacionId: 'inst-1',
  fecha: new Date('2099-12-30T00:00:00.000Z'),
  horaInicio: new Date('2099-12-30T10:00:00.000Z'),
  horaFin: new Date('2099-12-30T11:00:00.000Z'),
  estado: 'ACTIVA',
  creadoEn: new Date(),
  canceladoEn: null,
  canceladoPor: null,
  instalacion: { nombre: 'Padel 1' },
  usuario: { nombre: 'Usuario Test', email: 'test@test.com' },
}

function crearRequest(id: string) {
  return new NextRequest(`http://localhost/api/reservas/${id}/cancelar`, { method: 'PATCH' })
}

function crearParams(id: string) {
  return { params: { id } }
}

describe('PATCH /api/reservas/[id]/cancelar', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // La ruta usa prisma.$transaction(async (tx) => { tx.reserva.* })
    // Para que los mocks de prismaMock.reserva.* intercepten las llamadas dentro
    // de la transacción, hacemos que $transaction ejecute el callback pasándole
    // el propio prismaMock como cliente de transacción (tx = prismaMock).
    prismaMock.$transaction.mockImplementation((fn: any) => fn(prismaMock))
    // Mockear usuario.findMany para notificación de admins (Bloque 8)
    prismaMock.usuario.findMany.mockResolvedValue([])
  })

  it('debería devolver 401 cuando el usuario no está autenticado', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const res = await PATCH(crearRequest('reserva-1'), crearParams('reserva-1'))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body).toHaveProperty('error')
  })

  it('debería devolver 404 cuando la reserva no existe', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    // La ruta usa findFirst con { id, tenantId }
    prismaMock.reserva.findFirst.mockResolvedValue(null)

    const res = await PATCH(crearRequest('reserva-inexistente'), crearParams('reserva-inexistente'))
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body).toHaveProperty('error')
  })

  it('debería devolver 403 cuando un ciudadano intenta cancelar una reserva ajena', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'otro-usuario', rol: 'CIUDADANO', tenantId: TENANT_ID } })
    // findFirst encuentra la reserva (pertenece al tenant correcto) pero es de otro usuario
    prismaMock.reserva.findFirst.mockResolvedValue(reservaActiva)

    const res = await PATCH(crearRequest('reserva-1'), crearParams('reserva-1'))
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body).toHaveProperty('error')
  })

  it('debería devolver 200 y ok:true cuando el propietario cancela su propia reserva con antelación suficiente', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    prismaMock.reserva.findFirst.mockResolvedValue(reservaActiva)
    prismaMock.reserva.update.mockResolvedValue({ ...reservaActiva, estado: 'CANCELADA' })

    const res = await PATCH(crearRequest('reserva-1'), crearParams('reserva-1'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toMatchObject({ ok: true })
  })

  it('debería devolver 200 cuando un admin cancela una reserva ajena', async () => {
    mockGetServerSession.mockResolvedValue(sesionAdmin)
    prismaMock.reserva.findFirst.mockResolvedValue(reservaActiva)
    prismaMock.reserva.update.mockResolvedValue({ ...reservaActiva, estado: 'CANCELADA' })

    const res = await PATCH(crearRequest('reserva-1'), crearParams('reserva-1'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toMatchObject({ ok: true })
  })

  it('debería devolver 409 cuando la reserva ya está cancelada', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    prismaMock.reserva.findFirst.mockResolvedValue({ ...reservaActiva, estado: 'CANCELADA' })

    const res = await PATCH(crearRequest('reserva-1'), crearParams('reserva-1'))
    const body = await res.json()

    expect(res.status).toBe(409)
    expect(body).toHaveProperty('error')
  })

  it('debería llamar a prisma.reserva.update con estado CANCELADA al cancelar correctamente', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    prismaMock.reserva.findFirst.mockResolvedValue(reservaActiva)
    prismaMock.reserva.update.mockResolvedValue({ ...reservaActiva, estado: 'CANCELADA' })

    await PATCH(crearRequest('reserva-1'), crearParams('reserva-1'))

    expect(prismaMock.reserva.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'reserva-1' },
        data: expect.objectContaining({ estado: 'CANCELADA' }),
      })
    )
  })

  it('debería enviar push de cancelación cuando un ciudadano cancela su propia reserva', async () => {
    const { enviarPushCancelacion } = require('@/lib/push')
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    prismaMock.reserva.findFirst.mockResolvedValue(reservaActiva)
    prismaMock.reserva.update.mockResolvedValue({ ...reservaActiva, estado: 'CANCELADA' })

    await PATCH(crearRequest('reserva-1'), crearParams('reserva-1'))

    // Esperar a que la promesa asíncrona de push se resuelva
    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(enviarPushCancelacion).toHaveBeenCalledWith(
      expect.objectContaining({
        usuarioId: 'usuario-1',
        nombreInstalacion: 'Padel 1',
        canceladoPorAdmin: false,
      })
    )
  })

  it('debería enviar push con canceladoPorAdmin:true cuando un admin cancela una reserva ajena', async () => {
    const { enviarPushCancelacion } = require('@/lib/push')
    mockGetServerSession.mockResolvedValue(sesionAdmin)
    prismaMock.reserva.findFirst.mockResolvedValue(reservaActiva)
    prismaMock.reserva.update.mockResolvedValue({ ...reservaActiva, estado: 'CANCELADA' })

    await PATCH(crearRequest('reserva-1'), crearParams('reserva-1'))

    // Esperar a que la promesa asíncrona de push se resuelva
    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(enviarPushCancelacion).toHaveBeenCalledWith(
      expect.objectContaining({
        usuarioId: 'usuario-1',
        nombreInstalacion: 'Padel 1',
        canceladoPorAdmin: true,
      })
    )
  })
})
