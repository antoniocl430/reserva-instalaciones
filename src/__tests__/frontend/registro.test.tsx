/**
 * Tests del componente PaginaRegistro
 *
 * Estrategia: mockeamos next-auth/react, next/navigation y fetch global.
 * Verificamos el checkbox de privacidad, los enlaces legales y la validación.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

// --- Mocks ---

vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
}))

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
    target,
  }: {
    href: string
    children: React.ReactNode
    className?: string
    target?: string
  }) => React.createElement('a', { href, className, target }, children),
}))

import PaginaRegistro from '@/app/registro/page'

describe('PaginaRegistro', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Resetear window.location.search
    delete (window as any).location
    window.location = { search: '' } as any
    global.fetch = vi.fn()
  })

  it('debería renderizar el formulario de registro', () => {
    render(React.createElement(PaginaRegistro))
    // El h1 contiene "Crear cuenta" — usamos selector de heading
    expect(screen.getByRole('heading', { name: /Crear cuenta/i })).toBeInTheDocument()
  })

  it('debería renderizar el checkbox de aceptación de privacidad', () => {
    render(React.createElement(PaginaRegistro))
    // shadcn/ui Checkbox renderiza un <button role="checkbox">, no un <input>
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeInTheDocument()
    expect(checkbox.id).toBe('aceptaPrivacidad')
  })

  it('debería contener un enlace a /privacidad en el checkbox de privacidad', () => {
    render(React.createElement(PaginaRegistro))
    const enlacesPrivacidad = screen.getAllByRole('link', { name: /política de privacidad/i })
    expect(enlacesPrivacidad.length).toBeGreaterThanOrEqual(1)
    expect(enlacesPrivacidad[0]).toHaveAttribute('href', '/privacidad')
  })

  it('debería contener un enlace a /legal en el área del checkbox de privacidad', () => {
    render(React.createElement(PaginaRegistro))
    const enlaceLegal = screen.getByRole('link', { name: /aviso legal/i })
    expect(enlaceLegal).toBeInTheDocument()
    expect(enlaceLegal).toHaveAttribute('href', '/legal')
  })

  it('debería mostrar el placeholder de contraseña con mínimo 8 caracteres', () => {
    render(React.createElement(PaginaRegistro))
    const inputPassword = document.querySelector('#password') as HTMLInputElement
    expect(inputPassword.placeholder).toBe('Mínimo 8 caracteres')
  })

  it('debería mostrar error si la contraseña tiene menos de 8 caracteres', async () => {
    render(React.createElement(PaginaRegistro))

    // Rellenar nombre y email mínimos
    fireEvent.change(screen.getByLabelText(/nombre completo/i), {
      target: { value: 'Test Usuario' },
    })
    fireEvent.change(screen.getByLabelText(/^email$/i), {
      target: { value: 'test@test.com' },
    })
    fireEvent.change(document.querySelector('#password') as HTMLInputElement, {
      target: { value: 'corta' },
    })
    fireEvent.change(document.querySelector('#confirmar') as HTMLInputElement, {
      target: { value: 'corta' },
    })

    // Marcar el checkbox de privacidad
    fireEvent.click(document.querySelector('#aceptaPrivacidad') as HTMLInputElement)

    const form = document.querySelector('form') as HTMLFormElement
    fireEvent.submit(form)

    const errorElement = await screen.findByRole('alert')
    expect(errorElement.textContent).toMatch(/8 caracteres/i)
  })

  it('Si hay callbackUrl en params, redirige a esa URL tras registro exitoso', async () => {
    window.location.search = '?callbackUrl=%2Fpistas'
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: 'u123' }),
      })
    ) as any

    render(React.createElement(PaginaRegistro))

    // Rellenar formulario
    fireEvent.change(screen.getByLabelText(/nombre completo/i), {
      target: { value: 'Nuevo Usuario' },
    })
    fireEvent.change(screen.getByLabelText(/^email$/i), {
      target: { value: 'nuevo@example.com' },
    })
    fireEvent.change(document.querySelector('#password') as HTMLInputElement, {
      target: { value: 'password123' },
    })
    fireEvent.change(document.querySelector('#confirmar') as HTMLInputElement, {
      target: { value: 'password123' },
    })
    fireEvent.click(document.querySelector('#aceptaPrivacidad') as HTMLInputElement)

    fireEvent.click(screen.getByRole('button', { name: /crear cuenta/i }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/pistas')
    })
  })

  it('Si callbackUrl es inválida, redirige a /dashboard tras registro', async () => {
    window.location.search = '?callbackUrl=https://evil.com'
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: 'u123' }),
      })
    ) as any

    render(React.createElement(PaginaRegistro))

    fireEvent.change(screen.getByLabelText(/nombre completo/i), {
      target: { value: 'Nuevo Usuario' },
    })
    fireEvent.change(screen.getByLabelText(/^email$/i), {
      target: { value: 'nuevo@example.com' },
    })
    fireEvent.change(document.querySelector('#password') as HTMLInputElement, {
      target: { value: 'password123' },
    })
    fireEvent.change(document.querySelector('#confirmar') as HTMLInputElement, {
      target: { value: 'password123' },
    })
    fireEvent.click(document.querySelector('#aceptaPrivacidad') as HTMLInputElement)

    fireEvent.click(screen.getByRole('button', { name: /crear cuenta/i }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })
})
