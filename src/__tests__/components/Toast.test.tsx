/**
 * Tests del sistema de toasts — TDD (escritos ANTES de la implementación)
 *
 * Cubren:
 *   - El componente Toaster renderiza sin errores
 *   - Al llamar toast({ title }), aparece el texto en pantalla
 *   - La variante destructive aplica la clase correcta
 *   - El toast tiene role="status" para accesibilidad
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import React from 'react'

// --- Mocks de dependencias ---

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

// --- Suite de tests ---

describe('Toast — sistema de notificaciones', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debería renderizar el componente Toaster sin errores', async () => {
    const { Toaster } = await import('@/components/ui/toast')

    expect(() => render(React.createElement(Toaster))).not.toThrow()
  })

  it('debería mostrar el título cuando se llama a toast({ title })', async () => {
    const { Toaster } = await import('@/components/ui/toast')
    const { toast } = await import('@/hooks/use-toast')

    render(React.createElement(Toaster))

    act(() => {
      toast({ title: 'Prueba de notificación' })
    })

    expect(screen.getByText('Prueba de notificación')).toBeInTheDocument()
  })

  it('debería aplicar la clase destructive cuando variant es "destructive"', async () => {
    const { Toaster } = await import('@/components/ui/toast')
    const { toast } = await import('@/hooks/use-toast')

    render(React.createElement(Toaster))

    act(() => {
      toast({ title: 'Error grave', variant: 'destructive' })
    })

    // El toast con variante destructive debe tener la clase correspondiente
    const toastElement = screen.getByText('Error grave').closest('[data-state]')
    expect(toastElement).toHaveClass('destructive')
  })

  it('debería tener role="status" para accesibilidad', async () => {
    const { Toaster } = await import('@/components/ui/toast')
    const { toast } = await import('@/hooks/use-toast')

    render(React.createElement(Toaster))

    act(() => {
      toast({ title: 'Mensaje accesible' })
    })

    // Radix UI añade un <span role="status"> interno para anuncios; usamos getAllByRole
    // y buscamos el elemento visible que contiene el texto del toast
    const elementosStatus = screen.getAllByRole('status')
    expect(elementosStatus.length).toBeGreaterThan(0)

    // Al menos uno de los elementos con role="status" debe contener el texto del toast
    const toastVisible = elementosStatus.find(
      (el) => el.textContent?.includes('Mensaje accesible')
    )
    expect(toastVisible).toBeInTheDocument()
  })
})
