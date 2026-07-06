/**
 * Tests de `generateMetadata` en src/app/layout.tsx
 *
 * Verifica que el título de la pestaña cae al valor por defecto
 * cuando la configuración del tenant guarda una cadena vacía ("")
 * en vez de `null`/`undefined` (caso no cubierto por el operador `??`).
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// --- Mocks de dependencias ---

const mockHeaders = vi.fn()
vi.mock("next/headers", () => ({
  headers: () => mockHeaders(),
}))

const mockObtenerTenantPorSlug = vi.fn()
vi.mock("@/lib/tenant", () => ({
  extraerSlugDelHost: (host: string) => host.split(".")[0],
  obtenerTenantPorSlug: (slug: string) => mockObtenerTenantPorSlug(slug),
}))

// next/font/google requiere la caché de fuentes de Next.js — no disponible en Vitest
vi.mock("next/font/google", () => ({
  Inter: () => ({ className: "inter-mock" }),
}))

import { generateMetadata } from "@/app/layout"

describe("generateMetadata", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHeaders.mockReturnValue({ get: () => "sevilla.midominio.es" })
  })

  it("debería usar el título por defecto cuando configuracion.metadata.title es una cadena vacía", async () => {
    mockObtenerTenantPorSlug.mockResolvedValue({
      municipio: "Sevilla",
      configuracion: JSON.stringify({ metadata: { title: "" } }),
    })

    const metadata = await generateMetadata()

    expect((metadata.title as { default: string }).default).toBe(
      "Reservas Deportivas — Sevilla"
    )
  })

  it("debería usar el título guardado cuando configuracion.metadata.title tiene contenido", async () => {
    mockObtenerTenantPorSlug.mockResolvedValue({
      municipio: "Sevilla",
      configuracion: JSON.stringify({ metadata: { title: "Deportes Sevilla" } }),
    })

    const metadata = await generateMetadata()

    expect((metadata.title as { default: string }).default).toBe("Deportes Sevilla")
  })

  it("debería usar la descripción por defecto cuando configuracion.metadata.description es una cadena vacía", async () => {
    mockObtenerTenantPorSlug.mockResolvedValue({
      municipio: "Sevilla",
      configuracion: JSON.stringify({ metadata: { description: "" } }),
    })

    const metadata = await generateMetadata()

    expect(metadata.description).toBe(
      "Sistema de reservas de instalaciones deportivas municipales"
    )
  })
})
