/**
 * Tests para la página de admin de valoraciones
 * Ruta: /admin/(panel)/valoraciones/page.tsx
 * TDD: tests escritos ANTES de implementar la página
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'

// --- Mocks de next ---
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/admin/valoraciones',
}))

// --- Mock de next-auth (admin autenticado) ---
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({
    data: { user: { id: 'admin-1', name: 'Admin', rol: 'ADMIN' } },
    status: 'authenticated',
  })),
}))

// --- Mock de StarRating ---
vi.mock('@/components/StarRating', () => ({
  default: ({ value, size }: { value: number; size?: string }) =>
    React.createElement('div', {
      'data-testid': 'star-rating',
      'data-value': value,
      'data-size': size,
    }, `★ ${value}`),
}))

// --- Mock de Table de shadcn ---
vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children: React.ReactNode }) =>
    React.createElement('table', {}, children),
  TableHeader: ({ children }: { children: React.ReactNode }) =>
    React.createElement('thead', {}, children),
  TableBody: ({ children }: { children: React.ReactNode }) =>
    React.createElement('tbody', {}, children),
  TableRow: ({ children }: { children: React.ReactNode }) =>
    React.createElement('tr', {}, children),
  TableHead: ({ children }: { children: React.ReactNode }) =>
    React.createElement('th', {}, children),
  TableCell: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('td', { className }, children),
}))

// --- Mock de Skeleton ---
vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) =>
    React.createElement('div', { className, 'data-testid': 'skeleton' }),
}))

// --- Datos de ejemplo ---
const valoracionesEjemplo = [
  {
    id: 'val-1',
    puntuacion: 5,
    comentario: 'Excelente instalación',
    creadoEn: '2025-01-15T10:00:00.000Z',
    instalacion: { nombre: 'Pista de Pádel 1' },
    usuario: { nombre: 'Ana García', email: 'ana@test.com' },
  },
  {
    id: 'val-2',
    puntuacion: 3,
    comentario: null,
    creadoEn: '2025-01-10T09:00:00.000Z',
    instalacion: { nombre: 'Pista de Tenis 1' },
    usuario: { nombre: 'Carlos López', email: 'carlos@test.com' },
  },
]

// --- Importar la página bajo test ---
import PaginaAdminValoraciones from '@/app/admin/(panel)/valoraciones/page'

describe('PaginaAdminValoraciones', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock de fetch por defecto: devuelve la lista de valoraciones
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/admin/valoraciones') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ valoraciones: valoracionesEjemplo }),
        })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })
  })

  it('carga y muestra la lista de valoraciones', async () => {
    render(React.createElement(PaginaAdminValoraciones))

    await waitFor(() => {
      expect(screen.getByText('Pista de Pádel 1')).toBeInTheDocument()
      expect(screen.getByText('Ana García')).toBeInTheDocument()
      expect(screen.getByText('Excelente instalación')).toBeInTheDocument()
      expect(screen.getByText('Pista de Tenis 1')).toBeInTheDocument()
      expect(screen.getByText('Carlos López')).toBeInTheDocument()
    })
  })

  it('muestra estadísticas globales: total de valoraciones y media', async () => {
    render(React.createElement(PaginaAdminValoraciones))

    await waitFor(() => {
      // Debe mostrar el total (2 valoraciones)
      const body = document.body.textContent ?? ''
      expect(body).toContain('2')
      // La media de 5 y 3 es 4.0
      expect(body).toMatch(/4[,.]?0|media/i)
    })

    // Debe mostrar el StarRating con la media
    const starRatings = screen.getAllByTestId('star-rating')
    const conMedia = starRatings.find((el) => el.getAttribute('data-value') === '4')
    expect(conMedia).toBeTruthy()
  })

  it('muestra "No hay valoraciones todavía" si la lista está vacía', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/admin/valoraciones') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ valoraciones: [] }),
        })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })

    render(React.createElement(PaginaAdminValoraciones))

    await waitFor(() => {
      expect(screen.getByText(/no hay valoraciones todavía/i)).toBeInTheDocument()
    })
  })

  it('muestra "—" para comentarios nulos', async () => {
    render(React.createElement(PaginaAdminValoraciones))

    await waitFor(() => {
      // La segunda valoración tiene comentario=null, debe mostrar "—"
      expect(screen.getByText('—')).toBeInTheDocument()
    })
  })

  it('muestra el título "Valoraciones" en la cabecera', async () => {
    render(React.createElement(PaginaAdminValoraciones))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /valoraciones/i })).toBeInTheDocument()
    })
  })
})
