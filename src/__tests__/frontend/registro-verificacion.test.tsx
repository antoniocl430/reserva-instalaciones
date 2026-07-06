/**
 * Tests del nuevo flujo de verificación de email en el registro
 *
 * Cuando el API devuelve 201 con { mensaje }, el formulario se sustituye
 * por una pantalla de confirmación que permite reenviar el email.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

// --- Mocks ---

vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
}))

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
    target,
  }: {
    href: string
    children: React.ReactNode
    className?: string
    target?: string
  }) => React.createElement('a', { href, className, target }, children),
}))

const mockToast = vi.fn()
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}))

import PaginaRegistro from '@/app/registro/page'

// Helper para rellenar y enviar el formulario
async function rellenarYEnviar(email = 'usuario@ejemplo.com') {
  fireEvent.change(screen.getByLabelText(/nombre completo/i), {
    target: { value: 'Ana García' },
  })
  fireEvent.change(screen.getByLabelText(/^email$/i), {
    target: { value: email },
  })
  fireEvent.change(document.querySelector('#password') as HTMLInputElement, {
    target: { value: 'password123' },
  })
  fireEvent.change(document.querySelector('#confirmar') as HTMLInputElement, {
    target: { value: 'password123' },
  })
  fireEvent.click(document.querySelector('#aceptaPrivacidad') as HTMLInputElement)
  fireEvent.click(screen.getByRole('button', { name: /crear cuenta/i }))
}

describe('PaginaRegistro — flujo verificación email', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete (window as any).location
    window.location = { search: '' } as any
    global.fetch = vi.fn()
  })

  it('debería mostrar pantalla de confirmación cuando el registro devuelve 201 con mensaje', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ mensaje: 'Revisa tu email para verificar tu cuenta' }),
    }) as any

    render(<PaginaRegistro />)
    await rellenarYEnviar('ana@ejemplo.com')

    await waitFor(() => {
      expect(screen.getByText(/revisa tu bandeja de entrada/i)).toBeInTheDocument()
    })

    // El formulario ya no debe estar visible
    expect(screen.queryByRole('heading', { name: /crear cuenta/i })).not.toBeInTheDocument()
  })

  it('debería mostrar el email del usuario en la pantalla de confirmación', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ mensaje: 'Revisa tu email para verificar tu cuenta' }),
    }) as any

    render(<PaginaRegistro />)
    await rellenarYEnviar('usuario@ejemplo.com')

    await waitFor(() => {
      expect(screen.getByText(/usuario@ejemplo\.com/i)).toBeInTheDocument()
    })
  })

  it('debería mostrar aviso de caducidad del enlace en 24 horas', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ mensaje: 'Revisa tu email para verificar tu cuenta' }),
    }) as any

    render(<PaginaRegistro />)
    await rellenarYEnviar()

    await waitFor(() => {
      expect(screen.getByText(/24 horas/i)).toBeInTheDocument()
    })
  })

  it('debería NO redirigir tras registro con verificación pendiente', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ mensaje: 'Revisa tu email para verificar tu cuenta' }),
    }) as any

    render(<PaginaRegistro />)
    await rellenarYEnviar()

    await waitFor(() => {
      expect(screen.getByText(/revisa tu bandeja de entrada/i)).toBeInTheDocument()
    })

    // No debe redirigir
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('debería mostrar botón "Reenviar email" en la pantalla de confirmación', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ mensaje: 'Revisa tu email para verificar tu cuenta' }),
    }) as any

    render(<PaginaRegistro />)
    await rellenarYEnviar()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /reenviar email/i })).toBeInTheDocument()
    })
  })

  it('debería llamar a POST /api/reenviar-verificacion al pulsar "Reenviar email"', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ mensaje: 'Revisa tu email para verificar tu cuenta' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      }) as any

    render(<PaginaRegistro />)
    await rellenarYEnviar('usuario@ejemplo.com')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /reenviar email/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /reenviar email/i }))

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

  it('debería mostrar toast de éxito al reenviar el email correctamente', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ mensaje: 'Revisa tu email para verificar tu cuenta' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      }) as any

    render(<PaginaRegistro />)
    await rellenarYEnviar()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /reenviar email/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /reenviar email/i }))

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: expect.stringMatching(/enviado|reenviad/i),
      }))
    })
  })

  it('debería mostrar toast de error si el reenvío falla', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ mensaje: 'Revisa tu email para verificar tu cuenta' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Email no encontrado' }),
      }) as any

    render(<PaginaRegistro />)
    await rellenarYEnviar()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /reenviar email/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /reenviar email/i }))

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        variant: 'destructive',
      }))
    })
  })
})
