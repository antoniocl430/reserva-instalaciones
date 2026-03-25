/**
 * Tests para AdminDashboard — /admin/(panel)/page.tsx
 * Componente client-side que muestra métricas del administrador
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import AdminDashboard from '@/app/admin/(panel)/page'

// Mock de next/link
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    React.createElement('a', { href, className }, children),
}))

// Mock de fetch
global.fetch = vi.fn()

const metricasEjemplo = {
  reservasHoy: 5,
  reservasActivas: 12,
  pistasActivas: 3,
  cancelacionesHoy: 2,
}

describe('AdminDashboard — /admin/(panel)/page.tsx', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as any).mockClear()
  })

  it('debería mostrar estado de carga inicialmente', async () => {
    ;(global.fetch as any).mockImplementation(() => new Promise(() => {}))

    render(<AdminDashboard />)

    // Debe mostrar el título Dashboard mientras carga
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('debería mostrar las 4 tarjetas de métricas', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => metricasEjemplo,
    })

    render(<AdminDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Reservas hoy')).toBeInTheDocument()
      expect(screen.getByText('Reservas activas')).toBeInTheDocument()
      expect(screen.getByText('Pistas activas')).toBeInTheDocument()
      expect(screen.getByText('Cancelaciones hoy')).toBeInTheDocument()
    })
  })

  it('debería mostrar los valores correctos de cada métrica', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => metricasEjemplo,
    })

    render(<AdminDashboard />)

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument() // reservasHoy
      expect(screen.getByText('12')).toBeInTheDocument() // reservasActivas
      expect(screen.getByText('3')).toBeInTheDocument() // pistasActivas
      expect(screen.getByText('2')).toBeInTheDocument() // cancelacionesHoy
    })
  })

  it('debería mostrar error si la API falla', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: false,
    })

    render(<AdminDashboard />)

    await waitFor(() => {
      expect(screen.getByText(/Error al cargar/i)).toBeInTheDocument()
    })
  })

  it('debería mostrar acceso rápido a Gestionar reservas con enlace a /admin/reservas', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => metricasEjemplo,
    })

    render(<AdminDashboard />)

    await waitFor(() => {
      const enlace = screen.getByRole('link', { name: /Gestionar reservas/i })
      expect(enlace).toHaveAttribute('href', '/admin/reservas')
    })
  })

  it('debería mostrar acceso rápido a Crear bloqueos con enlace a /admin/bloqueos', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => metricasEjemplo,
    })

    render(<AdminDashboard />)

    await waitFor(() => {
      const enlace = screen.getByRole('link', { name: /Crear bloqueos/i })
      expect(enlace).toHaveAttribute('href', '/admin/bloqueos')
    })
  })

  it('debería mostrar acceso rápido a Gestionar pistas con enlace a /admin/pistas', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => metricasEjemplo,
    })

    render(<AdminDashboard />)

    await waitFor(() => {
      const enlace = screen.getByRole('link', { name: /Gestionar pistas/i })
      expect(enlace).toHaveAttribute('href', '/admin/pistas')
    })
  })

  it('debería mostrar acceso rápido a Gestionar admins con enlace a /admin/usuarios', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => metricasEjemplo,
    })

    render(<AdminDashboard />)

    await waitFor(() => {
      const enlace = screen.getByRole('link', { name: /Gestionar admins/i })
      expect(enlace).toHaveAttribute('href', '/admin/usuarios')
    })
  })
})
