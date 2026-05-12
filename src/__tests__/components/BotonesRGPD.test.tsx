/**
 * Tests del componente BotonesRGPD
 *
 * El componente fue simplificado: ahora sólo renderiza un enlace a /perfil
 * donde están disponibles las opciones completas de RGPD (exportar y eliminar).
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    asChild,
    className,
    variant,
  }: {
    children: React.ReactNode
    asChild?: boolean
    className?: string
    variant?: string
  }) =>
    asChild
      ? React.createElement(React.Fragment, {}, children)
      : React.createElement('button', { className, 'data-variant': variant }, children),
}))

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

import BotonesRGPD from '@/components/BotonesRGPD'

describe('BotonesRGPD', () => {
  it('debería renderizar el enlace a la página de perfil', () => {
    render(React.createElement(BotonesRGPD))
    const enlace = screen.getByRole('link', { name: /Gestionar mis datos/i })
    expect(enlace).toBeInTheDocument()
    expect(enlace.getAttribute('href')).toBe('/perfil')
  })

  it('debería mostrar el texto "Gestionar mis datos"', () => {
    render(React.createElement(BotonesRGPD))
    expect(screen.getByText('Gestionar mis datos')).toBeInTheDocument()
  })
})
