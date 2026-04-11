/**
 * Tests del componente PreferenciasNotificacion
 *
 * Verifica que el componente:
 * 1. Carga preferencias del usuario al montar
 * 2. Renderiza checkboxes sin marcar por defecto
 * 3. Permite cambiar preferencias y guardar (PATCH)
 * 4. Deshabilita e muestra spinner mientras guarda
 * 5. Muestra toast destructivo si falla el guardado
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

// --- Mock de useToast ---
const mockToast = vi.fn()
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}))

// --- Mock de shadcn/ui checkbox ---
vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({
    id,
    checked,
    onCheckedChange,
    disabled,
  }: {
    id?: string
    checked?: boolean
    onCheckedChange?: (checked: boolean) => void
    disabled?: boolean
  }) =>
    React.createElement('input', {
      id,
      type: 'checkbox',
      checked,
      onChange: (e) => onCheckedChange?.(e.target.checked),
      disabled,
      'data-testid': `checkbox-${id}`,
    }),
}))

// --- Mock de shadcn/ui label ---
vi.mock('@/components/ui/label', () => ({
  Label: ({
    htmlFor,
    children,
    className,
  }: {
    htmlFor?: string
    children: React.ReactNode
    className?: string
  }) =>
    React.createElement('label', { htmlFor, className }, children),
}))

// --- Mock de shadcn/ui button ---
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
    type?: string
    className?: string
  }) =>
    React.createElement('button', { onClick, disabled, type, className }, children),
}))

// --- Mock de shadcn/ui skeleton ---
vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) =>
    React.createElement('div', { className, 'data-testid': 'skeleton' }),
}))

// --- Importar componente bajo test ---
import PreferenciasNotificacion from '@/components/PreferenciasNotificacion'

describe('PreferenciasNotificacion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
    mockToast.mockClear()
  })

  // Test 1: carga preferencias al montar
  it('debería cargar preferencias al montar (GET)', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        recordatorioReserva: false,
        cancelacionPropia: false,
        cancelacionAdmin: false,
      }),
    })

    render(React.createElement(PreferenciasNotificacion))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/cuenta/preferencias-notificacion')
    })
  })

  // Test 2: renderiza 3 checkboxes sin marcar por defecto
  it('debería renderizar 3 checkboxes sin marcar (valores por defecto falsos)', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        recordatorioReserva: false,
        cancelacionPropia: false,
        cancelacionAdmin: false,
      }),
    })

    render(React.createElement(PreferenciasNotificacion))

    await waitFor(() => {
      const checkboxRecordatorio = screen.getByTestId('checkbox-recordatorioReserva') as HTMLInputElement
      const checkboxCancelacionPropia = screen.getByTestId('checkbox-cancelacionPropia') as HTMLInputElement
      const checkboxCancelacionAdmin = screen.getByTestId('checkbox-cancelacionAdmin') as HTMLInputElement

      expect(checkboxRecordatorio.checked).toBe(false)
      expect(checkboxCancelacionPropia.checked).toBe(false)
      expect(checkboxCancelacionAdmin.checked).toBe(false)
    })
  })

  // Test 3: cambiar checkbox y guardar llama PATCH
  it('debería cambiar checkbox y guardar llama PATCH con el campo actualizado', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          recordatorioReserva: false,
          cancelacionPropia: false,
          cancelacionAdmin: false,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          recordatorioReserva: true,
          cancelacionPropia: false,
          cancelacionAdmin: false,
        }),
      })

    render(React.createElement(PreferenciasNotificacion))

    await waitFor(() => {
      const checkboxRecordatorio = screen.getByTestId('checkbox-recordatorioReserva')
      expect(checkboxRecordatorio).toBeInTheDocument()
    })

    // Marcar el primer checkbox
    const checkboxRecordatorio = screen.getByTestId('checkbox-recordatorioReserva')
    fireEvent.change(checkboxRecordatorio, { target: { checked: true } })

    // Pulsar "Guardar"
    const botonGuardar = screen.getByRole('button', { name: /Guardar/i })
    fireEvent.click(botonGuardar)

    await waitFor(() => {
      const llamadas = (global.fetch as ReturnType<typeof vi.fn>).mock.calls
      const llamadaPatch = llamadas.find(
        (call) =>
          typeof call[0] === 'string' &&
          call[0].includes('/api/cuenta/preferencias-notificacion') &&
          call[1]?.method === 'PATCH'
      )
      expect(llamadaPatch).toBeDefined()
      expect(llamadaPatch?.[1]?.body).toContain('recordatorioReserva')
    })
  })

  // Test 4: deshabilita checkboxes y muestra spinner mientras guarda
  it('debería deshabilitar checkboxes y mostrar spinner en botón mientras se guarda', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          recordatorioReserva: false,
          cancelacionPropia: false,
          cancelacionAdmin: false,
        }),
      })
      .mockImplementationOnce(() =>
        new Promise((resolve) =>
          setTimeout(() =>
            resolve({
              ok: true,
              json: async () => ({
                recordatorioReserva: true,
                cancelacionPropia: false,
                cancelacionAdmin: false,
              }),
            }),
            100
          )
        )
      )

    render(React.createElement(PreferenciasNotificacion))

    await waitFor(() => {
      expect(screen.getByTestId('checkbox-recordatorioReserva')).toBeInTheDocument()
    })

    // Marcar y pulsar guardar
    const checkboxRecordatorio = screen.getByTestId('checkbox-recordatorioReserva')
    fireEvent.change(checkboxRecordatorio, { target: { checked: true } })

    const botonGuardar = screen.getByRole('button', { name: /Guardar/i })
    fireEvent.click(botonGuardar)

    // Mientras se guarda, los checkboxes deben estar deshabilitados
    await waitFor(() => {
      expect(screen.getByTestId('checkbox-recordatorioReserva')).toBeDisabled()
    })

    // El botón debe mostrar "Guardando..."
    expect(botonGuardar.textContent).toContain('Guardando')
  })

  // Test 5: muestra toast destructivo si falla el PATCH
  it('debería mostrar toast destructivo si falla el PATCH', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          recordatorioReserva: false,
          cancelacionPropia: false,
          cancelacionAdmin: false,
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

    render(React.createElement(PreferenciasNotificacion))

    await waitFor(() => {
      expect(screen.getByTestId('checkbox-recordatorioReserva')).toBeInTheDocument()
    })

    // Marcar y pulsar guardar
    const checkboxRecordatorio = screen.getByTestId('checkbox-recordatorioReserva')
    fireEvent.change(checkboxRecordatorio, { target: { checked: true } })

    const botonGuardar = screen.getByRole('button', { name: /Guardar/i })
    fireEvent.click(botonGuardar)

    // Debe mostrar toast con variante destructive
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
        })
      )
    })
  })
})
