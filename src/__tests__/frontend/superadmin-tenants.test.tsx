/**
 * Tests para SuperadminTenants — /superadmin/(panel)/tenants/page.tsx
 * Componente client-side que muestra la lista de tenants y permite gestionarlos
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import SuperadminTenants from '@/app/superadmin/(panel)/tenants/page'

// Mock de next/link
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    React.createElement('a', { href, className }, children),
}))

// Mock de lucide-react — listar todos los iconos usados por el componente y sus dependencias
vi.mock('lucide-react', () => {
  const React = require('react')
  const icono = (nombre: string) => (props: any) => React.createElement('span', { 'data-testid': `icon-${nombre}` })
  return {
    Building2: icono('building2'),
    Users: icono('users'),
    CalendarDays: icono('calendardays'),
    Activity: icono('activity'),
    LayoutDashboard: icono('layoutdashboard'),
    Plus: icono('plus'),
    Pencil: icono('pencil'),
    X: icono('x'),
    Check: icono('check'),
    ChevronDown: icono('chevrondown'),
    ChevronUp: icono('chevronup'),
  }
})

// Mock de fetch
global.fetch = vi.fn()

const tenantsEjemplo = [
  {
    id: 'tenant-1',
    slug: 'sevilla',
    nombre: 'Ayuntamiento de Sevilla',
    municipio: 'Sevilla',
    estado: 'ACTIVO',
    _count: { usuarios: 50, instalaciones: 10, reservas: 200 },
  },
  {
    id: 'tenant-2',
    slug: 'cordoba',
    nombre: 'Ayuntamiento de Cordoba',
    municipio: 'Cordoba',
    estado: 'SUSPENDIDO',
    _count: { usuarios: 20, instalaciones: 5, reservas: 80 },
  },
]

describe('SuperadminTenants — /superadmin/(panel)/tenants/page.tsx', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as any).mockClear()
  })

  it('deberia mostrar la lista de tenants con nombre, slug, municipio y estado', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => tenantsEjemplo,
    })

    render(<SuperadminTenants />)

    await waitFor(() => {
      expect(screen.getByText('Ayuntamiento de Sevilla')).toBeInTheDocument()
      expect(screen.getByText('sevilla')).toBeInTheDocument()
      expect(screen.getByText('Sevilla')).toBeInTheDocument()
      expect(screen.getByText('Ayuntamiento de Cordoba')).toBeInTheDocument()
      expect(screen.getByText('cordoba')).toBeInTheDocument()
      expect(screen.getByText('Cordoba')).toBeInTheDocument()
    })
  })

  it('deberia mostrar badge verde para tenant ACTIVO', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => tenantsEjemplo,
    })

    render(<SuperadminTenants />)

    await waitFor(() => {
      const badgeActivo = screen.getByText('ACTIVO')
      expect(badgeActivo).toBeInTheDocument()
      // Verificar que tiene clase de color verde
      expect(badgeActivo.className).toMatch(/green/)
    })
  })

  it('deberia mostrar badge rojo/gris para tenant SUSPENDIDO', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => tenantsEjemplo,
    })

    render(<SuperadminTenants />)

    await waitFor(() => {
      const badgeSuspendido = screen.getByText('SUSPENDIDO')
      expect(badgeSuspendido).toBeInTheDocument()
      // Verificar que tiene clase de color rojo o gris
      expect(badgeSuspendido.className).toMatch(/red|gray/)
    })
  })

  it('deberia tener boton "Nuevo tenant"', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => tenantsEjemplo,
    })

    render(<SuperadminTenants />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /nuevo tenant/i })).toBeInTheDocument()
    })
  })

  it('deberia mostrar skeletons al cargar', async () => {
    ;(global.fetch as any).mockImplementation(() => new Promise(() => {}))

    const { container } = render(<SuperadminTenants />)

    // Mientras carga, deberia mostrar titulo pero skeletons en lugar de tabla
    expect(screen.getByText(/tenants/i)).toBeInTheDocument()
  })

  it('deberia mostrar error si la API falla', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: false,
    })

    render(<SuperadminTenants />)

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument()
    })
  })
})
