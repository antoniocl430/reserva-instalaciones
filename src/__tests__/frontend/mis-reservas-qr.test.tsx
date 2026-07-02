/**
 * Verifica que el botón QR no aparece en la vista del ciudadano.
 * El QR se gestiona exclusivamente desde el panel de administración.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    React.createElement('a', { href, className }, children),
}))

vi.mock('lucide-react', () => ({
  Loader2: () => null,
  ChevronLeft: () => null,
  Calendar: () => null,
  Clock: () => null,
  X: () => null,
  Star: () => null,
  ClockIcon: () => null,
  ListOrdered: () => null,
}))

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
  TabsList: ({ children, active, onTabChange }: { children: React.ReactNode; active?: string; onTabChange?: (v: string) => void }) =>
    React.createElement('div', { role: 'tablist' },
      React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child
        return React.cloneElement(child as React.ReactElement<{ active?: string; onTabChange?: (v: string) => void }>, { active, onTabChange })
      })
    ),
  TabsTrigger: ({ children, value, active, onTabChange }: { children: React.ReactNode; value: string; active?: string; onTabChange?: (v: string) => void }) =>
    React.createElement('button', { role: 'tab', 'aria-selected': active === value, onClick: () => onTabChange?.(value) }, children),
  TabsContent: ({ children, value, active }: { children: React.ReactNode; value: string; active?: string }) =>
    active === value ? React.createElement('div', { 'data-testid': `tab-content-${value}` }, children) : null,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, className }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; variant?: string; className?: string }) =>
    React.createElement('button', { onClick, disabled, 'data-variant': variant, className }, children),
}))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? React.createElement('div', { role: 'dialog' }, children) : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => React.createElement('div', {}, children),
  DialogHeader: ({ children }: { children: React.ReactNode }) => React.createElement('div', {}, children),
  DialogTitle: ({ children }: { children: React.ReactNode }) => React.createElement('h2', {}, children),
  DialogDescription: ({ children }: { children: React.ReactNode }) => React.createElement('p', {}, children),
  DialogFooter: ({ children }: { children: React.ReactNode }) => React.createElement('div', {}, children),
}))

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => React.createElement('div', { className, 'data-testid': 'skeleton' }),
}))

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => React.createElement('textarea', props),
}))

vi.mock('@/components/StarRating', () => ({
  default: ({ value }: { value: number }) => React.createElement('span', { 'data-testid': 'star-rating', 'data-value': value }),
}))

import PaginaMisReservas from '@/app/mis-reservas/page'

const reservaActiva = {
  id: 'res-1',
  fecha: '2099-06-15T00:00:00.000Z',
  horaInicio: '2099-06-15T08:00:00.000Z',
  horaFin: '2099-06-15T09:15:00.000Z',
  estado: 'ACTIVA',
  qrToken: 'abc-123-token',
  instalacion: { id: 'inst-1', nombre: 'Pista 1' },
  valoracion: null,
}

function mockFetch() {
  return vi.fn().mockImplementation((url: string) => {
    if (url === '/api/reservas/mis-reservas') {
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ activas: [reservaActiva], historial: [] }) })
    }
    if (url.includes('/api/lista-espera')) {
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ entradas: [] }) })
    }
    return Promise.resolve({ ok: true, status: 200, json: async () => ({}) })
  })
}

describe('PaginaMisReservas — QR eliminado de la vista ciudadano', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('no muestra el botón QR aunque la reserva tenga qrToken', async () => {
    global.fetch = mockFetch()
    render(React.createElement(PaginaMisReservas))

    await waitFor(() => {
      expect(screen.getByText('Pista 1')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: /qr/i })).not.toBeInTheDocument()
  })

  it('sí muestra el botón Cancelar en reservas activas', async () => {
    global.fetch = mockFetch()
    render(React.createElement(PaginaMisReservas))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument()
    })
  })
})
