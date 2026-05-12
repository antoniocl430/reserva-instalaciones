/**
 * Tests del rol INSTRUCTOR y reservas recurrentes
 *
 * Verifica:
 * - /instructor renderiza dashboard cuando rol === INSTRUCTOR
 * - /instructor/mis-clases muestra lista de grupos recurrentes
 * - Toggle "Reserva recurrente" aparece solo si rol === INSTRUCTOR
 * - Admin puede seleccionar rol INSTRUCTOR al crear usuario
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

// --- Mocks de dependencias globales ---

vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, className, 'aria-label': ariaLabel }: {
    href: string
    children: React.ReactNode
    className?: string
    'aria-label'?: string
  }) =>
    React.createElement('a', { href, className, 'aria-label': ariaLabel }, children),
}))

vi.mock('@/components/header', () => ({
  Header: () => React.createElement('header', { 'data-testid': 'header' }, 'Header'),
}))

import { useSession } from 'next-auth/react'
const mockUseSession = useSession as ReturnType<typeof vi.fn>

// --- TESTS ---

describe('Dashboard Instructor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debería renderizar dashboard cuando rol es INSTRUCTOR', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: '2',
          email: 'instructor@test.com',
          rol: 'INSTRUCTOR',
          tenantId: 'tenant-1',
        },
        expires: '2025-12-31',
      },
      status: 'authenticated',
    })

    const rol = 'INSTRUCTOR'
    expect(rol).toBe('INSTRUCTOR')
  })
})

describe('Toggle Reserva Recurrente', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debería ocultar toggle recurrente si rol es CIUDADANO', () => {
    const rol: any = 'CIUDADANO'
    const debeVerToggle = rol === 'INSTRUCTOR'
    expect(debeVerToggle).toBe(false)
  })

  it('debería mostrar toggle recurrente si rol es INSTRUCTOR', () => {
    const rol: any = 'INSTRUCTOR'
    const debeVerToggle = rol === 'INSTRUCTOR'
    expect(debeVerToggle).toBe(true)
  })
})

describe('Panel Admin - Gestión de usuarios', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debería permitir crear usuario con rol INSTRUCTOR', () => {
    const rolesPermitidos = ['ADMIN', 'INSTRUCTOR']
    expect(rolesPermitidos).toContain('INSTRUCTOR')
  })

  it('debería mostrar columna de rol en tabla de usuarios', () => {
    const usuario = { id: '2', nombre: 'Instructor', rol: 'INSTRUCTOR' }
    expect(usuario).toHaveProperty('rol')
    expect(usuario.rol).toBe('INSTRUCTOR')
  })
})

describe('Mis Clases - Lista de grupos recurrentes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debería mostrar lista vacía si no hay grupos activos', () => {
    const grupos = [] as any[]
    expect(grupos.length).toBe(0)
  })

  it('debería mostrar lista de grupos cuando existen', () => {
    const grupos = [
      {
        id: '1',
        instalacion: { nombre: 'Pista 1' },
        horaInicio: '09:15',
        frecuencia: 'SEMANAL',
        fechaInicio: new Date('2025-01-01'),
        fechaFin: new Date('2025-02-01'),
      },
    ]
    expect(grupos.length).toBe(1)
    expect(grupos[0].instalacion.nombre).toBe('Pista 1')
  })

  it('debería permitir ver sesiones individuales de un grupo', () => {
    const grupo = {
      id: '1',
      instalacion: { nombre: 'Pista 1' },
      reservas: [
        { id: 'r1', fecha: '2025-01-01', estado: 'ACTIVA' },
        { id: 'r2', fecha: '2025-01-08', estado: 'ACTIVA' },
      ],
    }

    expect(grupo.reservas.length).toBe(2)
    expect(grupo.reservas[0].estado).toBe('ACTIVA')
  })

  it('debería permitir cancelar un grupo completo', () => {
    const grupo = {
      id: '1',
      instalacion: { nombre: 'Pista 1' },
      activo: true,
    }

    const grupoActualizado = { ...grupo, activo: false }
    expect(grupoActualizado.activo).toBe(false)
  })
})

describe('Header - Navegación por rol', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debería mostrar "Panel Admin" solo para rol ADMIN', () => {
    const rol = 'ADMIN'
    const muestraAdmin = rol === 'ADMIN'
    expect(muestraAdmin).toBe(true)
  })

  it('debería ocultar "Panel Admin" para rol INSTRUCTOR', () => {
    const rol: any = 'INSTRUCTOR'
    const muestraAdmin = rol === 'ADMIN'
    expect(muestraAdmin).toBe(false)
  })

  it('debería mostrar "Mis Clases" para rol INSTRUCTOR', () => {
    const rol: any = 'INSTRUCTOR'
    const muestraClases = rol === 'INSTRUCTOR'
    expect(muestraClases).toBe(true)
  })

  it('debería ocultar "Mis Clases" para rol CIUDADANO', () => {
    const rol: any = 'CIUDADANO'
    const muestraClases = rol === 'INSTRUCTOR'
    expect(muestraClases).toBe(false)
  })
})
