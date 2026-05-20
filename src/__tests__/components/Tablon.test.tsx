/**
 * Tests del componente Tablon — personalización por tenant (TDD)
 *
 * Escritos ANTES de la implementación.
 * Cubren:
 *   - Título dinámico según prop `municipio`
 *   - Aviso de login cuando no hay sesión
 *   - Mensaje vacío cuando no hay pistas
 *   - Renderizado de instalaciones y avisos
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// --- Mocks de dependencias ---

vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({ data: null, status: 'unauthenticated' })),
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

vi.mock('@/components/ui/badge', () => ({
  Badge: ({
    children,
    className,
  }: {
    children: React.ReactNode
    className?: string
  }) => React.createElement('span', { className, 'data-testid': 'badge' }, children),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({
    children,
    className,
  }: {
    children: React.ReactNode
    className?: string
  }) => React.createElement('div', { className, 'data-testid': 'card' }, children),
}))

vi.mock('lucide-react', () => ({
  Clock: () => React.createElement('span', { 'data-testid': 'icon-clock' }),
  Bell: () => React.createElement('span', { 'data-testid': 'icon-bell' }),
  AlertCircle: () => React.createElement('span', { 'data-testid': 'icon-alert' }),
  CheckCircle: () => React.createElement('span', { 'data-testid': 'icon-check' }),
  LogIn: () => React.createElement('span', { 'data-testid': 'icon-login' }),
  ChevronRight: () => React.createElement('span', { 'data-testid': 'icon-chevron-right' }),
  MapPin: () => React.createElement('span', { 'data-testid': 'icon-map-pin' }),
  Info: () => React.createElement('span', { 'data-testid': 'icon-info' }),
  Star: () => React.createElement('span', { 'data-testid': 'icon-star' }),
}))

// --- Datos de prueba ---

const PISTAS_EJEMPLO = [
  {
    id: 'pista-1',
    nombre: 'Pista de Pádel 1',
    tipo: 'PADEL',
    descripcion: 'Pista cubierta con iluminación LED',
    horario: 'Lunes a Domingo: 08:00 - 22:00',
    activa: true,
  },
  {
    id: 'pista-2',
    nombre: 'Pista de Tenis 1',
    tipo: 'TENIS',
    descripcion: null,
    horario: 'Lunes a Viernes: 09:00 - 21:00',
    activa: true,
  },
]

const AVISOS_EJEMPLO = [
  {
    id: 'aviso-1',
    fecha: '2026-03-01T00:00:00.000Z',
    titulo: 'Mantenimiento programado',
    descripcion: 'Las pistas estarán cerradas el lunes.',
    tipo: 'AVISO' as const,
  },
]

// --- Suite de tests ---

describe('Tablon — personalización por tenant', () => {
  it('muestra "Instalaciones deportivas" cuando no se pasa municipio', async () => {
    const { default: Tablon } = await import('@/components/Tablon')

    render(React.createElement(Tablon, { pistas: PISTAS_EJEMPLO, avisos: [] }))

    // El componente ahora muestra "Instalaciones deportivas" como título principal
    expect(screen.getByText('Instalaciones deportivas')).toBeInTheDocument()
  })

  it('muestra el nombre del municipio en el título cuando se pasa municipio="Sevilla"', async () => {
    const { default: Tablon } = await import('@/components/Tablon')

    render(
      React.createElement(Tablon, {
        pistas: PISTAS_EJEMPLO,
        avisos: [],
        municipio: 'Sevilla',
      })
    )

    // El componente muestra "Instalaciones de" + municipio (puede estar en nodos distintos)
    const body = document.body.textContent ?? ''
    expect(body).toContain('Sevilla')
    expect(body).not.toContain('Instalaciones deportivas')
  })

  it('muestra el enlace a /login cuando no hay sesión', async () => {
    const { default: Tablon } = await import('@/components/Tablon')

    render(React.createElement(Tablon, { pistas: PISTAS_EJEMPLO, avisos: [] }))

    // El enlace a /login muestra "Ya tengo cuenta"
    const enlaceLogin = document.querySelector('[href="/login"]')
    expect(enlaceLogin).toBeInTheDocument()
  })

  it('muestra mensaje de sin instalaciones cuando pistas está vacío', async () => {
    const { default: Tablon } = await import('@/components/Tablon')

    render(React.createElement(Tablon, { pistas: [], avisos: [] }))

    expect(
      screen.getByText('No hay instalaciones disponibles en este momento.')
    ).toBeInTheDocument()
  })

  it('renderiza cada instalación con su nombre', async () => {
    const { default: Tablon } = await import('@/components/Tablon')

    render(React.createElement(Tablon, { pistas: PISTAS_EJEMPLO, avisos: [] }))

    expect(screen.getByText('Pista de Pádel 1')).toBeInTheDocument()
    expect(screen.getByText('Pista de Tenis 1')).toBeInTheDocument()
  })

  it('renderiza cada aviso con su título', async () => {
    const { default: Tablon } = await import('@/components/Tablon')

    render(React.createElement(Tablon, { pistas: PISTAS_EJEMPLO, avisos: AVISOS_EJEMPLO }))

    expect(screen.getByText('Mantenimiento programado')).toBeInTheDocument()
  })
})
