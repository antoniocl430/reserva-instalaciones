/**
 * Tests de la página /cerrar-sesion
 *
 * Página personalizada en español que sustituye a la plantilla por
 * defecto de NextAuth (en inglés) en /api/auth/signout — H9 de la
 * auditoría UX.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import React from "react"

const mockSignOut = vi.fn()
vi.mock("next-auth/react", () => ({
  signOut: (...args: unknown[]) => mockSignOut(...args),
}))

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    React.createElement("a", { href, className }, children),
}))

import PaginaCerrarSesion from "@/app/cerrar-sesion/page"

describe("PaginaCerrarSesion", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSignOut.mockResolvedValue(undefined)
  })

  it("debería mostrar el texto de confirmación en español", () => {
    render(<PaginaCerrarSesion />)

    expect(screen.getByRole("heading", { name: /cerrar sesión/i })).toBeInTheDocument()
    expect(screen.getByText(/¿seguro que quieres cerrar sesión\?/i)).toBeInTheDocument()
  })

  it("debería llamar a signOut al pulsar el botón de confirmación", async () => {
    render(<PaginaCerrarSesion />)

    fireEvent.click(screen.getByRole("button", { name: /cerrar sesión/i }))

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledWith(expect.objectContaining({ callbackUrl: "/" }))
    })
  })

  it("debería mostrar un enlace para cancelar y volver al inicio", () => {
    render(<PaginaCerrarSesion />)

    const enlaceCancelar = screen.getByRole("link", { name: /cancelar/i })
    expect(enlaceCancelar).toHaveAttribute("href", "/")
  })
})
