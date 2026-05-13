/**
 * Tests TDD para la sección "Horarios y slots" de la página de configuración admin.
 * Ruta: /admin/(panel)/configuracion/page.tsx
 *
 * Cubre:
 *  - Renderizado con valores por defecto
 *  - Vista previa de slots con config default (75 min, 2 franjas → 7 slots)
 *  - Cambiar duración actualiza la vista previa
 *  - Cambiar hora de inicio de franja actualiza la vista previa
 *  - El PUT incluye el campo `slots` en el body al guardar
 *  - Validación: error si inicio >= fin en una franja
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

// Mock de next/navigation (requerido por páginas con router)
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/admin/configuracion',
}))

// Mock del componente Select de shadcn/ui para que sea manejable en tests
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, defaultValue, value }: {
    children: React.ReactNode
    onValueChange?: (val: string) => void
    defaultValue?: string
    value?: string
  }) => (
    <div data-testid="select-root" data-value={value ?? defaultValue}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, { onValueChange })
        }
        return child
      })}
    </div>
  ),
  SelectTrigger: ({ children, onValueChange, id }: {
    children: React.ReactNode
    onValueChange?: (val: string) => void
    id?: string
  }) => <div id={id} role="combobox">{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span>{placeholder}</span>
  ),
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
    <button
      data-testid={`select-item-${value}`}
      onClick={() => onValueChange?.(value)}
    >
      {children}
    </button>
  ),
}))

// Mock de fetch global
global.fetch = vi.fn()

// Respuesta API simulada con configuración por defecto (sin slots previos)
const respuestaConfigSinSlots = {
  configuracion: {
    nombreServicio: 'Deportes Municipales',
    colores: { primario: '#2563eb', secundario: '#16a34a' },
    metadata: { title: '', description: '' },
    // Sin propiedad slots → se usan los valores por defecto
  },
}

// Respuesta API simulada con slots ya configurados
const respuestaConfigConSlots = {
  configuracion: {
    nombreServicio: 'Deportes Municipales',
    colores: { primario: '#2563eb', secundario: '#16a34a' },
    metadata: { title: '', description: '' },
    slots: {
      duracionMinutos: 75,
      franjas: [
        { inicio: '08:00', fin: '13:00' },
        { inicio: '16:45', fin: '20:30' },
      ],
    },
  },
}

// Importar la página después de los mocks
import PaginaConfiguracion from '@/app/admin/(panel)/configuracion/page'

describe('PaginaConfiguracion — sección Horarios y slots', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Test 1: Renderiza la sección con valores por defecto ──────────────────

  it('debería renderizar la sección "Horarios y slots" con valores por defecto', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => respuestaConfigSinSlots,
    })

    render(<PaginaConfiguracion />)

    await waitFor(() => {
      expect(screen.getByText('Horarios y slots')).toBeInTheDocument()
    })

    // Comprueba que existen los labels clave
    expect(screen.getByText('Duración de cada slot')).toBeInTheDocument()
    expect(screen.getByText('Franjas horarias')).toBeInTheDocument()
    expect(screen.getByText(/Franja mañana/i)).toBeInTheDocument()
    expect(screen.getByText(/Franja tarde/i)).toBeInTheDocument()
    expect(screen.getByText(/Vista previa/i)).toBeInTheDocument()
  })

  // ── Test 2: Vista previa con config default muestra 7 slots ──────────────

  it('debería mostrar 7 slots en la vista previa con configuración por defecto (75 min)', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => respuestaConfigConSlots,
    })

    render(<PaginaConfiguracion />)

    // Esperar a que cargue la sección
    await waitFor(() => {
      expect(screen.getByText('Horarios y slots')).toBeInTheDocument()
    })

    // Los 7 slots esperados con 75 min y franjas default:
    // Mañana: 08:00-09:15, 09:15-10:30, 10:30-11:45, 11:45-13:00 (4 slots)
    // Tarde:  16:45-18:00, 18:00-19:15, 19:15-20:30 (3 slots)
    expect(screen.getByText(/08:00.*09:15/)).toBeInTheDocument()
    expect(screen.getByText(/09:15.*10:30/)).toBeInTheDocument()
    expect(screen.getByText(/10:30.*11:45/)).toBeInTheDocument()
    expect(screen.getByText(/11:45.*13:00/)).toBeInTheDocument()
    expect(screen.getByText(/16:45.*18:00/)).toBeInTheDocument()
    expect(screen.getByText(/18:00.*19:15/)).toBeInTheDocument()
    expect(screen.getByText(/19:15.*20:30/)).toBeInTheDocument()

    // Indica el conteo total
    expect(screen.getByText(/7 slots/)).toBeInTheDocument()
  })

  // ── Test 3: Cambiar duración a 60 min actualiza la vista previa ──────────

  it('debería actualizar la vista previa al cambiar duración a 60 min', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => respuestaConfigConSlots,
    })

    render(<PaginaConfiguracion />)

    await waitFor(() => {
      expect(screen.getByText('Horarios y slots')).toBeInTheDocument()
    })

    // Seleccionar 60 minutos
    const boton60 = screen.getByTestId('select-item-60')
    fireEvent.click(boton60)

    // Con 60 min y franjas 08:00-13:00 (5 slots) + 16:45-20:30 (3 slots... en realidad)
    // 08:00-09:00, 09:00-10:00, 10:00-11:00, 11:00-12:00, 12:00-13:00 = 5 slots mañana
    // 16:45-17:45, 17:45-18:45, 18:45-19:45 = 3 slots tarde (19:45+60=20:45 > 20:30 → no entra)
    // Total: 8 slots
    await waitFor(() => {
      expect(screen.getByText(/08:00.*09:00/)).toBeInTheDocument()
      expect(screen.getByText(/8 slots/)).toBeInTheDocument()
    })
  })

  // ── Test 4: Cambiar duración a 90 min actualiza la vista previa ──────────

  it('debería actualizar la vista previa al cambiar duración a 90 min', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => respuestaConfigConSlots,
    })

    render(<PaginaConfiguracion />)

    await waitFor(() => {
      expect(screen.getByText('Horarios y slots')).toBeInTheDocument()
    })

    // Seleccionar 90 minutos
    const boton90 = screen.getByTestId('select-item-90')
    fireEvent.click(boton90)

    // Con 90 min:
    // Mañana 08:00-13:00: 08:00-09:30, 09:30-11:00, 11:00-12:30 = 3 slots (12:30+90=14:00 > 13:00)
    // Tarde 16:45-20:30:  16:45-18:15, 18:15-19:45 = 2 slots (19:45+90=21:15 > 20:30)
    // Total: 5 slots
    await waitFor(() => {
      expect(screen.getByText(/08:00.*09:30/)).toBeInTheDocument()
      expect(screen.getByText(/5 slots/)).toBeInTheDocument()
    })
  })

  // ── Test 5: Cambiar hora de inicio de franja actualiza vista previa ───────

  it('debería actualizar la vista previa al cambiar la hora de inicio de la franja mañana', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => respuestaConfigConSlots,
    })

    render(<PaginaConfiguracion />)

    await waitFor(() => {
      expect(screen.getByText('Horarios y slots')).toBeInTheDocument()
    })

    // Cambiar inicio de franja mañana de 08:00 a 09:00
    const inputInicioManana = screen.getByTestId('input-franja-0-inicio')
    fireEvent.change(inputInicioManana, { target: { value: '09:00' } })

    // Con 75 min, franja mañana 09:00-13:00:
    // 09:00-10:15, 10:15-11:30, 11:30-12:45 = 3 slots (12:45+75=14:00 > 13:00)
    // Tarde sigue igual: 3 slots
    // Total: 6 slots
    await waitFor(() => {
      expect(screen.getByText(/09:00.*10:15/)).toBeInTheDocument()
      expect(screen.getByText(/6 slots/)).toBeInTheDocument()
    })
  })

  // ── Test 6: El PUT incluye `slots` en el body ─────────────────────────────

  it('debería incluir el campo `slots` en el body del PUT al guardar', async () => {
    // Primera llamada: GET configuración
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => respuestaConfigConSlots,
    })
    // Segunda llamada: PATCH/PUT guardar
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    })

    render(<PaginaConfiguracion />)

    await waitFor(() => {
      expect(screen.getByText('Horarios y slots')).toBeInTheDocument()
    })

    // Hacer clic en guardar
    const botonGuardar = screen.getByRole('button', { name: /Guardar cambios/i })
    fireEvent.click(botonGuardar)

    await waitFor(() => {
      const llamadas = (global.fetch as any).mock.calls
      // La segunda llamada es el PATCH/PUT
      const llamadaGuardar = llamadas.find(
        (call: any[]) => call[1]?.method === 'PATCH' || call[1]?.method === 'PUT'
      )
      expect(llamadaGuardar).toBeDefined()

      const body = JSON.parse(llamadaGuardar[1].body)
      expect(body.configuracion).toHaveProperty('slots')
      expect(body.configuracion.slots).toMatchObject({
        duracionMinutos: 75,
        franjas: [
          { inicio: '08:00', fin: '13:00' },
          { inicio: '16:45', fin: '20:30' },
        ],
      })
    })
  })

  // ── Test 7: Validación inicio >= fin muestra error ────────────────────────

  it('debería mostrar error de validación si el inicio es mayor o igual que el fin en una franja', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => respuestaConfigConSlots,
    })

    render(<PaginaConfiguracion />)

    await waitFor(() => {
      expect(screen.getByText('Horarios y slots')).toBeInTheDocument()
    })

    // Cambiar fin de franja mañana a un valor menor que el inicio (08:00)
    const inputFinManana = screen.getByTestId('input-franja-0-fin')
    fireEvent.change(inputFinManana, { target: { value: '07:00' } })

    // Hacer clic en guardar
    const botonGuardar = screen.getByRole('button', { name: /Guardar cambios/i })
    fireEvent.click(botonGuardar)

    // Debe mostrar mensaje de error y NO llamar al PUT
    await waitFor(() => {
      expect(screen.getByText(/inicio debe ser anterior al fin/i)).toBeInTheDocument()
    })

    // Verificar que solo hubo 1 llamada fetch (la GET inicial, no el PATCH)
    expect((global.fetch as any).mock.calls.length).toBe(1)
  })
})

// ─── Describe: limiteReservasActivas ──────────────────────────────────────────

/**
 * Tests TDD para el campo "Límite de reservas activas" añadido a la
 * sección "Reservas" de la página de configuración admin.
 */
describe('PaginaConfiguracion — sección Reservas (limiteReservasActivas)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Respuesta API sin limiteReservasActivas → debe usar el valor por defecto (2)
  const configSinLimite = {
    configuracion: {
      nombreServicio: 'Deportes Municipales',
      colores: { primario: '#2563eb', secundario: '#16a34a' },
      metadata: { title: '', description: '' },
    },
  }

  // Respuesta API con limiteReservasActivas guardado en 5
  const configConLimite = {
    configuracion: {
      nombreServicio: 'Deportes Municipales',
      colores: { primario: '#2563eb', secundario: '#16a34a' },
      metadata: { title: '', description: '' },
      limiteReservasActivas: 5,
    },
  }

  // ── Test 1: Se renderiza el input con el valor por defecto (2) ─────────────

  it('debería renderizar el input de límite de reservas con valor por defecto 2', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => configSinLimite,
    })

    render(<PaginaConfiguracion />)

    await waitFor(() => {
      expect(screen.getByLabelText(/Límite de reservas activas/i)).toBeInTheDocument()
    })

    const input = screen.getByLabelText(/Límite de reservas activas/i)
    expect((input as HTMLInputElement).value).toBe('2')
  })

  // ── Test 2: Carga el valor guardado en la config del tenant ────────────────

  it('debería cargar el valor guardado (5) desde la configuración del tenant', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => configConLimite,
    })

    render(<PaginaConfiguracion />)

    await waitFor(() => {
      const input = screen.getByLabelText(/Límite de reservas activas/i)
      expect((input as HTMLInputElement).value).toBe('5')
    })
  })

  // ── Test 3: El payload del PUT incluye limiteReservasActivas ───────────────

  it('debería incluir limiteReservasActivas en el body del PATCH al guardar', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => configConLimite,
    })
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    })

    render(<PaginaConfiguracion />)

    await waitFor(() => {
      expect(screen.getByLabelText(/Límite de reservas activas/i)).toBeInTheDocument()
    })

    const botonGuardar = screen.getByRole('button', { name: /Guardar cambios/i })
    fireEvent.click(botonGuardar)

    await waitFor(() => {
      const llamadas = (global.fetch as any).mock.calls
      const llamadaGuardar = llamadas.find(
        (call: any[]) => call[1]?.method === 'PATCH' || call[1]?.method === 'PUT'
      )
      expect(llamadaGuardar).toBeDefined()

      const body = JSON.parse(llamadaGuardar[1].body)
      expect(body.configuracion).toHaveProperty('limiteReservasActivas')
      expect(body.configuracion.limiteReservasActivas).toBe(5)
    })
  })

  // ── Test 4: Valor 0 queda corregido al mínimo (1) por el input ────────────

  it('debería corregir automáticamente el valor 0 al mínimo permitido (1)', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => configSinLimite,
    })

    render(<PaginaConfiguracion />)

    await waitFor(() => {
      expect(screen.getByLabelText(/Límite de reservas activas/i)).toBeInTheDocument()
    })

    const input = screen.getByLabelText(/Límite de reservas activas/i)
    fireEvent.change(input, { target: { value: '0' } })

    // El valor debe quedarse en 1 (min=1) por el clamp del onChange
    expect((input as HTMLInputElement).value).toBe('1')
  })

  // ── Test 5: Valor 11 queda corregido al máximo (10) por el input ──────────

  it('debería corregir automáticamente el valor 11 al máximo permitido (10)', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => configSinLimite,
    })

    render(<PaginaConfiguracion />)

    await waitFor(() => {
      expect(screen.getByLabelText(/Límite de reservas activas/i)).toBeInTheDocument()
    })

    const input = screen.getByLabelText(/Límite de reservas activas/i)
    fireEvent.change(input, { target: { value: '11' } })

    // El valor debe quedar en 10 (max=10) por el clamp del onChange
    expect((input as HTMLInputElement).value).toBe('10')
  })
})
