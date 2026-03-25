/**
 * Funciones de formato de fechas y horas compartidas en toda la aplicación.
 * Centralizadas aquí para evitar duplicación entre componentes frontend.
 */

/**
 * Formatea una fecha (Date o string ISO) en texto corto en español.
 * Ejemplo: "lun., 24 mar."
 * Usa timeZone UTC para que fechas ISO con T00:00:00.000Z no muestren el día anterior.
 */
export function formatearFechaCorta(fecha: Date | string): string {
  return new Date(fecha).toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })
}

/**
 * Formatea una fecha ISO en texto largo en español.
 * Ejemplo: "lunes, 24 de marzo de 2026"
 * Usa timeZone UTC para que fechas ISO con T00:00:00.000Z no muestren el día anterior.
 */
export function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  })
}

/**
 * Formatea una fecha en formato YYYY-MM-DD en texto largo en español,
 * construyendo el objeto Date sin conversión de zona horaria para evitar
 * que el día cambie según el offset del navegador.
 * Ejemplo: "lunes, 24 de marzo de 2026"
 */
export function formatearFechaLocal(fechaStr: string): string {
  const [anio, mes, dia] = fechaStr.split("-").map(Number)
  const d = new Date(anio, mes - 1, dia)
  return d.toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

/**
 * Formatea una hora (Date o string ISO) en formato HH:MM.
 * Ejemplo: "10:00"
 * Usa timeZone Europe/Madrid para mostrar siempre la hora local española.
 */
export function formatearHora(fecha: Date | string): string {
  return new Date(fecha).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  })
}
