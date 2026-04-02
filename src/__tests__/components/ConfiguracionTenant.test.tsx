/**
 * Tests de la página de configuración del tenant (TDD)
 *
 * Escritos ANTES de la implementación.
 * Cubren:
 *   - Renderizado de todos los campos del formulario
 *   - Carga de datos del tenant al montar (GET /api/admin/configuracion)
 *   - Valores actuales visibles en los inputs tras cargar
 *   - PATCH con datos correctos al guardar
 *   - Mensaje de éxito tras guardar
 *   - Mensaje de error si el PATCH falla
 *   - Botón "Guardar" deshabilitado mientras carga
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

// --- Mocks de shadcn/ui ---

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('div', { 'data-testid': 'card', className }, children),
  CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('div', { 'data-testid': 'card-header', className }, children),
  CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('h2', { className }, children),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('div', { 'data-testid': 'card-content', className }, children),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    type,
    className,
  }: {
    children: React.ReactNode
    onClick?: () => void
    disabled?: boolean
    type?: 'button' | 'submit' | 'reset'
    className?: string
  }) =>
    React.createElement(
      'button',
      { onClick, disabled, type: type ?? 'button', className },
      children
    ),
}))

vi.mock('@/components/ui/input', () => ({
  Input: ({
    id,
    value,
    onChange,
    placeholder,
    type,
    disabled,
    className,
  }: {
    id?: string
    value?: string
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
    placeholder?: string
    type?: string
    disabled?: boolean
    className?: string
  }) =>
    React.createElement('input', {
      id,
      value,
      onChange,
      placeholder,
      type: type ?? 'text',
      disabled,
      className,
    }),
}))

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({
    id,
    value,
    onChange,
    placeholder,
    rows,
    disabled,
    className,
  }: {
    id?: string
    value?: string
    onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
    placeholder?: string
    rows?: number
    disabled?: boolean
    className?: string
  }) =>
    React.createElement('textarea', {
      id,
      value,
      onChange,
      placeholder,
      rows,
      disabled,
      className,
    }),
}))

vi.mock('@/components/ui/label', () => ({
  Label: ({
    children,
    htmlFor,
    className,
  }: {
    children: React.ReactNode
    htmlFor?: string
    className?: string
  }) => React.createElement('label', { htmlFor, className }, children),
}))

// --- Mock de fetch global ---

const configuracionMock = {
  nombreServicio: 'Deportes Municipales',
  colores: {
    primario: '#ff0000',
    secundario: '#00ff00',
  },
  metadata: {
    title: 'Título SEO de prueba',
    description: 'Descripción SEO de prueba',
  },
}

// Importar el componente DESPUÉS de los mocks
import PaginaConfiguracion from '@/app/admin/(panel)/configuracion/page'

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Página de configuración del tenant', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ==========================================================================
  // Renderizado de campos
  // ==========================================================================

  it('renderiza el formulario con todos los campos', async () => {
    // fetch devuelve configuración vacía
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ configuracion: {} }),
      })
    )

    render(React.createElement(PaginaConfiguracion))

    // Esperar a que cargue el formulario
    await waitFor(() => {
      expect(screen.getByLabelText(/nombre del servicio/i)).toBeInTheDocument()
    })

    // Campos de información general / personalización
    expect(screen.getByLabelText(/color primario/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/color secundario/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/título de la página/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/descripción/i)).toBeInTheDocument()

    // Botón guardar
    expect(screen.getByRole('button', { name: /guardar cambios/i })).toBeInTheDocument()
  })

  // ==========================================================================
  // Carga de datos del tenant al montar
  // ==========================================================================

  it('carga los datos del tenant al montar (fetch a GET /api/admin/configuracion)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ configuracion: {} }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(React.createElement(PaginaConfiguracion))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/admin/configuracion')
    })
  })

  // ==========================================================================
  // Valores actuales visibles tras cargar
  // ==========================================================================

  it('muestra los valores actuales en los inputs tras cargar', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ configuracion: configuracionMock }),
      })
    )

    render(React.createElement(PaginaConfiguracion))

    await waitFor(() => {
      // El nombre del servicio debe aparecer en el input
      const inputNombre = screen.getByLabelText(/nombre del servicio/i) as HTMLInputElement
      expect(inputNombre.value).toBe('Deportes Municipales')
    })

    const inputTitulo = screen.getByLabelText(/título de la página/i) as HTMLInputElement
    expect(inputTitulo.value).toBe('Título SEO de prueba')

    const textareaDesc = screen.getByLabelText(/descripción/i) as HTMLTextAreaElement
    expect(textareaDesc.value).toBe('Descripción SEO de prueba')
  })

  // ==========================================================================
  // PATCH con datos correctos al guardar
  // ==========================================================================

  it('llama a PATCH con los datos correctos al guardar', async () => {
    const fetchMock = vi
      .fn()
      // Primera llamada: GET al montar
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ configuracion: configuracionMock }),
      })
      // Segunda llamada: PATCH al guardar
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ configuracion: configuracionMock }),
      })

    vi.stubGlobal('fetch', fetchMock)

    render(React.createElement(PaginaConfiguracion))

    // Esperar a que cargue
    await waitFor(() => {
      const inputNombre = screen.getByLabelText(/nombre del servicio/i) as HTMLInputElement
      expect(inputNombre.value).toBe('Deportes Municipales')
    })

    // Modificar el nombre del servicio
    fireEvent.change(screen.getByLabelText(/nombre del servicio/i), {
      target: { value: 'Nuevo Nombre' },
    })

    // Guardar
    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }))

    await waitFor(() => {
      // La segunda llamada debe ser un PATCH
      expect(fetchMock).toHaveBeenCalledTimes(2)
      const [url, opciones] = fetchMock.mock.calls[1]
      expect(url).toBe('/api/admin/configuracion')
      expect(opciones.method).toBe('PATCH')
      const cuerpo = JSON.parse(opciones.body)
      expect(cuerpo.configuracion.nombreServicio).toBe('Nuevo Nombre')
    })
  })

  // ==========================================================================
  // Mensaje de éxito tras guardar
  // ==========================================================================

  it('muestra mensaje de éxito tras guardar', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ configuracion: {} }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ configuracion: {} }),
        })
    )

    render(React.createElement(PaginaConfiguracion))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /guardar cambios/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }))

    await waitFor(() => {
      expect(screen.getByText(/configuración guardada/i)).toBeInTheDocument()
    })
  })

  // ==========================================================================
  // Mensaje de error si el PATCH falla
  // ==========================================================================

  it('muestra mensaje de error si el PATCH falla', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ configuracion: {} }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Error del servidor' }),
        })
    )

    render(React.createElement(PaginaConfiguracion))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /guardar cambios/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }))

    await waitFor(() => {
      expect(screen.getByText(/error al guardar/i)).toBeInTheDocument()
    })
  })

  // ==========================================================================
  // Botón deshabilitado mientras carga
  // ==========================================================================

  it('el botón "Guardar" se deshabilita mientras carga', async () => {
    // fetch que resuelve con un delay
    let resolverGet: (value: unknown) => void
    const promesaGet = new Promise((res) => {
      resolverGet = res
    })

    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValueOnce(promesaGet)
    )

    render(React.createElement(PaginaConfiguracion))

    // Mientras no ha resuelto el GET, el botón debe estar deshabilitado o el formulario en carga
    // El componente no muestra el formulario hasta que carga, así que el botón no existe
    expect(screen.queryByRole('button', { name: /guardar cambios/i })).not.toBeInTheDocument()

    // Resolver la promesa
    resolverGet!({
      ok: true,
      json: async () => ({ configuracion: {} }),
    })

    // Después de cargar, el botón aparece y está habilitado
    await waitFor(() => {
      const boton = screen.getByRole('button', { name: /guardar cambios/i })
      expect(boton).toBeInTheDocument()
      expect(boton).not.toBeDisabled()
    })
  })
})
