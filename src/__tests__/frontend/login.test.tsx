/**
 * Tests de la página de login
 *
 * Verifica que tras un login exitoso, todos los usuarios (incluido ADMIN)
 * son redirigidos a /dashboard.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

// --- Mocks de dependencias ---

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, className }: {
    href: string
    children: React.ReactNode
    className?: string
  }) =>
    React.createElement('a', { href, className }, children),
}))

const mockSignIn = vi.fn()
const mockGetSession = vi.fn()

vi.mock('next-auth/react', () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
  getSession: () => mockGetSession(),
}))

import PaginaLogin from '@/app/login/page'

describe('PaginaLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debería redirigir a /dashboard cuando el login es exitoso con rol CIUDADANO', async () => {
    mockSignIn.mockResolvedValue({ ok: true, error: null })
    mockGetSession.mockResolvedValue({
      user: { id: 'u1', name: 'Ana García', email: 'ana@example.com', rol: 'CIUDADANO' },
      expires: '2099-01-01',
    })

    render(<PaginaLogin />)

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'ana@example.com' } })
    fireEvent.change(screen.getByLabelText(/contraseña/i), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('debería redirigir a /dashboard cuando el login es exitoso con rol ADMIN', async () => {
    mockSignIn.mockResolvedValue({ ok: true, error: null })
    mockGetSession.mockResolvedValue({
      user: { id: 'u2', name: 'Carlos Admin', email: 'carlos@example.com', rol: 'ADMIN' },
      expires: '2099-01-01',
    })

    render(<PaginaLogin />)

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'carlos@example.com' } })
    fireEvent.change(screen.getByLabelText(/contraseña/i), { target: { value: 'admin123' } })
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })

    // Nunca debe redirigir a /admin directamente
    expect(mockPush).not.toHaveBeenCalledWith('/admin')
  })

  it('debería mostrar error cuando las credenciales son incorrectas', async () => {
    mockSignIn.mockResolvedValue({ ok: false, error: 'CredentialsSignin' })

    render(<PaginaLogin />)

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'mal@example.com' } })
    fireEvent.change(screen.getByLabelText(/contraseña/i), { target: { value: 'mal' } })
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    expect(mockPush).not.toHaveBeenCalled()
  })

  it('debería mostrar "Cargando..." en el botón mientras se procesa el login', async () => {
    // signIn tarda un poco en resolver
    mockSignIn.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ ok: true, error: null }), 50))
    )
    mockGetSession.mockResolvedValue({
      user: { id: 'u1', name: 'Ana', email: 'ana@example.com', rol: 'CIUDADANO' },
      expires: '2099-01-01',
    })

    render(<PaginaLogin />)

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'ana@example.com' } })
    fireEvent.change(screen.getByLabelText(/contraseña/i), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }))

    expect(screen.getByRole('button', { name: /entrando/i })).toBeInTheDocument()

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })
})
