/**
 * Tests TDD para la funcionalidad de no-show en la página de reservas del admin.
 * Ruta: /admin/(panel)/reservas/page.tsx
 *
 * Cubre:
 * - Botón "No presentado" visible para reserva pasada con noShow: false
 * - Botón NO visible para reserva futura
 * - Botón NO visible si noShow: true (se muestra badge)
 * - Badge "No presentado" visible cuando noShow: true
 * - Al confirmar: llama a PATCH /api/admin/reservas/[id]/no-show
 * - Si respuesta suspendido: true: muestra mensaje de suspensión
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import React from 'react'

// Mock de next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/admin/reservas',
}))

// Mock de next-auth/react
vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { id: 'admin-1', rol: 'ADMIN' } },
    status: 'authenticated',
  }),
}))

// Mock del Select de shadcn/ui
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, value }: {
    children: React.ReactNode
    onValueChange?: (val: string) => void
    value?: string
  }) => (
    <div data-testid="select-root" data-value={value}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, { onValueChange })
        }
        return child
      })}
    </div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <div role="combobox">{children}</div>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children, onValueChange }: {
    children: React.ReactNode
    onValueChange?: (val: string) => void
  }) => (
    <div>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, { onValueChange })
        }
        return child
      })}
    </div>
  ),
  SelectItem: ({ children, value, onValueChange }: {
    children: React.ReactNode
    value: string
    onValueChange?: (val: string) => void
  }) => (
    <button data-testid={`select-item-${value}`} onClick={() => onValueChange?.(value)}>
      {children}
    </button>
  ),
}))

// Mock de fetch global
global.fetch = vi.fn()

// ── Datos de prueba ──────────────────────────────────────────────────────────

// Fecha en el pasado (ayer a las 10:00)
const ayer = new Date()
ayer.setDate(ayer.getDate() - 1)
ayer.setHours(10, 0, 0, 0)

// Fecha en el futuro (mañana a las 10:00)
const manana = new Date()
manana.setDate(manana.getDate() + 1)
manana.setHours(10, 0, 0, 0)

// Hora fin (1:15 después del inicio)
function horaFin(base: Date): Date {
  const fin = new Date(base)
  fin.setMinutes(fin.getMinutes() + 75)
  return fin
}

const reservaPasadaSinNoShow = {
  id: 'reserva-pasada-1',
  horaInicio: ayer.toISOString(),
  horaFin: horaFin(ayer).toISOString(),
  estado: 'ACTIVA',
  noShow: false,
  usuario: { nombre: 'Ana García', email: 'ana@test.com' },
  instalacion: { nombre: 'Pista 1' },
}

const reservaPasadaConNoShow = {
  id: 'reserva-pasada-2',
  horaInicio: ayer.toISOString(),
  horaFin: horaFin(ayer).toISOString(),
  estado: 'ACTIVA',
  noShow: true,
  usuario: { nombre: 'Luis Martín', email: 'luis@test.com' },
  instalacion: { nombre: 'Pista 2' },
}

const reservaFutura = {
  id: 'reserva-futura-1',
  horaInicio: manana.toISOString(),
  horaFin: horaFin(manana).toISOString(),
  estado: 'ACTIVA',
  noShow: false,
  usuario: { nombre: 'Carmen López', email: 'carmen@test.com' },
  instalacion: { nombre: 'Pista 3' },
}

// Importar después de los mocks
import PaginaReservasAdmin from '@/app/admin/(panel)/reservas/page'

describe('PaginaReservasAdmin — funcionalidad no-show', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Test 1: Botón "No presentado" visible para reserva pasada con noShow: false

  it('debería mostrar botón "No presentado" para reserva pasada con noShow: false', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reservas: [reservaPasadaSinNoShow] }),
    })

    render(<PaginaReservasAdmin />)

    await waitFor(() => {
      expect(screen.getByText('Pista 1')).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /No presentado/i })).toBeInTheDocument()
  })

  // ── Test 2: Botón NO visible para reserva futura

  it('debería NO mostrar botón "No presentado" para reserva futura', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reservas: [reservaFutura] }),
    })

    render(<PaginaReservasAdmin />)

    await waitFor(() => {
      expect(screen.getByText('Pista 3')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: /No presentado/i })).not.toBeInTheDocument()
  })

  // ── Test 3: Badge "No presentado" visible cuando noShow: true

  it('debería mostrar badge "No presentado" cuando noShow: true', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reservas: [reservaPasadaConNoShow] }),
    })

    render(<PaginaReservasAdmin />)

    await waitFor(() => {
      expect(screen.getByText('Pista 2')).toBeInTheDocument()
    })

    // Debe haber un badge de "No presentado"
    expect(screen.getByText('No presentado')).toBeInTheDocument()
    // No debe haber botón de acción
    expect(screen.queryByRole('button', { name: /No presentado/i })).not.toBeInTheDocument()
  })

  // ── Test 4: Al confirmar llama a PATCH /api/admin/reservas/[id]/no-show

  it('debería llamar a PATCH /api/admin/reservas/[id]/no-show al confirmar el dialog', async () => {
    // Primera llamada: cargar reservas
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reservas: [reservaPasadaSinNoShow] }),
    })
    // Segunda llamada: PATCH no-show
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, suspendido: false }),
    })
    // Tercera llamada: recargar reservas tras el PATCH
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reservas: [] }),
    })

    render(<PaginaReservasAdmin />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /No presentado/i })).toBeInTheDocument()
    })

    // Abrir el dialog de confirmación
    fireEvent.click(screen.getByRole('button', { name: /No presentado/i }))

    // Confirmar en el dialog
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Confirmar/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Confirmar/i }))

    await waitFor(() => {
      const llamadas = (global.fetch as any).mock.calls
      const llamadaPatch = llamadas.find(
        (call: any[]) => call[0].includes('/no-show') && call[1]?.method === 'PATCH'
      )
      expect(llamadaPatch).toBeDefined()
      expect(llamadaPatch[0]).toBe(`/api/admin/reservas/${reservaPasadaSinNoShow.id}/no-show`)
    })
  })

  // ── Test 5: Si respuesta suspendido: true muestra mensaje de suspensión

  it('debería mostrar mensaje de suspensión si la respuesta indica suspendido: true', async () => {
    const fechaSuspension = new Date()
    fechaSuspension.setDate(fechaSuspension.getDate() + 14)

    // Primera llamada: cargar reservas
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reservas: [reservaPasadaSinNoShow] }),
    })
    // Segunda llamada: PATCH no-show con suspensión
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ok: true,
        suspendido: true,
        suspendidoHasta: fechaSuspension.toISOString(),
      }),
    })
    // Tercera llamada: recargar
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reservas: [] }),
    })

    render(<PaginaReservasAdmin />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /No presentado/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /No presentado/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Confirmar/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Confirmar/i }))

    await waitFor(() => {
      // Debe aparecer el mensaje de suspensión automática
      expect(screen.getByText(/suspendido automáticamente/i)).toBeInTheDocument()
    })
  })
})
