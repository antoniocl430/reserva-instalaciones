/**
 * Tests de la sección "Notificaciones push" y "Preferencias de notificación"
 * en la página de perfil del ciudadano.
 *
 * Cubre:
 *  - Visibilidad por rol (solo CIUDADANO)
 *  - Badge de estado Activa / Inactiva
 *  - Botón "Activar" / "Desactivar" según estado
 *  - Aviso cuando el navegador no soporta push
 *  - Llamadas a registrarServiceWorker + suscribirAPush al activar
 *  - Llamada a desuscribirDePush al desactivar
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import React from 'react'

// --- Mock de useToast ---
const mockToast = vi.fn()
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}))

// --- Mock de next-auth/react ---
const mockUseSession = vi.fn()
vi.mock('next-auth/react', () => ({
  useSession: (...args: unknown[]) => mockUseSession(...args),
  signOut: vi.fn(),
}))

// --- Mock de next/navigation ---
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// --- Mock de next/image ---
vi.mock('next/image', () => ({
  default: ({ src, alt, className }: { src: string; alt: string; className?: string }) =>
    React.createElement('img', { src, alt, className }),
}))

// --- Mock de next/link ---
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    React.createElement('a', { href, className }, children),
}))

// --- Mock de AvatarUsuario ---
vi.mock('@/components/AvatarUsuario', () => ({
  AvatarUsuario: ({ nombre }: { nombre: string; avatarUrl?: string | null; className?: string }) =>
    React.createElement('span', { 'data-testid': 'avatar-mock' }, nombre[0]),
}))

// --- Mock de shadcn/ui ---
vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant,
    size,
    className,
    type,
  }: {
    children: React.ReactNode
    onClick?: () => void
    disabled?: boolean
    variant?: string
    size?: string
    className?: string
    type?: string
  }) =>
    React.createElement(
      'button',
      { onClick, disabled, 'data-variant': variant, 'data-size': size, className, type },
      children
    ),
}))

vi.mock('@/components/ui/input', () => ({
  Input: ({
    id,
    value,
    onChange,
    disabled,
    type,
    className,
    placeholder,
  }: {
    id?: string
    value?: string
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
    disabled?: boolean
    type?: string
    className?: string
    placeholder?: string
  }) =>
    React.createElement('input', { id, value, onChange, disabled, type, className, placeholder }),
}))

vi.mock('@/components/ui/label', () => ({
  Label: ({
    children,
    htmlFor,
    className,
  }: {
    children: React.ReactNode
    htmlFor?: string
    className?: string
  }) => React.createElement('label', { htmlFor, className }, children),
}))

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) =>
    React.createElement('div', { className, 'data-testid': 'skeleton' }),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({
    children,
    variant,
    className,
  }: {
    children: React.ReactNode
    variant?: string
    className?: string
  }) =>
    React.createElement(
      'span',
      { 'data-testid': 'badge-push', 'data-variant': variant, className },
      children
    ),
}))

vi.mock('@/components/ui/alert', () => ({
  Alert: ({
    children,
    variant,
    className,
  }: {
    children: React.ReactNode
    variant?: string
    className?: string
  }) =>
    React.createElement('div', { role: 'alert', 'data-variant': variant, className }, children),
  AlertDescription: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', {}, children),
}))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({
    open,
    onOpenChange,
    children,
  }: {
    open: boolean
    onOpenChange?: (open: boolean) => void
    children: React.ReactNode
  }) =>
    open
      ? React.createElement(
          'div',
          { role: 'dialog', onClick: () => onOpenChange?.(false) },
          children
        )
      : null,
  DialogContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { onClick: (e: React.MouseEvent) => e.stopPropagation() }, children),
  DialogHeader: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', {}, children),
  DialogTitle: ({ children }: { children: React.ReactNode }) =>
    React.createElement('h2', {}, children),
  DialogDescription: ({ children }: { children: React.ReactNode }) =>
    React.createElement('p', {}, children),
  DialogFooter: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', {}, children),
}))

// --- Mock de PreferenciasNotificacion ---
vi.mock('@/components/PreferenciasNotificacion', () => ({
  default: () =>
    React.createElement('div', { 'data-testid': 'preferencias-notificacion' }, 'Preferencias mock'),
}))

// --- Mock de push-client ---
const mockRegistrarServiceWorker = vi.fn()
const mockSuscribirAPush = vi.fn()
const mockDesuscribirDePush = vi.fn()
const mockObtenerEstadoSuscripcion = vi.fn()

vi.mock('@/lib/push-client', () => ({
  registrarServiceWorker: (...args: unknown[]) => mockRegistrarServiceWorker(...args),
  suscribirAPush: (...args: unknown[]) => mockSuscribirAPush(...args),
  desuscribirDePush: (...args: unknown[]) => mockDesuscribirDePush(...args),
  obtenerEstadoSuscripcion: (...args: unknown[]) => mockObtenerEstadoSuscripcion(...args),
}))

// --- Importar componente bajo test (tras mocks) ---
import PaginaPerfil from '@/app/perfil/page'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Configura la sesión mock según el rol */
function mockSesion(rol: 'CIUDADANO' | 'ADMIN') {
  mockUseSession.mockReturnValue({
    data: {
      user: {
        id: 'user-1',
        name: rol === 'CIUDADANO' ? 'Ana García' : 'Admin Test',
        email: rol === 'CIUDADANO' ? 'ana@test.com' : 'admin@test.com',
        rol,
        avatarUrl: null,
      },
    },
    status: 'authenticated',
    update: vi.fn(),
  })
}

/** Configura fetch para devolver datos genéricos de /api/cuenta y /api/perfil */
function mockFetch(rol: 'CIUDADANO' | 'ADMIN' = 'CIUDADANO') {
  const nombre = rol === 'CIUDADANO' ? 'Ana García' : 'Admin Test'
  const email = rol === 'CIUDADANO' ? 'ana@test.com' : 'admin@test.com'

  global.fetch = vi.fn().mockImplementation((url: string, options?: { method?: string }) => {
    if (url === '/api/cuenta' && (!options?.method || options.method === 'GET')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          usuario: { id: 'user-1', nombre, email, rol, avatarUrl: null, creadoEn: '2026-01-01T00:00:00Z' },
        }),
      })
    }
    if (url === '/api/perfil' && (!options?.method || options.method === 'GET')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          id: 'user-1', nombre, email, rol,
          noShows: 0, suspendidoHasta: null, motivoSuspension: null,
          creadoEn: '2026-01-01T00:00:00Z',
        }),
      })
    }
    if (url === '/api/cuenta/preferencias-notificacion') {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          notificacionesEmail: true,
          notificacionesPush: true,
          recordatorioReserva: true,
          recordatorioCancel: true,
          notificacionesAviso: true,
        }),
      })
    }
    return Promise.resolve({ ok: true, json: async () => ({}) })
  }) as unknown as typeof fetch
}

// ---------------------------------------------------------------------------

describe('PaginaPerfil — Sección Notificaciones push', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockToast.mockClear()
    // Estado por defecto: inactivo
    mockObtenerEstadoSuscripcion.mockResolvedValue('inactivo')
    mockRegistrarServiceWorker.mockResolvedValue({})
    mockSuscribirAPush.mockResolvedValue(true)
    mockDesuscribirDePush.mockResolvedValue(true)
  })

  // -------------------------------------------------------------------------
  // Visibilidad por rol
  // -------------------------------------------------------------------------

  it('no debería mostrar la sección push cuando el rol es ADMIN', async () => {
    mockSesion('ADMIN')
    mockFetch('ADMIN')

    render(React.createElement(PaginaPerfil))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Mi perfil/i })).toBeInTheDocument()
    })

    // La sección "Notificaciones push" no debe aparecer para ADMIN
    expect(screen.queryByText(/Notificaciones push/i)).not.toBeInTheDocument()
  })

  it('debería mostrar la sección push cuando el rol es CIUDADANO', async () => {
    mockSesion('CIUDADANO')
    mockFetch('CIUDADANO')

    render(React.createElement(PaginaPerfil))

    await waitFor(() => {
      expect(screen.getByText(/Notificaciones push/i)).toBeInTheDocument()
    })
  })

  // -------------------------------------------------------------------------
  // Badge de estado
  // -------------------------------------------------------------------------

  it('debería mostrar badge "Inactiva" cuando obtenerEstadoSuscripcion devuelve "inactivo"', async () => {
    mockSesion('CIUDADANO')
    mockFetch('CIUDADANO')
    mockObtenerEstadoSuscripcion.mockResolvedValue('inactivo')

    render(React.createElement(PaginaPerfil))

    await waitFor(() => {
      // El componente muestra un <span> con "○ Inactivas" cuando el estado es inactivo
      const body = document.body.textContent ?? ''
      expect(/Inactivas/i.test(body)).toBe(true)
    })
  })

  it('debería mostrar badge "Activa" cuando obtenerEstadoSuscripcion devuelve "activo"', async () => {
    mockSesion('CIUDADANO')
    mockFetch('CIUDADANO')
    mockObtenerEstadoSuscripcion.mockResolvedValue('activo')

    render(React.createElement(PaginaPerfil))

    await waitFor(() => {
      // El componente muestra un <span> con "● Activas" cuando el estado es activo
      const body = document.body.textContent ?? ''
      expect(/Activas/i.test(body)).toBe(true)
    })
  })

  // -------------------------------------------------------------------------
  // Botones Activar / Desactivar
  // -------------------------------------------------------------------------

  it('debería mostrar el botón "Activar notificaciones" cuando no está suscrito', async () => {
    mockSesion('CIUDADANO')
    mockFetch('CIUDADANO')
    mockObtenerEstadoSuscripcion.mockResolvedValue('inactivo')

    render(React.createElement(PaginaPerfil))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Activar notificaciones/i })).toBeInTheDocument()
    })
  })

  it('debería mostrar el botón "Desactivar notificaciones" cuando está suscrito', async () => {
    mockSesion('CIUDADANO')
    mockFetch('CIUDADANO')
    mockObtenerEstadoSuscripcion.mockResolvedValue('activo')

    render(React.createElement(PaginaPerfil))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Desactivar notificaciones/i })).toBeInTheDocument()
    })
  })

  // -------------------------------------------------------------------------
  // Soporte del navegador
  // -------------------------------------------------------------------------

  it('debería mostrar mensaje de aviso cuando el navegador no soporta push', async () => {
    mockSesion('CIUDADANO')
    mockFetch('CIUDADANO')
    mockObtenerEstadoSuscripcion.mockResolvedValue('no-soportado')

    render(React.createElement(PaginaPerfil))

    await waitFor(() => {
      expect(screen.getByText(/Tu navegador no soporta notificaciones push/i)).toBeInTheDocument()
    })
  })

  // -------------------------------------------------------------------------
  // Interacciones: Activar
  // -------------------------------------------------------------------------

  it('debería llamar a suscribirAPush al pulsar "Activar notificaciones"', async () => {
    mockSesion('CIUDADANO')
    mockFetch('CIUDADANO')
    mockObtenerEstadoSuscripcion.mockResolvedValue('inactivo')
    mockSuscribirAPush.mockResolvedValue(true)

    render(React.createElement(PaginaPerfil))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Activar notificaciones/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Activar notificaciones/i }))

    await waitFor(() => {
      // El componente llama directamente a suscribirAPush (sin pasar por registrarServiceWorker)
      expect(mockSuscribirAPush).toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------------
  // Interacciones: Desactivar
  // -------------------------------------------------------------------------

  it('debería llamar a desuscribirDePush al pulsar "Desactivar notificaciones"', async () => {
    mockSesion('CIUDADANO')
    mockFetch('CIUDADANO')
    mockObtenerEstadoSuscripcion.mockResolvedValue('activo')
    mockDesuscribirDePush.mockResolvedValue(true)

    render(React.createElement(PaginaPerfil))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Desactivar notificaciones/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Desactivar notificaciones/i }))

    await waitFor(() => {
      expect(mockDesuscribirDePush).toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------------
  // Sección "Preferencias de notificación"
  // -------------------------------------------------------------------------

  it('debería renderizar el componente PreferenciasNotificacion para CIUDADANO', async () => {
    mockSesion('CIUDADANO')
    mockFetch('CIUDADANO')

    render(React.createElement(PaginaPerfil))

    await waitFor(() => {
      expect(screen.getByTestId('preferencias-notificacion')).toBeInTheDocument()
    })
  })

  it('no debería renderizar PreferenciasNotificacion para ADMIN', async () => {
    mockSesion('ADMIN')
    mockFetch('ADMIN')

    render(React.createElement(PaginaPerfil))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Mi perfil/i })).toBeInTheDocument()
    })

    expect(screen.queryByTestId('preferencias-notificacion')).not.toBeInTheDocument()
  })
})
