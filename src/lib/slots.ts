/**
 * Módulo centralizado de generación de slots de reserva.
 *
 * Elimina la duplicación de constantes hardcodeadas que existía en:
 *  - src/app/api/disponibilidad/route.ts    (SLOTS_DISPONIBLES)
 *  - src/app/api/reservas/route.ts           (SLOTS_VALIDOS)
 *  - src/app/api/admin/reservas/route.ts     (SLOTS_VALIDOS)
 *  - src/app/api/instructor/reservas-recurrentes/route.ts (SLOTS_VALIDOS)
 *  - src/lib/validaciones.ts                 (SLOTS_VALIDOS array)
 *
 * También centraliza `crearHoraEnMadrid`, que estaba duplicada en los 4 routes.
 */

// ─── Tipos ────────────────────────────────────────────────────────────────────

/** Configuración de slots para un tenant */
export interface SlotsConfig {
  /** Duración de cada slot en minutos (ej: 75) */
  duracionMinutos: number
  /** Franjas horarias en las que se generan slots */
  franjas: Array<{ inicio: string; fin: string }>
}

// ─── Configuración por defecto ────────────────────────────────────────────────

/**
 * Configuración de slots por defecto.
 * Corresponde al comportamiento original hardcodeado:
 *   - 7 slots de 75 minutos
 *   - Franja mañana 08:00-13:00 (4 slots)
 *   - Franja tarde  16:45-20:30 (3 slots)
 */
export const SLOTS_CONFIG_DEFAULT: SlotsConfig = {
  duracionMinutos: 75,
  franjas: [
    { inicio: "08:00", fin: "13:00" },
    { inicio: "16:45", fin: "20:30" },
  ],
}

// ─── Funciones de generación ──────────────────────────────────────────────────

/**
 * Convierte una cadena "HH:MM" a minutos desde medianoche.
 */
function horaAMinutos(hora: string): number {
  const [hh, mm] = hora.split(":").map(Number)
  return hh * 60 + mm
}

/**
 * Convierte minutos desde medianoche a cadena "HH:MM".
 * Si los minutos superan 23:59, satura a "23:59" para evitar valores inválidos.
 */
function minutosAHora(minutos: number): string {
  const hh = Math.floor(minutos / 60)
  const mm = minutos % 60
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`
}

/**
 * Genera un array de slots `{ horaInicio, horaFin }` a partir de la configuración dada.
 *
 * Para cada franja, genera slots consecutivos de `duracionMinutos` minutos
 * desde `inicio` hasta `fin`. Si el último slot no cabe completo (horaFin del
 * slot superaría la `fin` de la franja), no se incluye.
 *
 * @param config  Configuración de slots (duración y franjas)
 * @returns       Array de objetos `{ horaInicio: string, horaFin: string }`
 */
export function generarSlots(config: SlotsConfig): Array<{ horaInicio: string; horaFin: string }> {
  const slots: Array<{ horaInicio: string; horaFin: string }> = []

  for (const franja of config.franjas) {
    const finFranja = horaAMinutos(franja.fin)
    let cursor = horaAMinutos(franja.inicio)

    while (cursor + config.duracionMinutos <= finFranja) {
      const fin = cursor + config.duracionMinutos
      slots.push({
        horaInicio: minutosAHora(cursor),
        horaFin: minutosAHora(fin),
      })
      cursor = fin
    }
  }

  return slots
}

/**
 * Genera el mapa `Record<horaInicio, horaFin>` a partir de la configuración.
 * Útil para buscar la horaFin dado una horaInicio en O(1).
 *
 * @param config  Configuración de slots
 * @returns       Objeto `{ "08:00": "09:15", "09:15": "10:30", ... }`
 */
export function generarMapaSlots(config: SlotsConfig): Record<string, string> {
  const slots = generarSlots(config)
  return slots.reduce<Record<string, string>>((acc, slot) => {
    acc[slot.horaInicio] = slot.horaFin
    return acc
  }, {})
}

// ─── Helper de zona horaria ───────────────────────────────────────────────────

/**
 * Crea un objeto Date cuyo instante UTC corresponde a la hora indicada (en formato HH:MM)
 * en la zona horaria Europe/Madrid (UTC+1 invierno / UTC+2 verano).
 *
 * Centraliza la función que estaba duplicada en los 4 API routes.
 *
 * Ejemplo (horario de invierno, UTC+1):
 *   crearHoraEnMadrid("2026-03-25", "10:30") → 2026-03-25T09:30:00.000Z
 *   Formateado con timeZone "Europe/Madrid"  → "10:30" ✓
 *
 * @param fechaStr  Fecha en formato "YYYY-MM-DD"
 * @param horaStr   Hora en formato "HH:MM"
 * @returns         Date con el instante UTC correspondiente
 */
export function crearHoraEnMadrid(fechaStr: string, horaStr: string): Date {
  const [horas, minutos] = horaStr.split(":").map(Number)
  // Crear instante provisional asumiendo que la hora es UTC
  const base = new Date(
    `${fechaStr}T${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}:00.000Z`
  )
  // Averiguar qué hora muestra Madrid para ese instante UTC provisional
  const horaMadrid = parseInt(
    base.toLocaleString("en-US", {
      timeZone: "Europe/Madrid",
      hour: "numeric",
      hour12: false,
    })
  )
  // diff = cuántas horas está Madrid por delante de UTC en ese momento
  // Ej: UTC+1 → horaMadrid=11, hora=10, diff=1
  let diff = horaMadrid - horas
  if (diff > 12) diff -= 24
  if (diff < -12) diff += 24
  // Restamos el offset para que Madrid muestre exactamente 'horas:minutos'
  return new Date(base.getTime() - diff * 60 * 60 * 1000)
}
