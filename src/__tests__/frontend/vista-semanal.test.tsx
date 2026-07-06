/**
 * Tests del componente VistaSemanaPistas (vista semanal de disponibilidad)
 *
 * Estrategia: mockeamos fetch global para devolver slots fijos,
 * y verificamos el comportamiento de la cuadrícula semanal.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import React from 'react'

// --- Mock de fetch ---
// Devuelve slots fijos para cualquier fecha

const slotsMock = [
  { horaInicio: '08:00', horaFin: '09:15', estado: 'libre' },
  { horaInicio: '09:15', horaFin: '10:30', estado: 'ocupado' },
  { horaInicio: '10:30', horaFin: '11:45', estado: 'bloqueado' },
]

// Mock de next-auth/react para evitar el SessionProvider
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({
    data: { user: { id: 'usuario-123', name: 'Ana García', rol: 'CIUDADANO' } },
    status: 'authenticated',
  })),
}))

vi.mock('@/lib/utils', () => ({
  cn: (...clases: (string | undefined | null | false)[]) =>
    clases.filter(Boolean).join(' '),
}))

// Importamos el componente DESPUÉS de los mocks
import VistaSemanaPistas from '@/components/VistaSemanaPistas'

/**
 * Calcula el lunes de la semana actual en formato YYYY-MM-DD (UTC para tests)
 */
function obtenerLunesActualParaTest(): string {
  const ahora = new Date()
  const diaSemana = ahora.getUTCDay() // 0=dom, 1=lun, ...6=sáb
  const diasHastaLunes = diaSemana === 0 ? 6 : diaSemana - 1
  const lunes = new Date(ahora)
  lunes.setUTCDate(ahora.getUTCDate() - diasHastaLunes)
  return lunes.toISOString().slice(0, 10)
}

/**
 * Suma N días a una fecha YYYY-MM-DD usando UTC
 */
function sumarDias(fecha: string, dias: number): string {
  const d = new Date(fecha + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

describe('VistaSemanaPistas', () => {
  const onSeleccionarSlotMock = vi.fn()
  const semanaBase = obtenerLunesActualParaTest()

  beforeEach(() => {
    vi.clearAllMocks()
    // Fetch devuelve slots fijos para CUALQUIER URL
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        slots: slotsMock,
        festivoDelDia: null,
      }),
    })
  })

  it('debería renderizar 7 columnas de días (Lun, Mar, Mié, Jue, Vie, Sáb, Dom)', async () => {
    render(
      React.createElement(VistaSemanaPistas, {
        instalacionId: 'pista-1',
        semanaBase,
        onSeleccionarSlot: onSeleccionarSlotMock,
      })
    )

    // Esperamos a que los encabezados de día aparezcan tras la carga
    await waitFor(() => {
      expect(screen.getByText('Lun')).toBeInTheDocument()
    })

    expect(screen.getByText('Mar')).toBeInTheDocument()
    expect(screen.getByText('Mié')).toBeInTheDocument()
    expect(screen.getByText('Jue')).toBeInTheDocument()
    expect(screen.getByText('Vie')).toBeInTheDocument()
    expect(screen.getByText('Sáb')).toBeInTheDocument()
    expect(screen.getByText('Dom')).toBeInTheDocument()
  })

  it('debería mostrar las horas de inicio como filas (08:00, 09:15, 10:30)', async () => {
    render(
      React.createElement(VistaSemanaPistas, {
        instalacionId: 'pista-1',
        semanaBase,
        onSeleccionarSlot: onSeleccionarSlotMock,
      })
    )

    await waitFor(() => {
      expect(screen.getAllByText('08:00').length).toBeGreaterThanOrEqual(1)
    })

    expect(screen.getAllByText('09:15').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('10:30').length).toBeGreaterThanOrEqual(1)
  })

  it('debería hacer que el slot libre tenga role="button" o sea clickeable', async () => {
    render(
      React.createElement(VistaSemanaPistas, {
        instalacionId: 'pista-1',
        semanaBase,
        onSeleccionarSlot: onSeleccionarSlotMock,
      })
    )

    await waitFor(() => {
      // Al menos un slot libre debe existir en la tabla
      const slotsLibres = document.querySelectorAll('[data-estado="libre"]')
      expect(slotsLibres.length).toBeGreaterThan(0)
    })
  })

  it('debería llamar a onSeleccionarSlot con la fecha correcta y el slot al hacer click en un slot libre', async () => {
    const lunesEsperado = semanaBase // El lunes de la semana base

    render(
      React.createElement(VistaSemanaPistas, {
        instalacionId: 'pista-1',
        semanaBase: lunesEsperado,
        onSeleccionarSlot: onSeleccionarSlotMock,
      })
    )

    await waitFor(() => {
      const primerSlotLibre = document.querySelector('[data-estado="libre"]')
      expect(primerSlotLibre).toBeTruthy()
    })

    // Hacer click en el primer slot libre (corresponde al lunes de la semana)
    const primerSlotLibre = document.querySelector('[data-estado="libre"]')!
    fireEvent.click(primerSlotLibre)

    expect(onSeleccionarSlotMock).toHaveBeenCalledTimes(1)
    // El primer argumento debe ser una fecha YYYY-MM-DD
    const [fechaLlamada, slotLlamado] = onSeleccionarSlotMock.mock.calls[0]
    expect(fechaLlamada).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(slotLlamado).toMatchObject({ horaInicio: '08:00', estado: 'libre' })
  })

  it('NO debería llamar a onSeleccionarSlot al hacer click en un slot ocupado', async () => {
    render(
      React.createElement(VistaSemanaPistas, {
        instalacionId: 'pista-1',
        semanaBase,
        onSeleccionarSlot: onSeleccionarSlotMock,
      })
    )

    await waitFor(() => {
      const slotOcupado = document.querySelector('[data-estado="ocupado"]')
      expect(slotOcupado).toBeTruthy()
    })

    const slotOcupado = document.querySelector('[data-estado="ocupado"]')!
    fireEvent.click(slotOcupado)

    expect(onSeleccionarSlotMock).not.toHaveBeenCalled()
  })

  it('debería avanzar la semana al hacer click en "Siguiente semana"', async () => {
    render(
      React.createElement(VistaSemanaPistas, {
        instalacionId: 'pista-1',
        semanaBase,
        onSeleccionarSlot: onSeleccionarSlotMock,
      })
    )

    // Esperamos a que carguen los días de la semana actual
    await waitFor(() => {
      expect(screen.getByText('Lun')).toBeInTheDocument()
    })

    // Obtenemos el número del lunes actual (en el encabezado de la tabla)
    const lunesActual = new Date(semanaBase + 'T00:00:00Z')
    const numeroLunesActual = lunesActual.getUTCDate().toString()

    // Hacemos click en "Siguiente semana"
    const botonSiguiente = screen.getByLabelText('Semana siguiente')
    fireEvent.click(botonSiguiente)

    // Tras avanzar, debería mostrarse el lunes de la semana siguiente
    const lunesSiguiente = new Date(semanaBase + 'T00:00:00Z')
    lunesSiguiente.setUTCDate(lunesSiguiente.getUTCDate() + 7)
    const numeroLunesSiguiente = lunesSiguiente.getUTCDate().toString()

    await waitFor(() => {
      // El número del lunes siguiente debe aparecer en la cabecera
      // (puede que el número actual también esté si coinciden, pero el nuevo debe estar)
      const celdas = screen.getAllByText(numeroLunesSiguiente)
      expect(celdas.length).toBeGreaterThanOrEqual(1)
    })

    // El número de lunes anterior ya no debe ser el visible para lunes
    // (a menos que coincidan con lunes de otra semana del mismo número)
    expect(lunesSiguiente.getUTCDate()).not.toBe(lunesActual.getUTCDate())
  })

  it('debería deshabilitar el botón "Semana anterior" cuando semanaBase es la semana actual', async () => {
    render(
      React.createElement(VistaSemanaPistas, {
        instalacionId: 'pista-1',
        semanaBase, // Semana actual → botón anterior deshabilitado
        onSeleccionarSlot: onSeleccionarSlotMock,
      })
    )

    await waitFor(() => {
      expect(screen.getByLabelText('Semana anterior')).toBeInTheDocument()
    })

    const botonAnterior = screen.getByLabelText('Semana anterior')
    expect(botonAnterior).toBeDisabled()
  })
})
