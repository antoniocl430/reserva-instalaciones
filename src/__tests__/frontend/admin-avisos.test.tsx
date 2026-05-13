/**
 * Tests para la página de admin de avisos — /admin/(panel)/avisos/page.tsx
 * y el componente FormularioAviso — /components/admin/FormularioAviso.tsx
 *
 * Cubre la funcionalidad de fecha de caducidad (caducaEn).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

// ─── Mocks globales ───────────────────────────────────────────────────────────

// Mock de fetch
global.fetch = vi.fn()

// Mock del Select de shadcn/ui (no labellable por jsdom)
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: { children: React.ReactNode; value?: string; onValueChange?: (v: string) => void }) =>
    React.createElement('div', { 'data-testid': 'select-mock', 'data-value': value }, children),
  SelectTrigger: ({ children, id }: { children: React.ReactNode; id?: string }) =>
    React.createElement('div', { id }, children),
  SelectValue: ({ placeholder }: { placeholder?: string }) =>
    React.createElement('span', null, placeholder),
  SelectContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) =>
    React.createElement('div', { 'data-testid': `select-item-${value}`, role: 'option', 'data-value': value }, children),
}))

// Mock de next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/',
}))

// ─── Datos de ejemplo ─────────────────────────────────────────────────────────

/** Aviso sin fecha de caducidad */
const avisoSinCaducidad = {
  id: '1',
  titulo: 'Aviso sin caducidad',
  descripcion: 'Descripción del aviso sin caducidad',
  tipo: 'INFO' as const,
  fecha: '2026-01-01T00:00:00.000Z',
  activo: true,
  caducaEn: null,
}

/** Aviso con fecha de caducidad ya pasada */
const avisosCaducado = {
  id: '2',
  titulo: 'Aviso caducado',
  descripcion: 'Descripción del aviso caducado',
  tipo: 'AVISO' as const,
  fecha: '2026-01-01T00:00:00.000Z',
  activo: true,
  caducaEn: '2025-01-01T00:00:00.000Z', // fecha pasada (hoy es 2026-05-13)
}

/** Aviso con fecha de caducidad futura */
const avisoCaducidadFutura = {
  id: '3',
  titulo: 'Aviso con caducidad futura',
  descripcion: 'Descripción del aviso con caducidad futura',
  tipo: 'CIERRE' as const,
  fecha: '2026-01-01T00:00:00.000Z',
  activo: true,
  caducaEn: '2030-06-15T00:00:00.000Z', // fecha futura
}

// ─── Tests de la página de lista de avisos ────────────────────────────────────

describe('PaginaAdminAvisos — lista de avisos con caducidad', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debería renderizar la lista de avisos sin errores', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [avisoSinCaducidad, avisosCaducado, avisoCaducidadFutura],
    })

    const { default: PaginaAdminAvisos } = await import('@/app/admin/(panel)/avisos/page')
    render(<PaginaAdminAvisos />)

    await waitFor(() => {
      expect(screen.getByText('Aviso sin caducidad')).toBeInTheDocument()
      expect(screen.getByText('Aviso caducado')).toBeInTheDocument()
      expect(screen.getByText('Aviso con caducidad futura')).toBeInTheDocument()
    })
  })

  it('debería mostrar badge "Caducado" para aviso con caducaEn en el pasado', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [avisosCaducado],
    })

    const { default: PaginaAdminAvisos } = await import('@/app/admin/(panel)/avisos/page')
    render(<PaginaAdminAvisos />)

    await waitFor(() => {
      expect(screen.getByText('Caducado')).toBeInTheDocument()
    })
  })

  it('debería mostrar texto "Caduca DD/MM/AAAA" para aviso con caducaEn en el futuro', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [avisoCaducidadFutura],
    })

    const { default: PaginaAdminAvisos } = await import('@/app/admin/(panel)/avisos/page')
    render(<PaginaAdminAvisos />)

    await waitFor(() => {
      // La fecha futura es 15/06/2030
      expect(screen.getByText('Caduca 15/06/2030')).toBeInTheDocument()
    })
  })

  it('debería no mostrar badge ni texto de caducidad para aviso sin caducaEn', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [avisoSinCaducidad],
    })

    const { default: PaginaAdminAvisos } = await import('@/app/admin/(panel)/avisos/page')
    render(<PaginaAdminAvisos />)

    await waitFor(() => {
      expect(screen.getByText('Aviso sin caducidad')).toBeInTheDocument()
    })

    expect(screen.queryByText('Caducado')).not.toBeInTheDocument()
    expect(screen.queryByText(/Caduca/)).not.toBeInTheDocument()
  })
})

// ─── Tests del formulario de aviso ───────────────────────────────────────────

describe('FormularioAviso — campo de fecha de caducidad', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debería mostrar el campo "Fecha de caducidad" en el formulario de creación', async () => {
    const { default: FormularioAviso } = await import('@/components/admin/FormularioAviso')
    const onGuardar = vi.fn().mockResolvedValue(undefined)
    const onCancelar = vi.fn()

    render(<FormularioAviso onGuardar={onGuardar} onCancelar={onCancelar} />)

    expect(screen.getByLabelText(/Fecha de caducidad/i)).toBeInTheDocument()
  })

  it('debería enviar caducaEn: null cuando el campo de caducidad está vacío', async () => {
    const { default: FormularioAviso } = await import('@/components/admin/FormularioAviso')
    const onGuardar = vi.fn().mockResolvedValue(undefined)
    const onCancelar = vi.fn()

    render(<FormularioAviso onGuardar={onGuardar} onCancelar={onCancelar} />)

    // Rellenar campos obligatorios
    await userEvent.type(screen.getByLabelText(/Título/i), 'Título de prueba')
    await userEvent.type(screen.getByLabelText(/Descripción/i), 'Descripción de prueba')
    fireEvent.change(screen.getByLabelText(/^Fecha$/i), { target: { value: '2026-05-13' } })
    // Dejar caducaEn vacío (no rellenar)

    // Enviar formulario
    fireEvent.submit(screen.getByRole('form', { name: /formulario de aviso/i }))

    await waitFor(() => {
      expect(onGuardar).toHaveBeenCalledWith(
        expect.objectContaining({ caducaEn: null })
      )
    })
  })

  it('debería enviar caducaEn con la fecha cuando el campo de caducidad tiene valor', async () => {
    const { default: FormularioAviso } = await import('@/components/admin/FormularioAviso')
    const onGuardar = vi.fn().mockResolvedValue(undefined)
    const onCancelar = vi.fn()

    render(<FormularioAviso onGuardar={onGuardar} onCancelar={onCancelar} />)

    // Rellenar campos obligatorios
    await userEvent.type(screen.getByLabelText(/Título/i), 'Título de prueba')
    await userEvent.type(screen.getByLabelText(/Descripción/i), 'Descripción de prueba')
    fireEvent.change(screen.getByLabelText(/^Fecha$/i), { target: { value: '2026-05-13' } })
    // Rellenar caducaEn
    fireEvent.change(screen.getByLabelText(/Fecha de caducidad/i), { target: { value: '2030-12-31' } })

    // Enviar formulario
    fireEvent.submit(screen.getByRole('form', { name: /formulario de aviso/i }))

    await waitFor(() => {
      expect(onGuardar).toHaveBeenCalledWith(
        expect.objectContaining({ caducaEn: '2030-12-31' })
      )
    })
  })

  it('debería pre-rellenar el campo de caducidad al editar un aviso con caducaEn', async () => {
    const { default: FormularioAviso } = await import('@/components/admin/FormularioAviso')
    const onGuardar = vi.fn().mockResolvedValue(undefined)
    const onCancelar = vi.fn()

    const avisoConCaducidad = {
      id: 'aviso-1',
      titulo: 'Título existente',
      descripcion: 'Descripción existente',
      tipo: 'INFO' as const,
      fecha: '2026-01-01',
      activo: true,
      caducaEn: '2030-06-15', // fecha en formato YYYY-MM-DD
    }

    render(<FormularioAviso aviso={avisoConCaducidad} onGuardar={onGuardar} onCancelar={onCancelar} />)

    const campoCaducidad = screen.getByLabelText(/Fecha de caducidad/i) as HTMLInputElement
    expect(campoCaducidad.value).toBe('2030-06-15')
  })
})
