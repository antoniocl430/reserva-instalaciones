/**
 * Tests de PaginaDetallePista — lista de espera con validación de slot ya reservado.
 *
 * Regla: si el ciudadano ya tiene reserva en ese slot exacto, el servidor
 * devuelve 409 con { error: "Ya tienes una reserva activa para este slot" }
 * al intentar unirse a la lista de espera. La página muestra ese error via toast.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import React from 'react'

// ─── Mocks de navegación ────────────────────────────────────────────────────

const mockPush = vi.fn()
const mockBack = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  useParams: () => ({ id: 'pista-1' }),
  usePathname: () => '/pistas/pista-1',
}))

// ─── Mock de next-auth ───────────────────────────────────────────────────────

vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({
    data: { user: { id: 'usuario-123', name: 'Ana García', rol: 'CIUDADANO' } },
    status: 'authenticated',
  })),
}))

// ─── Mock del hook useToast ──────────────────────────────────────────────────

const mockToast = vi.fn()
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}))

// ─── Mock de shadcn Dialog ───────────────────────────────────────────────────

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

// ─── Mock de shadcn Button ───────────────────────────────────────────────────

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant,
  }: {
    children: React.ReactNode
    onClick?: () => void
    disabled?: boolean
    variant?: string
  }) =>
    React.createElement(
      'button',
      { onClick, disabled, 'data-variant': variant },
      children
    ),
}))

// ─── Mock de utilidades ──────────────────────────────────────────────────────

vi.mock('@/lib/utils', () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(' '),
}))

// ─── Mock de next/link ───────────────────────────────────────────────────────

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string
    children: React.ReactNode
    className?: string
  }) => React.createElement('a', { href, className }, children),
}))

// ─── Mock de VistaSemanaPistas ───────────────────────────────────────────────

vi.mock('@/components/VistaSemanaPistas', () => ({
  default: () => React.createElement('div', { 'data-testid': 'vista-semana-mock' }),
  obtenerLunesDeHoy: () => '2026-05-18',
}))

// ─── Mock de formato ─────────────────────────────────────────────────────────

vi.mock('@/lib/formato', () => ({
  formatearFechaLocal: (fecha: string) => fecha,
}))

// ─── Datos fijos ─────────────────────────────────────────────────────────────

const pistaFicticia = {
  id: 'pista-1',
  nombre: 'Pista de Pádel 1',
  tipo: 'PADEL',
  descripcion: 'Pista techada',
  activa: true,
  horario: 'Lun-Dom: 8:00-20:30',
}

// Slot ocupado: muestra el botón "Apuntarme" para ciudadanos autenticados
const slotOcupado = { horaInicio: '10:00', horaFin: '11:00', estado: 'ocupado' as const }

// ─── Importación del componente ───────────────────────────────────────────────

import PaginaDetallePista from '@/app/pistas/[id]/page'

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('PaginaDetallePista — lista de espera: 409 slot ya reservado', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockToast.mockClear()
    global.fetch = vi.fn()
  })

  it('cuando el servidor devuelve 409 al apuntarse a lista de espera, muestra el mensaje de error', async () => {
    // Llamada 1: cargar instalación
    // Llamada 2: cargar disponibilidad (slot ocupado)
    // Llamada 3: cargar lista de espera del ciudadano (sin entradas)
    // Llamada 4: POST /api/lista-espera → 409
    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ instalaciones: [pistaFicticia] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slots: [slotOcupado] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ entradas: [] }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ error: 'Ya tienes una reserva activa para este slot' }),
      })

    render(React.createElement(PaginaDetallePista, { params: { id: 'pista-1' } }))

    // Esperar a que el slot ocupado esté en el DOM
    await waitFor(() => {
      expect(screen.getByText('10:00–11:00')).toBeInTheDocument()
    })

    // El botón "Apuntarme" aparece dentro del slot ocupado para ciudadanos
    const botonApuntarme = screen.getByRole('button', { name: /apuntarme/i })
    expect(botonApuntarme).toBeInTheDocument()

    // Hacer clic en "Apuntarme"
    fireEvent.click(botonApuntarme)

    // La respuesta 409 debe generar un toast con el mensaje de error
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Ya tienes una reserva activa para este slot',
        })
      )
    })
  })

  it('cuando el servidor devuelve 201, el usuario queda en lista de espera', async () => {
    // Llamada 1: cargar instalación
    // Llamada 2: cargar disponibilidad (slot ocupado)
    // Llamada 3: cargar lista de espera inicial (sin entradas)
    // Llamada 4: POST /api/lista-espera → 201 ok
    // Llamada 5: recargar lista de espera tras apuntarse
    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ instalaciones: [pistaFicticia] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slots: [slotOcupado] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ entradas: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ id: 'espera-nueva-1', posicion: 1 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          entradas: [
            {
              instalacionId: 'pista-1',
              fecha: '2026-05-20T00:00:00.000Z',
              horaInicio: '10:00',
              estado: 'ESPERANDO',
              posicion: 1,
            },
          ],
        }),
      })

    render(React.createElement(PaginaDetallePista, { params: { id: 'pista-1' } }))

    // Esperar a que el slot ocupado esté en el DOM
    await waitFor(() => {
      expect(screen.getByText('10:00–11:00')).toBeInTheDocument()
    })

    const botonApuntarme = screen.getByRole('button', { name: /apuntarme/i })
    fireEvent.click(botonApuntarme)

    // No debe aparecer mensaje de error de "slot ya reservado"
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('lista de espera'),
        })
      )
    })

    // El toast de error con el mensaje 409 NO debe haberse disparado
    const llamadasConError = mockToast.mock.calls.filter((args) =>
      args[0]?.title?.includes('Ya tienes una reserva activa para este slot')
    )
    expect(llamadasConError).toHaveLength(0)
  })
})
