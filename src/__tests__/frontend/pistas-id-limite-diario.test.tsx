/**
 * Tests de PaginaDetallePista — límite de 1 reserva activa por día por ciudadano.
 *
 * Regla: si el ciudadano ya tiene una reserva ese día, el servidor devuelve
 * 409 con { error: "Ya tienes una reserva activa para este día" }.
 * La página debe mostrar ese mensaje en el modal de confirmación.
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

// ─── Mock de shadcn Dialog (sin portal, renderiza inline) ───────────────────

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

// ─── Mock de VistaSemanaPistas (no necesario en este test) ──────────────────

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

const slotLibre = { horaInicio: '09:00', horaFin: '10:00', estado: 'libre' as const }

// ─── Importación del componente ───────────────────────────────────────────────

import PaginaDetallePista from '@/app/pistas/[id]/page'

// ─── Helper: lleva al usuario hasta el dialog de confirmación ─────────────────

async function abrirDialogConfirmacion() {
  render(React.createElement(PaginaDetallePista, { params: { id: 'pista-1' } }))

  // Esperar a que aparezca el slot libre
  await waitFor(() => {
    expect(document.querySelector('[role="button"]')).toBeTruthy()
  })

  // Hacer clic en el slot libre para abrir el dialog
  const slot = document.querySelector('[role="button"]')!
  fireEvent.click(slot)

  // Esperar a que el dialog esté en el DOM
  await waitFor(() => {
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  // Obtener el botón "Confirmar reserva" (el <button>, no el <h2>)
  const botones = screen.getAllByText('Confirmar reserva')
  const boton = botones.find((el) => el.tagName === 'BUTTON')!
  expect(boton).toBeDefined()
  return boton
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('PaginaDetallePista — límite de 1 reserva activa por día', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockToast.mockClear()
    global.fetch = vi.fn()
  })

  it('cuando el servidor devuelve 409 por límite diario, muestra el mensaje de error en el modal', async () => {
    // Llamada 1: cargar instalación
    // Llamada 2: cargar disponibilidad
    // Llamada 3: cargar lista de espera (rol CIUDADANO)
    // Llamada 4: POST /api/reservas → 409
    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ instalaciones: [pistaFicticia] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slots: [slotLibre] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ entradas: [] }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ error: 'Ya tienes una reserva activa para este día' }),
      })

    const botonConfirmar = await abrirDialogConfirmacion()
    fireEvent.click(botonConfirmar)

    // El mensaje de error del servidor debe aparecer en el modal
    await waitFor(() => {
      expect(
        screen.getByText('Ya tienes una reserva activa para este día')
      ).toBeInTheDocument()
    })
  })

  it('cuando el servidor devuelve 201, la reserva se completa correctamente', async () => {
    // Llamada 1: cargar instalación
    // Llamada 2: cargar disponibilidad inicial
    // Llamada 3: cargar lista de espera
    // Llamada 4: POST /api/reservas → 201 ok
    // Llamada 5: recargar disponibilidad tras reservar
    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ instalaciones: [pistaFicticia] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slots: [slotLibre] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ entradas: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ id: 'reserva-nueva-1' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slots: [{ ...slotLibre, estado: 'ocupado' }] }),
      })

    const botonConfirmar = await abrirDialogConfirmacion()
    fireEvent.click(botonConfirmar)

    // El mensaje de error NO debe aparecer (reserva exitosa)
    await waitFor(() => {
      expect(
        screen.queryByText('Ya tienes una reserva activa para este día')
      ).not.toBeInTheDocument()
    })

    // El toast de éxito sí debe haberse disparado
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.stringContaining('éxito') })
      )
    })
  })
})
