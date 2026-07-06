/**
 * Resolución del slug de tenant a partir del host HTTP.
 *
 * Este módulo NO importa Prisma ni ningún adaptador de base de datos, por lo que
 * es seguro importarlo desde el middleware de Next.js (Edge Runtime). Mantenerlo
 * separado de `tenant.ts` evita que el driver de PostgreSQL se incluya en el
 * bundle del Edge y dispare el límite de tamaño de la función.
 */

// Slug de fallback para desarrollo local — siempre existe en BD
export const SLUG_DESARROLLO = "desarrollo"

/**
 * Extrae el slug del tenant desde el host de la petición HTTP.
 *
 * Reglas de resolución:
 *   - localhost o 127.0.0.1 (con o sin puerto)  → "desarrollo"
 *   - reservas.ayto-SLUG.es                     → SLUG
 *   - cualquier otro host no reconocido          → "desarrollo" (fallback seguro)
 *
 * @example
 *   extraerSlugDelHost("localhost:3000")           → "desarrollo"
 *   extraerSlugDelHost("reservas.ayto-sevilla.es") → "sevilla"
 *   extraerSlugDelHost("ejemplo.com")              → "desarrollo"
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
