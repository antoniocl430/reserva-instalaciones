/**
 * Tests del botón "Ver QR" y el dialog de código QR en PaginaMisReservas
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

// Mock de react-qr-code para evitar SVG real en tests
vi.mock('react-qr-code', () => ({
  default: ({ value }: { value: string }) =>
    React.createElement('div', { 'data-testid': 'qr-code', 'data-value': value }),
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

import PaginaMisReservas from '@/app/mis-reservas/page'

// Datos de ejemplo: reserva activa CON qrToken
const reservaActiva = {
  id: 'res-1',
  fecha: '2099-06-15T00:00:00.000Z',
  horaInicio: '2099-06-15T08:00:00.000Z',
  horaFin: '2099-06-15T09:15:00.000Z',
  estado: 'ACTIVA',
  qrToken: 'abc-123-token',
  instalacion: { id: 'inst-1', nombre: 'Pista 1' },
}

// mockFetch que devuelve la reserva activa
function mockFetch(activas = [reservaActiva]) {
  return vi.fn().mockImplementation((url: string) => {
    if (url === '/api/reservas/mis-reservas') {
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ activas, historial: [] }) })
    }
    if (url.includes('/api/lista-espera')) {
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ entradas: [] }) })
    }
    return Promise.resolve({ ok: true, status: 200, json: async () => ({}) })
  })
}

describe('PaginaMisReservas — Botón Ver QR', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPush.mockReset()
    mockToast.mockClear()
  })

  it('muestra el botón Ver QR para reservas activas con qrToken', async () => {
    global.fetch = mockFetch()
    render(React.createElement(PaginaMisReservas))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ver qr/i })).toBeInTheDocument()
    })
  })

  it('al hacer clic en Ver QR, abre el dialog con el código QR', async () => {
    global.fetch = mockFetch()
    render(React.createElement(PaginaMisReservas))

    // Esperar a que el botón aparezca (datos cargados)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ver qr/i })).toBeInTheDocument()
    })

    // El dialog no debe estar visible aún
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    // Hacer clic en Ver QR
    fireEvent.click(screen.getByRole('button', { name: /ver qr/i }))

    // El dialog debe abrirse con el QR
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByTestId('qr-code')).toBeInTheDocument()
    })
  })

  it('el QR del dialog contiene la URL de verificación con el token correcto', async () => {
    global.fetch = mockFetch()
    render(React.createElement(PaginaMisReservas))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ver qr/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /ver qr/i }))

    await waitFor(() => {
      const qr = screen.getByTestId('qr-code')
      const valor = qr.getAttribute('data-value') ?? ''
      expect(valor).toContain('/verificar/abc-123-token')
    })
  })

  it('no muestra el botón Ver QR si qrToken es null', async () => {
    const reservaSinToken = { ...reservaActiva, qrToken: null }
    global.fetch = mockFetch([reservaSinToken])
    render(React.createElement(PaginaMisReservas))

    await waitFor(() => {
      // La reserva sí se muestra (el nombre de la instalación aparece)
      expect(screen.getByText('Pista 1')).toBeInTheDocument()
    })

    // Pero el botón Ver QR no debe existir
    expect(screen.queryByRole('button', { name: /ver qr/i })).not.toBeInTheDocument()
  })
})
