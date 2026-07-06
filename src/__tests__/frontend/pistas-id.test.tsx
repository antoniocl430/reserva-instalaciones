/**
 * Tests del componente PaginaDetallePista (Client Component)
 *
 * Estrategia: mockeamos fetch global, useRouter y los componentes shadcn/ui
 * que usan Radix Portal (Dialog). Renderizamos el componente con props fijas
 * y simulamos interacciones del usuario.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import React from 'react'
import { useSession } from 'next-auth/react'

// --- Mocks ---

const mockPush = vi.fn()
const mockBack = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  useParams: () => ({ id: 'pista-1' }),
  usePathname: () => '/pistas/pista-1',
}))

// Mock de next-auth/react para que useSession no requiera SessionProvider
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({
    data: { user: { id: 'usuario-123', name: 'Ana García', rol: 'CIUDADANO' } },
    status: 'authenticated',
  })),
}))

// Mock del hook useToast para verificar las notificaciones toast
const mockToast = vi.fn()
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}))

// Mock de shadcn Dialog: renderiza el contenido directamente sin portal
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

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant }: {
    children: React.ReactNode
    onClick?: () => void
    disabled?: boolean
    variant?: string
  }) => React.createElement('button', { onClick, disabled, 'data-variant': variant }, children),
}))

vi.mock('@/lib/utils', () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(' '),
}))

// Mock de next/link para que renderice como <a> con el href correcto
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    React.createElement('a', { href, className }, children),
}))

// Pista ficticia de ejemplo
const pistaFicticia = {
  id: 'pista-1',
  nombre: 'Pista de Pádel 1',
  tipo: 'PADEL',
  descripcion: 'Pista techada',
  activa: true,
  horario: 'Lun-Dom: 8:00-13:00 y 16:45-20:30',
}

// 7 slots fijos del sistema (actualización 2026-03-25)
const sieteSlotsDelSistema = [
  { horaInicio: '08:00', horaFin: '09:15', estado: 'libre' as const },
  { horaInicio: '09:15', horaFin: '10:30', estado: 'libre' as const },
  { horaInicio: '10:30', horaFin: '11:45', estado: 'libre' as const },
  { horaInicio: '11:45', horaFin: '13:00', estado: 'libre' as const },
  { horaInicio: '16:45', horaFin: '18:00', estado: 'libre' as const },
  { horaInicio: '18:00', horaFin: '19:15', estado: 'libre' as const },
  { horaInicio: '19:15', horaFin: '20:30', estado: 'libre' as const },
]

import PaginaDetallePista from '@/app/pistas/[id]/page'

describe('PaginaDetallePista', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockToast.mockClear()
    global.fetch = vi.fn()
  })

  it('debería mostrar el selector de fecha', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ instalaciones: [pistaFicticia] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slots: [] }),
      })

    render(React.createElement(PaginaDetallePista, { params: { id: 'pista-1' } }))

    await waitFor(() => {
      expect(screen.getByText('Selecciona una fecha')).toBeInTheDocument()
    })

    const inputFecha = document.querySelector('input[type="date"]')
    expect(inputFecha).toBeInTheDocument()
  })

  it('debería mostrar exactamente 7 slots (no 14)', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ instalaciones: [pistaFicticia] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slots: sieteSlotsDelSistema }),
      })

    render(React.createElement(PaginaDetallePista, { params: { id: 'pista-1' } }))

    await waitFor(() => {
      expect(screen.getByText('08:00–09:15')).toBeInTheDocument()
    })

    const slotsElements = screen.getAllByText(/\d{2}:\d{2}–\d{2}:\d{2}/)
    expect(slotsElements).toHaveLength(7)
  })

  it('debería mostrar el horario de la pista en la página de detalle', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ instalaciones: [pistaFicticia] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slots: [] }),
      })

    render(React.createElement(PaginaDetallePista, { params: { id: 'pista-1' } }))

    await waitFor(() => {
      expect(screen.getByText('Lun-Dom: 8:00-13:00 y 16:45-20:30')).toBeInTheDocument()
    })
  })

  it('debería mostrar los slots del día seleccionado', async () => {
    const slots = [
      { horaInicio: '09:00', horaFin: '10:00', estado: 'libre' as const },
      { horaInicio: '10:00', horaFin: '11:00', estado: 'ocupado' as const },
    ]

    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ instalaciones: [pistaFicticia] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slots }),
      })

    render(React.createElement(PaginaDetallePista, { params: { id: 'pista-1' } }))

    await waitFor(() => {
      expect(screen.getByText('09:00–10:00')).toBeInTheDocument()
    })

    expect(screen.getByText('10:00–11:00')).toBeInTheDocument()
  })

  it('debería marcar en verde los slots libres con la clase bg-green-50', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ instalaciones: [pistaFicticia] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slots: [{ horaInicio: '09:00', horaFin: '10:00', estado: 'libre' }] }),
      })

    render(React.createElement(PaginaDetallePista, { params: { id: 'pista-1' } }))

    await waitFor(() => {
      expect(screen.getByText('09:00–10:00')).toBeInTheDocument()
    })

    // "Disponible" aparece tanto en la leyenda como en el slot.
    // El que está en el slot es un <div class="text-xs opacity-70">
    const todasLasEtiquetas = screen.getAllByText('Disponible')
    const etiquetaEnSlot = todasLasEtiquetas.find(
      (el) => el.className.includes('text-xs') && el.className.includes('opacity-70')
    )!
    expect(etiquetaEnSlot).toBeDefined()
    const contenedorSlot = etiquetaEnSlot.parentElement!
    expect(contenedorSlot.className).toContain('bg-green-50')
  })

  it('debería marcar en rojo los slots ocupados con la clase bg-red-50', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ instalaciones: [pistaFicticia] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slots: [{ horaInicio: '10:00', horaFin: '11:00', estado: 'ocupado' }] }),
      })

    render(React.createElement(PaginaDetallePista, { params: { id: 'pista-1' } }))

    await waitFor(() => {
      expect(screen.getByText('10:00–11:00')).toBeInTheDocument()
    })

    // "Ocupado" aparece tanto en la leyenda como en el slot.
    // El que está en el slot es un <div class="text-xs opacity-70">
    const todasLasEtiquetas = screen.getAllByText('Ocupado')
    const etiquetaEnSlot = todasLasEtiquetas.find(
      (el) => el.className.includes('text-xs') && el.className.includes('opacity-70')
    )!
    expect(etiquetaEnSlot).toBeDefined()
    const contenedorSlot = etiquetaEnSlot.parentElement!
    expect(contenedorSlot.className).toContain('bg-red-50')
  })

  it('debería abrir el dialog de confirmación al hacer click en un slot libre', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ instalaciones: [pistaFicticia] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slots: [{ horaInicio: '09:00', horaFin: '10:00', estado: 'libre' }] }),
      })

    render(React.createElement(PaginaDetallePista, { params: { id: 'pista-1' } }))

    // El slot libre tiene role="button"
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /09:00/i })).toBeInTheDocument()
    })

    // Buscar el div con role="button" (el slot libre)
    const slotLibre = document.querySelector('[role="button"]')!
    fireEvent.click(slotLibre)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // El dialog muestra el título "Confirmar reserva" en un <h2>
    expect(screen.getAllByText('Confirmar reserva').length).toBeGreaterThanOrEqual(1)
  })

  it('debería llamar a POST /api/reservas al pulsar Confirmar reserva y confirmar', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ instalaciones: [pistaFicticia] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slots: [{ horaInicio: '09:00', horaFin: '10:00', estado: 'libre' }] }),
      })
      // Respuesta al POST /api/reservas
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'reserva-nueva-1' }),
      })
      // Segunda carga de disponibilidad tras reservar
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slots: [{ horaInicio: '09:00', horaFin: '10:00', estado: 'ocupado' }] }),
      })

    render(React.createElement(PaginaDetallePista, { params: { id: 'pista-1' } }))

    await waitFor(() => {
      expect(document.querySelector('[role="button"]')).toBeTruthy()
    })

    // Hacer click en el slot libre
    const slotLibre = document.querySelector('[role="button"]')!
    fireEvent.click(slotLibre)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // Hacer click en el botón "Confirmar reserva" del dialog (es el <button>, no el <h2>)
    const botonesConfirmar = screen.getAllByText('Confirmar reserva')
    const botonConfirmar = botonesConfirmar.find((el) => el.tagName === 'BUTTON')!
    expect(botonConfirmar).toBeDefined()
    fireEvent.click(botonConfirmar)

    await waitFor(() => {
      const llamadas = (global.fetch as ReturnType<typeof vi.fn>).mock.calls
      const llamadaPost = llamadas.find(
        (call) => call[0] === '/api/reservas' && call[1]?.method === 'POST'
      )
      expect(llamadaPost).toBeDefined()
    })
  })

  it('debería enviar instalacionId correcto en el cuerpo del POST al confirmar', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ instalaciones: [pistaFicticia] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slots: [{ horaInicio: '09:00', horaFin: '10:00', estado: 'libre' }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'reserva-nueva-1' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slots: [] }),
      })

    render(React.createElement(PaginaDetallePista, { params: { id: 'pista-1' } }))

    await waitFor(() => {
      expect(document.querySelector('[role="button"]')).toBeTruthy()
    })

    const slotLibre = document.querySelector('[role="button"]')!
    fireEvent.click(slotLibre)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    const botonesConfirmar = screen.getAllByText('Confirmar reserva')
    const botonConfirmar = botonesConfirmar.find((el) => el.tagName === 'BUTTON')!
    fireEvent.click(botonConfirmar)

    await waitFor(() => {
      const llamadas = (global.fetch as ReturnType<typeof vi.fn>).mock.calls
      const llamadaPost = llamadas.find(
        (call) => call[0] === '/api/reservas' && call[1]?.method === 'POST'
      )
      expect(llamadaPost).toBeDefined()
      const cuerpo = JSON.parse(llamadaPost![1].body)
      expect(cuerpo.instalacionId).toBe('pista-1')
      expect(cuerpo.horaInicio).toBe('09:00')
    })
  })

  it('debería mostrar un toast de éxito al completar una reserva correctamente', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ instalaciones: [pistaFicticia] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slots: [{ horaInicio: '09:00', horaFin: '10:00', estado: 'libre' }] }),
      })
      // Lista de espera del ciudadano (llamada al montar el componente)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ entradas: [] }),
      })
      // Respuesta al POST /api/reservas
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'reserva-nueva-1' }),
      })
      // Segunda carga de disponibilidad tras reservar
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slots: [{ horaInicio: '09:00', horaFin: '10:00', estado: 'ocupado' }] }),
      })

    render(React.createElement(PaginaDetallePista, { params: { id: 'pista-1' } }))

    await waitFor(() => {
      expect(document.querySelector('[role="button"]')).toBeTruthy()
    })

    // Abrir el dialog
    const slotLibre = document.querySelector('[role="button"]')!
    fireEvent.click(slotLibre)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // Confirmar la reserva
    const botonesConfirmar = screen.getAllByText('Confirmar reserva')
    const botonConfirmar = botonesConfirmar.find((el) => el.tagName === 'BUTTON')!
    fireEvent.click(botonConfirmar)

    // El toast de éxito debe haberse llamado con el título correcto
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.stringContaining('éxito') })
      )
    })

    // El banner inline verde NO debe existir en el DOM
    const bannerVerde = document.querySelector('.bg-green-50.border-green-200')
    // Puede existir el slot verde, pero no el banner de éxito con el texto de reserva
    const mensajeExito = screen.queryByText(/Reserva creada con éxito/)
    expect(mensajeExito).not.toBeInTheDocument()
  })

  it('debería mostrar mensaje de error si la API rechaza la reserva', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ instalaciones: [pistaFicticia] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slots: [{ horaInicio: '09:00', horaFin: '10:00', estado: 'libre' }] }),
      })
      // Lista de espera del ciudadano (llamada al montar el componente)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ entradas: [] }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Ya tienes una reserva activa de este tipo. Cancélala antes de hacer otra del mismo tipo' }),
      })

    render(React.createElement(PaginaDetallePista, { params: { id: 'pista-1' } }))

    await waitFor(() => {
      expect(document.querySelector('[role="button"]')).toBeTruthy()
    })

    const slotLibre = document.querySelector('[role="button"]')!
    fireEvent.click(slotLibre)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    const botonesConfirmar = screen.getAllByText('Confirmar reserva')
    const botonConfirmar = botonesConfirmar.find((el) => el.tagName === 'BUTTON')!
    fireEvent.click(botonConfirmar)

    await waitFor(() => {
      expect(screen.getByText(/Ya tienes una reserva activa de este tipo/i)).toBeInTheDocument()
    })
  })
})

describe('PaginaDetallePista — usuario anónimo (sin sesión)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockToast.mockClear()
    global.fetch = vi.fn()
    // Sobreescribir useSession para simular usuario no autenticado
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    } as ReturnType<typeof useSession>)
  })

  afterEach(() => {
    // Restaurar al estado autenticado por defecto
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: 'usuario-123', name: 'Ana García', rol: 'CIUDADANO' } },
      status: 'authenticated',
    } as ReturnType<typeof useSession>)
  })

  it('muestra el mensaje de invitación a registrarse cuando no hay sesión', async () => {
    // Solo 2 llamadas fetch: instalaciones + slots (sin 3ª de lista-espera porque no hay sesión)
    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ instalaciones: [pistaFicticia] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slots: sieteSlotsDelSistema }),
      })

    render(React.createElement(PaginaDetallePista, { params: { id: 'pista-1' } }))

    // Esperar a que cargue la pista (pueden aparecer en heading y breadcrumb)
    await waitFor(() => {
      expect(screen.getAllByText('Pista de Pádel 1').length).toBeGreaterThanOrEqual(1)
    })

    // Debe aparecer texto que invite al registro o a iniciar sesión
    // Buscamos en el texto completo del documento (incluyendo texto distribuido en nodos)
    const body = document.body.textContent ?? ''
    const tieneTextoInvitacion =
      /Consulta la disponibilidad/i.test(body) ||
      /sin registrarte/i.test(body) ||
      /crea tu cuenta/i.test(body) ||
      /sin cuenta/i.test(body)

    expect(tieneTextoInvitacion).toBe(true)
  })

  it('al hacer clic en slot libre sin sesión, muestra dialog de conversión en lugar de redirigir', async () => {
    // Solo 2 llamadas fetch: instalaciones + slots
    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ instalaciones: [pistaFicticia] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slots: [{ horaInicio: '09:00', horaFin: '10:00', estado: 'libre' }] }),
      })

    render(React.createElement(PaginaDetallePista, { params: { id: 'pista-1' } }))

    // Esperar a que aparezca el slot libre
    await waitFor(() => {
      expect(document.querySelector('[role="button"]')).toBeTruthy()
    })

    // Hacer clic en el slot libre
    const slotLibre = document.querySelector('[role="button"]')!
    fireEvent.click(slotLibre)

    // Debe aparecer un dialog
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // El dialog NO debe contener "Confirmar reserva" (eso es para autenticados)
    expect(screen.queryByText('Confirmar reserva')).not.toBeInTheDocument()

    // NO se debe haber llamado a router.push (no redirige al login directamente)
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('el dialog de conversión contiene enlace a /registro y a /login', async () => {
    // Solo 2 llamadas fetch: instalaciones + slots
    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ instalaciones: [pistaFicticia] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slots: [{ horaInicio: '09:00', horaFin: '10:00', estado: 'libre' }] }),
      })

    render(React.createElement(PaginaDetallePista, { params: { id: 'pista-1' } }))

    // Esperar a que aparezca el slot libre
    await waitFor(() => {
      expect(document.querySelector('[role="button"]')).toBeTruthy()
    })

    // Hacer clic en el slot libre para abrir el dialog de conversión
    const slotLibre = document.querySelector('[role="button"]')!
    fireEvent.click(slotLibre)

    // Esperar a que aparezca el dialog
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // Verificar que hay un enlace/botón que va a /registro
    const enlaceRegistro = document.querySelector('[href*="/registro"]')
    expect(enlaceRegistro).toBeInTheDocument()

    // Verificar que hay un enlace/botón que va a /login
    const enlaceLogin = document.querySelector('[href*="/login"]')
    expect(enlaceLogin).toBeInTheDocument()

    // Verificar que NO se llamó a router.push
    expect(mockPush).not.toHaveBeenCalled()
  })
})
