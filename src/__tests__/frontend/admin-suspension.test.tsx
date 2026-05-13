/**
 * Tests TDD para la funcionalidad de suspensión en la página de usuarios del admin.
 * Ruta: /admin/(panel)/usuarios/page.tsx
 *
 * Cubre:
 * - Badge "Suspendido hasta..." visible para usuario suspendido con fecha futura
 * - Badge de no-shows visible cuando noShows > 0
 * - Botón "Suspender" visible para usuario sin suspensión activa
 * - Botón "Levantar suspensión" visible para usuario con suspensión activa
 * - Dialog de suspensión requiere fecha y motivo
 * - Al confirmar suspensión: llama a PATCH /api/admin/usuarios/[id]/suspender
 * - Al levantar: llama a PATCH /api/admin/usuarios/[id]/levantar-suspension
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import React from 'react'

// Mock de next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/admin/usuarios',
}))

// Mock de next-auth/react
vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { id: 'admin-99', rol: 'ADMIN' } },
    status: 'authenticated',
  }),
}))

// Mock de fetch global
global.fetch = vi.fn()

// ── Datos de prueba ──────────────────────────────────────────────────────────

// Fecha futura para suspensión (en 14 días)
const fechaSuspensionFutura = new Date()
fechaSuspensionFutura.setDate(fechaSuspensionFutura.getDate() + 14)

// Fecha pasada (ayer) — suspensión ya vencida
const fechaSuspensionPasada = new Date()
fechaSuspensionPasada.setDate(fechaSuspensionPasada.getDate() - 1)

const usuarioSinSuspension = {
  id: 'usuario-1',
  nombre: 'Ana García',
  email: 'ana@test.com',
  rol: 'CIUDADANO',
  creadoEn: new Date().toISOString(),
  noShows: 0,
  suspendidoHasta: null,
  motivoSuspension: null,
}

const usuarioConNoShows = {
  id: 'usuario-2',
  nombre: 'Luis Martín',
  email: 'luis@test.com',
  rol: 'CIUDADANO',
  creadoEn: new Date().toISOString(),
  noShows: 2,
  suspendidoHasta: null,
  motivoSuspension: null,
}

const usuarioSuspendido = {
  id: 'usuario-3',
  nombre: 'Carmen López',
  email: 'carmen@test.com',
  rol: 'CIUDADANO',
  creadoEn: new Date().toISOString(),
  noShows: 3,
  suspendidoHasta: fechaSuspensionFutura.toISOString(),
  motivoSuspension: 'Tres no-shows consecutivos',
}

// Importar después de los mocks
import PaginaUsuariosAdmin from '@/app/admin/(panel)/usuarios/page'

describe('PaginaUsuariosAdmin — funcionalidad de suspensión', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Test 1: Badge "Suspendido hasta..." visible para usuario suspendido

  it('debería mostrar badge "Suspendido hasta..." para usuario con suspensión activa', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ usuarios: [usuarioSuspendido] }),
    })

    render(<PaginaUsuariosAdmin />)

    await waitFor(() => {
      expect(screen.getByText('Carmen López')).toBeInTheDocument()
    })

    expect(screen.getByText(/Suspendido hasta/i)).toBeInTheDocument()
  })

  // ── Test 2: Badge de no-shows visible cuando noShows > 0

  it('debería mostrar badge de no-shows cuando noShows > 0', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ usuarios: [usuarioConNoShows] }),
    })

    render(<PaginaUsuariosAdmin />)

    await waitFor(() => {
      expect(screen.getByText('Luis Martín')).toBeInTheDocument()
    })

    expect(screen.getByText(/2 no-shows/i)).toBeInTheDocument()
  })

  // ── Test 3: Botón "Suspender" visible para usuario sin suspensión activa

  it('debería mostrar botón "Suspender" para usuario sin suspensión activa', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ usuarios: [usuarioSinSuspension] }),
    })

    render(<PaginaUsuariosAdmin />)

    await waitFor(() => {
      expect(screen.getByText('Ana García')).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /Suspender/i })).toBeInTheDocument()
  })

  // ── Test 4: Botón "Levantar suspensión" visible para usuario suspendido

  it('debería mostrar botón "Levantar suspensión" para usuario con suspensión activa', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ usuarios: [usuarioSuspendido] }),
    })

    render(<PaginaUsuariosAdmin />)

    await waitFor(() => {
      expect(screen.getByText('Carmen López')).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /Levantar suspensión/i })).toBeInTheDocument()
  })

  // ── Test 5: Dialog de suspensión tiene campos de fecha y motivo

  it('debería mostrar dialog con campos de fecha y motivo al pulsar Suspender', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ usuarios: [usuarioSinSuspension] }),
    })

    render(<PaginaUsuariosAdmin />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Suspender/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Suspender/i }))

    await waitFor(() => {
      // El dialog debe tener un input de fecha
      expect(screen.getByLabelText(/Fecha fin/i)).toBeInTheDocument()
      // El dialog debe tener un input de motivo
      expect(screen.getByLabelText(/Motivo/i)).toBeInTheDocument()
    })
  })

  // ── Test 6: Al confirmar suspensión llama a PATCH /api/admin/usuarios/[id]/suspender

  it('debería llamar a PATCH /api/admin/usuarios/[id]/suspender al confirmar', async () => {
    // Primera llamada: cargar usuarios
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ usuarios: [usuarioSinSuspension] }),
    })
    // Segunda llamada: PATCH suspender
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    })
    // Tercera llamada: recargar usuarios
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ usuarios: [] }),
    })

    render(<PaginaUsuariosAdmin />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Suspender/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Suspender/i }))

    await waitFor(() => {
      expect(screen.getByLabelText(/Fecha fin/i)).toBeInTheDocument()
    })

    // Rellenar el formulario
    const inputFecha = screen.getByLabelText(/Fecha fin/i)
    const inputMotivo = screen.getByLabelText(/Motivo/i)
    const fechaFutura = new Date()
    fechaFutura.setDate(fechaFutura.getDate() + 7)
    const fechaStr = fechaFutura.toISOString().split('T')[0]

    fireEvent.change(inputFecha, { target: { value: fechaStr } })
    fireEvent.change(inputMotivo, { target: { value: 'Motivo de prueba' } })

    // Confirmar
    const botonConfirmar = screen.getByRole('button', { name: /Confirmar suspensión/i })
    fireEvent.click(botonConfirmar)

    await waitFor(() => {
      const llamadas = (global.fetch as any).mock.calls
      const llamadaPatch = llamadas.find(
        (call: any[]) =>
          call[0].includes(`/api/admin/usuarios/${usuarioSinSuspension.id}/suspender`) &&
          call[1]?.method === 'PATCH'
      )
      expect(llamadaPatch).toBeDefined()
      const body = JSON.parse(llamadaPatch[1].body)
      expect(body).toHaveProperty('suspendidoHasta')
      expect(body).toHaveProperty('motivoSuspension', 'Motivo de prueba')
    })
  })

  // ── Test 7: Al levantar suspensión llama a PATCH /api/admin/usuarios/[id]/levantar-suspension

  it('debería llamar a PATCH /api/admin/usuarios/[id]/levantar-suspension al confirmar', async () => {
    // Primera llamada: cargar usuarios
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ usuarios: [usuarioSuspendido] }),
    })
    // Segunda llamada: PATCH levantar
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    })
    // Tercera llamada: recargar usuarios
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ usuarios: [] }),
    })

    render(<PaginaUsuariosAdmin />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Levantar suspensión/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Levantar suspensión/i }))

    // Confirmar en el dialog
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Confirmar/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Confirmar/i }))

    await waitFor(() => {
      const llamadas = (global.fetch as any).mock.calls
      const llamadaPatch = llamadas.find(
        (call: any[]) =>
          call[0].includes(`/api/admin/usuarios/${usuarioSuspendido.id}/levantar-suspension`) &&
          call[1]?.method === 'PATCH'
      )
      expect(llamadaPatch).toBeDefined()
    })
  })
})
