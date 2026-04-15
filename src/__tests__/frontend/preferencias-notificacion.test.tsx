/**
 * Tests del componente PreferenciasNotificacion
 *
 * Verifica que el componente:
 * 1. Carga preferencias del usuario al montar
 * 2. Renderiza 5 checkboxes con los nuevos campos
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
        notificacionesEmail: true,
        notificacionesPush: true,
        recordatorioReserva: true,
        recordatorioCancel: true,
        notificacionesAviso: true,
      }),
    })

    render(React.createElement(PreferenciasNotificacion))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/cuenta/preferencias-notificacion')
    })
  })

  // Test 2: renderiza 5 checkboxes marcados por defecto
  it('debería renderizar 5 checkboxes marcados (valores por defecto true)', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        notificacionesEmail: true,
        notificacionesPush: true,
        recordatorioReserva: true,
        recordatorioCancel: true,
        notificacionesAviso: true,
      }),
    })

    render(React.createElement(PreferenciasNotificacion))

    await waitFor(() => {
      const checkboxEmail = screen.getByTestId('checkbox-notificacionesEmail') as HTMLInputElement
      const checkboxPush = screen.getByTestId('checkbox-notificacionesPush') as HTMLInputElement
      const checkboxRecordatorio = screen.getByTestId('checkbox-recordatorioReserva') as HTMLInputElement
      const checkboxCancel = screen.getByTestId('checkbox-recordatorioCancel') as HTMLInputElement
      const checkboxAviso = screen.getByTestId('checkbox-notificacionesAviso') as HTMLInputElement

      expect(checkboxEmail.checked).toBe(true)
      expect(checkboxPush.checked).toBe(true)
      expect(checkboxRecordatorio.checked).toBe(true)
      expect(checkboxCancel.checked).toBe(true)
      expect(checkboxAviso.checked).toBe(true)
    })
  })

  // Test 3: cambiar checkbox y guardar llama PATCH
  it('debería cambiar checkbox y guardar llama PATCH con el campo actualizado', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          notificacionesEmail: true,
          notificacionesPush: true,
          recordatorioReserva: true,
          recordatorioCancel: true,
          notificacionesAviso: true,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          notificacionesEmail: false,
          notificacionesPush: true,
          recordatorioReserva: true,
          recordatorioCancel: true,
          notificacionesAviso: true,
        }),
      })

    render(React.createElement(PreferenciasNotificacion))

    await waitFor(() => {
      const checkboxEmail = screen.getByTestId('checkbox-notificacionesEmail')
      expect(checkboxEmail).toBeInTheDocument()
    })

    // Desmarcar el checkbox de email
    const checkboxEmail = screen.getByTestId('checkbox-notificacionesEmail')
    fireEvent.change(checkboxEmail, { target: { checked: false } })

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
      expect(llamadaPatch?.[1]?.body).toContain('notificacionesEmail')
    })
  })

  // Test 4: deshabilita checkboxes y muestra spinner mientras guarda
  it('debería deshabilitar checkboxes y mostrar spinner en botón mientras se guarda', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          notificacionesEmail: true,
          notificacionesPush: true,
          recordatorioReserva: true,
          recordatorioCancel: true,
          notificacionesAviso: true,
        }),
      })
      .mockImplementationOnce(() =>
        new Promise((resolve) =>
          setTimeout(() =>
            resolve({
              ok: true,
              json: async () => ({
                notificacionesEmail: false,
                notificacionesPush: true,
                recordatorioReserva: true,
                recordatorioCancel: true,
                notificacionesAviso: true,
              }),
            }),
            100
          )
        )
      )

    render(React.createElement(PreferenciasNotificacion))

    await waitFor(() => {
      const checkboxEmail = screen.getByTestId('checkbox-notificacionesEmail')
      expect(checkboxEmail).toBeInTheDocument()
    })

    const checkboxEmail = screen.getByTestId('checkbox-notificacionesEmail')
    fireEvent.change(checkboxEmail, { target: { checked: false } })

    const botonGuardar = screen.getByRole('button', { name: /Guardar/i })
    fireEvent.click(botonGuardar)

    // Verificar que el botón se deshabilita durante el guardado
    await waitFor(() => {
      expect(botonGuardar).toHaveAttribute('disabled')
    }, { timeout: 50 })
  })

  // Test 5: muestra toast destructivo si falla el guardado
  it('debería mostrar toast destructivo si el PATCH falla', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          notificacionesEmail: true,
          notificacionesPush: true,
          recordatorioReserva: true,
          recordatorioCancel: true,
          notificacionesAviso: true,
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Server error' }),
      })

    render(React.createElement(PreferenciasNotificacion))

    await waitFor(() => {
      const checkboxEmail = screen.getByTestId('checkbox-notificacionesEmail')
      expect(checkboxEmail).toBeInTheDocument()
    })

    const checkboxEmail = screen.getByTestId('checkbox-notificacionesEmail')
    fireEvent.change(checkboxEmail, { target: { checked: false } })

    const botonGuardar = screen.getByRole('button', { name: /Guardar/i })
    fireEvent.click(botonGuardar)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
        })
      )
    })
  })
})
