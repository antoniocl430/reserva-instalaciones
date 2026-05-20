/**
 * Tests del componente PaginaMisReservas (Client Component)
 *
 * Estrategia: mockeamos fetch global y los componentes shadcn/ui que usan
 * Radix (Tabs, Dialog, Badge, Button). Renderizamos el componente y
 * simulamos interacciones de cancelación.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import React from 'react'

// --- Mock de next/navigation (useRouter) ---
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// --- Mock de useToast ---
const mockToast = vi.fn()
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}))

// --- Mock de next/link ---
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    React.createElement('a', { href, className }, children),
}))

// --- Mocks de componentes shadcn/ui ---

// Mock de Tabs: renderiza dos paneles, el primero visible por defecto
vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, defaultValue }: { children: React.ReactNode; defaultValue?: string }) => {
    const [active, setActive] = React.useState(defaultValue ?? 'activas')
    return React.createElement(
      'div',
      { 'data-testid': 'tabs' },
      React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child
        // Inyectamos la pestaña activa en los hijos que la necesiten
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

import PaginaMisReservas from '@/app/mis-reservas/page'

// Datos de ejemplo
const reservaActiva = {
  id: 'res-1',
  fecha: '2026-03-30T00:00:00Z',
  horaInicio: '2026-03-30T10:00:00Z',
  horaFin: '2026-03-30T11:00:00Z',
  estado: 'ACTIVA',
  instalacion: { id: 'p1', nombre: 'Pista de Pádel 1' },
}

const reservaHistorial = {
  id: 'res-2',
  fecha: '2026-03-10T00:00:00Z',
  horaInicio: '2026-03-10T09:00:00Z',
  horaFin: '2026-03-10T10:00:00Z',
  estado: 'CANCELADA',
  instalacion: { id: 'p2', nombre: 'Pista de Pádel 2' },
}

describe('PaginaMisReservas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPush.mockReset()
    mockToast.mockClear()
    global.fetch = vi.fn()
  })

  it('debería mostrar las tabs Activas e Historial', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ activas: [], historial: [] }),
    })

    render(React.createElement(PaginaMisReservas))

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Activas/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /Historial/i })).toBeInTheDocument()
    })
  })

  it('debería mostrar mensaje vacío cuando no hay reservas activas', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ activas: [], historial: [] }),
    })

    render(React.createElement(PaginaMisReservas))

    await waitFor(() => {
      expect(screen.getByText('No tienes reservas activas')).toBeInTheDocument()
    })
  })

  it('debería mostrar las reservas activas con el nombre de la pista', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ activas: [reservaActiva], historial: [] }),
    })

    render(React.createElement(PaginaMisReservas))

    await waitFor(() => {
      expect(screen.getByText('Pista de Pádel 1')).toBeInTheDocument()
    })
  })

  it('debería mostrar botón Cancelar en cada reserva activa', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ activas: [reservaActiva], historial: [] }),
    })

    render(React.createElement(PaginaMisReservas))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Cancelar/i })).toBeInTheDocument()
    })
  })

  it('debería abrir el dialog de cancelación al pulsar Cancelar', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ activas: [reservaActiva], historial: [] }),
    })

    render(React.createElement(PaginaMisReservas))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Cancelar/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Cancelar reserva')).toBeInTheDocument()
    })
  })

  it('debería llamar a PATCH /api/reservas/[id]/cancelar al confirmar la cancelación', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ activas: [reservaActiva], historial: [] }),
      })
      // Respuesta al PATCH
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Reserva cancelada' }),
      })
      // Recarga de reservas tras cancelar
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ activas: [], historial: [{ ...reservaActiva, estado: 'CANCELADA' }] }),
      })

    render(React.createElement(PaginaMisReservas))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Cancelar/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // Hacer click en "Confirmar cancelación"
    const botonConfirmar = screen.getByText('Confirmar cancelación')
    fireEvent.click(botonConfirmar)

    await waitFor(() => {
      const llamadas = (global.fetch as ReturnType<typeof vi.fn>).mock.calls
      const llamadaPatch = llamadas.find(
        (call) =>
          typeof call[0] === 'string' &&
          call[0].includes('/api/reservas/') &&
          call[0].includes('/cancelar') &&
          call[1]?.method === 'PATCH'
      )
      expect(llamadaPatch).toBeDefined()
    })

    // Verificar que el toast de confirmación fue mostrado
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringMatching(/cancelada/i),
        })
      )
    })
  })

  it('debería mostrar las reservas del historial en la pestaña Historial', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ activas: [], historial: [reservaHistorial] }),
    })

    render(React.createElement(PaginaMisReservas))

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Historial/i })).toBeInTheDocument()
    })

    // Hacer click en la pestaña Historial
    fireEvent.click(screen.getByRole('tab', { name: /Historial/i }))

    await waitFor(() => {
      expect(screen.getByText('Pista de Pádel 2')).toBeInTheDocument()
    })
  })

  it('debería mostrar mensaje vacío en el historial cuando no hay reservas pasadas', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ activas: [], historial: [] }),
    })

    render(React.createElement(PaginaMisReservas))

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Historial/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('tab', { name: /Historial/i }))

    await waitFor(() => {
      expect(screen.getByText('No hay reservas en el historial')).toBeInTheDocument()
    })
  })

  it('debería mostrar error global si la carga de reservas falla', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    })

    render(React.createElement(PaginaMisReservas))

    await waitFor(() => {
      expect(
        screen.getByText(/No se pudieron cargar tus reservas/i)
      ).toBeInTheDocument()
    })
  })

  it('debería mostrar enlace para volver al inicio', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ activas: [], historial: [] }),
    })

    render(React.createElement(PaginaMisReservas))

    await waitFor(() => {
      // El enlace de vuelta al inicio dice "Inicio" (con icono ChevronLeft)
      const enlace = document.querySelector('a[href="/"]')
      expect(enlace).toBeInTheDocument()
    })
  })
})
