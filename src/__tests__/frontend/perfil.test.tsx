/**
 * Tests del componente PaginaPerfil (Client Component)
 *
 * Estrategia: mockeamos useSession, useRouter, fetch global y los componentes
 * shadcn/ui que usan Radix. Renderizamos el componente y simulamos
 * interacciones de edición de perfil y eliminación de cuenta.
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
  })),
  signOut: vi.fn(),
}))

// --- Mock de next/navigation ---
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// --- Mock de next/image (si se usa) ---
vi.mock('next/image', () => ({
  default: ({ src, alt, className }: { src: string; alt: string; className?: string }) =>
    React.createElement('img', { src, alt, className }),
}))

// --- Mock de AvatarUsuario ---
vi.mock('@/components/AvatarUsuario', () => ({
  AvatarUsuario: ({ nombre, avatarUrl, className }: { nombre: string; avatarUrl?: string | null; className?: string }) => {
    const iniciales = nombre
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p: string) => p[0])
      .join('')
      .toUpperCase() || '?'
    if (avatarUrl) {
      return React.createElement('img', { src: avatarUrl, alt: `Foto de perfil de ${nombre}`, className })
    }
    return React.createElement('span', { 'data-testid': 'avatar-iniciales', className }, iniciales)
  },
}))

// --- Mock de next/link ---
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    React.createElement('a', { href, className }, children),
}))

// --- Mocks de componentes shadcn/ui ---

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
    accept,
    className,
    placeholder,
  }: {
    id?: string
    value?: string
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
    disabled?: boolean
    type?: string
    accept?: string
    className?: string
    placeholder?: string
  }) =>
    React.createElement('input', {
      id,
      value,
      onChange,
      disabled,
      type,
      accept,
      className,
      placeholder,
    }),
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
    React.createElement(
      'span',
      { 'data-testid': 'badge', 'data-variant': variant, className },
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

// --- Mock de PreferenciasNotificacion ---
vi.mock('@/components/PreferenciasNotificacion', () => ({
  default: () =>
    React.createElement('div', { 'data-testid': 'preferencias-notificacion' }, 'Preferencias mock'),
}))

// --- Mock de push-client ---
const mockSuscribirAPush = vi.fn()
const mockDesuscribirDePush = vi.fn()
const mockObtenerEstadoSuscripcion = vi.fn()

vi.mock('@/lib/push-client', () => ({
  registrarServiceWorker: vi.fn().mockResolvedValue(null),
  suscribirAPush: (...args: unknown[]) => mockSuscribirAPush(...args),
  desuscribirDePush: (...args: unknown[]) => mockDesuscribirDePush(...args),
  obtenerEstadoSuscripcion: (...args: unknown[]) => mockObtenerEstadoSuscripcion(...args),
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
  creadoEn: '2026-01-01T00:00:00Z',
}

describe('PaginaPerfil', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPush.mockReset()
    mockToast.mockClear()
    // Estado de push por defecto para que los tests existentes no fallen
    mockObtenerEstadoSuscripcion.mockResolvedValue('inactivo')

    // Mock inteligente de fetch que maneja múltiples endpoints
    const fetchMock = vi.fn()
    fetchMock.mockImplementation((url: string, options?: any) => {
      if (url === '/api/cuenta' && options?.method !== 'PATCH') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ usuario: usuarioFicticio }),
        })
      }
      if (url === '/api/perfil' && (!options?.method || options?.method === 'GET')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: 'user-1',
            nombre: 'Ana García',
            email: 'ana@test.com',
            rol: 'CIUDADANO',
            noShows: 0,
            suspendidoHasta: null,
            motivoSuspension: null,
            creadoEn: '2026-01-01T00:00:00Z',
          }),
        })
      }
      if (url === '/api/cuenta/preferencias-notificacion' && options?.method !== 'PATCH') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            recordatorioReserva: false,
            cancelacionPropia: false,
            cancelacionAdmin: false,
          }),
        })
      }
      if (url === '/api/cuenta' && options?.method === 'PATCH') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ usuario: { ...usuarioFicticio, nombre: 'Ana García' } }),
        })
      }
      if (url === '/api/cuenta/preferencias-notificacion' && options?.method === 'PATCH') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            recordatorioReserva: false,
            cancelacionPropia: false,
            cancelacionAdmin: false,
          }),
        })
      }
      // Fallback
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      })
    })
    global.fetch = fetchMock as any
  })

  // Helper: mockear fetch para perfil (cuenta) + preferencias notificación (para tests específicos)
  function mockFetchPerfil(overrideCuenta?: any, overridePreferencias?: any) {
    const cuentaDefault = { usuario: usuarioFicticio }
    const preferenciasDefault = {
      recordatorioReserva: false,
      cancelacionPropia: false,
      cancelacionAdmin: false,
    }
    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => overrideCuenta ?? cuentaDefault,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => overridePreferencias ?? preferenciasDefault,
      })
  }

  it('debería renderizar el título "Mi perfil"', async () => {
    render(React.createElement(PaginaPerfil))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Mi perfil/i })).toBeInTheDocument()
    })
  })

  it('debería mostrar el avatar con las iniciales cuando no hay avatarUrl', async () => {
    render(React.createElement(PaginaPerfil))

    await waitFor(() => {
      const avatarIniciales = screen.getByTestId('avatar-iniciales')
      expect(avatarIniciales).toBeInTheDocument()
      expect(avatarIniciales.textContent).toBe('AG')
    })
  })

  it('debería mostrar el campo nombre con el valor cargado de la API', async () => {
    render(React.createElement(PaginaPerfil))

    await waitFor(() => {
      const campoNombre = screen.getByDisplayValue('Ana García')
      expect(campoNombre).toBeInTheDocument()
    })
  })

  it('debería tener el campo email deshabilitado', async () => {
    render(React.createElement(PaginaPerfil))

    await waitFor(() => {
      const campoEmail = screen.getByDisplayValue('ana@test.com')
      expect(campoEmail).toBeDisabled()
    })
  })

  it('debería llamar a PATCH /api/cuenta al pulsar "Guardar cambios"', async () => {
    render(React.createElement(PaginaPerfil))

    await waitFor(() => {
      expect(screen.getByDisplayValue('Ana García')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Guardar cambios/i }))

    await waitFor(() => {
      const llamadas = (global.fetch as ReturnType<typeof vi.fn>).mock.calls
      const llamadaPatch = llamadas.find(
        (call) =>
          typeof call[0] === 'string' &&
          call[0].includes('/api/cuenta') &&
          call[1]?.method === 'PATCH'
      )
      expect(llamadaPatch).toBeDefined()
    })
  })

  it('debería mostrar la sección de zona de peligro', async () => {
    render(React.createElement(PaginaPerfil))

    await waitFor(() => {
      expect(screen.getByText(/Zona de peligro/i)).toBeInTheDocument()
    })
  })

  it('debería abrir el dialog de confirmación al pulsar "Eliminar mi cuenta"', async () => {
    render(React.createElement(PaginaPerfil))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Eliminar mi cuenta/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Eliminar mi cuenta/i }))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText(/Esta acción es irreversible/i)).toBeInTheDocument()
    })
  })

  it('debería mostrar enlace para volver al inicio', async () => {
    render(React.createElement(PaginaPerfil))

    await waitFor(() => {
      // El enlace de vuelta al inicio dice "Inicio" (con icono ChevronLeft)
      const enlace = document.querySelector('a[href="/"]')
      expect(enlace).toBeInTheDocument()
    })
  })

  it('debería llamar a toast con título de éxito al guardar los cambios correctamente', async () => {
    render(React.createElement(PaginaPerfil))

    await waitFor(() => {
      expect(screen.getByDisplayValue('Ana García')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Guardar cambios/i }))

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringMatching(/guardado|éxito/i),
        })
      )
    })
  })

  it('debería llamar a toast con variante destructive cuando falla el guardado', async () => {
    // Override: hacer que el PATCH falle
    ;(global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce((url: string, options?: any) => {
      if (url === '/api/cuenta' && options?.method === 'PATCH') {
        return Promise.resolve({
          ok: false,
          status: 500,
        })
      }
      // Usar el comportamiento default para otros endpoints
      if (url === '/api/cuenta' && options?.method !== 'PATCH') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ usuario: usuarioFicticio }),
        })
      }
      if (url === '/api/cuenta/preferencias-notificacion' && options?.method !== 'PATCH') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            recordatorioReserva: false,
            cancelacionPropia: false,
            cancelacionAdmin: false,
          }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      })
    })

    render(React.createElement(PaginaPerfil))

    await waitFor(() => {
      expect(screen.getByDisplayValue('Ana García')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Guardar cambios/i }))

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
        })
      )
    })
  })

  it('no debería mostrar mensajes de estado inline al guardar correctamente', async () => {
    render(React.createElement(PaginaPerfil))

    await waitFor(() => {
      expect(screen.getByDisplayValue('Ana García')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Guardar cambios/i }))

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalled()
    })

    // No debe haber mensajes inline de estado con role="status"
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  // --- Tests de la sección de notificaciones push ---

  it('debería mostrar la sección "Notificaciones push" con botón "Activar notificaciones" cuando el estado es inactivo', async () => {
    mockObtenerEstadoSuscripcion.mockResolvedValue('inactivo')

    render(React.createElement(PaginaPerfil))

    await waitFor(() => {
      expect(screen.getByText(/Notificaciones push/i)).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /Activar notificaciones/i })).toBeInTheDocument()
  })

  it('debería mostrar botón "Desactivar notificaciones" cuando las notificaciones están activas', async () => {
    mockObtenerEstadoSuscripcion.mockResolvedValue('activo')

    render(React.createElement(PaginaPerfil))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Desactivar notificaciones/i })).toBeInTheDocument()
    })
  })

  it('debería mostrar aviso de permisos bloqueados cuando el estado es "denegado"', async () => {
    mockObtenerEstadoSuscripcion.mockResolvedValue('denegado')

    render(React.createElement(PaginaPerfil))

    await waitFor(() => {
      expect(screen.getByText(/Debes permitir las notificaciones/i)).toBeInTheDocument()
    })
  })

  it('debería mostrar aviso de no soportado cuando el estado es "no-soportado"', async () => {
    mockObtenerEstadoSuscripcion.mockResolvedValue('no-soportado')

    render(React.createElement(PaginaPerfil))

    await waitFor(() => {
      expect(screen.getByText(/Tu navegador no soporta notificaciones push/i)).toBeInTheDocument()
    })
  })

  it('debería llamar a suscribirAPush al pulsar "Activar notificaciones"', async () => {
    mockObtenerEstadoSuscripcion.mockResolvedValue('inactivo')
    mockSuscribirAPush.mockResolvedValue(true)

    render(React.createElement(PaginaPerfil))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Activar notificaciones/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Activar notificaciones/i }))

    await waitFor(() => {
      expect(mockSuscribirAPush).toHaveBeenCalled()
    })
  })

  it('debería llamar a desuscribirDePush al pulsar "Desactivar notificaciones"', async () => {
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
})
