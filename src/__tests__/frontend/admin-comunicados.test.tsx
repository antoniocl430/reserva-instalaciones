/**
 * Tests para la página de admin de comunicados masivos
 * Ruta: /admin/(panel)/comunicados/page.tsx
 * TDD: tests escritos ANTES de implementar la página
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import React from 'react'

// ─── Mocks de next ─────────────────────────────────────────────────────────────

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/admin/comunicados',
}))

// ─── Mock de next-auth (admin autenticado) ──────────────────────────────────────

vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({
    data: { user: { id: 'admin-1', name: 'Admin', rol: 'ADMIN', tenantId: 'tenant-1' } },
    status: 'authenticated',
  })),
}))

// ─── Mock de toast ─────────────────────────────────────────────────────────────

const mockToast = vi.fn()
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}))

// ─── Mock de Dialog de shadcn (sin portal) ──────────────────────────────────────

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
  DialogFooter: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', {}, children),
}))

// ─── Mock de Button ───────────────────────────────────────────────────────────

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, type }: {
    children: React.ReactNode
    onClick?: () => void
    disabled?: boolean
    variant?: string
    type?: 'button' | 'submit' | 'reset'
  }) =>
    React.createElement('button', { onClick, disabled, 'data-variant': variant, type }, children),
}))

// ─── Mock de Badge ────────────────────────────────────────────────────────────

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('span', { className }, children),
}))

// ─── Mock de Skeleton ─────────────────────────────────────────────────────────

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) =>
    React.createElement('div', { className, 'data-testid': 'skeleton' }),
}))

// ─── Mock de Select de shadcn — simplificado con estado interno ───────────────

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, defaultValue }: {
    children: React.ReactNode
    onValueChange?: (v: string) => void
    defaultValue?: string
  }) => {
    const [val, setVal] = React.useState(defaultValue ?? '')
    return React.createElement(
      'div',
      { 'data-testid': 'select' },
      React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child
        return React.cloneElement(child as React.ReactElement<{
          onValueChange?: (v: string) => void
          value?: string
        }>, {
          onValueChange: (v: string) => { setVal(v); onValueChange?.(v) },
          value: val,
        })
      })
    )
  },
  SelectTrigger: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { role: 'button', 'data-testid': 'select-trigger' }, children),
  SelectContent: ({ children, onValueChange }: {
    children: React.ReactNode
    onValueChange?: (v: string) => void
  }) =>
    React.createElement(
      'div',
      { 'data-testid': 'select-content' },
      React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child
        return React.cloneElement(child as React.ReactElement<{
          onSelect?: (v: string) => void
        }>, {
          onSelect: (v: string) => onValueChange?.(v),
        })
      })
    ),
  SelectItem: ({ children, value, onSelect }: {
    children: React.ReactNode
    value: string
    onSelect?: (v: string) => void
  }) =>
    React.createElement(
      'div',
      { onClick: () => onSelect?.(value), 'data-value': value, role: 'option' },
      children
    ),
  SelectValue: ({ placeholder }: { placeholder?: string }) =>
    React.createElement('span', {}, placeholder),
}))

// ─── Datos de ejemplo ─────────────────────────────────────────────────────────

const comunicadoEjemplo = {
  id: 'com-1',
  titulo: 'Cierre por mantenimiento',
  cuerpo: 'El polideportivo cerrará el lunes 20 por obras.',
  canal: 'AMBOS',
  enviadoEn: '2026-05-14T10:00:00.000Z',
}

// ─── Importar página bajo test ────────────────────────────────────────────────

import PaginaComunicados from '@/app/admin/(panel)/comunicados/page'

// ─── Suite de tests ───────────────────────────────────────────────────────────

describe('PaginaAdminComunicados', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPush.mockReset()
    mockToast.mockClear()

    // Mock de fetch por defecto: GET devuelve historial con un comunicado
    global.fetch = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
      if (url === '/api/admin/comunicados' && !options?.method) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ comunicados: [comunicadoEjemplo] }),
        })
      }
      if (url === '/api/admin/comunicados' && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 201,
          json: async () => ({
            comunicado: comunicadoEjemplo,
            enviados: { email: 42, push: 15 },
          }),
        })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })
  })

  it('muestra el formulario con campos titulo, cuerpo y selector de canal', async () => {
    render(React.createElement(PaginaComunicados))

    await waitFor(() => {
      // Título de la página
      expect(screen.getByText(/comunicados masivos/i)).toBeInTheDocument()
    })

    // Campo título
    expect(screen.getByLabelText(/título/i)).toBeInTheDocument()
    // Campo cuerpo
    expect(screen.getByLabelText(/cuerpo/i)).toBeInTheDocument()
    // Selector de canal
    expect(screen.getByTestId('select')).toBeInTheDocument()
    // Botón enviar
    expect(screen.getByRole('button', { name: /enviar comunicado/i })).toBeInTheDocument()
  })

  it('muestra el historial de comunicados enviados previamente', async () => {
    render(React.createElement(PaginaComunicados))

    await waitFor(() => {
      expect(screen.getByText('Cierre por mantenimiento')).toBeInTheDocument()
    })
  })

  it('muestra estado vacío cuando no hay historial', async () => {
    global.fetch = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
      if (url === '/api/admin/comunicados' && !options?.method) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ comunicados: [] }),
        })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })

    render(React.createElement(PaginaComunicados))

    await waitFor(() => {
      expect(screen.getByText(/aún no se han enviado comunicados/i)).toBeInTheDocument()
    })
  })

  it('al enviar el formulario, llama a POST /api/admin/comunicados con los datos correctos', async () => {
    render(React.createElement(PaginaComunicados))

    await waitFor(() => {
      expect(screen.getByLabelText(/título/i)).toBeInTheDocument()
    })

    // Rellenar el formulario
    fireEvent.change(screen.getByLabelText(/título/i), {
      target: { value: 'Aviso de prueba' },
    })
    fireEvent.change(screen.getByLabelText(/cuerpo/i), {
      target: { value: 'Texto del comunicado de prueba.' },
    })

    // Hacer clic en el botón enviar para abrir el dialog de confirmación
    fireEvent.click(screen.getByRole('button', { name: /enviar comunicado/i }))

    // Confirmar en el dialog
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/comunicados',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
          body: expect.stringContaining('Aviso de prueba'),
        })
      )
    })
  })

  it('muestra toast de éxito con número de destinatarios tras envío correcto', async () => {
    render(React.createElement(PaginaComunicados))

    await waitFor(() => {
      expect(screen.getByLabelText(/título/i)).toBeInTheDocument()
    })

    // Rellenar el formulario
    fireEvent.change(screen.getByLabelText(/título/i), {
      target: { value: 'Aviso de prueba' },
    })
    fireEvent.change(screen.getByLabelText(/cuerpo/i), {
      target: { value: 'Texto del comunicado.' },
    })

    // Abrir dialog de confirmación
    fireEvent.click(screen.getByRole('button', { name: /enviar comunicado/i }))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // Confirmar envío
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('enviado'),
          description: expect.stringContaining('42'),
        })
      )
    })
  })
})
