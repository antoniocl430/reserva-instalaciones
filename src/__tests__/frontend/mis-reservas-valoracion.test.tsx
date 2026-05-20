/**
 * Tests del sistema de valoraciones en PaginaMisReservas
 * Cubre el botón "Valorar" en el historial y el dialog de valoración
 * TDD: tests escritos ANTES de implementar la funcionalidad
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import React from 'react'

// --- Mocks de next ---
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

const mockToast = vi.fn()
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    React.createElement('a', { href, className }, children),
}))

// Mock de react-qr-code
vi.mock('react-qr-code', () => ({
  default: ({ value }: { value: string }) =>
    React.createElement('div', { 'data-testid': 'qr-code', 'data-value': value }),
}))

// Mock de StarRating para aislar el comportamiento
vi.mock('@/components/StarRating', () => ({
  default: ({
    value,
    interactive,
    onChange,
    size,
  }: {
    value: number
    interactive?: boolean
    onChange?: (n: number) => void
    size?: string
  }) => {
    if (interactive) {
      return React.createElement(
        'div',
        { 'data-testid': 'star-rating-interactivo', 'data-value': value, 'data-size': size },
        [1, 2, 3, 4, 5].map((n) =>
          React.createElement('button', {
            key: n,
            role: 'button',
            'aria-label': `${n} estrella${n > 1 ? 's' : ''}`,
            onClick: () => onChange?.(n),
            'data-testid': `star-btn-${n}`,
          }, '★')
        )
      )
    }
    return React.createElement('div', {
      'data-testid': 'star-rating-lectura',
      'data-value': value,
      'data-size': size,
    }, `★ ${value}`)
  },
}))

// --- Mocks de shadcn/ui ---
vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, defaultValue }: { children: React.ReactNode; defaultValue?: string }) => {
    const [active, setActive] = React.useState(defaultValue ?? 'activas')
    return React.createElement(
      'div',
      { 'data-testid': 'tabs' },
      React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child
        return React.cloneElement(child as React.ReactElement<{ active?: string; onTabChange?: (v: string) => void }>, {
          active,
          onTabChange: setActive,
        })
      })
    )
  },
  TabsList: ({ children, active, onTabChange }: {
    children: React.ReactNode
    active?: string
    onTabChange?: (v: string) => void
  }) =>
    React.createElement(
      'div',
      { role: 'tablist' },
      React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child
        return React.cloneElement(child as React.ReactElement<{ active?: string; onTabChange?: (v: string) => void }>, {
          active,
          onTabChange,
        })
      })
    ),
  TabsTrigger: ({ children, value, active, onTabChange }: {
    children: React.ReactNode
    value: string
    active?: string
    onTabChange?: (v: string) => void
  }) =>
    React.createElement(
      'button',
      {
        role: 'tab',
        'aria-selected': active === value,
        onClick: () => onTabChange?.(value),
        'data-value': value,
      },
      children
    ),
  TabsContent: ({ children, value, active }: {
    children: React.ReactNode
    value: string
    active?: string
  }) => (active === value ? React.createElement('div', { 'data-testid': `tab-content-${value}` }, children) : null),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className, variant }: { children: React.ReactNode; className?: string; variant?: string }) =>
    React.createElement('span', { className, 'data-variant': variant, 'data-testid': 'badge' }, children),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, size, className }: {
    children: React.ReactNode
    onClick?: () => void
    disabled?: boolean
    variant?: string
    size?: string
    className?: string
  }) => React.createElement('button', { onClick, disabled, 'data-variant': variant, className }, children),
}))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children, onOpenChange }: { open: boolean; children: React.ReactNode; onOpenChange?: (v: boolean) => void }) =>
    open ? React.createElement('div', { role: 'dialog' }, children) : null,
  DialogContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', {}, children),
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

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({ value, onChange, placeholder, maxLength, className }: {
    value?: string
    onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
    placeholder?: string
    maxLength?: number
    className?: string
  }) =>
    React.createElement('textarea', { value, onChange, placeholder, maxLength, className }),
}))

// --- Datos de ejemplo ---

const reservaHistorialSinValorar = {
  id: 'hist-1',
  fecha: '2025-01-15T00:00:00.000Z',
  horaInicio: '2025-01-15T10:00:00.000Z',
  horaFin: '2025-01-15T11:00:00.000Z',
  estado: 'ACTIVA', // "ACTIVA" completada en historial
  qrToken: null,
  instalacion: { id: 'inst-1', nombre: 'Pista de Pádel 1' },
  valoracion: null as { id: string; puntuacion: number; comentario: string } | null,
}

const reservaHistorialConValoracion = {
  id: 'hist-2',
  fecha: '2025-01-10T00:00:00.000Z',
  horaInicio: '2025-01-10T09:00:00.000Z',
  horaFin: '2025-01-10T10:00:00.000Z',
  estado: 'ACTIVA',
  qrToken: null,
  instalacion: { id: 'inst-2', nombre: 'Pista de Tenis 1' },
  valoracion: { id: 'val-1', puntuacion: 4, comentario: 'Muy buena pista' },
}

// mockFetch que devuelve historial con reservas
function mockFetch(historial = [reservaHistorialSinValorar]) {
  return vi.fn().mockImplementation((url: string) => {
    if (url === '/api/reservas/mis-reservas') {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ activas: [], historial }),
      })
    }
    if (url.includes('/api/lista-espera')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ entradas: [] }),
      })
    }
    if (url === '/api/valoraciones') {
      return Promise.resolve({
        ok: true,
        status: 201,
        json: async () => ({
          valoracion: { id: 'val-nuevo', puntuacion: 4, comentario: null },
        }),
      })
    }
    return Promise.resolve({ ok: true, status: 200, json: async () => ({}) })
  })
}

import PaginaMisReservas from '@/app/mis-reservas/page'

// Para navegar al tab de historial debemos hacer click en el trigger
async function irAHistorial() {
  const tabHistorial = screen.getByRole('tab', { name: /historial/i })
  fireEvent.click(tabHistorial)
}

describe('PaginaMisReservas — Valoraciones en historial', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPush.mockReset()
    mockToast.mockClear()
  })

  it('muestra botón "Valorar" en reserva del historial sin valoración', async () => {
    global.fetch = mockFetch([reservaHistorialSinValorar])
    render(React.createElement(PaginaMisReservas))

    await waitFor(() => {
      // Primero esperamos a que carguen los datos
      expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument()
    })

    await irAHistorial()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /valorar/i })).toBeInTheDocument()
    })
  })

  it('NO muestra botón "Valorar" si la reserva ya tiene valoración', async () => {
    global.fetch = mockFetch([reservaHistorialConValoracion])
    render(React.createElement(PaginaMisReservas))

    await waitFor(() => {
      expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument()
    })

    await irAHistorial()

    await waitFor(() => {
      expect(screen.getByText('Pista de Tenis 1')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: /valorar/i })).not.toBeInTheDocument()
  })

  it('muestra las estrellas de la valoración existente en el historial', async () => {
    global.fetch = mockFetch([reservaHistorialConValoracion])
    render(React.createElement(PaginaMisReservas))

    await waitFor(() => {
      expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument()
    })

    await irAHistorial()

    await waitFor(() => {
      // Debe mostrarse el componente StarRating en modo lectura con puntuacion=4
      const starRating = screen.getByTestId('star-rating-lectura')
      expect(starRating).toBeInTheDocument()
      expect(starRating.getAttribute('data-value')).toBe('4')
    })
  })

  it('abre dialog de valoración al clicar "Valorar"', async () => {
    global.fetch = mockFetch([reservaHistorialSinValorar])
    render(React.createElement(PaginaMisReservas))

    await waitFor(() => {
      expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument()
    })

    await irAHistorial()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /valorar/i })).toBeInTheDocument()
    })

    // El dialog no debe estar visible aún
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /valorar/i }))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText(/valorar instalación/i)).toBeInTheDocument()
    })
  })

  it('botón "Enviar valoración" deshabilitado con 0 estrellas', async () => {
    global.fetch = mockFetch([reservaHistorialSinValorar])
    render(React.createElement(PaginaMisReservas))

    await waitFor(() => {
      expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument()
    })

    await irAHistorial()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /valorar/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /valorar/i }))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // El botón de enviar debe estar deshabilitado al abrirse (0 estrellas)
    const btnEnviar = screen.getByRole('button', { name: /enviar valoración/i })
    expect(btnEnviar).toBeDisabled()
  })

  it('POST a /api/valoraciones al confirmar con estrellas seleccionadas', async () => {
    global.fetch = mockFetch([reservaHistorialSinValorar])
    render(React.createElement(PaginaMisReservas))

    await waitFor(() => {
      expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument()
    })

    await irAHistorial()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /valorar/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /valorar/i }))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // Seleccionar 4 estrellas mediante el mock de StarRating interactivo
    const btnEstrella4 = screen.getByTestId('star-btn-4')
    fireEvent.click(btnEstrella4)

    // Ahora el botón de enviar debe estar habilitado
    await waitFor(() => {
      const btnEnviar = screen.getByRole('button', { name: /enviar valoración/i })
      expect(btnEnviar).not.toBeDisabled()
    })

    // Enviar la valoración
    fireEvent.click(screen.getByRole('button', { name: /enviar valoración/i }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/valoraciones',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
          body: expect.stringContaining('"puntuacion":4'),
        })
      )
    })
  })

  it('muestra error inline si la API devuelve 409 (ya valorada)', async () => {
    // Primero mock normal para cargar historial
    global.fetch = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
      if (url === '/api/reservas/mis-reservas') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ activas: [], historial: [reservaHistorialSinValorar] }),
        })
      }
      if (url.includes('/api/lista-espera')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ entradas: [] }),
        })
      }
      if (url === '/api/valoraciones' && options?.method === 'POST') {
        return Promise.resolve({
          ok: false,
          status: 409,
          json: async () => ({ error: 'Esta reserva ya ha sido valorada' }),
        })
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) })
    })

    render(React.createElement(PaginaMisReservas))

    await waitFor(() => {
      expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument()
    })

    await irAHistorial()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /valorar/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /valorar/i }))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // Seleccionar estrellas y enviar
    fireEvent.click(screen.getByTestId('star-btn-3'))

    await waitFor(() => {
      const btnEnviar = screen.getByRole('button', { name: /enviar valoración/i })
      expect(btnEnviar).not.toBeDisabled()
    })

    fireEvent.click(screen.getByRole('button', { name: /enviar valoración/i }))

    await waitFor(() => {
      // Debe mostrarse el error inline en el dialog
      expect(screen.getByText(/ya ha sido valorada/i)).toBeInTheDocument()
    })
  })
})
