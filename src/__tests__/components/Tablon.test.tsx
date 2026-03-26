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
  it('muestra "Instalaciones disponibles" cuando no se pasa municipio', async () => {
    const { default: Tablon } = await import('@/components/Tablon')

    render(React.createElement(Tablon, { pistas: PISTAS_EJEMPLO, avisos: [] }))

    expect(screen.getByText('Instalaciones disponibles')).toBeInTheDocument()
  })

  it('muestra "Instalaciones — Sevilla" cuando municipio="Sevilla"', async () => {
    const { default: Tablon } = await import('@/components/Tablon')

    render(
      React.createElement(Tablon, {
        pistas: PISTAS_EJEMPLO,
        avisos: [],
        municipio: 'Sevilla',
      })
    )

    expect(screen.getByText('Instalaciones — Sevilla')).toBeInTheDocument()
    expect(screen.queryByText('Instalaciones disponibles')).not.toBeInTheDocument()
  })

  it('muestra el aviso de login cuando no hay sesión', async () => {
    const { default: Tablon } = await import('@/components/Tablon')

    render(React.createElement(Tablon, { pistas: PISTAS_EJEMPLO, avisos: [] }))

    // El aviso de login contiene el enlace a /login
    const enlaceLogin = screen.getByRole('link', { name: /inicia sesión/i })
    expect(enlaceLogin).toHaveAttribute('href', '/login')
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
