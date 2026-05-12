/**
 * Tests para GET /api/disponibilidad?instalacionId=&fecha=
 * Ruta pública — no requiere autenticación (GAP-03)
 * Retorna slots libres/ocupados/bloqueados/pasados para una instalación y fecha.
 *
 * NOTA: La ruta usa request.nextUrl (propiedad de NextRequest de Next.js),
 * por lo que los tests deben usar NextRequest, no el Request nativo del navegador.
 * El middleware inyecta x-tenant-id en cada request; los tests lo simulan manualmente.
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

// El middleware inyecta x-tenant-slug (no x-tenant-id). Mockeamos el helper de tenant
// para que resuelva el slug al TENANT_ID de prueba sin consultar la BD real.
jest.mock('@/lib/tenant', () => ({
  obtenerTenantIdPorSlug: jest.fn().mockResolvedValue('tenant-test'),
  extraerSlugDelHost: jest.fn().mockReturnValue('test'),
}))

import { GET } from '@/app/api/disponibilidad/route'
import { NextRequest } from 'next/server'

// ID de tenant de prueba (el middleware lo inyecta como x-tenant-slug)
const TENANT_ID = 'tenant-test'

// Helper: crea un NextRequest con el header de tenant inyectado por el middleware
function crearRequest(url: string) {
  return new NextRequest(url, {
    headers: { 'x-tenant-slug': 'test' },
  })
}

// Instalación activa de prueba
const instalacionActiva = {
  id: 'inst-1',
  tenantId: TENANT_ID,
  nombre: 'Pista 1',
  tipo: 'PADEL',
  descripcion: null,
  activa: true,
  creadoEn: new Date(),
  horario: 'Lun-Dom: 8:00-13:00 y 16:45-20:30',
}

describe('GET /api/disponibilidad', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('debería devolver 404 cuando se consulta sin sesión y la instalación no existe', async () => {
    // La ruta es pública (GAP-03): no requiere autenticación.
    // Sin sesión y con una instalación inexistente, la respuesta debe ser 404.
    prismaMock.instalacion.findFirst.mockResolvedValue(null)

    const req = crearRequest('http://localhost/api/disponibilidad?instalacionId=no-existe&fecha=2099-06-01')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body).toHaveProperty('error')
  })

  it('debería devolver 400 cuando falta el parámetro instalacionId', async () => {
    const req = crearRequest('http://localhost/api/disponibilidad?fecha=2026-06-01')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toMatch(/instalacionId/i)
  })

  it('debería devolver 400 cuando falta el parámetro fecha', async () => {
    const req = crearRequest('http://localhost/api/disponibilidad?instalacionId=inst-1')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toMatch(/fecha/i)
  })

  it('debería devolver 404 cuando la instalación no existe', async () => {
    prismaMock.instalacion.findFirst.mockResolvedValue(null)

    const req = crearRequest('http://localhost/api/disponibilidad?instalacionId=no-existe&fecha=2026-06-01')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body).toHaveProperty('error')
  })

  it('debería devolver 200 con todos los slots bloqueados cuando la instalación está inactiva', async () => {
    prismaMock.instalacion.findFirst.mockResolvedValue({
      ...instalacionActiva,
      activa: false,
    })

    const req = crearRequest('http://localhost/api/disponibilidad?instalacionId=inst-1&fecha=2026-06-01')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.slots).toHaveLength(7)
    expect(body.slots.every((s: { estado: string }) => s.estado === 'bloqueado')).toBe(true)
  })

  it('debería devolver 200 con exactamente 7 slots para una fecha futura', async () => {
    prismaMock.instalacion.findFirst.mockResolvedValue(instalacionActiva)
    prismaMock.reserva.findMany.mockResolvedValue([])
    prismaMock.bloqueo.findMany.mockResolvedValue([])

    const req = crearRequest('http://localhost/api/disponibilidad?instalacionId=inst-1&fecha=2099-12-31')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toHaveProperty('slots')
    expect(body.slots).toHaveLength(7)
  })

  it('debería devolver slots con horaInicio y horaFin correctos', async () => {
    prismaMock.instalacion.findFirst.mockResolvedValue(instalacionActiva)
    prismaMock.reserva.findMany.mockResolvedValue([])
    prismaMock.bloqueo.findMany.mockResolvedValue([])

    const req = crearRequest('http://localhost/api/disponibilidad?instalacionId=inst-1&fecha=2099-12-31')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.slots[0]).toEqual({
      horaInicio: '08:00',
      horaFin: '09:15',
      estado: 'libre',
    })
    expect(body.slots[4]).toEqual({
      horaInicio: '16:45',
      horaFin: '18:00',
      estado: 'libre',
    })
  })

  it('debería marcar como ocupado el slot 08:00 cuando hay una reserva activa a esa hora', async () => {
    prismaMock.instalacion.findFirst.mockResolvedValue(instalacionActiva)
    // Diciembre está en UTC+1 (horario de invierno Madrid).
    // crearHoraEnMadrid("2099-12-31", 08:00) genera T07:00:00.000Z para que Madrid muestre 08:00.
    prismaMock.reserva.findMany.mockResolvedValue([
      {
        horaInicio: new Date('2099-12-31T07:00:00.000Z'),
        horaFin: new Date('2099-12-31T08:15:00.000Z'),
      },
    ])
    prismaMock.bloqueo.findMany.mockResolvedValue([])

    const req = crearRequest('http://localhost/api/disponibilidad?instalacionId=inst-1&fecha=2099-12-31')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    const slotOcupado = body.slots.find((s: any) => s.horaInicio === '08:00')
    expect(slotOcupado).toBeDefined()
    expect(slotOcupado.estado).toBe('ocupado')
  })

  it('debería marcar como ocupado el slot 16:45 cuando hay una reserva activa a esa hora (pausa del mediodía respetada)', async () => {
    prismaMock.instalacion.findFirst.mockResolvedValue(instalacionActiva)
    // crearHoraEnMadrid("2099-12-31", 16:45) genera T15:45:00.000Z para que Madrid muestre 16:45.
    prismaMock.reserva.findMany.mockResolvedValue([
      {
        horaInicio: new Date('2099-12-31T15:45:00.000Z'),
        horaFin: new Date('2099-12-31T17:00:00.000Z'),
      },
    ])
    prismaMock.bloqueo.findMany.mockResolvedValue([])

    const req = crearRequest('http://localhost/api/disponibilidad?instalacionId=inst-1&fecha=2099-12-31')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    const slotOcupado = body.slots.find((s: any) => s.horaInicio === '16:45')
    expect(slotOcupado).toBeDefined()
    expect(slotOcupado.estado).toBe('ocupado')
  })
})
