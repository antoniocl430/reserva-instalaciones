/**
 * Tests para la página de admin de festivos — /admin/(panel)/festivos/page.tsx
 * TDD: tests escritos ANTES de implementar la página
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import React from "react"

global.fetch = vi.fn()
global.confirm = vi.fn(() => true)

vi.mock("@/components/ui/select", () => ({
  Select: ({ children, value, onValueChange }: { children: React.ReactNode; value?: string; onValueChange?: (v: string) => void }) =>
    React.createElement("select", { "data-testid": "select-mock", value, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onValueChange?.(e.target.value) }, children),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children),
  SelectValue: ({ placeholder }: { placeholder?: string }) => React.createElement("span", null, placeholder),
  SelectContent: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children),
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) =>
    React.createElement("option", { value }, children),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/admin/festivos",
}))

const festivoNavidad = {
  id: "festivo-1",
  fecha: "2026-12-25T00:00:00.000Z",
  nombre: "Navidad",
  repetirAnual: false,
  creadoEn: "2026-01-01T00:00:00.000Z",
}

const festivoAnual = {
  id: "festivo-2",
  fecha: "2026-01-01T00:00:00.000Z",
  nombre: "Año Nuevo",
  repetirAnual: true,
  creadoEn: "2026-01-01T00:00:00.000Z",
}

import PaginaFestivos from "@/app/admin/(panel)/festivos/page"

describe("PaginaAdminFestivos", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("muestra skeleton mientras carga", () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ festivos: [] }),
    })
    render(React.createElement(PaginaFestivos))
    expect(document.querySelector(".animate-pulse")).toBeTruthy()
  })

  it("muestra la lista de festivos tras cargar", async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ festivos: [festivoNavidad, festivoAnual] }),
    })
    render(React.createElement(PaginaFestivos))
    await waitFor(() => {
      expect(screen.getByText("Navidad")).toBeInTheDocument()
      expect(screen.getByText("Año Nuevo")).toBeInTheDocument()
    })
  })

  it("muestra badge 'Anual' para festivos con repetirAnual=true", async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ festivos: [festivoAnual] }),
    })
    render(React.createElement(PaginaFestivos))
    await waitFor(() => {
      expect(screen.getByText("Anual")).toBeInTheDocument()
    })
  })

  it("muestra mensaje cuando no hay festivos", async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ festivos: [] }),
    })
    render(React.createElement(PaginaFestivos))
    await waitFor(() => {
      expect(screen.getByText(/no hay festivos/i)).toBeInTheDocument()
    })
  })

  it("abre el dialog al pulsar 'Añadir festivo'", async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ festivos: [] }),
    })
    render(React.createElement(PaginaFestivos))
    await waitFor(() => screen.getByText(/añadir festivo/i))
    fireEvent.click(screen.getByText(/añadir festivo/i))
    await waitFor(() => {
      expect(screen.getByText(/nuevo festivo/i)).toBeInTheDocument()
    })
  })

  it("elimina un festivo al pulsar el botón eliminar y confirmar", async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ festivos: [festivoNavidad] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ festivos: [] }),
      })

    render(React.createElement(PaginaFestivos))
    await waitFor(() => screen.getByText("Navidad"))

    const botones = screen.getAllByRole("button", { name: /eliminar/i })
    fireEvent.click(botones[0])

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("festivo-1"),
        expect.objectContaining({ method: "DELETE" })
      )
    })
  })

  it("muestra botón para importar festivos nacionales", async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ festivos: [] }),
    })
    render(React.createElement(PaginaFestivos))
    await waitFor(() => {
      expect(screen.getByText(/importar festivos/i)).toBeInTheDocument()
    })
  })
})
