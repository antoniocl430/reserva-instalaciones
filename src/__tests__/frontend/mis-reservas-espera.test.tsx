/**
 * Tests del tab "Lista de espera" en PaginaMisReservas
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
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
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

import PaginaMisReservas from '@/app/mis-reservas/page'

// Datos de ejemplo
const entradaEsperando = {
  id: 'espera-1',
  instalacionId: 'inst-1',
  fecha: '2099-06-15T00:00:00.000Z',
  horaInicio: '10:00',
  estado: 'ESPERANDO',
  posicion: 2,
  expiraEn: null as string | null,
  instalacion: { id: 'inst-1', nombre: 'Pista 1' },
}

const entradaNotificada = {
  id: 'espera-2',
  instalacionId: 'inst-1',
  fecha: '2099-06-15T00:00:00.000Z',
  horaInicio: '11:00',
  estado: 'NOTIFICADO',
  posicion: 1,
  expiraEn: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
  instalacion: { id: 'inst-1', nombre: 'Pista 1' },
}

function mockFetch(entradas: typeof entradaEsperando[]) {
  return vi.fn().mockImplementation((url: string) => {
    if (url.includes('/api/lista-espera')) {
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ entradas }) })
    }
    return Promise.resolve({ ok: true, status: 200, json: async () => ({ activas: [], historial: [] }) })
  })
}

describe('PaginaMisReservas — Tab Lista de espera', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPush.mockReset()
    mockToast.mockClear()
  })

  it('muestra el tab Lista de espera junto a Activas e Historial', async () => {
    global.fetch = mockFetch([])
    render(React.createElement(PaginaMisReservas))

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Activas/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /Historial/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /Lista de espera/i })).toBeInTheDocument()
    })
  })

  it('muestra mensaje vacío cuando no hay entradas en lista de espera', async () => {
    global.fetch = mockFetch([])
    render(React.createElement(PaginaMisReservas))

    // Navegar al tab de lista de espera
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Lista de espera/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('tab', { name: /Lista de espera/i }))

    await waitFor(() => {
      expect(screen.getByText(/no estás en ninguna lista de espera/i)).toBeInTheDocument()
    })
  })

  it('muestra las entradas ESPERANDO con posición y botón Abandonar', async () => {
    global.fetch = mockFetch([entradaEsperando])
    render(React.createElement(PaginaMisReservas))

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Lista de espera/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('tab', { name: /Lista de espera/i }))

    await waitFor(() => {
      expect(screen.getByText('Pista 1')).toBeInTheDocument()
      expect(screen.getByText(/posición/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /abandonar/i })).toBeInTheDocument()
    })
  })

  it('muestra las entradas NOTIFICADO con badge de turno y botón Confirmar', async () => {
    global.fetch = mockFetch([entradaNotificada])
    render(React.createElement(PaginaMisReservas))

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Lista de espera/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('tab', { name: /Lista de espera/i }))

    await waitFor(() => {
      expect(screen.getByText('Pista 1')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /confirmar reserva/i })).toBeInTheDocument()
    })
  })

  it('llama a DELETE al hacer clic en Abandonar', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
      if (url.includes('/api/lista-espera/espera-1') && options?.method === 'DELETE') {
        return Promise.resolve({ ok: true, json: async () => ({ ok: true }) })
      }
      if (url.includes('/api/lista-espera')) {
        return Promise.resolve({ ok: true, json: async () => ({ entradas: [entradaEsperando] }) })
      }
      return Promise.resolve({ ok: true, json: async () => ({ activas: [], historial: [] }) })
    })
    global.fetch = fetchMock

    render(React.createElement(PaginaMisReservas))

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Lista de espera/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('tab', { name: /Lista de espera/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /abandonar/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /abandonar/i }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/lista-espera/espera-1',
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })

  it('llama a POST confirmar al hacer clic en Confirmar reserva', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
      if (url.includes('/confirmar') && options?.method === 'POST') {
        return Promise.resolve({ ok: true, json: async () => ({ reserva: { id: 'nueva' } }) })
      }
      if (url.includes('/api/lista-espera')) {
        return Promise.resolve({ ok: true, json: async () => ({ entradas: [entradaNotificada] }) })
      }
      return Promise.resolve({ ok: true, json: async () => ({ activas: [], historial: [] }) })
    })
    global.fetch = fetchMock

    render(React.createElement(PaginaMisReservas))

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Lista de espera/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('tab', { name: /Lista de espera/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /confirmar reserva/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /confirmar reserva/i }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/lista-espera/espera-2/confirmar',
        expect.objectContaining({ method: 'POST' })
      )
    })
  })
})
