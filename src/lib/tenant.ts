/**
 * Helper de resolución de tenant
 * Funciones para identificar el ayuntamiento (tenant) a partir del host HTTP
 * y para recuperar sus datos desde la base de datos.
 */

import { prisma } from "./prisma"
import type { Tenant } from "@prisma/client"

// Slug de fallback para desarrollo local — siempre existe en BD
const SLUG_DESARROLLO = "desarrollo"

/**
 * Extrae el slug del tenant desde el host de la petición HTTP.
 *
 * Reglas de resolución:
 *   - localhost o 127.0.0.1 (con o sin puerto)  → "desarrollo"
 *   - reservas.ayto-SLUG.es                     → SLUG
 *   - cualquier otro host no reconocido          → "desarrollo" (fallback seguro)
 *
 * @example
 *   extraerSlugDelHost("localhost:3000")          → "desarrollo"
 *   extraerSlugDelHost("reservas.ayto-sevilla.es") → "sevilla"
 *   extraerSlugDelHost("ejemplo.com")             → "desarrollo"
 */
export function extraerSlugDelHost(host: string): string {
  if (!host) return SLUG_DESARROLLO

  // Eliminar el puerto si existe (ej: "localhost:3000" → "localhost")
  const hostSinPuerto = host.split(":")[0]

  // Hosts de desarrollo local
  if (hostSinPuerto === "localhost" || hostSinPuerto === "127.0.0.1") {
    return SLUG_DESARROLLO
  }

  // Formato de producción: "reservas.ayto-SLUG.es"
  // Ej: "reservas.ayto-sevilla.es" → partes: ["reservas", "ayto-sevilla", "es"]
  const partes = hostSinPuerto.split(".")
  for (const parte of partes) {
    if (parte.startsWith("ayto-")) {
      // Extraer el slug: "ayto-sevilla" → "sevilla"
      return parte.slice("ayto-".length)
    }
  }

  // Fallback: host no reconocido → desarrollo
  return SLUG_DESARROLLO
}

/**
 * Obtiene el Tenant completo desde la base de datos por su slug.
 * Solo devuelve tenants con estado ACTIVO.
 *
 * @param slug  Slug del tenant (ej: "sevilla", "desarrollo")
 * @returns     El Tenant si existe y está activo, null en caso contrario
 */
export async function obtenerTenantPorSlug(slug: string): Promise<Tenant | null> {
  return prisma.tenant.findFirst({
    where: { slug, estado: "ACTIVO" },
  })
}

/**
 * Obtiene solo el ID del tenant por su slug (más eficiente que obtenerTenantPorSlug).
 * Solo devuelve tenants con estado ACTIVO.
 *
 * @param slug  Slug del tenant (ej: "sevilla", "desarrollo")
 * @returns     El ID del tenant si existe y está activo, null en caso contrario
 */
export async function obtenerTenantIdPorSlug(slug: string): Promise<string | null> {
  const tenant = await prisma.tenant.findFirst({
    where: { slug, estado: "ACTIVO" },
    select: { id: true },
  })
  return tenant?.id ?? null
}
