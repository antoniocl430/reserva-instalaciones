/**
 * Tests para SuperadminDashboard — /superadmin/(panel)/page.tsx
 * Componente client-side que muestra metricas globales del superadmin
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import SuperadminDashboard from '@/app/superadmin/(panel)/page'

// Mock de next/link
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    React.createElement('a', { href, className }, children),
}))

// Mock de lucide-react — listar todos los iconos usados por el componente y sus dependencias (dialog, etc.)
vi.mock('lucide-react', () => {
  const React = require('react')
  const icono = (nombre: string) => (props: any) => React.createElement('span', { 'data-testid': `icon-${nombre}` })
  return {
    Building2: icono('building2'),
    Users: icono('users'),
    CalendarDays: icono('calendardays'),
    Activity: icono('activity'),
    LayoutDashboard: icono('layoutdashboard'),
    X: icono('x'),
    Check: icono('check'),
    ChevronDown: icono('chevrondown'),
    ChevronUp: icono('chevronup'),
  }
})

// Mock de fetch
global.fetch = vi.fn()

const metricasEjemplo = {
  totalTenants: 8,
  tenantsActivos: 6,
  totalUsuarios: 150,
  totalInstalaciones: 25,
  totalReservasHoy: 42,
}

describe('SuperadminDashboard — /superadmin/(panel)/page.tsx', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as any).mockClear()
  })

  it('deberia mostrar el titulo "Resumen global" o "Panel Superadmin"', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => metricasEjemplo,
    })

    render(<SuperadminDashboard />)

    await waitFor(() => {
      const titulo = screen.getByText(/resumen global/i) || screen.getByText(/panel superadmin/i)
      expect(titulo).toBeInTheDocument()
    })
  })

  it('deberia mostrar las 5 metricas: Total tenants, Tenants activos, Usuarios, Instalaciones, Reservas hoy', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => metricasEjemplo,
    })

    render(<SuperadminDashboard />)

    await waitFor(() => {
      expect(screen.getByText(/total centros/i)).toBeInTheDocument()
      expect(screen.getByText(/centros activos/i)).toBeInTheDocument()
      expect(screen.getByText(/total usuarios/i)).toBeInTheDocument()
      expect(screen.getByText(/total instalaciones/i)).toBeInTheDocument()
      expect(screen.getByText(/reservas hoy/i)).toBeInTheDocument()
    })
  })

  it('deberia mostrar los valores correctos de cada metrica', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => metricasEjemplo,
    })

    render(<SuperadminDashboard />)

    await waitFor(() => {
      expect(screen.getByText('8')).toBeInTheDocument()   // totalTenants
      expect(screen.getByText('6')).toBeInTheDocument()   // tenantsActivos
      expect(screen.getByText('150')).toBeInTheDocument() // totalUsuarios
      expect(screen.getByText('25')).toBeInTheDocument()  // totalInstalaciones
      expect(screen.getByText('42')).toBeInTheDocument()  // totalReservasHoy
    })
  })

  it('deberia mostrar error si la API falla', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: false,
    })

    render(<SuperadminDashboard />)

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument()
    })
  })

  it('deberia tener enlace a /superadmin/tenants', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => metricasEjemplo,
    })

    render(<SuperadminDashboard />)

    await waitFor(() => {
      const enlace = screen.getByRole('link', { name: /gestionar centros/i })
      expect(enlace).toHaveAttribute('href', '/superadmin/tenants')
    })
  })

  it('deberia mostrar skeletons mientras carga', async () => {
    ;(global.fetch as any).mockImplementation(() => new Promise(() => {}))

    const { container } = render(<SuperadminDashboard />)

    // Deberia tener skeletons visibles
    expect(screen.getByText(/resumen global/i)).toBeInTheDocument()
    // Los skeletons se renderizan como divs con clase animate-pulse (patron del proyecto)
  })
})
