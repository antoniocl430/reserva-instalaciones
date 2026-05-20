/**
 * Tests de las secciones nuevas de PaginaPerfil:
 *   - Datos personales (nombre editable, email solo lectura)
 *   - Cambio de contraseña
 *   - Penalizaciones (solo CIUDADANO)
 *
 * Estas secciones usan el endpoint GET/PATCH /api/perfil.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import React from 'react'

// --- Mock de useToast ---
const mockToast = vi.fn()
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}))

// --- Mock de next-auth/react (sesión de CIUDADANO por defecto) ---
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
    React.createElement('input', {
      id,
      value,
      onChange,
      disabled,
      type,
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
    React.createElement(
      'div',
      { role: 'alert', 'data-variant': variant, className },
      children
    ),
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
const usuarioCiudadano = {
  id: 'user-1',
  nombre: 'Juan López',
  email: 'juan@test.com',
  rol: 'CIUDADANO',
  noShows: 0,
  suspendidoHasta: null,
  motivoSuspension: null,
  creadoEn: '2026-01-01T00:00:00Z',
}

const usuarioAdmin = {
  id: 'user-2',
  nombre: 'Admin Test',
  email: 'admin@test.com',
  rol: 'ADMIN',
  noShows: 0,
  suspendidoHasta: null,
  motivoSuspension: null,
  creadoEn: '2026-01-01T00:00:00Z',
}

/** Configura la sesión mock según el rol */
function mockSesion(rol: 'CIUDADANO' | 'ADMIN' | 'INSTRUCTOR') {
  const usuario = rol === 'CIUDADANO' ? usuarioCiudadano : usuarioAdmin
  mockUseSession.mockReturnValue({
    data: {
      user: {
        id: usuario.id,
        name: usuario.nombre,
        email: usuario.email,
        rol,
        avatarUrl: null,
      },
    },
    status: 'authenticated',
    update: vi.fn(),
  })
}

/** Configura fetch para devolver los datos de /api/cuenta y /api/perfil */
function mockFetch(
  datosPerfilExtra: Partial<typeof usuarioCiudadano> = {},
  patchOk = true
) {
  const cuentaData = {
    id: usuarioCiudadano.id,
    nombre: usuarioCiudadano.nombre,
    email: usuarioCiudadano.email,
    rol: usuarioCiudadano.rol,
    avatarUrl: null,
    creadoEn: usuarioCiudadano.creadoEn,
  }
  const perfilData = { ...usuarioCiudadano, ...datosPerfilExtra }

  const fetchMock = vi.fn().mockImplementation((url: string, options?: { method?: string; body?: string }) => {
    // GET /api/cuenta
    if (url === '/api/cuenta' && (!options?.method || options.method === 'GET')) {
      return Promise.resolve({ ok: true, json: async () => ({ usuario: cuentaData }) })
    }
    // GET /api/perfil
    if (url === '/api/perfil' && (!options?.method || options.method === 'GET')) {
      return Promise.resolve({ ok: true, json: async () => perfilData })
    }
    // PATCH /api/perfil
    if (url === '/api/perfil' && options?.method === 'PATCH') {
      if (patchOk) {
        return Promise.resolve({ ok: true, json: async () => ({ ok: true, usuario: perfilData }) })
      } else {
        return Promise.resolve({ ok: false, json: async () => ({ error: 'Contraseña actual incorrecta' }) })
      }
    }
    // PATCH /api/cuenta
    if (url === '/api/cuenta' && options?.method === 'PATCH') {
      return Promise.resolve({ ok: true, json: async () => ({ usuario: cuentaData }) })
    }
    // GET preferencias
    if (url === '/api/cuenta/preferencias-notificacion' && (!options?.method || options.method === 'GET')) {
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

describe('PaginaPerfil — Sección datos personales', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSesion('CIUDADANO')
    mockFetch()
  })

  it('debería renderizar el campo nombre pre-relleno con el valor cargado de la API', async () => {
    render(React.createElement(PaginaPerfil))

    await waitFor(() => {
      expect(screen.getByDisplayValue('Juan López')).toBeInTheDocument()
    })
  })

  it('debería renderizar el campo email como solo lectura', async () => {
    render(React.createElement(PaginaPerfil))

    await waitFor(() => {
      const campoEmail = screen.getByDisplayValue('juan@test.com')
      expect(campoEmail).toBeDisabled()
    })
  })

  it('debería llamar a PATCH /api/cuenta con el nombre al guardar cambios', async () => {
    const fetchMock = mockFetch()
    render(React.createElement(PaginaPerfil))

    await waitFor(() => {
      expect(screen.getByDisplayValue('Juan López')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Guardar cambios/i }))

    await waitFor(() => {
      const llamadas = fetchMock.mock.calls
      const patchLlamada = llamadas.find(
        (call) => call[0] === '/api/cuenta' && call[1]?.method === 'PATCH'
      )
      expect(patchLlamada).toBeDefined()
      const body = JSON.parse(patchLlamada![1].body)
      expect(body).toHaveProperty('nombre')
    })
  })

  it('debería mostrar toast de éxito al guardar el nombre correctamente', async () => {
    render(React.createElement(PaginaPerfil))

    await waitFor(() => {
      expect(screen.getByDisplayValue('Juan López')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Guardar cambios/i }))

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.stringMatching(/guardado|cambi|perfil/i) })
      )
    })
  })
})

// ---------------------------------------------------------------------------

describe('PaginaPerfil — Sección cambio de contraseña', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSesion('CIUDADANO')
    mockFetch()
  })

  it('debería mostrar error inline cuando nueva contraseña y confirmación no coinciden', async () => {
    render(React.createElement(PaginaPerfil))

    await waitFor(() => {
      expect(screen.getByLabelText(/Contraseña actual/i)).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText(/Contraseña actual/i), {
      target: { value: 'claveVieja' },
    })
    // Usar el id directamente para evitar ambigüedad entre "Nueva contraseña" y "Confirmar nueva contraseña"
    fireEvent.change(screen.getByLabelText(/^Nueva contraseña$/i), {
      target: { value: 'clave1234' },
    })
    fireEvent.change(screen.getByLabelText(/Confirmar nueva contraseña/i), {
      target: { value: 'claveDiferente' },
    })

    fireEvent.click(screen.getByRole('button', { name: /Cambiar contraseña/i }))

    await waitFor(() => {
      expect(screen.getByText(/contraseñas no coinciden/i)).toBeInTheDocument()
    })
  })

  it('no debería enviar la petición cuando nueva contraseña y confirmación no coinciden', async () => {
    const fetchMock = mockFetch()
    render(React.createElement(PaginaPerfil))

    await waitFor(() => {
      expect(screen.getByLabelText(/Contraseña actual/i)).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText(/Contraseña actual/i), {
      target: { value: 'claveVieja' },
    })
    fireEvent.change(screen.getByLabelText(/^Nueva contraseña$/i), {
      target: { value: 'clave1234' },
    })
    fireEvent.change(screen.getByLabelText(/Confirmar nueva contraseña/i), {
      target: { value: 'claveDiferente' },
    })

    fireEvent.click(screen.getByRole('button', { name: /Cambiar contraseña/i }))

    await waitFor(() => {
      expect(screen.getByText(/contraseñas no coinciden/i)).toBeInTheDocument()
    })

    // Verificar que no se envió ningún PATCH a /api/perfil
    const llamadas = fetchMock.mock.calls
    const patchPerfil = llamadas.find(
      (call) => call[0] === '/api/perfil' && call[1]?.method === 'PATCH'
    )
    expect(patchPerfil).toBeUndefined()
  })

  it('debería llamar a PATCH /api/perfil con passwordActual y passwordNueva cuando las contraseñas coinciden', async () => {
    const fetchMock = mockFetch()
    render(React.createElement(PaginaPerfil))

    await waitFor(() => {
      expect(screen.getByLabelText(/Contraseña actual/i)).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText(/Contraseña actual/i), {
      target: { value: 'claveVieja' },
    })
    fireEvent.change(screen.getByLabelText(/^Nueva contraseña$/i), {
      target: { value: 'claveNueva1' },
    })
    fireEvent.change(screen.getByLabelText(/Confirmar nueva contraseña/i), {
      target: { value: 'claveNueva1' },
    })

    fireEvent.click(screen.getByRole('button', { name: /Cambiar contraseña/i }))

    await waitFor(() => {
      const llamadas = fetchMock.mock.calls
      const patchPerfil = llamadas.find(
        (call) => call[0] === '/api/perfil' && call[1]?.method === 'PATCH'
      )
      expect(patchPerfil).toBeDefined()
      const body = JSON.parse(patchPerfil![1].body)
      expect(body).toEqual(
        expect.objectContaining({
          passwordActual: 'claveVieja',
          passwordNueva: 'claveNueva1',
        })
      )
    })
  })
})

// ---------------------------------------------------------------------------

describe('PaginaPerfil — Sección penalizaciones', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('no debería mostrar la sección penalizaciones cuando el rol es ADMIN', async () => {
    mockSesion('ADMIN')
    // Para admin, /api/perfil devuelve rol ADMIN
    const fetchMock = vi.fn().mockImplementation((url: string, options?: { method?: string }) => {
      if (url === '/api/cuenta' && (!options?.method || options.method === 'GET')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            usuario: { id: 'u2', nombre: 'Admin', email: 'admin@test.com', rol: 'ADMIN', avatarUrl: null, creadoEn: '2026-01-01T00:00:00Z' },
          }),
        })
      }
      if (url === '/api/perfil' && (!options?.method || options.method === 'GET')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: 'u2', nombre: 'Admin', email: 'admin@test.com', rol: 'ADMIN',
            noShows: 0, suspendidoHasta: null, motivoSuspension: null, creadoEn: '2026-01-01T00:00:00Z',
          }),
        })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })
    global.fetch = fetchMock as unknown as typeof fetch

    render(React.createElement(PaginaPerfil))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Mi perfil/i })).toBeInTheDocument()
    })

    // La sección "Penalizaciones" no debe aparecer para ADMIN
    expect(screen.queryByRole('heading', { name: /^Penalizaciones$/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/no-shows acumulados/i)).not.toBeInTheDocument()
  })

  it('debería mostrar badge de no-shows cuando noShows > 0', async () => {
    mockSesion('CIUDADANO')
    mockFetch({ noShows: 2 })

    render(React.createElement(PaginaPerfil))

    await waitFor(() => {
      expect(screen.getByText(/2 no-shows/i)).toBeInTheDocument()
    })
  })

  it('debería mostrar alerta de suspensión activa cuando suspendidoHasta es una fecha futura', async () => {
    mockSesion('CIUDADANO')
    // Fecha futura: 1 año desde ahora
    const fechaFutura = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    mockFetch({
      noShows: 3,
      suspendidoHasta: fechaFutura,
      motivoSuspension: 'Demasiados no-shows',
    })

    render(React.createElement(PaginaPerfil))

    await waitFor(() => {
      // El componente muestra "Cuenta suspendida hasta [fecha]. Motivo: [motivo]"
      expect(screen.getByText(/Cuenta suspendida hasta/i)).toBeInTheDocument()
      expect(screen.getByText(/Demasiados no-shows/i)).toBeInTheDocument()
    })
  })

  it('debería mostrar mensaje de no penalizaciones cuando noShows === 0 y sin suspensión', async () => {
    mockSesion('CIUDADANO')
    mockFetch({ noShows: 0, suspendidoHasta: null })

    render(React.createElement(PaginaPerfil))

    await waitFor(() => {
      expect(screen.getByText(/No tienes penalizaciones/i)).toBeInTheDocument()
    })
  })
})
