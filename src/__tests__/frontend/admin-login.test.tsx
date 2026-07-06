/**
 * Tests de la página /admin/login
 *
 * Verifica que, tras un login correcto, la redirección depende del ROL
 * del usuario autenticado (no siempre a /admin). Un SUPERADMIN o un
 * INSTRUCTOR que inicien sesión desde este formulario deben terminar
 * en su propio panel, no en /admin (que los expulsaría a /dashboard).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

// --- Mocks de dependencias ---

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
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

import PaginaAdminLogin from '@/app/admin/login/page'

describe('PaginaAdminLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete (window as any).location
    window.location = { href: '' } as any
  })

  async function enviarFormulario(email: string, password: string) {
    render(<PaginaAdminLogin />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: email } })
    fireEvent.change(screen.getByLabelText(/contrase/i), { target: { value: password } })
    fireEvent.click(screen.getByRole('button', { name: /acceder/i }))
  }

  it('debería redirigir a /admin cuando el rol es ADMIN', async () => {
    mockSignIn.mockResolvedValue({ ok: true, error: null, status: 200 })
    mockGetSession.mockResolvedValue({
      user: { id: 'u1', name: 'Carlos Admin', email: 'admin@example.com', rol: 'ADMIN' },
      expires: '2099-01-01',
    })

    await enviarFormulario('admin@example.com', 'admin123')

    await waitFor(() => {
      expect(window.location.href).toBe('/admin')
    })
  })

  it('debería redirigir a /superadmin cuando el rol es SUPERADMIN', async () => {
    mockSignIn.mockResolvedValue({ ok: true, error: null, status: 200 })
    mockGetSession.mockResolvedValue({
      user: { id: 'u2', name: 'Sara Super', email: 'super@example.com', rol: 'SUPERADMIN' },
      expires: '2099-01-01',
    })

    await enviarFormulario('super@example.com', 'super123')

    await waitFor(() => {
      expect(window.location.href).toBe('/superadmin')
    })
  })

  it('debería redirigir a /instructor cuando el rol es INSTRUCTOR', async () => {
    mockSignIn.mockResolvedValue({ ok: true, error: null, status: 200 })
    mockGetSession.mockResolvedValue({
      user: { id: 'u3', name: 'Iván Instructor', email: 'inst@example.com', rol: 'INSTRUCTOR' },
      expires: '2099-01-01',
    })

    await enviarFormulario('inst@example.com', 'inst123')

    await waitFor(() => {
      expect(window.location.href).toBe('/instructor')
    })
  })

  it('debería redirigir a /dashboard cuando el rol es CIUDADANO (fallback)', async () => {
    mockSignIn.mockResolvedValue({ ok: true, error: null, status: 200 })
    mockGetSession.mockResolvedValue({
      user: { id: 'u4', name: 'Ana Ciudadana', email: 'ana@example.com', rol: 'CIUDADANO' },
      expires: '2099-01-01',
    })

    await enviarFormulario('ana@example.com', 'ana123')

    await waitFor(() => {
      expect(window.location.href).toBe('/dashboard')
    })
  })

  it('debería mostrar error cuando las credenciales son incorrectas', async () => {
    mockSignIn.mockResolvedValue({ ok: false, error: 'CredentialsSignin', status: 401 })

    await enviarFormulario('mal@example.com', 'mal')

    await waitFor(() => {
      expect(screen.getByText(/credenciales incorrectas/i)).toBeInTheDocument()
    })

    expect(window.location.href).toBe('')
  })
})
