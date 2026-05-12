/**
 * Tests para POST y DELETE /api/push/suscribir
 * Gestión de suscripciones Web Push del usuario autenticado.
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

// Evitar que web-push intente configurar VAPID al importar push.ts
jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn().mockResolvedValue({ statusCode: 201 }),
}))

import { POST, DELETE } from '@/app/api/push/suscribir/route'
import { getServerSession } from 'next-auth'
import { NextRequest } from 'next/server'

const mockGetServerSession = getServerSession as jest.Mock

const TENANT_ID = 'tenant-test'
const sesionCiudadano = {
  user: { id: 'usuario-1', rol: 'CIUDADANO', tenantId: TENANT_ID },
}

// Body válido para suscribir
const bodyValido = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
  keys: {
    p256dh: 'clave-publica-p256dh',
    auth: 'clave-auth',
  },
}

function crearPostRequest(body: object) {
  return new NextRequest('http://localhost/api/push/suscribir', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function crearDeleteRequest(body: object) {
  return new NextRequest('http://localhost/api/push/suscribir', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/push/suscribir', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('debería devolver 401 si el usuario no está autenticado', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const res = await POST(crearPostRequest(bodyValido))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBeDefined()
  })

  it('debería devolver 400 si el body es inválido', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)

    const res = await POST(crearPostRequest({ endpoint: '', keys: {} }))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBeDefined()
  })

  it('debería crear la suscripción y devolver 200 con { ok: true }', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    prismaMock.suscripcionPush.upsert.mockResolvedValue({
      id: 'suscripcion-1',
      usuarioId: 'usuario-1',
      tenantId: TENANT_ID,
      endpoint: bodyValido.endpoint,
      p256dh: bodyValido.keys.p256dh,
      auth: bodyValido.keys.auth,
      activa: true,
    })

    const res = await POST(crearPostRequest(bodyValido))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(prismaMock.suscripcionPush.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          usuarioId_endpoint: {
            usuarioId: 'usuario-1',
            endpoint: bodyValido.endpoint,
          },
        },
        update: expect.objectContaining({ activa: true }),
        create: expect.objectContaining({
          tenantId: TENANT_ID,
          usuarioId: 'usuario-1',
          endpoint: bodyValido.endpoint,
          p256dh: bodyValido.keys.p256dh,
          auth: bodyValido.keys.auth,
        }),
      })
    )
  })
})

describe('DELETE /api/push/suscribir', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('debería devolver 401 si el usuario no está autenticado', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const res = await DELETE(crearDeleteRequest({ endpoint: bodyValido.endpoint }))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBeDefined()
  })

  it('debería devolver 400 si falta el endpoint', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)

    const res = await DELETE(crearDeleteRequest({}))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBeDefined()
  })

  it('debería marcar la suscripción como inactiva y devolver 200 con { ok: true }', async () => {
    mockGetServerSession.mockResolvedValue(sesionCiudadano)
    prismaMock.suscripcionPush.updateMany.mockResolvedValue({ count: 1 })

    const res = await DELETE(crearDeleteRequest({ endpoint: bodyValido.endpoint }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(prismaMock.suscripcionPush.updateMany).toHaveBeenCalledWith({
      where: {
        usuarioId: 'usuario-1',
        endpoint: bodyValido.endpoint,
      },
      data: { activa: false },
    })
  })
})
