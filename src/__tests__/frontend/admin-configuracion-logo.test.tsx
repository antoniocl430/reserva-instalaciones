/**
 * Tests TDD para la feature "subir logo del ayuntamiento" en la página de configuración admin.
 * Ruta: /admin/(panel)/configuracion/page.tsx
 *
 * Cubre:
 *  1. Renderiza campo "Nombre del ayuntamiento" con valor cargado desde API
 *  2. Renderiza campo "Municipio" con valor cargado desde API
 *  3. Muestra <img> de preview cuando logoUrl está definido
 *  4. Muestra texto placeholder "Sin logo" cuando logoUrl es null
 *  5. Click en "Subir logo" activa el input file oculto
 *  6. Upload exitoso actualiza la imagen con la nueva URL
 *  7. Click "Eliminar logo" llama PATCH con { logoUrl: null }
 *  8. Error en upload muestra mensaje de error
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

// ─── Mocks necesarios ─────────────────────────────────────────────────────────

// Mock de next/navigation (requerido por páginas con router)
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/admin/configuracion',
}))

// Mock del componente Select de shadcn/ui para que sea manejable en tests
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, defaultValue, value }: {
    children: React.ReactNode
    onValueChange?: (val: string) => void
    defaultValue?: string
    value?: string
  }) => (
    <div data-testid="select-root" data-value={value ?? defaultValue}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, { onValueChange })
        }
        return child
      })}
    </div>
  ),
  SelectTrigger: ({ children, onValueChange, id }: {
    children: React.ReactNode
    onValueChange?: (val: string) => void
    id?: string
  }) => <div id={id} role="combobox">{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span>{placeholder}</span>
  ),
  SelectContent: ({ children, onValueChange }: {
    children: React.ReactNode
    onValueChange?: (val: string) => void
  }) => (
    <div>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, { onValueChange })
        }
        return child
      })}
    </div>
  ),
  SelectItem: ({ children, value, onValueChange }: {
    children: React.ReactNode
    value: string
    onValueChange?: (val: string) => void
  }) => (
    <button
      data-testid={`select-item-${value}`}
      onClick={() => onValueChange?.(value)}
    >
      {children}
    </button>
  ),
}))

// Mock de fetch global
global.fetch = vi.fn()

// ─── Respuesta base del GET /api/admin/configuracion ────────────────────────

const respuestaConLogo = {
  nombre: 'Ayuntamiento de Sevilla',
  municipio: 'Sevilla',
  logoUrl: 'data:image/png;base64,abc123',
  configuracion: { nombreServicio: 'Reservas Deportivas' },
}

const respuestaSinLogo = {
  nombre: 'Ayuntamiento de Sevilla',
  municipio: 'Sevilla',
  logoUrl: null,
  configuracion: { nombreServicio: 'Reservas Deportivas' },
}

// ─── Importar la página después de los mocks ─────────────────────────────────

import PaginaConfiguracion from '@/app/admin/(panel)/configuracion/page'

// ─── Suite de tests ───────────────────────────────────────────────────────────

describe('PaginaConfiguracion — sección Identidad del ayuntamiento (logo)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Test 1: Campo "Nombre del ayuntamiento" con valor cargado ─────────────

  it('debería renderizar el campo "Nombre del ayuntamiento" con el valor de la API', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => respuestaConLogo,
    })

    render(<PaginaConfiguracion />)

    await waitFor(() => {
      expect(screen.getByLabelText(/Nombre del ayuntamiento/i)).toBeInTheDocument()
    })

    const input = screen.getByLabelText(/Nombre del ayuntamiento/i) as HTMLInputElement
    expect(input.value).toBe('Ayuntamiento de Sevilla')
  })

  // ── Test 2: Campo "Municipio" con valor cargado ───────────────────────────

  it('debería renderizar el campo "Municipio" con el valor de la API', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => respuestaConLogo,
    })

    render(<PaginaConfiguracion />)

    await waitFor(() => {
      expect(screen.getByLabelText(/^Municipio$/i)).toBeInTheDocument()
    })

    const input = screen.getByLabelText(/^Municipio$/i) as HTMLInputElement
    expect(input.value).toBe('Sevilla')
  })

  // ── Test 3: Preview de logo cuando logoUrl está definido ──────────────────

  it('debería mostrar <img> de preview cuando logoUrl está definido', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => respuestaConLogo,
    })

    render(<PaginaConfiguracion />)

    await waitFor(() => {
      const img = screen.getByRole('img', { name: /logo/i })
      expect(img).toBeInTheDocument()
      expect(img).toHaveAttribute('src', 'data:image/png;base64,abc123')
    })
  })

  // ── Test 4: Placeholder "Sin logo" cuando logoUrl es null ────────────────

  it('debería mostrar texto "Sin logo" cuando logoUrl es null', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => respuestaSinLogo,
    })

    render(<PaginaConfiguracion />)

    await waitFor(() => {
      expect(screen.getByText(/Sin logo/i)).toBeInTheDocument()
    })

    // No debe haber imagen de logo
    expect(screen.queryByRole('img', { name: /logo/i })).not.toBeInTheDocument()
  })

  // ── Test 5: Click en "Subir logo" activa el input file ───────────────────

  it('debería activar el input file al hacer click en "Subir logo"', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => respuestaSinLogo,
    })

    render(<PaginaConfiguracion />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Subir logo/i })).toBeInTheDocument()
    })

    // Espiar el click del input file
    const inputFile = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(inputFile).not.toBeNull()
    const clickSpy = vi.spyOn(inputFile, 'click')

    fireEvent.click(screen.getByRole('button', { name: /Subir logo/i }))

    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  // ── Test 6: Upload exitoso actualiza la imagen ────────────────────────────

  it('debería actualizar la imagen tras un upload exitoso', async () => {
    // Primera llamada: GET configuración
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => respuestaSinLogo,
    })
    // Segunda llamada: POST /api/admin/logo
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ logoUrl: 'data:image/png;base64,nuevo' }),
    })

    render(<PaginaConfiguracion />)

    await waitFor(() => {
      expect(screen.getByText(/Sin logo/i)).toBeInTheDocument()
    })

    // Simular subida de archivo a través del input file
    const inputFile = document.querySelector('input[type="file"]') as HTMLInputElement
    const archivo = new File(['contenido'], 'logo.png', { type: 'image/png' })
    fireEvent.change(inputFile, { target: { files: [archivo] } })

    // La imagen debe aparecer con la nueva URL
    await waitFor(() => {
      const img = screen.getByRole('img', { name: /logo/i })
      expect(img).toHaveAttribute('src', 'data:image/png;base64,nuevo')
    })

    // El texto "Sin logo" ya no debe estar
    expect(screen.queryByText(/Sin logo/i)).not.toBeInTheDocument()
  })

  // ── Test 7: Click "Eliminar logo" llama PATCH con logoUrl: null ──────────

  it('debería llamar PATCH con { logoUrl: null } al hacer click en "Eliminar logo"', async () => {
    // Primera llamada: GET configuración (con logo)
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => respuestaConLogo,
    })
    // Segunda llamada: PATCH eliminar logo
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    })

    render(<PaginaConfiguracion />)

    // Esperar a que aparezca el botón eliminar (solo visible cuando hay logo)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Eliminar logo/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Eliminar logo/i }))

    await waitFor(() => {
      const llamadas = (global.fetch as any).mock.calls
      const llamadaEliminar = llamadas.find(
        (call: any[]) => call[1]?.method === 'PATCH' && call[0] === '/api/admin/configuracion'
      )
      expect(llamadaEliminar).toBeDefined()

      const body = JSON.parse(llamadaEliminar[1].body)
      expect(body).toHaveProperty('logoUrl', null)
    })

    // La imagen debe desaparecer
    await waitFor(() => {
      expect(screen.queryByRole('img', { name: /logo/i })).not.toBeInTheDocument()
    })
  })

  // ── Test 8: Error en upload muestra mensaje de error ─────────────────────

  it('debería mostrar mensaje de error cuando el upload falla con 400', async () => {
    // Primera llamada: GET configuración
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => respuestaSinLogo,
    })
    // Segunda llamada: POST /api/admin/logo → error 400
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Formato de imagen no válido' }),
    })

    render(<PaginaConfiguracion />)

    await waitFor(() => {
      expect(screen.getByText(/Sin logo/i)).toBeInTheDocument()
    })

    // Simular subida de archivo
    const inputFile = document.querySelector('input[type="file"]') as HTMLInputElement
    const archivo = new File(['contenido'], 'imagen.png', { type: 'image/png' })
    fireEvent.change(inputFile, { target: { files: [archivo] } })

    // Debe aparecer un mensaje de error
    await waitFor(() => {
      expect(screen.getByText(/Formato de imagen no válido/i)).toBeInTheDocument()
    })
  })
})
