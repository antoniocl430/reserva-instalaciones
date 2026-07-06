/**
 * Tests de la funcionalidad de eliminación de cuenta en PaginaPerfil.
 *
 * Cubre:
 *   1. Click en "Eliminar mi cuenta" abre el dialog de confirmación
 *   2. Confirmar en el dialog llama a DELETE /api/perfil/eliminar y luego a signOut
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
const mockSignOut = vi.fn()
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({
    data: {
      user: {
        id: 'user-1',
        name: 'Ana García',
        email: 'ana@test.com',
        rol: 'CIUDADANO',
        avatarUrl: null,
      },
    },
    status: 'authenticated',
    update: vi.fn(),
  })),
  signOut: (...args: unknown[]) => mockSignOut(...args),
}))

// --- Mock de next/navigation ---
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

// --- Mock de next/image ---
vi.mock('next/image', () => ({
  default: ({ src, alt, className }: { src: string; alt: string; className?: string }) =>
    React.createElement('img', { src, alt, className }),
}))

// --- Mock de AvatarUsuario ---
vi.mock('@/components/AvatarUsuario', () => ({
  AvatarUsuario: ({ nombre }: { nombre: string; avatarUrl?: string | null; className?: string }) =>
    React.createElement('span', { 'data-testid': 'avatar-mock' }, nombre[0]),
}))

// --- Mock de next/link ---
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    React.createElement('a', { href, className }, children),
}))

// --- Mock de componentes shadcn/ui ---
vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant,
    className,
    type,
    size,
  }: {
    children: React.ReactNode
    onClick?: () => void
    disabled?: boolean
    variant?: string
    className?: string
    type?: string
    size?: string
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
    React.createElement('span', { 'data-testid': 'badge', 'data-variant': variant, className }, children),
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

// --- Mock de PreferenciasNotificacion ---
vi.mock('@/components/PreferenciasNotificacion', () => ({
  default: () => React.createElement('div', { 'data-testid': 'preferencias-notificacion' }),
}))

// --- Mock de push-client ---
vi.mock('@/lib/push-client', () => ({
  registrarServiceWorker: vi.fn().mockResolvedValue(null),
  suscribirAPush: vi.fn().mockResolvedValue(true),
  desuscribirDePush: vi.fn().mockResolvedValue(true),
  obtenerEstadoSuscripcion: vi.fn().mockResolvedValue('inactivo'),
}))

// --- Importar el componente bajo test (tras mocks) ---
import PaginaPerfil from '@/app/perfil/page'

// --- Datos de ejemplo ---
const usuarioFicticio = {
  id: 'user-1',
  nombre: 'Ana García',
  email: 'ana@test.com',
  rol: 'CIUDADANO',
  avatarUrl: null,
  noShows: 0,
  suspendidoHasta: null,
  motivoSuspension: null,
  creadoEn: '2026-01-01T00:00:00Z',
}

/** Configura fetch para los endpoints habituales de la página de perfil */
function mockFetchBase(overrides: { eliminarOk?: boolean } = {}) {
  const { eliminarOk = true } = overrides

  const fetchMock = vi.fn().mockImplementation((url: string, options?: { method?: string; body?: string }) => {
    // GET /api/cuenta
    if (url === '/api/cuenta' && (!options?.method || options.method === 'GET')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          usuario: {
            id: usuarioFicticio.id,
            nombre: usuarioFicticio.nombre,
            email: usuarioFicticio.email,
            rol: usuarioFicticio.rol,
            avatarUrl: null,
            creadoEn: usuarioFicticio.creadoEn,
          },
        }),
      })
    }
    // GET /api/perfil
    if (url === '/api/perfil' && (!options?.method || options.method === 'GET')) {
      return Promise.resolve({ ok: true, json: async () => usuarioFicticio })
    }
    // DELETE /api/perfil/eliminar
    if (url === '/api/perfil/eliminar' && options?.method === 'DELETE') {
      return Promise.resolve({ ok: eliminarOk, json: async () => ({}) })
    }
    // GET preferencias
    if (url === '/api/cuenta/preferencias-notificacion') {
      return Promise.resolve({
        ok: true,
        json: async () => ({ recordatorioReserva: false, cancelacionPropia: false, cancelacionAdmin: false }),
      })
    }
    // Fallback
    return Promise.resolve({ ok: true, json: async () => ({}) })
  })

  global.fetch = fetchMock as unknown as typeof fetch
  return fetchMock
}

// ---------------------------------------------------------------------------

describe('PaginaPerfil — Eliminación de cuenta', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSignOut.mockResolvedValue(undefined)
  })

  it('debería abrir el dialog de confirmación al hacer click en "Eliminar mi cuenta"', async () => {
    mockFetchBase()
    render(React.createElement(PaginaPerfil))

    // Esperar a que cargue la página
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Eliminar mi cuenta/i })).toBeInTheDocument()
    })

    // El dialog no debe estar visible antes de hacer click
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    // Hacer click en el botón de la zona de peligro
    fireEvent.click(screen.getByRole('button', { name: /Eliminar mi cuenta/i }))

    // El dialog debe aparecer con el texto de confirmación
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText(/Esta acción es irreversible/i)).toBeInTheDocument()
    })
  })

  it('debería llamar a DELETE /api/perfil/eliminar y luego a signOut al confirmar la eliminación', async () => {
    const fetchMock = mockFetchBase({ eliminarOk: true })
    render(React.createElement(PaginaPerfil))

    // Esperar carga y abrir el dialog
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Eliminar mi cuenta/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Eliminar mi cuenta/i }))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // Pulsar el botón de confirmación dentro del dialog
    fireEvent.click(screen.getByRole('button', { name: /Confirmar eliminación/i }))

    // Verificar que se llamó a DELETE /api/perfil/eliminar
    await waitFor(() => {
      const llamadas = fetchMock.mock.calls
      const llamadaDelete = llamadas.find(
        (call) =>
          call[0] === '/api/perfil/eliminar' &&
          call[1]?.method === 'DELETE'
      )
      expect(llamadaDelete).toBeDefined()
    })

    // Verificar que se llamó a signOut con callbackUrl "/"
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: '/' })
    })
  })
})
