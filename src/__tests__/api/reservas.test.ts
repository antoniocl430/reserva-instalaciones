/**
 * Tests para POST /api/reservas
 * Requiere autenticación — crea una reserva con todas las validaciones de negocio
 *
 * Fase 4 multi-tenant:
 *   - La ruta usa findFirst con { id, tenantId } para verificar instalación y bloqueo
 *   - La sesión incluye tenantId (LESSON-016)
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
  enviarEmailReserva: jest.fn().mockResolvedValue(undefined),
  enviarEmailNotificacionAdmins: jest.fn().mockResolvedValue(undefined),
}))

// Mockear web-push y @/lib/push para evitar dependencia de credenciales VAPID (LESSON-021)
jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn().mockResolvedValue({ statusCode: 201 }),
}))
jest.mock('@/lib/push', () => ({
  enviarPushReservaConfirmada: jest.fn().mockResolvedValue(undefined),
}))

import { POST } from '@/app/api/reservas/route'
import { getServerSession } from 'next-auth'

const mockGetServerSession = getServerSession as jest.Mock

const TENANT_ID = 'tenant-test'
const FECHA_FUTURA = '2099-12-30'
const bodyValido = {
  instalacionId: 'inst-1',
  fecha: FECHA_FUTURA,
  horaInicio: '10:30',
}

// La sesión incluye tenantId desde Fase 4
const sesionCiudadano = {
  user: {
    id: 'usuario-1',
    rol: 'CIUDADANO',
    email: 'test@test.com',
    tenantId: TENANT_ID,
  },
}

const instalacionActiva = {
  id: 'inst-1',
  tenantId: TENANT_ID,
  nombre: 'Pista 1',
  tipo: 'PADEL',
  descripcion: null,
  activa: true,
  creadoEn: new Date(),
}

describe('POST /api/reservas', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mockear usuario.findMany para notificación de admins post-creación (Bloque 8)
    prismaMock.usuario.findMany.mockResolvedValue([])
  })

  it('debería devolver 401 cuando el usuario no está autenticado', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const req = new Request('http://localhost/api/reservas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyValido),
    }) as any
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body).toHaveProperty('error')
  })

  it('debería devolver 400 cuando faltan campos obligatorios en el cuerpo', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)

    const req = new Request('http://localhost/api/reservas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instalacionId: 'inst-1' }), // faltan fecha y horaInicio
    }) as any
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body).toHaveProperty('error')
  })

  it('debería devolver 400 cuando la horaInicio está fuera del rango permitido (antes de 08:00)', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)

    const req = new Request('http://localhost/api/reservas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...bodyValido, horaInicio: '07:00' }),
    }) as any
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toContain('Invalid option')
  })

  it('debería devolver 400 cuando horaInicio es una hora en punto no válida como "10:00" (no es slot)', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)

    const req = new Request('http://localhost/api/reservas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...bodyValido, horaInicio: '10:00' }),
    }) as any
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toContain('Invalid option')
  })

  it('debería devolver 400 cuando horaInicio es "14:00" (está en la pausa del mediodía)', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)

    const req = new Request('http://localhost/api/reservas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...bodyValido, horaInicio: '14:00' }),
    }) as any
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toContain('Invalid option')
  })

  it('debería devolver 201 cuando horaInicio es "11:45" (slot válido con minutos)', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    // La ruta usa findFirst con { id, tenantId } desde Fase 4 (LESSON-016)
    prismaMock.instalacion.findFirst.mockResolvedValue(instalacionActiva)
    prismaMock.bloqueo.findFirst.mockResolvedValue(null)
    prismaMock.reserva.count.mockResolvedValue(0)

    const reservaCreada = {
      id: 'reserva-nueva',
      tenantId: TENANT_ID,
      usuarioId: 'usuario-1',
      instalacionId: 'inst-1',
      fecha: new Date(`${FECHA_FUTURA}T00:00:00.000Z`),
      horaInicio: new Date(`${FECHA_FUTURA}T11:45:00.000Z`),
      horaFin: new Date(`${FECHA_FUTURA}T13:00:00.000Z`),
      estado: 'ACTIVA',
      creadoEn: new Date(),
      canceladoEn: null,
      canceladoPor: null,
      instalacion: { nombre: 'Pista 1' },
    }
    prismaMock.$transaction.mockResolvedValue(reservaCreada)

    const req = new Request('http://localhost/api/reservas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...bodyValido, horaInicio: '11:45' }),
    }) as any
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body).toHaveProperty('reserva')
    expect(body.reserva.id).toBe('reserva-nueva')
  })

  it('debería devolver 201 cuando horaInicio es "09:15" (slot válido con minutos)', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    // La ruta usa findFirst con { id, tenantId } desde Fase 4 (LESSON-016)
    prismaMock.instalacion.findFirst.mockResolvedValue(instalacionActiva)
    prismaMock.bloqueo.findFirst.mockResolvedValue(null)
    prismaMock.reserva.count.mockResolvedValue(0)

    const reservaCreada = {
      id: 'reserva-nueva-2',
      tenantId: TENANT_ID,
      usuarioId: 'usuario-1',
      instalacionId: 'inst-1',
      fecha: new Date(`${FECHA_FUTURA}T00:00:00.000Z`),
      horaInicio: new Date(`${FECHA_FUTURA}T09:15:00.000Z`),
      horaFin: new Date(`${FECHA_FUTURA}T10:30:00.000Z`),
      estado: 'ACTIVA',
      creadoEn: new Date(),
      canceladoEn: null,
      canceladoPor: null,
      instalacion: { nombre: 'Pista 1' },
    }
    prismaMock.$transaction.mockResolvedValue(reservaCreada)

    const req = new Request('http://localhost/api/reservas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...bodyValido, horaInicio: '09:15' }),
    }) as any
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body).toHaveProperty('reserva')
    expect(body.reserva.id).toBe('reserva-nueva-2')
  })

  it('debería devolver 404 cuando la instalación no existe o está inactiva', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    // La ruta usa findFirst con { id, tenantId } desde Fase 4 (LESSON-016)
    prismaMock.instalacion.findFirst.mockResolvedValue(null)

    const req = new Request('http://localhost/api/reservas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyValido),
    }) as any
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body).toHaveProperty('error')
  })

  it('debería devolver 409 cuando el ciudadano supera el límite de reservas activas (default: 2)', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    // La ruta usa findFirst con { id, tenantId } desde Fase 4 (LESSON-016)
    prismaMock.instalacion.findFirst.mockResolvedValue(instalacionActiva)
    prismaMock.bloqueo.findFirst.mockResolvedValue(null)
    // Sin configuración de límite en el tenant → usa el default de 2
    prismaMock.tenant.findUnique.mockResolvedValue({ configuracion: null })
    // Para que tx.reserva.count sea interceptado, hacemos que $transaction ejecute
    // el callback pasándole el propio prismaMock como cliente de transacción (tx).
    prismaMock.$transaction.mockImplementation((fn: any) => fn(prismaMock))
    // El ciudadano ya tiene 2 reservas activas → supera el límite default
    prismaMock.reserva.count.mockResolvedValue(2)
    prismaMock.usuario.findUnique.mockResolvedValue({ suspendidoHasta: null, motivoSuspension: null })

    const req = new Request('http://localhost/api/reservas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyValido),
    }) as any
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(409)
    expect(body.error).toContain('2')
  })

  it('debería devolver 409 con limiteReservasActivas: 1 cuando el ciudadano ya tiene 1 reserva activa', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    prismaMock.instalacion.findFirst.mockResolvedValue(instalacionActiva)
    prismaMock.bloqueo.findFirst.mockResolvedValue(null)
    // Config con límite reducido a 1
    prismaMock.tenant.findUnique.mockResolvedValue({
      configuracion: JSON.stringify({ limiteReservasActivas: 1 }),
    })
    prismaMock.$transaction.mockImplementation((fn: any) => fn(prismaMock))
    // El ciudadano ya tiene 1 reserva activa → supera el límite configurado
    prismaMock.reserva.count.mockResolvedValue(1)
    prismaMock.usuario.findUnique.mockResolvedValue({ suspendidoHasta: null, motivoSuspension: null })

    const req = new Request('http://localhost/api/reservas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyValido),
    }) as any
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(409)
    expect(body.error).toContain('1')
  })

  it('debería devolver 201 con limiteReservasActivas: 3 cuando el ciudadano tiene 2 reservas activas', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    prismaMock.instalacion.findFirst.mockResolvedValue(instalacionActiva)
    prismaMock.bloqueo.findFirst.mockResolvedValue(null)
    // Config con límite ampliado a 3
    prismaMock.tenant.findUnique.mockResolvedValue({
      configuracion: JSON.stringify({ limiteReservasActivas: 3 }),
    })
    prismaMock.$transaction.mockImplementation((fn: any) => fn(prismaMock))
    // El ciudadano tiene 2 reservas activas → aún está por debajo del límite de 3
    prismaMock.reserva.count.mockResolvedValue(2)
    prismaMock.usuario.findUnique.mockResolvedValue({ suspendidoHasta: null, motivoSuspension: null })
    prismaMock.reserva.findFirst.mockResolvedValue(null) // slot disponible
    prismaMock.reserva.create.mockResolvedValue({
      id: 'reserva-limite3',
      tenantId: TENANT_ID,
      usuarioId: 'usuario-1',
      instalacionId: 'inst-1',
      estado: 'ACTIVA',
      instalacion: { nombre: 'Pista 1' },
    })

    const req = new Request('http://localhost/api/reservas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyValido),
    }) as any
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body).toHaveProperty('reserva')
  })

  it('debería devolver 409 con el mensaje que incluye el número correcto del límite configurado', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    prismaMock.instalacion.findFirst.mockResolvedValue(instalacionActiva)
    prismaMock.bloqueo.findFirst.mockResolvedValue(null)
    // Config con límite de 5
    prismaMock.tenant.findUnique.mockResolvedValue({
      configuracion: JSON.stringify({ limiteReservasActivas: 5 }),
    })
    prismaMock.$transaction.mockImplementation((fn: any) => fn(prismaMock))
    // El ciudadano ya tiene 5 reservas activas → supera el límite de 5
    prismaMock.reserva.count.mockResolvedValue(5)
    prismaMock.usuario.findUnique.mockResolvedValue({ suspendidoHasta: null, motivoSuspension: null })

    const req = new Request('http://localhost/api/reservas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyValido),
    }) as any
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(409)
    expect(body.error).toContain('5')
  })

  it('debería devolver 409 cuando el slot ya está ocupado (detectado en la transacción)', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    // La ruta usa findFirst con { id, tenantId } desde Fase 4 (LESSON-016)
    prismaMock.instalacion.findFirst.mockResolvedValue(instalacionActiva)
    prismaMock.bloqueo.findFirst.mockResolvedValue(null)
    prismaMock.reserva.count.mockResolvedValue(0)
    // La transacción lanza el error interno de slot ocupado
    prismaMock.$transaction.mockRejectedValue(new Error('SLOT_OCUPADO'))

    const req = new Request('http://localhost/api/reservas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyValido),
    }) as any
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(409)
    expect(body.error).toMatch(/slot/i)
  })

  it('debería devolver 201 y la reserva cuando todos los datos son correctos', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    // La ruta usa findFirst con { id, tenantId } desde Fase 4 (LESSON-016)
    prismaMock.instalacion.findFirst.mockResolvedValue(instalacionActiva)
    prismaMock.bloqueo.findFirst.mockResolvedValue(null)
    prismaMock.reserva.count.mockResolvedValue(0)

    const reservaCreada = {
      id: 'reserva-nueva',
      tenantId: TENANT_ID,
      usuarioId: 'usuario-1',
      instalacionId: 'inst-1',
      fecha: new Date(`${FECHA_FUTURA}T00:00:00.000Z`),
      horaInicio: new Date(`${FECHA_FUTURA}T10:30:00.000Z`),
      horaFin: new Date(`${FECHA_FUTURA}T11:45:00.000Z`),
      estado: 'ACTIVA',
      creadoEn: new Date(),
      canceladoEn: null,
      canceladoPor: null,
      instalacion: { nombre: 'Pista 1' },
    }
    prismaMock.$transaction.mockResolvedValue(reservaCreada)

    const req = new Request('http://localhost/api/reservas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyValido),
    }) as any
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body).toHaveProperty('reserva')
    expect(body.reserva.id).toBe('reserva-nueva')
  })
})
