/**
 * Helper de resolución de tenant
 * Funciones para identificar el ayuntamiento (tenant) a partir del host HTTP
 * y para recuperar sus datos desde la base de datos.
 * También incluye helpers para parsear y mergear la configuración JSON del tenant.
 */

import type { Tenant } from "@prisma/client"

export { extraerSlugDelHost } from "./tenant-slug"

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
  /** Configuración de slots de reserva para este tenant */
  slots?: {
    /** Duración de cada slot en minutos. Por defecto: 75 */
    duracionMinutos: number
    /** Franjas horarias en las que se generan slots */
    franjas: Array<{ inicio: string; fin: string }>
  }
  /** Configuración del sistema de penalizaciones por no-show */
  penalizaciones?: {
    /** Número máximo de no-shows antes de suspender al usuario. Por defecto: 3 */
    maxNoShows: number
    /** Días de suspensión al alcanzar el límite. Por defecto: 14 */
    diasSuspension: number
  }
  /**
   * Número máximo de reservas ACTIVAS simultáneas que puede tener un CIUDADANO.
   * No aplica a ADMIN ni INSTRUCTOR.
   * Por defecto: 2
   */
  limiteReservasActivas?: number
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
    // Merge profundo del subobjeto slots (reemplaza completo si se envía)
    slots:
      override.slots !== undefined
        ? override.slots
        : base.slots,
    // Merge profundo del subobjeto penalizaciones
    penalizaciones:
      override.penalizaciones !== undefined
        ? { ...base.penalizaciones, ...override.penalizaciones }
        : base.penalizaciones,
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
