/**
 * Tests de la página VerificarEmail
 *
 * Cubre los estados:
 * 1. Cargando (spinner mientras llama al API)
 * 2. Éxito (cuenta verificada)
 * 3. Error (token inválido o expirado) con formulario de reenvío
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

// --- Mocks ---

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({
    get: (key: string) => {
      if (key === 'token') return 'token-valido-abc123'
      return null
    },
  }),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, className }: {
    href: string
    children: React.ReactNode
    className?: string
  }) =>
    React.createElement('a', { href, className }, children),
}))

const mockToast = vi.fn()
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}))

import PaginaVerificarEmail from '@/app/verificar-email/page'

describe('PaginaVerificarEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it('debería mostrar un spinner mientras verifica el token', async () => {
    // fetch que nunca resuelve para atrapar el estado de carga
    global.fetch = vi.fn(() => new Promise(() => {})) as any

    render(<PaginaVerificarEmail />)

    // El spinner o texto de carga debe estar presente inmediatamente
    expect(screen.getByText(/verificando/i)).toBeInTheDocument()
  })

  it('debería mostrar pantalla de éxito cuando la verificación es correcta', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    }) as any

    render(<PaginaVerificarEmail />)

    await waitFor(() => {
      expect(screen.getByText(/cuenta verificada/i)).toBeInTheDocument()
    })

    // Debe haber un enlace para ir al login
    expect(screen.getByRole('link', { name: /iniciar sesión/i })).toBeInTheDocument()
  })

  it('debería mostrar error cuando el token es inválido o expirado', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Token inválido o expirado' }),
    }) as any

    render(<PaginaVerificarEmail />)

    await waitFor(() => {
      expect(screen.getByText(/token inválido o expirado/i)).toBeInTheDocument()
    })

    // Debe haber un campo de email para reenviar enlace
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()

    // Debe haber un botón de reenvío
    expect(screen.getByRole('button', { name: /reenviar enlace/i })).toBeInTheDocument()
  })

  it('debería reenviar el enlace de verificación al pulsar el botón', async () => {
    // Primera llamada: verificación fallida
    // Segunda llamada: reenvío exitoso
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Token inválido o expirado' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      }) as any

    render(<PaginaVerificarEmail />)

    // Esperar estado de error
    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    })

    // Introducir email y pulsar reenviar
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'usuario@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /reenviar enlace/i }))

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: expect.stringMatching(/enviado|reenviad/i),
      }))
    })

    // Verificar que se llamó a la API de reenvío
    expect(global.fetch).toHaveBeenCalledWith('/api/reenviar-verificacion', expect.objectContaining({
      method: 'POST',
    }))
  })

  it('debería llamar al API con el token correcto de la URL', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    }) as any

    render(<PaginaVerificarEmail />)

    await waitFor(() => {
      expect(screen.getByText(/cuenta verificada/i)).toBeInTheDocument()
    })

    // Verificar que se llamó con el token de la URL
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('token-valido-abc123'),
      expect.anything()
    )
  })
})
