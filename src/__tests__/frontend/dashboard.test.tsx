/**
 * Tests del componente PaginaDashboard (Server Component)
 *
 * Estrategia: mockeamos getServerSession, redirect y prisma antes de importar
 * el componente. Renderizamos con `render(await PaginaDashboard())` porque
 * el componente es async.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// --- Mocks de dependencias del servidor ---

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

vi.mock('@/lib/prisma', () => ({
  prisma: {
    reserva: {
      findMany: vi.fn(),
    },
  },
}))

import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import PaginaDashboard from '@/app/dashboard/page'

const sesionFicticia = {
  user: {
    id: 'usuario-123',
    name: 'Ana García',
    email: 'ana@example.com',
    rol: 'CIUDADANO',
  },
  expires: '2099-01-01',
}

function crearReservaFicticia(id: string, nombre: string) {
  return {
    id,
    horaInicio: new Date('2026-03-25T10:00:00Z'),
    horaFin: new Date('2026-03-25T11:00:00Z'),
    estado: 'ACTIVA',
    instalacion: { id: 'inst-1', nombre },
  }
}

describe('PaginaDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debería redirigir a /login si no hay sesión', async () => {
    ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    await expect(PaginaDashboard()).rejects.toThrow('NEXT_REDIRECT:/login')
    expect(redirect).toHaveBeenCalledWith('/login')
  })

  it('debería mostrar el nombre del usuario autenticado', async () => {
    ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(sesionFicticia)
    ;(prisma.reserva.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])

    const elemento = await PaginaDashboard()
    render(elemento)

    expect(screen.getByText(/Ana García/i)).toBeInTheDocument()
  })

  it('debería mostrar el acceso rápido Reservar pista con enlace a /pistas', async () => {
    ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(sesionFicticia)
    ;(prisma.reserva.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])

    const elemento = await PaginaDashboard()
    render(elemento)

    expect(screen.getByText('Reservar pista')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Reservar pista/i })).toHaveAttribute('href', '/pistas')
  })

  it('debería mostrar el acceso rápido Mis reservas con enlace a /mis-reservas', async () => {
    ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(sesionFicticia)
    ;(prisma.reserva.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])

    const elemento = await PaginaDashboard()
    render(elemento)

    expect(screen.getByText('Mis reservas')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Mis reservas/i })).toHaveAttribute('href', '/mis-reservas')
  })

  it('debería mostrar mensaje vacío cuando no hay reservas activas', async () => {
    ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(sesionFicticia)
    ;(prisma.reserva.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])

    const elemento = await PaginaDashboard()
    render(elemento)

    const mensajes = screen.getAllByText(/No tienes reservas activas/i)
    expect(mensajes.length).toBeGreaterThanOrEqual(1)
  })

  it('debería mostrar las reservas activas del usuario con su nombre de pista', async () => {
    ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(sesionFicticia)
    ;(prisma.reserva.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      crearReservaFicticia('r1', 'Pista de Pádel 1'),
    ])

    const elemento = await PaginaDashboard()
    render(elemento)

    expect(screen.getByText('Pista de Pádel 1')).toBeInTheDocument()
    expect(screen.getByText('Activa')).toBeInTheDocument()
  })

  it('debería mostrar banner de límite cuando el usuario tiene 2 reservas activas', async () => {
    ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(sesionFicticia)
    ;(prisma.reserva.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      crearReservaFicticia('r1', 'Pista de Pádel 1'),
      crearReservaFicticia('r2', 'Pista de Pádel 2'),
    ])

    const elemento = await PaginaDashboard()
    render(elemento)

    expect(
      screen.getByText(/Has alcanzado el limite de 2 reservas activas/i)
    ).toBeInTheDocument()
  })

  it('debería mostrar el contador 2 / 2 cuando hay 2 reservas activas', async () => {
    ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(sesionFicticia)
    ;(prisma.reserva.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      crearReservaFicticia('r1', 'Pista de Pádel 1'),
      crearReservaFicticia('r2', 'Pista de Pádel 2'),
    ])

    const elemento = await PaginaDashboard()
    render(elemento)

    expect(screen.getByText('2 / 2')).toBeInTheDocument()
  })
})
