/**
 * Tests del componente FormularioAviso (TDD)
 *
 * Estos tests se escriben ANTES de implementar el componente.
 * Cubren:
 *   - Renderizado de todos los campos del formulario
 *   - Validación: error si se envía sin título
 *   - Validación: error si se envía sin descripción
 *   - Callback onGuardar se llama con los datos correctos al enviar
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

// --- Mocks de componentes shadcn/ui ---

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, type, variant, className }: {
    children: React.ReactNode
    onClick?: () => void
    disabled?: boolean
    type?: 'button' | 'submit' | 'reset'
    variant?: string
    className?: string
  }) => React.createElement('button', { onClick, disabled, type: type ?? 'button', 'data-variant': variant, className }, children),
}))

vi.mock('@/components/ui/input', () => ({
  Input: ({ id, value, onChange, placeholder, type, required, maxLength, className }: {
    id?: string
    value?: string
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
    placeholder?: string
    type?: string
    required?: boolean
    maxLength?: number
    className?: string
  }) => React.createElement('input', { id, value, onChange, placeholder, type: type ?? 'text', required, maxLength, className }),
}))

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({ id, value, onChange, placeholder, required, maxLength, rows, className }: {
    id?: string
    value?: string
    onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
    placeholder?: string
    required?: boolean
    maxLength?: number
    rows?: number
    className?: string
  }) => React.createElement('textarea', { id, value, onChange, placeholder, required, maxLength, rows, className }),
}))

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor, className }: {
    children: React.ReactNode
    htmlFor?: string
    className?: string
  }) => React.createElement('label', { htmlFor, className }, children),
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, defaultValue, value }: {
    children: React.ReactNode
    onValueChange?: (value: string) => void
    defaultValue?: string
    value?: string
  }) => {
    // Renderizamos un select nativo para facilitar los tests
    return React.createElement(
      'div',
      { 'data-testid': 'select-wrapper' },
      React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child
        return React.cloneElement(child as React.ReactElement<{ onValueChange?: (value: string) => void; value?: string }>, {
          onValueChange,
          value: value ?? defaultValue,
        })
      })
    )
  },
  SelectTrigger: ({ children, className, id }: {
    children: React.ReactNode
    className?: string
    id?: string
  }) => React.createElement('div', { className, id, 'data-testid': 'select-trigger' }, children),
  SelectValue: ({ placeholder }: { placeholder?: string }) =>
    React.createElement('span', { 'data-testid': 'select-value' }, placeholder),
  SelectContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'select-content' }, children),
  SelectItem: ({ children, value, onValueChange }: {
    children: React.ReactNode
    value: string
    onValueChange?: (value: string) => void
  }) =>
    React.createElement(
      'button',
      {
        type: 'button',
        'data-value': value,
        onClick: () => onValueChange?.(value),
        'data-testid': `select-item-${value}`,
      },
      children
    ),
}))

// Importar el componente DESPUÉS de los mocks
import FormularioAviso from '@/components/admin/FormularioAviso'

// ─── Datos de prueba ──────────────────────────────────────────────────────────

const datosAvisoValido = {
  titulo: 'Mantenimiento pistas',
  descripcion: 'Las pistas estarán cerradas el lunes de 8:00 a 10:00.',
  tipo: 'AVISO' as const,
  fecha: '2026-04-01',
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('FormularioAviso', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ==========================================================================
  // Renderizado de campos
  // ==========================================================================

  it('debería renderizar el campo de título', () => {
    render(React.createElement(FormularioAviso, { onGuardar: vi.fn(), onCancelar: vi.fn() }))

    expect(screen.getByLabelText(/título/i)).toBeInTheDocument()
  })

  it('debería renderizar el campo de descripción', () => {
    render(React.createElement(FormularioAviso, { onGuardar: vi.fn(), onCancelar: vi.fn() }))

    expect(screen.getByLabelText(/descripción/i)).toBeInTheDocument()
  })

  it('debería renderizar el campo de fecha', () => {
    render(React.createElement(FormularioAviso, { onGuardar: vi.fn(), onCancelar: vi.fn() }))

    // Usar el id del input para evitar ambigüedad con "Fecha de caducidad"
    expect(screen.getByLabelText(/^Fecha$/i)).toBeInTheDocument()
  })

  it('debería renderizar el campo de tipo', () => {
    render(React.createElement(FormularioAviso, { onGuardar: vi.fn(), onCancelar: vi.fn() }))

    // La label "Tipo" debe estar en el DOM; el select shadcn es un div en tests
    const label = screen.getByText('Tipo', { selector: 'label' })
    expect(label).toBeInTheDocument()
    // Las opciones del selector deben estar presentes
    expect(screen.getByTestId('select-item-INFO')).toBeInTheDocument()
    expect(screen.getByTestId('select-item-AVISO')).toBeInTheDocument()
    expect(screen.getByTestId('select-item-CIERRE')).toBeInTheDocument()
  })

  it('debería renderizar los botones de guardar y cancelar', () => {
    render(React.createElement(FormularioAviso, { onGuardar: vi.fn(), onCancelar: vi.fn() }))

    expect(screen.getByRole('button', { name: /guardar/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument()
  })

  it('debería prerrellenar los campos cuando se pasa un aviso para editar', () => {
    const avisoExistente = {
      id: 'aviso-1',
      titulo: 'Título existente',
      descripcion: 'Descripción existente',
      tipo: 'INFO' as const,
      fecha: '2026-04-15',
      activo: true,
      caducaEn: null,
    }

    render(
      React.createElement(FormularioAviso, {
        aviso: avisoExistente,
        onGuardar: vi.fn(),
        onCancelar: vi.fn(),
      })
    )

    expect(screen.getByDisplayValue('Título existente')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Descripción existente')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2026-04-15')).toBeInTheDocument()
  })

  // ==========================================================================
  // Validaciones de cliente
  // ==========================================================================

  it('debería mostrar error si se envía sin título', async () => {
    render(React.createElement(FormularioAviso, { onGuardar: vi.fn(), onCancelar: vi.fn() }))

    // Enviar sin rellenar el título
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }))

    await waitFor(() => {
      expect(screen.getByText(/el título es obligatorio/i)).toBeInTheDocument()
    })
  })

  it('debería mostrar error si se envía sin descripción', async () => {
    render(React.createElement(FormularioAviso, { onGuardar: vi.fn(), onCancelar: vi.fn() }))

    // Rellenar título pero dejar descripción vacía
    fireEvent.change(screen.getByLabelText(/título/i), {
      target: { value: 'Título de prueba' },
    })

    fireEvent.click(screen.getByRole('button', { name: /guardar/i }))

    await waitFor(() => {
      expect(screen.getByText(/la descripción es obligatoria/i)).toBeInTheDocument()
    })
  })

  it('debería mostrar error si se envía sin fecha', async () => {
    render(React.createElement(FormularioAviso, { onGuardar: vi.fn(), onCancelar: vi.fn() }))

    // Rellenar título y descripción pero dejar fecha vacía
    fireEvent.change(screen.getByLabelText(/título/i), {
      target: { value: 'Título de prueba' },
    })
    fireEvent.change(screen.getByLabelText(/descripción/i), {
      target: { value: 'Descripción de prueba' },
    })

    fireEvent.click(screen.getByRole('button', { name: /guardar/i }))

    await waitFor(() => {
      expect(screen.getByText(/la fecha es obligatoria/i)).toBeInTheDocument()
    })
  })

  // ==========================================================================
  // Callback onGuardar
  // ==========================================================================

  it('debería llamar a onGuardar con los datos correctos al enviar el formulario válido', async () => {
    const onGuardar = vi.fn().mockResolvedValue(undefined)

    render(React.createElement(FormularioAviso, { onGuardar, onCancelar: vi.fn() }))

    // Rellenar todos los campos
    fireEvent.change(screen.getByLabelText(/título/i), {
      target: { value: datosAvisoValido.titulo },
    })
    fireEvent.change(screen.getByLabelText(/descripción/i), {
      target: { value: datosAvisoValido.descripcion },
    })
    fireEvent.change(screen.getByLabelText(/^Fecha$/i), {
      target: { value: datosAvisoValido.fecha },
    })

    fireEvent.click(screen.getByRole('button', { name: /guardar/i }))

    await waitFor(() => {
      expect(onGuardar).toHaveBeenCalledTimes(1)
      expect(onGuardar).toHaveBeenCalledWith(
        expect.objectContaining({
          titulo: datosAvisoValido.titulo,
          descripcion: datosAvisoValido.descripcion,
          fecha: datosAvisoValido.fecha,
        })
      )
    })
  })

  it('debería llamar a onCancelar cuando se pulsa el botón cancelar', () => {
    const onCancelar = vi.fn()

    render(React.createElement(FormularioAviso, { onGuardar: vi.fn(), onCancelar }))

    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }))

    expect(onCancelar).toHaveBeenCalledTimes(1)
  })

  it('no debería llamar a onGuardar si el formulario tiene errores', async () => {
    const onGuardar = vi.fn()

    render(React.createElement(FormularioAviso, { onGuardar, onCancelar: vi.fn() }))

    // Enviar sin rellenar ningún campo
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }))

    await waitFor(() => {
      expect(onGuardar).not.toHaveBeenCalled()
    })
  })
})
