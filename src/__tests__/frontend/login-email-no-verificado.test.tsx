/**
 * Tests del manejo del error EMAIL_NO_VERIFICADO en la página de login
 *
 * Cuando NextAuth devuelve error=EMAIL_NO_VERIFICADO, se muestra una alerta
 * específica y un formulario para reenviar el enlace de verificación.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

// --- Mocks ---

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
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

vi.mock('next-auth/react', () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
}))

const mockToast = vi.fn()
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}))

import PaginaLogin from '@/app/login/page'

describe('PaginaLogin — error EMAIL_NO_VERIFICADO', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete (window as any).location
    window.location = { search: '' } as any
    global.fetch = vi.fn()
  })

  it('debería mostrar alerta específica cuando NextAuth devuelve EMAIL_NO_VERIFICADO', async () => {
    // NextAuth devuelve error EMAIL_NO_VERIFICADO
    mockSignIn.mockResolvedValue({ ok: false, error: 'EMAIL_NO_VERIFICADO' })

    render(<PaginaLogin />)

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'usuario@ejemplo.com' },
    })
    fireEvent.change(screen.getByLabelText(/contraseña/i), {
      target: { value: 'password123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    // El mensaje debe ser específico para email no verificado
    expect(screen.getByRole('alert')).toHaveTextContent(/verificar tu email/i)
  })

  it('debería mostrar botón de reenvío cuando hay error EMAIL_NO_VERIFICADO', async () => {
    mockSignIn.mockResolvedValue({ ok: false, error: 'EMAIL_NO_VERIFICADO' })

    render(<PaginaLogin />)

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'usuario@ejemplo.com' },
    })
    fireEvent.change(screen.getByLabelText(/contraseña/i), {
      target: { value: 'password123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => {
      // Debe aparecer un botón de reenvío de verificación
      expect(screen.getByRole('button', { name: /reenviar enlace/i })).toBeInTheDocument()
    })
  })

  it('debería mostrar el email del login pre-rellenado en el campo de reenvío', async () => {
    mockSignIn.mockResolvedValue({ ok: false, error: 'EMAIL_NO_VERIFICADO' })

    render(<PaginaLogin />)

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'usuario@ejemplo.com' },
    })
    fireEvent.change(screen.getByLabelText(/contraseña/i), {
      target: { value: 'password123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /reenviar enlace/i })).toBeInTheDocument()
    })

    // El input de email de reenvío debe tener el email pre-rellenado
    const inputsEmail = screen.getAllByDisplayValue('usuario@ejemplo.com')
    expect(inputsEmail.length).toBeGreaterThanOrEqual(1)
  })

  it('debería llamar a /api/reenviar-verificacion al pulsar el botón de reenvío', async () => {
    mockSignIn.mockResolvedValue({ ok: false, error: 'EMAIL_NO_VERIFICADO' })
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    }) as any

    render(<PaginaLogin />)

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'usuario@ejemplo.com' },
    })
    fireEvent.change(screen.getByLabelText(/contraseña/i), {
      target: { value: 'password123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /reenviar enlace/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /reenviar enlace/i }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/reenviar-verificacion',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('usuario@ejemplo.com'),
        })
      )
    })
  })

  it('debería mostrar toast de éxito al reenviar el enlace correctamente', async () => {
    mockSignIn.mockResolvedValue({ ok: false, error: 'EMAIL_NO_VERIFICADO' })
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    }) as any

    render(<PaginaLogin />)

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'usuario@ejemplo.com' },
    })
    fireEvent.change(screen.getByLabelText(/contraseña/i), {
      target: { value: 'password123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /reenviar enlace/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /reenviar enlace/i }))

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: expect.stringMatching(/enviado|reenviad/i),
      }))
    })
  })

  it('debería mostrar mensaje de error genérico cuando el error no es EMAIL_NO_VERIFICADO', async () => {
    mockSignIn.mockResolvedValue({ ok: false, error: 'CredentialsSignin' })

    render(<PaginaLogin />)

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'mal@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/contraseña/i), {
      target: { value: 'mal' },
    })
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    // No debe mostrar el formulario de reenvío para errores genéricos
    expect(screen.queryByRole('button', { name: /reenviar enlace/i })).not.toBeInTheDocument()

    // El mensaje debe ser el genérico de credenciales incorrectas
    expect(screen.getByRole('alert')).toHaveTextContent(/contraseña incorrectos/i)
  })
})
