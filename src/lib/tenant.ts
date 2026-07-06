/**
 * Helper de resolución de tenant
 * Funciones para identificar el ayuntamiento (tenant) a partir del host HTTP
 * y para recuperar sus datos desde la base de datos.
 * También incluye helpers para parsear y mergear la configuración JSON del tenant.
 */

import type { NextRequest } from "next/server"
import type { Tenant } from "@prisma/client"
import { extraerSlugDelHost, SLUG_DESARROLLO } from "./tenant-slug"

// Re-exportado para mantener compatibilidad con imports existentes
// (`import { extraerSlugDelHost } from "@/lib/tenant"`).
export { extraerSlugDelHost, SLUG_DESARROLLO }

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

/**
 * Obtiene el Tenant completo desde la petición HTTP.
 * Primero intenta el header `x-tenant-slug` (para clientes móviles Flutter).
 * Si no está presente, hace fallback al subdominio del host (comportamiento web existente).
 *
 * @param request  Petición Next.js
 * @returns        El Tenant si existe y está activo, null en caso contrario
 */
export async function obtenerTenantDesdeRequest(request: NextRequest): Promise<Tenant | null> {
  // Primero intenta el header x-tenant-slug (para mobile)
  const headerSlug = request.headers.get("x-tenant-slug")
  if (headerSlug) return obtenerTenantPorSlug(headerSlug)

  // Fallback: subdominio (comportamiento web existente)
  const host = request.headers.get("host") ?? ""
  const slug = extraerSlugDelHost(host)
  return obtenerTenantPorSlug(slug)
}
