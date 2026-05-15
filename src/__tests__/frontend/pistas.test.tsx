/**
 * Tests del componente PaginaPistas (Server Component)
 *
 * Estrategia: mockeamos getServerSession, prisma, next/headers y tenant antes de importar
 * el componente. Renderizamos con `render(await PaginaPistas())`.
 * La página es pública — no redirige si no hay sesión.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// --- Mocks ---

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    React.createElement('a', { href, className }, children),
}))

vi.mock('@/lib/auth', () => ({
  opcionesAuth: {},
}))

// next/headers: mock para que no falle fuera de contexto de petición HTTP
vi.mock('next/headers', () => ({
  headers: vi.fn(() => ({ get: vi.fn(() => 'desarrollo') })),
}))

// tenant: resuelve siempre el tenant de desarrollo
vi.mock('@/lib/tenant', () => ({
  obtenerTenantPorSlug: vi.fn().mockResolvedValue({ id: 'tenant-desarrollo-0001', slug: 'desarrollo' }),
  extraerSlugDelHost: vi.fn(() => 'desarrollo'),
}))

// Mock de shadcn Card: renderiza divs simples para evitar dependencias de Radix
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('div', { className, 'data-testid': 'card' }, children),
  CardHeader: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', {}, children),
  CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('h3', { className }, children),
  CardDescription: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', {}, children),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('div', { className }, children),
  CardFooter: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', {}, children),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('span', { className, 'data-testid': 'badge' }, children),
}))

// Mock de StarRating para evitar dependencias en tests de pistas
vi.mock('@/components/StarRating', () => ({
  default: ({ value, size }: { value: number; size?: string }) =>
    React.createElement('div', { 'data-testid': 'star-rating', 'data-value': value, 'data-size': size }),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    instalacion: {
      findMany: vi.fn(),
    },
    valoracion: {
      // aggregate siempre devuelve 0 valoraciones por defecto en los tests existentes
      aggregate: vi.fn().mockResolvedValue({
        _avg: { puntuacion: null },
        _count: { puntuacion: 0 },
      }),
    },
  },
}))

import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import PaginaPistas from '@/app/pistas/page'

const sesionFicticia = {
  user: { id: 'usuario-123', name: 'Ana García', email: 'ana@example.com', rol: 'CIUDADANO', tenantId: 'tenant-desarrollo-0001' },
  expires: '2099-01-01',
}

// Los datos ficticios incluyen _count para compatibilidad con la nueva query que usa _count.valoraciones
const pistasFicticias = [
  { id: 'p1', nombre: 'Pista de Pádel 1', tipo: 'PADEL', descripcion: 'Pista techada', activa: true, horario: 'Lun-Dom: 8:00-13:00 y 16:45-20:30', _count: { valoraciones: 0 } },
  { id: 'p2', nombre: 'Pista de Pádel 2', tipo: 'PADEL', descripcion: null, activa: true, horario: 'Lun-Dom: 8:00-13:00 y 16:45-20:30', _count: { valoraciones: 0 } },
  { id: 'p3', nombre: 'Pista de Pádel 3', tipo: 'PADEL', descripcion: 'Exterior', activa: true, horario: 'Mar-Sab: 9:00-14:00 y 17:00-21:00', _count: { valoraciones: 0 } },
]

describe('PaginaPistas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debería mostrar el título Instalaciones deportivas con o sin sesión', async () => {
    ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    ;(prisma.instalacion.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(pistasFicticias)

    const elemento = await PaginaPistas()
    render(elemento)

    expect(screen.getByText('Instalaciones deportivas')).toBeInTheDocument()
  })

  it('debería mostrar subtítulo de reserva cuando hay sesión', async () => {
    ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(sesionFicticia)
    ;(prisma.instalacion.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(pistasFicticias)

    const elemento = await PaginaPistas()
    render(elemento)

    expect(screen.getByText(/Selecciona una instalación para ver su disponibilidad y reservar/i)).toBeInTheDocument()
  })

  it('debería mostrar subtítulo de solo consulta cuando no hay sesión', async () => {
    ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    ;(prisma.instalacion.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(pistasFicticias)

    const elemento = await PaginaPistas()
    render(elemento)

    expect(screen.getByText(/Consulta la disponibilidad/i)).toBeInTheDocument()
  })

  it('debería mostrar las pistas disponibles con sus nombres', async () => {
    ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(sesionFicticia)
    ;(prisma.instalacion.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(pistasFicticias)

    const elemento = await PaginaPistas()
    render(elemento)

    expect(screen.getByText('Pista de Pádel 1')).toBeInTheDocument()
    expect(screen.getByText('Pista de Pádel 2')).toBeInTheDocument()
    expect(screen.getByText('Pista de Pádel 3')).toBeInTheDocument()
  })

  it('debería mostrar un botón "Ver disponibilidad" por cada pista', async () => {
    ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(sesionFicticia)
    ;(prisma.instalacion.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(pistasFicticias)

    const elemento = await PaginaPistas()
    render(elemento)

    const botones = screen.getAllByText('Ver disponibilidad')
    expect(botones).toHaveLength(3)
  })

  it('debería enlazar cada botón Ver disponibilidad a la URL correcta de la pista', async () => {
    ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(sesionFicticia)
    ;(prisma.instalacion.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(pistasFicticias)

    const elemento = await PaginaPistas()
    render(elemento)

    const enlaces = screen.getAllByRole('link', { name: /Ver disponibilidad/i })
    const hrefs = enlaces.map((el) => el.getAttribute('href'))

    expect(hrefs).toContain('/pistas/p1')
    expect(hrefs).toContain('/pistas/p2')
    expect(hrefs).toContain('/pistas/p3')
  })

  it('debería mostrar la etiqueta Pádel para pistas de tipo PADEL', async () => {
    ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(sesionFicticia)
    ;(prisma.instalacion.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([pistasFicticias[0]])

    const elemento = await PaginaPistas()
    render(elemento)

    expect(screen.getByText('Pádel')).toBeInTheDocument()
  })

  it('debería mostrar la descripción de la pista cuando existe', async () => {
    ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(sesionFicticia)
    ;(prisma.instalacion.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([pistasFicticias[0]])

    const elemento = await PaginaPistas()
    render(elemento)

    expect(screen.getByText('Pista techada')).toBeInTheDocument()
  })

  it('debería mostrar "Sin descripción" cuando la pista no tiene descripción', async () => {
    ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(sesionFicticia)
    ;(prisma.instalacion.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([pistasFicticias[1]])

    const elemento = await PaginaPistas()
    render(elemento)

    expect(screen.getByText('Sin descripción')).toBeInTheDocument()
  })

  it('debería mostrar el horario de cada pista en la tarjeta', async () => {
    ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(sesionFicticia)
    ;(prisma.instalacion.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([pistasFicticias[0], pistasFicticias[2]])

    const elemento = await PaginaPistas()
    render(elemento)

    expect(screen.getByText('Lun-Dom: 8:00-13:00 y 16:45-20:30')).toBeInTheDocument()
    expect(screen.getByText('Mar-Sab: 9:00-14:00 y 17:00-21:00')).toBeInTheDocument()
  })

  it('debería mostrar mensaje vacío cuando no hay pistas disponibles', async () => {
    ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(sesionFicticia)
    ;(prisma.instalacion.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])

    const elemento = await PaginaPistas()
    render(elemento)

    expect(screen.getByText(/No hay instalaciones disponibles en este momento/i)).toBeInTheDocument()
  })
})
