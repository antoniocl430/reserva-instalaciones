/**
 * Tests del componente Header
 *
 * Verifica que el menú de navegación muestra los links correctos
 * según el rol del usuario (sin sesión, CIUDADANO, ADMIN).
 * Para ADMIN comprueba que ve tanto los links de ciudadano como
 * el acceso al panel de administración.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// --- Mocks de dependencias ---

vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, className, 'aria-label': ariaLabel }: {
    href: string
    children: React.ReactNode
    className?: string
    'aria-label'?: string
  }) =>
    React.createElement('a', { href, className, 'aria-label': ariaLabel }, children),
}))

vi.mock('@/components/AvatarUsuario', () => ({
  AvatarUsuario: ({ nombre }: { nombre: string }) =>
    React.createElement('span', { 'data-testid': 'avatar-usuario' }, nombre),
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

// Mockear InstalarPWA para evitar dependencias de matchMedia en estos tests
vi.mock('@/components/InstalarPWA', () => ({
  default: () => null,
}))

import { useSession } from 'next-auth/react'
import { Header } from '@/components/header'

// Tipado del mock de useSession
const mockUseSession = useSession as ReturnType<typeof vi.fn>

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ----- Sin sesión -----

  it('debería mostrar los botones de Iniciar sesión y Crear cuenta cuando no hay sesión', () => {
    mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' })

    render(<Header />)

    expect(screen.getAllByRole('link', { name: /Iniciar sesión/i }).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByRole('link', { name: /Crear cuenta/i }).length).toBeGreaterThanOrEqual(1)
  })

  // ----- Ciudadano -----

  it('debería mostrar los links de ciudadano cuando el rol es CIUDADANO', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: 'u1', name: 'Ana García', email: 'ana@example.com', rol: 'CIUDADANO' },
        expires: '2099-01-01',
      },
      status: 'authenticated',
    })

    render(<Header />)

    // Links de navegación
    expect(screen.getAllByRole('link', { name: /Instalaciones/i }).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByRole('link', { name: /Mis reservas/i }).length).toBeGreaterThanOrEqual(1)
  })

  it('no debería mostrar Panel Admin cuando el rol es CIUDADANO', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: 'u1', name: 'Ana García', email: 'ana@example.com', rol: 'CIUDADANO' },
        expires: '2099-01-01',
      },
      status: 'authenticated',
    })

    render(<Header />)

    expect(screen.queryByRole('link', { name: /Panel Admin/i })).toBeNull()
  })

  // ----- Admin -----

  it('debería mostrar los links de ciudadano cuando el rol es ADMIN', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: 'u2', name: 'Carlos Admin', email: 'carlos@example.com', rol: 'ADMIN' },
        expires: '2099-01-01',
      },
      status: 'authenticated',
    })

    render(<Header />)

    // El admin también debe ver Instalaciones y Mis reservas
    expect(screen.getAllByRole('link', { name: /Instalaciones/i }).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByRole('link', { name: /Mis reservas/i }).length).toBeGreaterThanOrEqual(1)
  })

  it('debería mostrar el link Panel Admin cuando el rol es ADMIN', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: 'u2', name: 'Carlos Admin', email: 'carlos@example.com', rol: 'ADMIN' },
        expires: '2099-01-01',
      },
      status: 'authenticated',
    })

    render(<Header />)

    expect(screen.getAllByRole('link', { name: /Panel Admin/i }).length).toBeGreaterThanOrEqual(1)
  })

  it('el link Panel Admin del admin debe apuntar a /admin', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: 'u2', name: 'Carlos Admin', email: 'carlos@example.com', rol: 'ADMIN' },
        expires: '2099-01-01',
      },
      status: 'authenticated',
    })

    render(<Header />)

    const linksAdmin = screen.getAllByRole('link', { name: /Panel Admin/i })
    expect(linksAdmin[0]).toHaveAttribute('href', '/admin')
  })

  it('debería mostrar el avatar y nombre del admin en el header', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: 'u2', name: 'Carlos Admin', email: 'carlos@example.com', rol: 'ADMIN' },
        expires: '2099-01-01',
      },
      status: 'authenticated',
    })

    render(<Header />)

    // El avatar debe estar presente para el admin igual que para el ciudadano
    expect(screen.getAllByTestId('avatar-usuario').length).toBeGreaterThanOrEqual(1)
  })

  it('debería mostrar el link a /perfil para el admin', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: 'u2', name: 'Carlos Admin', email: 'carlos@example.com', rol: 'ADMIN' },
        expires: '2099-01-01',
      },
      status: 'authenticated',
    })

    render(<Header />)

    const linksPerfilAdmin = screen.getAllByRole('link', { name: /Mi perfil/i })
    expect(linksPerfilAdmin[0]).toHaveAttribute('href', '/perfil')
  })
})
