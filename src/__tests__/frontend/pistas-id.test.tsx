/**
 * Tests del componente PaginaDetallePista (Client Component)
 *
 * Estrategia: mockeamos fetch global, useRouter y los componentes shadcn/ui
 * que usan Radix Portal (Dialog). Renderizamos el componente con props fijas
 * y simulamos interacciones del usuario.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import React from 'react'

// --- Mocks ---

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ id: 'pista-1' }),
}))

// Mock de shadcn Dialog: renderiza el contenido directamente sin portal
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

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant }: {
    children: React.ReactNode
    onClick?: () => void
    disabled?: boolean
    variant?: string
  }) => React.createElement('button', { onClick, disabled, 'data-variant': variant }, children),
}))

vi.mock('@/lib/utils', () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(' '),
}))

// Pista ficticia de ejemplo
const pistaFicticia = {
  id: 'pista-1',
  nombre: 'Pista de Pádel 1',
  tipo: 'PADEL',
  descripcion: 'Pista techada',
  activa: true,
  horario: 'Lun-Dom: 8:00-13:00 y 16:45-20:30',
}

// 7 slots fijos del sistema (actualización 2026-03-25)
const sieteSlotsDelSistema = [
  { horaInicio: '08:00', horaFin: '09:15', estado: 'libre' as const },
  { horaInicio: '09:15', horaFin: '10:30', estado: 'libre' as const },
  { horaInicio: '10:30', horaFin: '11:45', estado: 'libre' as const },
  { horaInicio: '11:45', horaFin: '13:00', estado: 'libre' as const },
  { horaInicio: '16:45', horaFin: '18:00', estado: 'libre' as const },
  { horaInicio: '18:00', horaFin: '19:15', estado: 'libre' as const },
  { horaInicio: '19:15', horaFin: '20:30', estado: 'libre' as const },
]

import PaginaDetallePista from '@/app/pistas/[id]/page'

describe('PaginaDetallePista', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it('debería mostrar el selector de fecha', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ instalaciones: [pistaFicticia] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slots: [] }),
      })

    render(React.createElement(PaginaDetallePista, { params: { id: 'pista-1' } }))

    await waitFor(() => {
      expect(screen.getByText('Selecciona una fecha')).toBeInTheDocument()
    })

    const inputFecha = document.querySelector('input[type="date"]')
    expect(inputFecha).toBeInTheDocument()
  })

  it('debería mostrar exactamente 7 slots (no 14)', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ instalaciones: [pistaFicticia] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slots: sieteSlotsDelSistema }),
      })

    render(React.createElement(PaginaDetallePista, { params: { id: 'pista-1' } }))

    await waitFor(() => {
      expect(screen.getByText('08:00–09:15')).toBeInTheDocument()
    })

    const slotsElements = screen.getAllByText(/\d{2}:\d{2}–\d{2}:\d{2}/)
    expect(slotsElements).toHaveLength(7)
  })

  it('debería mostrar el horario de la pista en la página de detalle', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ instalaciones: [pistaFicticia] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slots: [] }),
      })

    render(React.createElement(PaginaDetallePista, { params: { id: 'pista-1' } }))

    await waitFor(() => {
      expect(screen.getByText('Lun-Dom: 8:00-13:00 y 16:45-20:30')).toBeInTheDocument()
    })
  })

  it('debería mostrar los slots del día seleccionado', async () => {
    const slots = [
      { horaInicio: '09:00', horaFin: '10:00', estado: 'libre' as const },
      { horaInicio: '10:00', horaFin: '11:00', estado: 'ocupado' as const },
    ]

    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ instalaciones: [pistaFicticia] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slots }),
      })

    render(React.createElement(PaginaDetallePista, { params: { id: 'pista-1' } }))

    await waitFor(() => {
      expect(screen.getByText('09:00–10:00')).toBeInTheDocument()
    })

    expect(screen.getByText('10:00–11:00')).toBeInTheDocument()
  })

  it('debería marcar en verde los slots libres con la clase bg-green-50', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ instalaciones: [pistaFicticia] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slots: [{ horaInicio: '09:00', horaFin: '10:00', estado: 'libre' }] }),
      })

    render(React.createElement(PaginaDetallePista, { params: { id: 'pista-1' } }))

    await waitFor(() => {
      expect(screen.getByText('09:00–10:00')).toBeInTheDocument()
    })

    // "Disponible" aparece tanto en la leyenda como en el slot.
    // El que está en el slot es un <div class="text-xs opacity-75">
    const todasLasEtiquetas = screen.getAllByText('Disponible')
    const etiquetaEnSlot = todasLasEtiquetas.find(
      (el) => el.className.includes('text-xs') && el.className.includes('opacity-75')
    )!
    expect(etiquetaEnSlot).toBeDefined()
    const contenedorSlot = etiquetaEnSlot.parentElement!
    expect(contenedorSlot.className).toContain('bg-green-50')
  })

  it('debería marcar en rojo los slots ocupados con la clase bg-red-50', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ instalaciones: [pistaFicticia] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slots: [{ horaInicio: '10:00', horaFin: '11:00', estado: 'ocupado' }] }),
      })

    render(React.createElement(PaginaDetallePista, { params: { id: 'pista-1' } }))

    await waitFor(() => {
      expect(screen.getByText('10:00–11:00')).toBeInTheDocument()
    })

    // "Ocupado" aparece tanto en la leyenda como en el slot.
    // El que está en el slot es un <div class="text-xs opacity-75">
    const todasLasEtiquetas = screen.getAllByText('Ocupado')
    const etiquetaEnSlot = todasLasEtiquetas.find(
      (el) => el.className.includes('text-xs') && el.className.includes('opacity-75')
    )!
    expect(etiquetaEnSlot).toBeDefined()
    const contenedorSlot = etiquetaEnSlot.parentElement!
    expect(contenedorSlot.className).toContain('bg-red-50')
  })

  it('debería abrir el dialog de confirmación al hacer click en un slot libre', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ instalaciones: [pistaFicticia] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slots: [{ horaInicio: '09:00', horaFin: '10:00', estado: 'libre' }] }),
      })

    render(React.createElement(PaginaDetallePista, { params: { id: 'pista-1' } }))

    // El slot libre tiene role="button"
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /09:00/i })).toBeInTheDocument()
    })

    // Buscar el div con role="button" (el slot libre)
    const slotLibre = document.querySelector('[role="button"]')!
    fireEvent.click(slotLibre)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // El dialog muestra el título "Confirmar reserva" en un <h2>
    expect(screen.getAllByText('Confirmar reserva').length).toBeGreaterThanOrEqual(1)
  })

  it('debería llamar a POST /api/reservas al pulsar Confirmar reserva y confirmar', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ instalaciones: [pistaFicticia] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slots: [{ horaInicio: '09:00', horaFin: '10:00', estado: 'libre' }] }),
      })
      // Respuesta al POST /api/reservas
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'reserva-nueva-1' }),
      })
      // Segunda carga de disponibilidad tras reservar
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slots: [{ horaInicio: '09:00', horaFin: '10:00', estado: 'ocupado' }] }),
      })

    render(React.createElement(PaginaDetallePista, { params: { id: 'pista-1' } }))

    await waitFor(() => {
      expect(document.querySelector('[role="button"]')).toBeTruthy()
    })

    // Hacer click en el slot libre
    const slotLibre = document.querySelector('[role="button"]')!
    fireEvent.click(slotLibre)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // Hacer click en el botón "Confirmar reserva" del dialog (es el <button>, no el <h2>)
    const botonesConfirmar = screen.getAllByText('Confirmar reserva')
    const botonConfirmar = botonesConfirmar.find((el) => el.tagName === 'BUTTON')!
    expect(botonConfirmar).toBeDefined()
    fireEvent.click(botonConfirmar)

    await waitFor(() => {
      const llamadas = (global.fetch as ReturnType<typeof vi.fn>).mock.calls
      const llamadaPost = llamadas.find(
        (call) => call[0] === '/api/reservas' && call[1]?.method === 'POST'
      )
      expect(llamadaPost).toBeDefined()
    })
  })

  it('debería enviar instalacionId correcto en el cuerpo del POST al confirmar', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ instalaciones: [pistaFicticia] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slots: [{ horaInicio: '09:00', horaFin: '10:00', estado: 'libre' }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'reserva-nueva-1' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slots: [] }),
      })

    render(React.createElement(PaginaDetallePista, { params: { id: 'pista-1' } }))

    await waitFor(() => {
      expect(document.querySelector('[role="button"]')).toBeTruthy()
    })

    const slotLibre = document.querySelector('[role="button"]')!
    fireEvent.click(slotLibre)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    const botonesConfirmar = screen.getAllByText('Confirmar reserva')
    const botonConfirmar = botonesConfirmar.find((el) => el.tagName === 'BUTTON')!
    fireEvent.click(botonConfirmar)

    await waitFor(() => {
      const llamadas = (global.fetch as ReturnType<typeof vi.fn>).mock.calls
      const llamadaPost = llamadas.find(
        (call) => call[0] === '/api/reservas' && call[1]?.method === 'POST'
      )
      expect(llamadaPost).toBeDefined()
      const cuerpo = JSON.parse(llamadaPost![1].body)
      expect(cuerpo.instalacionId).toBe('pista-1')
      expect(cuerpo.horaInicio).toBe('09:00')
    })
  })

  it('debería mostrar mensaje de error si la API rechaza la reserva', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ instalaciones: [pistaFicticia] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slots: [{ horaInicio: '09:00', horaFin: '10:00', estado: 'libre' }] }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Ya tienes 2 reservas activas' }),
      })

    render(React.createElement(PaginaDetallePista, { params: { id: 'pista-1' } }))

    await waitFor(() => {
      expect(document.querySelector('[role="button"]')).toBeTruthy()
    })

    const slotLibre = document.querySelector('[role="button"]')!
    fireEvent.click(slotLibre)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    const botonesConfirmar = screen.getAllByText('Confirmar reserva')
    const botonConfirmar = botonesConfirmar.find((el) => el.tagName === 'BUTTON')!
    fireEvent.click(botonConfirmar)

    await waitFor(() => {
      expect(screen.getByText(/Ya tienes 2 reservas activas/i)).toBeInTheDocument()
    })
  })
})
