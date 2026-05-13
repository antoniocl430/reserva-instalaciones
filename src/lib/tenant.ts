/**
 * Helper de resolución de tenant
 * Funciones para identificar el ayuntamiento (tenant) a partir del host HTTP
 * y para recuperar sus datos desde la base de datos.
 * También incluye helpers para parsear y mergear la configuración JSON del tenant.
 */

import type { Tenant } from "@prisma/client"

// ─── Tipos de configuración ───────────────────────────────────────────────────

/**
 * Estructura tipada del campo `configuracion` del Tenant (almacenado como JSON en BD)
 */
export interface ConfiguracionTenant {
  nombreServicio?: string
  colores?: {
    primario?: string
    secundario?: string
  }
  metadata?: {
    title?: string
    description?: string
  }
}

// ─── Helpers de configuración ─────────────────────────────────────────────────

/**
 * Parsea el campo `configuracion` (JSON string) del Tenant de forma segura.
 * Si el valor es null, una cadena vacía o JSON malformado, devuelve un objeto vacío.
 * Nunca lanza una excepción.
 *
 * @param configuracion  Valor crudo del campo `configuracion` del Tenant
 * @returns              Objeto ConfiguracionTenant parseado (puede ser {})
 */
export function parsearConfiguracion(configuracion: string | null): ConfiguracionTenant {
  if (!configuracion) return {}
  try {
    const parsed = JSON.parse(configuracion)
    // Asegurar que el resultado es un objeto plano, no un array ni un primitivo
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as ConfiguracionTenant
    }
    return {}
  } catch {
    return {}
  }
}

/**
 * Realiza un merge profundo de dos objetos ConfiguracionTenant.
 * Las claves del `override` sobreescriben las del `base`.
 * Para objetos anidados (colores, metadata) el merge es también profundo,
 * preservando las claves del base que no aparecen en el override.
 *
 * @param base      Configuración base (existente en BD)
 * @param override  Configuración parcial que llega del cliente
 * @returns         Nueva configuración merged
 */
export function mergearConfiguracion(
  base: ConfiguracionTenant,
  override: Partial<ConfiguracionTenant>
): ConfiguracionTenant {
  return {
    ...base,
    ...override,
    // Merge profundo del subobjeto colores
    colores:
      override.colores !== undefined
        ? { ...base.colores, ...override.colores }
        : base.colores,
    // Merge profundo del subobjeto metadata
    metadata:
      override.metadata !== undefined
        ? { ...base.metadata, ...override.metadata }
        : base.metadata,
  }
}

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
  const { prisma } = await import("./prisma")
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
  const { prisma } = await import("./prisma")
  const tenant = await prisma.tenant.findFirst({
    where: { slug, estado: "ACTIVO" },
    select: { id: true },
  })
  return tenant?.id ?? null
}
