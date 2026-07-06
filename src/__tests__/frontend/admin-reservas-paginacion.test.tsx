/**
 * Tests TDD para la paginación de la página de reservas del admin (hallazgo H10 de la
 * auditoría UX): la página renderizaba TODAS las reservas del tenant de una vez (67 filas
 * en dev), produciendo una página de miles de píxeles de alto, especialmente mala en móvil.
 *
 * Ruta: src/app/admin/(panel)/reservas/page.tsx
 *
 * Cubre:
 * - Los controles de paginación se muestran cuando paginacion.totalPaginas > 1
 * - El botón "Siguiente" hace fetch con pagina=2
 * - El botón "Anterior" está deshabilitado en la página 1
 * - El botón "Siguiente" está deshabilitado en la última página
 * - Cambiar un filtro existente resetea la página a 1
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

// Mock del Select de shadcn/ui (igual que en admin-no-show.test.tsx)
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

function crearReserva(id: string, nombrePista: string) {
  return {
    id,
    horaInicio: '2026-08-10T10:00:00.000Z',
    horaFin: '2026-08-10T11:15:00.000Z',
    estado: 'ACTIVA',
    noShow: false,
    usuario: { nombre: 'Ana García', email: 'ana@test.com' },
    instalacion: { nombre: nombrePista },
  }
}

// Importar después de los mocks
import PaginaReservasAdmin from '@/app/admin/(panel)/reservas/page'

describe('PaginaReservasAdmin — paginación (H10)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debería mostrar los controles de paginación cuando paginacion.totalPaginas > 1', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        reservas: [crearReserva('r1', 'Pista 1')],
        paginacion: { pagina: 1, porPagina: 20, total: 25, totalPaginas: 2 },
      }),
    })

    render(<PaginaReservasAdmin />)

    await waitFor(() => {
      expect(screen.getByText('Pista 1')).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /Anterior/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Siguiente/i })).toBeInTheDocument()
    expect(screen.getByText(/Página 1 de 2/i)).toBeInTheDocument()
  })

  it('NO debería mostrar los controles de paginación cuando paginacion.totalPaginas es 1', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        reservas: [crearReserva('r1', 'Pista 1')],
        paginacion: { pagina: 1, porPagina: 20, total: 3, totalPaginas: 1 },
      }),
    })

    render(<PaginaReservasAdmin />)

    await waitFor(() => {
      expect(screen.getByText('Pista 1')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: /Siguiente/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Anterior/i })).not.toBeInTheDocument()
  })

  it('el botón "Anterior" debería estar deshabilitado en la página 1', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        reservas: [crearReserva('r1', 'Pista 1')],
        paginacion: { pagina: 1, porPagina: 20, total: 25, totalPaginas: 2 },
      }),
    })

    render(<PaginaReservasAdmin />)

    await waitFor(() => {
      expect(screen.getByText('Pista 1')).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /Anterior/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Siguiente/i })).not.toBeDisabled()
  })

  it('debería hacer fetch con pagina=2 al pulsar "Siguiente"', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        reservas: [crearReserva('r1', 'Pista 1')],
        paginacion: { pagina: 1, porPagina: 20, total: 25, totalPaginas: 2 },
      }),
    })
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        reservas: [crearReserva('r2', 'Pista 2')],
        paginacion: { pagina: 2, porPagina: 20, total: 25, totalPaginas: 2 },
      }),
    })

    render(<PaginaReservasAdmin />)

    await waitFor(() => {
      expect(screen.getByText('Pista 1')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }))

    await waitFor(() => {
      expect(screen.getByText('Pista 2')).toBeInTheDocument()
    })

    const llamadas = (global.fetch as any).mock.calls
    const segundaLlamada = llamadas[1][0] as string
    expect(segundaLlamada).toContain('pagina=2')
  })

  it('el botón "Siguiente" debería estar deshabilitado en la última página', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        reservas: [crearReserva('r1', 'Pista 1')],
        paginacion: { pagina: 2, porPagina: 20, total: 25, totalPaginas: 2 },
      }),
    })

    render(<PaginaReservasAdmin />)

    await waitFor(() => {
      expect(screen.getByText('Pista 1')).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /Siguiente/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Anterior/i })).not.toBeDisabled()
  })

  it('debería resetear la página a 1 al cambiar el filtro de estado', async () => {
    // Página 1 inicial
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        reservas: [crearReserva('r1', 'Pista 1')],
        paginacion: { pagina: 1, porPagina: 20, total: 25, totalPaginas: 2 },
      }),
    })
    // Tras pulsar "Siguiente" → página 2
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        reservas: [crearReserva('r2', 'Pista 2')],
        paginacion: { pagina: 2, porPagina: 20, total: 25, totalPaginas: 2 },
      }),
    })
    // Tras cambiar el filtro de estado → debe volver a pedir página 1
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        reservas: [crearReserva('r3', 'Pista 3')],
        paginacion: { pagina: 1, porPagina: 20, total: 5, totalPaginas: 1 },
      }),
    })

    render(<PaginaReservasAdmin />)

    await waitFor(() => {
      expect(screen.getByText('Pista 1')).toBeInTheDocument()
    })

    // Avanzar a la página 2
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }))
    await waitFor(() => {
      expect(screen.getByText('Pista 2')).toBeInTheDocument()
    })

    // Cambiar el filtro de estado a "ACTIVA"
    fireEvent.click(screen.getByTestId('select-item-ACTIVA'))

    await waitFor(() => {
      expect(screen.getByText('Pista 3')).toBeInTheDocument()
    })

    const llamadas = (global.fetch as any).mock.calls
    const terceraLlamada = llamadas[2][0] as string
    expect(terceraLlamada).toContain('pagina=1')
    expect(terceraLlamada).toContain('estado=ACTIVA')
  })

  it('debería mantener el mensaje de "no hay reservas" y no mostrar controles cuando paginacion.total es 0', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        reservas: [],
        paginacion: { pagina: 1, porPagina: 20, total: 0, totalPaginas: 0 },
      }),
    })

    render(<PaginaReservasAdmin />)

    await waitFor(() => {
      expect(screen.getByText('No hay reservas que mostrar')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: /Siguiente/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Anterior/i })).not.toBeInTheDocument()
  })
})
