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

// ─── Regla: un ciudadano solo puede tener 1 reserva activa por día ────────────
// La verificación ocurre DENTRO de la transacción (LESSON-001).
// Cuando el ciudadano ya tiene 1 reserva en ese día, la ruta lanza LIMITE_RESERVAS
// y devuelve 409 con el mensaje "Ya tienes una reserva activa para este día".

describe('POST /api/reservas — límite de 1 reserva por día', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    prismaMock.usuario.findMany.mockResolvedValue([])
  })

  it('debería devolver 409 cuando el ciudadano ya tiene 1 reserva activa ese día', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    prismaMock.instalacion.findFirst.mockResolvedValue(instalacionActiva)
    prismaMock.bloqueo.findFirst.mockResolvedValue(null)
    // Sin configuración de límite global → usa default
    prismaMock.tenant.findUnique.mockResolvedValue({ configuracion: null })
    prismaMock.usuario.findUnique.mockResolvedValue({ suspendidoHasta: null, motivoSuspension: null })

    // La transacción ejecuta el callback con prismaMock como cliente tx
    prismaMock.$transaction.mockImplementation((fn: any) => fn(prismaMock))
    // El conteo de reservas ACTIVAS del día devuelve 1 → supera el límite diario
    prismaMock.reserva.count.mockResolvedValue(1)

    const req = new Request('http://localhost/api/reservas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyValido),
    }) as any
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(409)
    expect(body.error).toBe('Ya tienes una reserva activa para este día')
  })

  it('debería devolver 409 cuando el ciudadano tiene 3 reservas activas ese día (nunca puede haber más de 1)', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    prismaMock.instalacion.findFirst.mockResolvedValue(instalacionActiva)
    prismaMock.bloqueo.findFirst.mockResolvedValue(null)
    prismaMock.tenant.findUnique.mockResolvedValue({ configuracion: null })
    prismaMock.usuario.findUnique.mockResolvedValue({ suspendidoHasta: null, motivoSuspension: null })

    prismaMock.$transaction.mockImplementation((fn: any) => fn(prismaMock))
    // Aunque tenga más de 1, la regla se activa desde >= 1
    prismaMock.reserva.count.mockResolvedValue(3)

    const req = new Request('http://localhost/api/reservas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyValido),
    }) as any
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(409)
    expect(body.error).toBe('Ya tienes una reserva activa para este día')
  })

  it('debería devolver 201 cuando el ciudadano no tiene reservas activas ese día (camino feliz)', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    prismaMock.instalacion.findFirst.mockResolvedValue(instalacionActiva)
    prismaMock.bloqueo.findFirst.mockResolvedValue(null)
    prismaMock.tenant.findUnique.mockResolvedValue({ configuracion: null })
    prismaMock.usuario.findUnique.mockResolvedValue({ suspendidoHasta: null, motivoSuspension: null })

    prismaMock.$transaction.mockImplementation((fn: any) => fn(prismaMock))
    // 0 reservas activas ese día → pasa el límite diario
    prismaMock.reserva.count.mockResolvedValue(0)
    // Slot libre → no hay SLOT_OCUPADO
    prismaMock.reserva.findFirst.mockResolvedValue(null)

    const reservaCreada = {
      id: 'reserva-dia-ok',
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
    prismaMock.reserva.create.mockResolvedValue(reservaCreada)

    const req = new Request('http://localhost/api/reservas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyValido),
    }) as any
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body).toHaveProperty('reserva')
    expect(body.reserva.id).toBe('reserva-dia-ok')
  })

  it('debería devolver 201 cuando el ciudadano solo tiene una reserva ACTIVA cuya hora ya pasó ese mismo día (no debe bloquear reservas futuras)', async () => {
    // Hallazgo H1 auditoría UX: una reserva ACTIVA de esta mañana (ya pasada) no debe
    // contar para el límite diario, igual que mis-reservas.ts la excluye de "Activas".
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    prismaMock.instalacion.findFirst.mockResolvedValue(instalacionActiva)
    prismaMock.bloqueo.findFirst.mockResolvedValue(null)
    prismaMock.tenant.findUnique.mockResolvedValue({ configuracion: null })
    prismaMock.usuario.findUnique.mockResolvedValue({ suspendidoHasta: null, motivoSuspension: null })

    prismaMock.$transaction.mockImplementation((fn: any) => fn(prismaMock))

    // Reserva ACTIVA ya existente en BD, del mismo día, pero con horaInicio en el pasado
    const reservaPasadaDelDia = {
      usuarioId: 'usuario-1',
      estado: 'ACTIVA',
      fecha: new Date(`${FECHA_FUTURA}T00:00:00.000Z`),
      horaInicio: new Date('2000-01-01T09:00:00.000Z'), // claramente en el pasado
    }

    // Simula el filtrado real de Prisma sobre el `where` recibido por tx.reserva.count,
    // incluido el filtro horaInicio.gte que debe aplicar la ruta (mismo criterio que
    // usa GET /api/reservas/mis-reservas para decidir qué es "activa").
    prismaMock.reserva.count.mockImplementation((args: any) => {
      const candidatas = [reservaPasadaDelDia]
      const coincide = candidatas.filter((r) => {
        const mismoUsuario = r.usuarioId === args.where.usuarioId
        const mismoEstado = r.estado === args.where.estado
        const mismaFecha = r.fecha.getTime() === args.where.fecha.getTime()
        const cumpleHora = !args.where.horaInicio?.gte || r.horaInicio >= args.where.horaInicio.gte
        return mismoUsuario && mismoEstado && mismaFecha && cumpleHora
      })
      return Promise.resolve(coincide.length)
    })
    prismaMock.reserva.findFirst.mockResolvedValue(null)

    const reservaCreada = {
      id: 'reserva-dia-ok-2',
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
    prismaMock.reserva.create.mockResolvedValue(reservaCreada)

    const req = new Request('http://localhost/api/reservas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyValido),
    }) as any
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body).toHaveProperty('reserva')
    expect(body.reserva.id).toBe('reserva-dia-ok-2')
  })
})
