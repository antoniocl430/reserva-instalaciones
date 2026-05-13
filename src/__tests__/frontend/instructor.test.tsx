/**
 * Tests del componente MisClases (página /instructor/mis-clases)
 *
 * Componente client-side que muestra los grupos recurrentes del instructor,
 * permite expandir sesiones y cancelar grupos completos.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import React from 'react'

// --- Mocks de dependencias ---

vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}))

const mockPush = vi.fn()
// El objeto de router es estable para evitar que el useEffect se ejecute en bucle
const mockRouter = { push: mockPush }
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => mockRouter),
}))

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href }, children),
}))

vi.mock('@/components/header', () => ({
  Header: () => React.createElement('header', { 'data-testid': 'header' }, 'Header'),
}))

// Mock de componentes shadcn/ui para evitar dependencias de Radix

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('div', { className, 'data-testid': 'card' }, children),
  CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('div', { className }, children),
  CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('h3', { className }, children),
  CardDescription: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', {}, children),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('div', { className }, children),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant,
    size,
    className,
    asChild,
  }: {
    children: React.ReactNode
    onClick?: () => void
    disabled?: boolean
    variant?: string
    size?: string
    className?: string
    asChild?: boolean
  }) => {
    if (asChild && React.isValidElement(children)) {
      return children
    }
    return React.createElement('button', { onClick, disabled, 'data-variant': variant, className }, children)
  },
}))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({
    open,
    children,
    onOpenChange,
  }: {
    open: boolean
    children: React.ReactNode
    onOpenChange?: (open: boolean) => void
  }) =>
    open
      ? React.createElement('div', { role: 'dialog', 'data-testid': 'dialog' }, children)
      : null,
  DialogContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', {}, children),
  DialogHeader: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', {}, children),
  DialogTitle: ({ children }: { children: React.ReactNode }) =>
    React.createElement('h2', {}, children),
  DialogDescription: ({ children }: { children: React.ReactNode }) =>
    React.createElement('p', {}, children),
  DialogFooter: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('div', { className }, children),
}))

// Lucide: mockeamos los íconos para no depender de SVG real
vi.mock('lucide-react', () => ({
  ChevronDown: () => React.createElement('span', { 'data-testid': 'chevron-down' }),
  ChevronUp: () => React.createElement('span', { 'data-testid': 'chevron-up' }),
  Trash2: () => React.createElement('span', { 'data-testid': 'trash2' }),
}))

// Mock global.fetch
global.fetch = vi.fn()

import { useSession } from 'next-auth/react'
const mockUseSession = useSession as ReturnType<typeof vi.fn>

import MisClases from '@/app/instructor/mis-clases/page'

// --- Datos de ejemplo ---

const grupoActivo = {
  id: 'g1',
  instalacion: { nombre: 'Pádel 1' },
  horaInicio: '09:15',
  frecuencia: 'SEMANAL',
  fechaInicio: '2025-01-01T00:00:00.000Z',
  fechaFin: '2025-06-30T00:00:00.000Z',
  activo: true,
  reservas: [
    { id: 'r1', fecha: '2025-01-08T00:00:00.000Z', horaInicio: '09:15', estado: 'ACTIVA' },
    { id: 'r2', fecha: '2025-01-15T00:00:00.000Z', horaInicio: '09:15', estado: 'CANCELADA' },
  ],
}

function mockSesionInstructor() {
  mockUseSession.mockReturnValue({
    data: {
      user: { id: '1', email: 'inst@test.es', rol: 'INSTRUCTOR', tenantId: 'tenant-1' },
      expires: '2099-01-01',
    },
    status: 'authenticated',
  })
}

function mockFetchGrupos(grupos: typeof grupoActivo[]) {
  ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: true,
    json: async () => ({
      grupos,
      proximasSesiones: grupos.flatMap(g => g.reservas),
    }),
  } as any)
}

// --- TESTS ---

describe('MisClases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPush.mockReset()
    ;(global.fetch as ReturnType<typeof vi.fn>).mockReset()
  })

  it('debería mostrar spinner "Cargando clases..." mientras carga', () => {
    // Estado de sesión "loading" mantiene el spinner visible
    mockUseSession.mockReturnValue({
      data: null,
      status: 'loading',
    })

    render(React.createElement(MisClases))

    expect(screen.getByText('Cargando clases...')).toBeInTheDocument()
  })

  it('debería redirigir a /login si el usuario no está autenticado', async () => {
    mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' })

    render(React.createElement(MisClases))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })

  it('debería redirigir a / si el rol no es INSTRUCTOR', async () => {
    // El componente llama router.push('/') para roles no INSTRUCTOR.
    // cargando permanece true porque cargarGrupos() no se invoca,
    // por lo que la pantalla de "acceso denegado" nunca se muestra.
    // Verificamos la redirección en su lugar.
    mockUseSession.mockReturnValue({
      data: {
        user: { id: '2', email: 'ciudadano@test.es', rol: 'CIUDADANO', tenantId: 'tenant-1' },
        expires: '2099-01-01',
      },
      status: 'authenticated',
    })

    render(React.createElement(MisClases))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })

  it('debería mostrar "No hay clases creadas" cuando el instructor no tiene grupos activos', async () => {
    mockSesionInstructor()
    mockFetchGrupos([])

    render(React.createElement(MisClases))

    await waitFor(() => {
      expect(screen.getByText('No hay clases creadas')).toBeInTheDocument()
    })
  })

  it('debería mostrar lista de grupos activos con nombre de instalación y badge de frecuencia', async () => {
    mockSesionInstructor()
    mockFetchGrupos([grupoActivo])

    render(React.createElement(MisClases))

    await waitFor(() => {
      expect(screen.getByText('Pádel 1')).toBeInTheDocument()
      expect(screen.getByText('Semanal')).toBeInTheDocument()
    })
  })

  it('debería expandir las sesiones al hacer click en la tarjeta del grupo', async () => {
    mockSesionInstructor()
    mockFetchGrupos([grupoActivo])

    render(React.createElement(MisClases))

    // Esperar a que cargue la lista
    await waitFor(() => {
      expect(screen.getByText('Pádel 1')).toBeInTheDocument()
    })

    // El botón de la tarjeta contiene el nombre de la instalación
    // Usamos el texto "Pádel 1" para localizar el botón de su tarjeta
    const botonTarjeta = screen.getByText('Pádel 1').closest('button') as HTMLElement
    fireEvent.click(botonTarjeta)

    await waitFor(() => {
      expect(screen.getByText('Sesiones (2)')).toBeInTheDocument()
    })
  })

  it('debería mostrar el estado ACTIVA y CANCELADA de las sesiones expandidas', async () => {
    mockSesionInstructor()
    mockFetchGrupos([grupoActivo])

    render(React.createElement(MisClases))

    await waitFor(() => {
      expect(screen.getByText('Pádel 1')).toBeInTheDocument()
    })

    // Expandir el grupo
    const botonTarjeta = screen.getByText('Pádel 1').closest('button') as HTMLElement
    fireEvent.click(botonTarjeta)

    await waitFor(() => {
      expect(screen.getByText('ACTIVA')).toBeInTheDocument()
      expect(screen.getByText('CANCELADA')).toBeInTheDocument()
    })
  })

  it('debería abrir el dialog de confirmación al hacer click en "Cancelar grupo"', async () => {
    mockSesionInstructor()
    mockFetchGrupos([grupoActivo])

    render(React.createElement(MisClases))

    await waitFor(() => {
      expect(screen.getByText('Pádel 1')).toBeInTheDocument()
    })

    // Expandir para ver el botón "Cancelar grupo"
    const botonTarjeta = screen.getByText('Pádel 1').closest('button') as HTMLElement
    fireEvent.click(botonTarjeta)

    await waitFor(() => {
      expect(screen.getByText('Cancelar grupo')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Cancelar grupo'))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Cancelar grupo de clases')).toBeInTheDocument()
    })
  })

  it('debería llamar a DELETE /api/instructor/reservas-recurrentes/{id} al confirmar cancelación', async () => {
    mockSesionInstructor()

    // Primera llamada: cargar grupos
    // Segunda llamada: DELETE cancelación
    // Tercera llamada: recargar grupos
    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ grupos: [grupoActivo], proximasSesiones: [] }),
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ grupos: [], proximasSesiones: [] }),
      } as any)

    render(React.createElement(MisClases))

    await waitFor(() => {
      expect(screen.getByText('Pádel 1')).toBeInTheDocument()
    })

    // Expandir
    const botonTarjeta = screen.getByText('Pádel 1').closest('button') as HTMLElement
    fireEvent.click(botonTarjeta)

    await waitFor(() => {
      expect(screen.getByText('Cancelar grupo')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Cancelar grupo'))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Confirmar cancelación'))

    await waitFor(() => {
      const llamadas = (global.fetch as ReturnType<typeof vi.fn>).mock.calls
      const llamadaDelete = llamadas.find(
        (call) =>
          typeof call[0] === 'string' &&
          call[0].includes('/api/instructor/reservas-recurrentes/g1') &&
          call[1]?.method === 'DELETE'
      )
      expect(llamadaDelete).toBeDefined()
    })
  })

  it('debería cerrar el dialog y recargar la lista tras cancelación exitosa', async () => {
    mockSesionInstructor()

    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ grupos: [grupoActivo], proximasSesiones: [] }),
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ grupos: [], proximasSesiones: [] }),
      } as any)

    render(React.createElement(MisClases))

    await waitFor(() => {
      expect(screen.getByText('Pádel 1')).toBeInTheDocument()
    })

    // Expandir
    const botonTarjeta = screen.getByText('Pádel 1').closest('button') as HTMLElement
    fireEvent.click(botonTarjeta)

    await waitFor(() => {
      expect(screen.getByText('Cancelar grupo')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Cancelar grupo'))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Confirmar cancelación'))

    // Tras la cancelación exitosa el dialog debe cerrarse y la lista recargarse
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(screen.getByText('No hay clases creadas')).toBeInTheDocument()
    })
  })
})
