/**
 * Tests de PaginaAdminAvisos — caducidad de avisos.
 *
 * Regla:
 *   - caducaEn anterior a hoy → badge "Caducado"
 *   - caducaEn igual a hoy o posterior → texto "Caduca DD/MM/AAAA"
 *   - caducaEn null → sin badge de caducidad
 *
 * Ruta afectada: src/app/admin/(panel)/avisos/page.tsx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'

// ─── Mock de fetch (se asigna en cada test) ──────────────────────────────────

global.fetch = vi.fn()

// ─── Mock de next/navigation ─────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/admin/avisos',
}))

// ─── Mock de shadcn/ui componentes que usan Radix Portal ────────────────────

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? React.createElement('div', { role: 'dialog' }, children) : null,
  DialogContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', {}, children),
  DialogHeader: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', {}, children),
  DialogTitle: ({ children }: { children: React.ReactNode }) =>
    React.createElement('h2', {}, children),
  DialogDescription: ({ children }: { children: React.ReactNode }) =>
    React.createElement('p', {}, children),
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

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant,
    size,
  }: {
    children: React.ReactNode
    onClick?: () => void
    disabled?: boolean
    variant?: string
    size?: string
  }) =>
    React.createElement(
      'button',
      { onClick, disabled, 'data-variant': variant, 'data-size': size },
      children
    ),
}))

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) =>
    React.createElement('div', { className, 'data-testid': 'skeleton' }),
}))

// ─── Mock del formulario de aviso (no lo necesitamos en estos tests) ─────────

vi.mock('@/components/admin/FormularioAviso', () => ({
  default: () => React.createElement('div', { 'data-testid': 'formulario-aviso-mock' }),
}))

// ─── Helpers de fecha ─────────────────────────────────────────────────────────

/** Devuelve una fecha ISO correspondiente a "ayer" */
function ayer(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  d.setUTCHours(0, 0, 0, 0)
  return d.toISOString()
}

/** Devuelve una fecha ISO correspondiente a "mañana" */
function manana(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + 1)
  d.setUTCHours(0, 0, 0, 0)
  return d.toISOString()
}

/** Formatea una fecha ISO a DD/MM/AAAA usando UTC (igual que la página) */
function formatearDDMMAAAA(iso: string): string {
  const d = new Date(iso)
  const dia = String(d.getUTCDate()).padStart(2, '0')
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0')
  const anio = d.getUTCFullYear()
  return `${dia}/${mes}/${anio}`
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('PaginaAdminAvisos — caducidad de avisos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("muestra badge 'Caducado' para avisos con caducaEn en el pasado", async () => {
    const avisoDelPasado = {
      id: '1',
      titulo: 'Aviso caducado',
      descripcion: 'Este aviso ya caducó',
      tipo: 'AVISO' as const,
      fecha: '2026-01-01T00:00:00.000Z',
      activo: true,
      caducaEn: ayer(), // fecha de ayer → caducado
    }

    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [avisoDelPasado],
    })

    const { default: PaginaAdminAvisos } = await import(
      '@/app/admin/(panel)/avisos/page'
    )
    render(React.createElement(PaginaAdminAvisos))

    // Esperar a que cargue el aviso
    await waitFor(() => {
      expect(screen.getByText('Aviso caducado')).toBeInTheDocument()
    })

    // Debe aparecer el badge "Caducado"
    expect(screen.getByText('Caducado')).toBeInTheDocument()
  })

  it('muestra fecha de caducidad para avisos que caducan en el futuro', async () => {
    const fechaManana = manana()
    const fechaFormateada = formatearDDMMAAAA(fechaManana)

    const avisoDeFuturo = {
      id: '2',
      titulo: 'Aviso con caducidad futura',
      descripcion: 'Este aviso caduca mañana',
      tipo: 'INFO' as const,
      fecha: '2026-01-01T00:00:00.000Z',
      activo: true,
      caducaEn: fechaManana,
    }

    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [avisoDeFuturo],
    })

    const { default: PaginaAdminAvisos } = await import(
      '@/app/admin/(panel)/avisos/page'
    )
    render(React.createElement(PaginaAdminAvisos))

    // Esperar a que cargue el aviso
    await waitFor(() => {
      expect(screen.getByText('Aviso con caducidad futura')).toBeInTheDocument()
    })

    // Debe aparecer "Caduca" seguido de la fecha en DD/MM/AAAA
    expect(screen.getByText(`Caduca ${fechaFormateada}`)).toBeInTheDocument()

    // NO debe aparecer el badge "Caducado"
    expect(screen.queryByText('Caducado')).not.toBeInTheDocument()
  })

  it('no muestra badge de caducidad para avisos sin fecha de caducidad', async () => {
    const avisoSinCaducidad = {
      id: '3',
      titulo: 'Aviso sin caducidad',
      descripcion: 'Este aviso no tiene fecha de caducidad',
      tipo: 'INFO' as const,
      fecha: '2026-01-01T00:00:00.000Z',
      activo: true,
      caducaEn: null,
    }

    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [avisoSinCaducidad],
    })

    const { default: PaginaAdminAvisos } = await import(
      '@/app/admin/(panel)/avisos/page'
    )
    render(React.createElement(PaginaAdminAvisos))

    // Esperar a que cargue el aviso
    await waitFor(() => {
      expect(screen.getByText('Aviso sin caducidad')).toBeInTheDocument()
    })

    // No debe aparecer ni "Caducado" ni ningún texto con "Caduca"
    expect(screen.queryByText('Caducado')).not.toBeInTheDocument()
    expect(screen.queryByText(/Caduca/)).not.toBeInTheDocument()
  })
})
