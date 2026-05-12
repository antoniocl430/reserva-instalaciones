// Tipo global para el evento de instalación PWA
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<{ outcome: 'accepted' | 'dismissed' }>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

import { render, screen, fireEvent, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import InstalarPWA from '@/components/InstalarPWA'

// Helper para simular matchMedia
function mockMatchMedia(standalone: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(display-mode: standalone)' ? standalone : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

describe('InstalarPWA', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mockMatchMedia(false)
    // Simular que NO es iOS por defecto
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      value: 'Mozilla/5.0 (Linux; Android 12) Chrome/120',
    })
  })

  it('muestra banner cuando beforeinstallprompt está disponible', async () => {
    render(<InstalarPWA />)
    await act(async () => {
      const evento = new Event('beforeinstallprompt') as BeforeInstallPromptEvent
      ;(evento as any).prompt = vi.fn().mockResolvedValue({ outcome: 'accepted' })
      ;(evento as any).userChoice = Promise.resolve({ outcome: 'accepted' })
      window.dispatchEvent(evento)
    })
    expect(screen.getByRole('button', { name: /instalar/i })).toBeInTheDocument()
  })

  it('no muestra nada en modo standalone', () => {
    mockMatchMedia(true)
    render(<InstalarPWA />)
    expect(screen.queryByText(/instalar/i)).not.toBeInTheDocument()
  })

  it('muestra instrucciones iOS en Safari/iOS', async () => {
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15 Safari/604.1',
    })
    render(<InstalarPWA />)
    // En iOS no hay beforeinstallprompt, se muestra instrucción manual
    await act(async () => {}) // esperar efectos
    expect(screen.getByText(/compartir/i)).toBeInTheDocument()
  })

  it('oculta banner al pulsar descartar', async () => {
    render(<InstalarPWA />)
    await act(async () => {
      const evento = new Event('beforeinstallprompt') as BeforeInstallPromptEvent
      ;(evento as any).prompt = vi.fn().mockResolvedValue({ outcome: 'dismissed' })
      ;(evento as any).userChoice = Promise.resolve({ outcome: 'dismissed' })
      window.dispatchEvent(evento)
    })
    const botonDescartar = screen.getByLabelText(/cerrar/i)
    fireEvent.click(botonDescartar)
    expect(screen.queryByRole('button', { name: /instalar/i })).not.toBeInTheDocument()
  })
})
