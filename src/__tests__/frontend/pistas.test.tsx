/**
 * Tests del componente PaginaPistas (Server Component)
 *
 * Estrategia: mockeamos getServerSession, redirect y prisma antes de importar
 * el componente. Renderizamos con `render(await PaginaPistas())`.
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

vi.mock('@/lib/prisma', () => ({
  prisma: {
    instalacion: {
      findMany: vi.fn(),
    },
  },
}))

import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import PaginaPistas from '@/app/pistas/page'

const sesionFicticia = {
  user: { id: 'usuario-123', name: 'Ana García', email: 'ana@example.com', rol: 'CIUDADANO' },
  expires: '2099-01-01',
}

const pistasFicticias = [
  { id: 'p1', nombre: 'Pista de Pádel 1', tipo: 'PADEL', descripcion: 'Pista techada', activa: true, horario: 'Lun-Dom: 8:00-13:00 y 16:45-20:30' },
  { id: 'p2', nombre: 'Pista de Pádel 2', tipo: 'PADEL', descripcion: null, activa: true, horario: 'Lun-Dom: 8:00-13:00 y 16:45-20:30' },
  { id: 'p3', nombre: 'Pista de Pádel 3', tipo: 'PADEL', descripcion: 'Exterior', activa: true, horario: 'Mar-Sab: 9:00-14:00 y 17:00-21:00' },
]

describe('PaginaPistas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debería redirigir a /login si no hay sesión', async () => {
    ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    await expect(PaginaPistas()).rejects.toThrow('NEXT_REDIRECT:/login')
    expect(redirect).toHaveBeenCalledWith('/login')
  })

  it('debería mostrar el título Pistas deportivas', async () => {
    ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(sesionFicticia)
    ;(prisma.instalacion.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(pistasFicticias)

    const elemento = await PaginaPistas()
    render(elemento)

    expect(screen.getByText('Pistas deportivas')).toBeInTheDocument()
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

  it('debería mostrar la etiqueta Padel para pistas de tipo PADEL', async () => {
    ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(sesionFicticia)
    ;(prisma.instalacion.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([pistasFicticias[0]])

    const elemento = await PaginaPistas()
    render(elemento)

    expect(screen.getByText('Padel')).toBeInTheDocument()
  })

  it('debería mostrar la descripción de la pista cuando existe', async () => {
    ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(sesionFicticia)
    ;(prisma.instalacion.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([pistasFicticias[0]])

    const elemento = await PaginaPistas()
    render(elemento)

    expect(screen.getByText('Pista techada')).toBeInTheDocument()
  })

  it('debería mostrar "Sin descripcion" cuando la pista no tiene descripción', async () => {
    ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(sesionFicticia)
    ;(prisma.instalacion.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([pistasFicticias[1]])

    const elemento = await PaginaPistas()
    render(elemento)

    expect(screen.getByText('Sin descripcion')).toBeInTheDocument()
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

    expect(screen.getByText(/No hay pistas disponibles en este momento/i)).toBeInTheDocument()
  })
})
