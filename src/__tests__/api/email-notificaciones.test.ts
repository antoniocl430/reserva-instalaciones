/**
 * Tests para el sistema de notificaciones por email (Bloque 8)
 *
 * Cubre los siguientes comportamientos:
 * 1. Al crear reserva → enviarEmailNotificacionAdmins se llama con los emails de admins activos
 * 2. Al cancelar reserva (ciudadano) → enviarEmailCancelacion se llama con canceladoPorAdmin: false
 * 3. Al cancelar reserva (ciudadano) → enviarEmailCancelacionAdmins se llama
 * 4. Al cancelar reserva (admin) → enviarEmailCancelacion se llama con canceladoPorAdmin: true
 * 5. Al cancelar reserva (admin) → enviarEmailCancelacionAdmins NO se llama
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

// Mockear el módulo de email con todas las funciones (incluidas las nuevas)
jest.mock('@/lib/email', () => ({
  enviarEmailReserva: jest.fn().mockResolvedValue(undefined),
  enviarEmailCancelacion: jest.fn().mockResolvedValue(undefined),
  enviarEmailNotificacionAdmins: jest.fn().mockResolvedValue(undefined),
  enviarEmailCancelacionAdmins: jest.fn().mockResolvedValue(undefined),
}))

// Mockear el módulo de push (Bloque 11) para que los tests no dependan de VAPID ni suscripciones
jest.mock('@/lib/push', () => ({
  enviarPushCancelacion: jest.fn().mockResolvedValue(undefined),
  enviarPushReservaConfirmada: jest.fn().mockResolvedValue(undefined),
}))

// Evitar que web-push intente configurar VAPID al importar transitivamente push.ts
jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn().mockResolvedValue({ statusCode: 201 }),
}))

import { POST } from '@/app/api/reservas/route'
import { PATCH } from '@/app/api/reservas/[id]/cancelar/route'
import { getServerSession } from 'next-auth'
import { NextRequest } from 'next/server'
import * as emailModule from '@/lib/email'

const mockGetServerSession = getServerSession as jest.Mock
const mockEnviarEmailReserva = emailModule.enviarEmailReserva as jest.Mock
const mockEnviarEmailCancelacion = emailModule.enviarEmailCancelacion as jest.Mock
const mockEnviarEmailNotificacionAdmins = emailModule.enviarEmailNotificacionAdmins as jest.Mock
const mockEnviarEmailCancelacionAdmins = emailModule.enviarEmailCancelacionAdmins as jest.Mock

const TENANT_ID = 'tenant-test'
const FECHA_FUTURA = '2099-12-30'

const sesionCiudadano = {
  user: {
    id: 'usuario-1',
    rol: 'CIUDADANO',
    email: 'ciudadano@test.com',
    name: 'Ciudadano Test',
    tenantId: TENANT_ID,
  },
}

const sesionAdmin = {
  user: {
    id: 'admin-1',
    rol: 'ADMIN',
    email: 'admin@test.com',
    name: 'Admin Test',
    tenantId: TENANT_ID,
  },
}

const instalacionActiva = {
  id: 'inst-1',
  tenantId: TENANT_ID,
  nombre: 'Pista Padel 1',
  tipo: 'PADEL',
  descripcion: null,
  activa: true,
  creadoEn: new Date(),
}

const reservaCreada = {
  id: 'reserva-nueva',
  tenantId: TENANT_ID,
  usuarioId: 'usuario-1',
  instalacionId: 'inst-1',
  fecha: new Date('2099-12-30T00:00:00.000Z'),
  horaInicio: new Date('2099-12-30T09:30:00.000Z'),
  horaFin: new Date('2099-12-30T10:45:00.000Z'),
  estado: 'ACTIVA',
  creadoEn: new Date(),
  canceladoEn: null,
  canceladoPor: null,
  instalacion: { nombre: 'Pista Padel 1' },
}

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
  instalacion: { nombre: 'Pista Padel 1' },
  usuario: { nombre: 'Ciudadano Test', email: 'ciudadano@test.com' },
}

const adminsActivos = [
  { email: 'admin1@ayto.es' },
  { email: 'admin2@ayto.es' },
]

function crearRequestReserva(body: object) {
  return new Request('http://localhost/api/reservas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as any
}

function crearRequestCancelar(id: string) {
  return new NextRequest(`http://localhost/api/reservas/${id}/cancelar`, { method: 'PATCH' })
}

function crearParams(id: string) {
  return { params: { id } }
}

// ---------------------------------------------------------------------------
// Tests de creación de reserva — notificación a admins
// ---------------------------------------------------------------------------

describe('POST /api/reservas — notificaciones a admins', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prismaMock.$transaction.mockImplementation((fn: any) => fn(prismaMock))
  })

  it('debería llamar a enviarEmailReserva al ciudadano al crear la reserva', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    prismaMock.instalacion.findFirst.mockResolvedValue(instalacionActiva)
    prismaMock.bloqueo.findFirst.mockResolvedValue(null)
    prismaMock.reserva.count.mockResolvedValue(0)
    prismaMock.reserva.findFirst.mockResolvedValue(null)
    prismaMock.reserva.create.mockResolvedValue(reservaCreada)
    prismaMock.usuario.findMany.mockResolvedValue([])

    const req = crearRequestReserva({
      instalacionId: 'inst-1',
      fecha: FECHA_FUTURA,
      horaInicio: '10:30',
    })

    const res = await POST(req)
    expect(res.status).toBe(201)

    await new Promise(resolve => setTimeout(resolve, 50))

    expect(mockEnviarEmailReserva).toHaveBeenCalledWith(
      expect.objectContaining({
        emailUsuario: 'ciudadano@test.com',
        nombreInstalacion: 'Pista Padel 1',
      })
    )
  })
})

// ---------------------------------------------------------------------------
// Tests de cancelación — notificaciones diferenciadas
// ---------------------------------------------------------------------------

describe('PATCH /api/reservas/[id]/cancelar — notificaciones diferenciadas', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prismaMock.$transaction.mockImplementation((fn: any) => fn(prismaMock))
  })

  it('debería llamar a enviarEmailCancelacion con canceladoPorAdmin: false cuando cancela el ciudadano', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    prismaMock.reserva.findFirst.mockResolvedValue(reservaActiva)
    prismaMock.reserva.update.mockResolvedValue({ ...reservaActiva, estado: 'CANCELADA' })
    prismaMock.usuario.findMany.mockResolvedValue(adminsActivos)

    const res = await PATCH(crearRequestCancelar('reserva-1'), crearParams('reserva-1'))
    expect(res.status).toBe(200)

    await new Promise(resolve => setTimeout(resolve, 50))

    expect(mockEnviarEmailCancelacion).toHaveBeenCalledWith(
      expect.objectContaining({
        canceladoPorAdmin: false,
      })
    )
  })

  it('debería llamar a enviarEmailCancelacionAdmins cuando cancela el ciudadano', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    prismaMock.reserva.findFirst.mockResolvedValue(reservaActiva)
    prismaMock.reserva.update.mockResolvedValue({ ...reservaActiva, estado: 'CANCELADA' })
    prismaMock.usuario.findMany.mockResolvedValue(adminsActivos)

    const res = await PATCH(crearRequestCancelar('reserva-1'), crearParams('reserva-1'))
    expect(res.status).toBe(200)

    await new Promise(resolve => setTimeout(resolve, 50))

    expect(mockEnviarEmailCancelacionAdmins).toHaveBeenCalledWith(
      expect.objectContaining({
        nombreCiudadano: 'Ciudadano Test',
        nombreInstalacion: 'Pista Padel 1',
      }),
      ['admin1@ayto.es', 'admin2@ayto.es']
    )
  })

  it('debería llamar a enviarEmailCancelacion con canceladoPorAdmin: true cuando cancela el admin', async () => {
    mockGetServerSession.mockResolvedValue(sesionAdmin)
    // La reserva pertenece al ciudadano pero el admin la cancela
    prismaMock.reserva.findFirst.mockResolvedValue(reservaActiva)
    prismaMock.reserva.update.mockResolvedValue({ ...reservaActiva, estado: 'CANCELADA' })

    const res = await PATCH(crearRequestCancelar('reserva-1'), crearParams('reserva-1'))
    expect(res.status).toBe(200)

    await new Promise(resolve => setTimeout(resolve, 50))

    expect(mockEnviarEmailCancelacion).toHaveBeenCalledWith(
      expect.objectContaining({
        canceladoPorAdmin: true,
      })
    )
  })

  it('NO debería llamar a enviarEmailCancelacionAdmins cuando cancela el admin', async () => {
    mockGetServerSession.mockResolvedValue(sesionAdmin)
    prismaMock.reserva.findFirst.mockResolvedValue(reservaActiva)
    prismaMock.reserva.update.mockResolvedValue({ ...reservaActiva, estado: 'CANCELADA' })

    const res = await PATCH(crearRequestCancelar('reserva-1'), crearParams('reserva-1'))
    expect(res.status).toBe(200)

    await new Promise(resolve => setTimeout(resolve, 50))

    expect(mockEnviarEmailCancelacionAdmins).not.toHaveBeenCalled()
  })
})
