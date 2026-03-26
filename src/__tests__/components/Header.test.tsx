/**
 * Tests del componente Header — personalización por tenant (TDD)
 *
 * Escritos ANTES de la implementación.
 * Cubren:
 *   - Texto por defecto cuando no se pasa nombreServicio
 *   - Texto dinámico cuando se pasa nombreServicio
 *   - Botones de login/registro cuando no hay sesión
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// --- Mocks de dependencias (al nivel superior, obligatorio en vitest) ---

vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({ data: null, status: 'unauthenticated' })),
  signOut: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string
    children: React.ReactNode
    className?: string
  }) => React.createElement('a', { href, className }, children),
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

// --- Suite de tests ---

describe('Header — personalización por tenant', () => {
  it('muestra "Reservas Deportivas" cuando no se pasa nombreServicio', async () => {
    const { Header } = await import('@/components/header')

    render(React.createElement(Header, {}))

    // El span visible en desktop muestra el nombre del servicio
    expect(screen.getByText('Reservas Deportivas')).toBeInTheDocument()
  })

  it('muestra el nombreServicio cuando se proporciona', async () => {
    const { Header } = await import('@/components/header')

    render(React.createElement(Header, { nombreServicio: 'Deportes Sevilla' }))

    expect(screen.getByText('Deportes Sevilla')).toBeInTheDocument()
    // El valor por defecto no debe aparecer
    expect(screen.queryByText('Reservas Deportivas')).not.toBeInTheDocument()
  })

  it('muestra los botones de login/registro cuando no hay sesión', async () => {
    const { Header } = await import('@/components/header')

    render(React.createElement(Header, {}))

    // Puede haber múltiples instancias (desktop + móvil), verificamos al menos una
    const enlacesLogin = screen.getAllByRole('link', { name: /iniciar sesión/i })
    const enlacesRegistro = screen.getAllByRole('link', { name: /crear cuenta/i })

    expect(enlacesLogin.length).toBeGreaterThan(0)
    expect(enlacesRegistro.length).toBeGreaterThan(0)
    expect(enlacesLogin[0]).toHaveAttribute('href', '/login')
    expect(enlacesRegistro[0]).toHaveAttribute('href', '/registro')
  })
})
