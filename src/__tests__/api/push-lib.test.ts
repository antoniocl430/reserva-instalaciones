/**
 * Tests unitarios para src/lib/push.ts
 * Verifica las funciones de envío de notificaciones Web Push.
 * Mockea web-push y prisma para no depender de servicios externos.
 */

// eslint-disable-next-line no-var
var prismaMock: any
// eslint-disable-next-line no-var
var webpushMock: any

jest.mock('@/lib/prisma', () => {
  const { mockDeep } = require('jest-mock-extended')
  prismaMock = mockDeep()
  return { prisma: prismaMock }
})

jest.mock('web-push', () => {
  webpushMock = {
    setVapidDetails: jest.fn(),
    sendNotification: jest.fn().mockResolvedValue({ statusCode: 201 }),
  }
  return webpushMock
})

import { enviarPushUsuario, enviarRecordatorioReserva, enviarPushCancelacion } from '@/lib/push'

// Suscripciones de prueba
const suscripcionActiva = {
  id: 'suscripcion-1',
  tenantId: 'tenant-test',
  usuarioId: 'usuario-1',
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
  p256dh: 'clave-publica-p256dh',
  auth: 'clave-auth',
  activa: true,
  creadoEn: new Date(),
}

describe('enviarPushUsuario', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('debería enviar push a todas las suscripciones activas del usuario', async () => {
    prismaMock.suscripcionPush.findMany.mockResolvedValue([suscripcionActiva])
    webpushMock.sendNotification.mockResolvedValue({ statusCode: 201 })

    await enviarPushUsuario('usuario-1', {
      titulo: 'Recordatorio',
      cuerpo: 'Tu reserva es en 1 hora',
    })

    expect(prismaMock.suscripcionPush.findMany).toHaveBeenCalledWith({
      where: { usuarioId: 'usuario-1', activa: true },
    })
    expect(webpushMock.sendNotification).toHaveBeenCalledTimes(1)
  })

  it('debería desactivar la suscripción en BD si el endpoint responde con 410', async () => {
    prismaMock.suscripcionPush.findMany.mockResolvedValue([suscripcionActiva])
    const errorGone = Object.assign(new Error('Gone'), { statusCode: 410 })
    webpushMock.sendNotification.mockRejectedValue(errorGone)
    prismaMock.suscripcionPush.updateMany.mockResolvedValue({ count: 1 })

    await enviarPushUsuario('usuario-1', {
      titulo: 'Test',
      cuerpo: 'Cuerpo de prueba',
    })

    expect(prismaMock.suscripcionPush.updateMany).toHaveBeenCalledWith({
      where: { usuarioId: 'usuario-1', endpoint: suscripcionActiva.endpoint },
      data: { activa: false },
    })
  })

  it('debería no enviar nada si el usuario no tiene suscripciones activas', async () => {
    prismaMock.suscripcionPush.findMany.mockResolvedValue([])

    await enviarPushUsuario('usuario-1', {
      titulo: 'Test',
      cuerpo: 'Sin suscripciones',
    })

    expect(webpushMock.sendNotification).not.toHaveBeenCalled()
  })

  it('debería enviar push a múltiples suscripciones simultáneamente', async () => {
    const suscripcion2 = { ...suscripcionActiva, id: 'suscripcion-2', endpoint: 'https://fcm.example.com/other' }
    prismaMock.suscripcionPush.findMany.mockResolvedValue([suscripcionActiva, suscripcion2])
    webpushMock.sendNotification.mockResolvedValue({ statusCode: 201 })

    await enviarPushUsuario('usuario-1', {
      titulo: 'Test múltiple',
      cuerpo: 'Cuerpo',
    })

    expect(webpushMock.sendNotification).toHaveBeenCalledTimes(2)
  })
})

describe('enviarRecordatorioReserva', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('debería llamar enviarPushUsuario con el payload de recordatorio correcto', async () => {
    prismaMock.suscripcionPush.findMany.mockResolvedValue([suscripcionActiva])
    webpushMock.sendNotification.mockResolvedValue({ statusCode: 201 })

    await enviarRecordatorioReserva({
      usuarioId: 'usuario-1',
      nombreInstalacion: 'Padel 1',
      fecha: '2099-12-30',
      horaInicio: '10:00',
    })

    expect(webpushMock.sendNotification).toHaveBeenCalledTimes(1)
    const llamada = webpushMock.sendNotification.mock.calls[0]
    const payload = JSON.parse(llamada[1])
    // El payload debe incluir datos de la reserva
    expect(payload.titulo).toBeDefined()
    expect(payload.cuerpo).toContain('Padel 1')
  })
})

describe('enviarPushCancelacion', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('debería llamar enviarPushUsuario con el payload de cancelación por admin', async () => {
    prismaMock.suscripcionPush.findMany.mockResolvedValue([suscripcionActiva])
    webpushMock.sendNotification.mockResolvedValue({ statusCode: 201 })

    await enviarPushCancelacion({
      usuarioId: 'usuario-1',
      nombreInstalacion: 'Padel 1',
      fecha: '2099-12-30',
      horaInicio: '10:00',
      canceladoPorAdmin: true,
    })

    expect(webpushMock.sendNotification).toHaveBeenCalledTimes(1)
    const llamada = webpushMock.sendNotification.mock.calls[0]
    const payload = JSON.parse(llamada[1])
    expect(payload.titulo).toBeDefined()
    expect(payload.cuerpo).toContain('Padel 1')
  })

  it('debería usar un mensaje diferente cuando cancela el propio ciudadano', async () => {
    prismaMock.suscripcionPush.findMany.mockResolvedValue([suscripcionActiva])
    webpushMock.sendNotification.mockResolvedValue({ statusCode: 201 })

    await enviarPushCancelacion({
      usuarioId: 'usuario-1',
      nombreInstalacion: 'Padel 2',
      fecha: '2099-12-30',
      horaInicio: '12:00',
      canceladoPorAdmin: false,
    })

    expect(webpushMock.sendNotification).toHaveBeenCalledTimes(1)
    const llamada = webpushMock.sendNotification.mock.calls[0]
    const payload = JSON.parse(llamada[1])
    expect(payload.titulo).toBeDefined()
    expect(payload.cuerpo).toContain('Padel 2')
  })
})
