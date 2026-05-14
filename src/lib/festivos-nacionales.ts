// Festivos nacionales de España — lista fija + Viernes Santo calculado

export interface FestivoNacional {
  fecha: string // "YYYY-MM-DD"
  nombre: string
}

// Algoritmo Meeus/Jones/Butcher para calcular el Domingo de Pascua
function calcularPascua(año: number): Date {
  const a = año % 19
  const b = Math.floor(año / 100)
  const c = año % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m + 114) / 31)
  const dia = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(Date.UTC(año, mes - 1, dia))
}

function formatearFecha(date: Date): string {
  const año = date.getUTCFullYear()
  const mes = String(date.getUTCMonth() + 1).padStart(2, "0")
  const dia = String(date.getUTCDate()).padStart(2, "0")
  return `${año}-${mes}-${dia}`
}

export function obtenerFestivosNacionales(año: number): FestivoNacional[] {
  const pascua = calcularPascua(año)
  const viernesSanto = new Date(Date.UTC(pascua.getUTCFullYear(), pascua.getUTCMonth(), pascua.getUTCDate() - 2))

  return [
    { fecha: `${año}-01-01`, nombre: "Año Nuevo" },
    { fecha: `${año}-01-06`, nombre: "Día de Reyes" },
    { fecha: formatearFecha(viernesSanto), nombre: "Viernes Santo" },
    { fecha: `${año}-05-01`, nombre: "Día del Trabajador" },
    { fecha: `${año}-08-15`, nombre: "Asunción de la Virgen" },
    { fecha: `${año}-10-12`, nombre: "Fiesta Nacional de España" },
    { fecha: `${año}-11-01`, nombre: "Todos los Santos" },
    { fecha: `${año}-12-06`, nombre: "Día de la Constitución Española" },
    { fecha: `${año}-12-08`, nombre: "Inmaculada Concepción" },
    { fecha: `${año}-12-25`, nombre: "Navidad" },
  ]
}
