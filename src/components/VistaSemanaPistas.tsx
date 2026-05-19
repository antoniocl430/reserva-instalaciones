"use client"

// Componente de vista semanal de disponibilidad de instalaciones

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

// Tipos de datos del slot de disponibilidad
interface Slot {
  horaInicio: string
  horaFin: string
  estado: "libre" | "ocupado" | "pasado" | "bloqueado"
}

// Datos de disponibilidad de un día concreto
interface DatosDelDia {
  slots: Slot[]
  festivoDelDia: { nombre: string } | null
}

// Props del componente
interface Props {
  instalacionId: string
  semanaBase: string // YYYY-MM-DD — lunes de la semana
  onSeleccionarSlot: (
    fecha: string,
    slot: { horaInicio: string; horaFin: string; estado: string }
  ) => void
}

// --- Helpers de fecha (puros, fáciles de testear) ---

/**
 * Obtiene el lunes de la semana actual en formato YYYY-MM-DD (Europe/Madrid).
 * Se usa Intl.DateTimeFormat para obtener la fecha local en Madrid.
 */
export function obtenerLunesDeHoy(): string {
  const hoyMadrid = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
  }).format(new Date())

  // Calculamos el día de la semana en Madrid usando UTC del string de fecha
  const d = new Date(hoyMadrid + "T00:00:00Z")
  const diaSemana = d.getUTCDay() // 0=dom, 1=lun, ..., 6=sáb
  const diasHastaLunes = diaSemana === 0 ? 6 : diaSemana - 1
  const lunes = new Date(d)
  lunes.setUTCDate(d.getUTCDate() - diasHastaLunes)
  return lunes.toISOString().slice(0, 10)
}

/**
 * Devuelve un array de 7 fechas YYYY-MM-DD (lunes a domingo) para la semana del lunes dado.
 * Trabaja en UTC para evitar problemas de zona horaria.
 */
export function calcularDiasSemana(lunes: string): string[] {
  const resultado: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(lunes + "T00:00:00Z")
    d.setUTCDate(d.getUTCDate() + i)
    resultado.push(d.toISOString().slice(0, 10))
  }
  return resultado
}

/**
 * Devuelve el nombre corto del día de la semana en español: "Lun", "Mar", etc.
 */
export function diaSemanaCorto(fecha: string): string {
  // Construimos la fecha en UTC para evitar desfases de zona horaria
  const d = new Date(fecha + "T00:00:00Z")
  return d.toLocaleDateString("es-ES", { weekday: "short", timeZone: "UTC" })
    .replace(".", "")
    .replace(/^\w/, (c) => c.toUpperCase())
    .slice(0, 3)
}

/**
 * Devuelve el número del día del mes como string: "17"
 */
export function numeroDia(fecha: string): string {
  const d = new Date(fecha + "T00:00:00Z")
  return String(d.getUTCDate())
}

/**
 * Formatea un rango de semana: "17–23 may 2026"
 */
export function formatearRangoSemana(inicio: string, fin: string): string {
  const dInicio = new Date(inicio + "T00:00:00Z")
  const dFin = new Date(fin + "T00:00:00Z")
  const numInicio = dInicio.getUTCDate()
  const numFin = dFin.getUTCDate()
  const mes = dFin.toLocaleDateString("es-ES", { month: "short", timeZone: "UTC" }).replace(".", "")
  const anio = dFin.getUTCFullYear()
  return `${numInicio}–${numFin} ${mes} ${anio}`
}

/**
 * Comprueba si una fecha YYYY-MM-DD es el día de hoy en Europe/Madrid
 */
export function esHoy(fecha: string): boolean {
  const hoyMadrid = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
  }).format(new Date())
  return fecha === hoyMadrid
}

// --- Subcomponente CeldaSlot ---

interface PropsCeldaSlot {
  slot: Slot | undefined
  esFestivo: boolean
  cargando: boolean
  onClick: () => void
}

function CeldaSlot({ slot, esFestivo, cargando, onClick }: PropsCeldaSlot) {
  // Skeleton durante la carga
  if (cargando) {
    return (
      <div className="h-8 w-full rounded bg-gray-200 animate-pulse" />
    )
  }

  // Celda de festivo
  if (esFestivo && !slot) {
    return (
      <div className="h-8 w-full rounded bg-gray-100 flex items-center justify-center text-xs text-gray-400">
        🚫
      </div>
    )
  }

  // Sin slot para este hueco horario
  if (!slot) {
    return (
      <div className="h-8 w-full rounded bg-gray-50" />
    )
  }

  // Celda de slot libre
  if (slot.estado === "libre") {
    return (
      <div
        className="h-8 w-full rounded bg-green-100 border border-green-200 flex items-center justify-center text-xs text-green-800 cursor-pointer hover:bg-green-200 transition-colors"
        onClick={onClick}
        role="button"
        tabIndex={0}
        data-estado="libre"
        aria-label={`Libre: ${slot.horaInicio}–${slot.horaFin}`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onClick()
        }}
      >
        Libre
      </div>
    )
  }

  // Celda de slot ocupado
  if (slot.estado === "ocupado") {
    return (
      <div
        className="h-8 w-full rounded bg-red-100 border border-red-200 flex items-center justify-center text-xs text-red-700 cursor-not-allowed"
        data-estado="ocupado"
        aria-label={`Ocupado: ${slot.horaInicio}–${slot.horaFin}`}
      >
        Ocupado
      </div>
    )
  }

  // Celda de slot bloqueado, pasado, o cualquier otro estado
  return (
    <div
      className="h-8 w-full rounded bg-gray-100 border border-gray-200 flex items-center justify-center text-xs text-gray-400 cursor-not-allowed"
      data-estado={slot.estado}
      aria-label={`${slot.estado}: ${slot.horaInicio}–${slot.horaFin}`}
    >
      {slot.estado === "bloqueado" ? "Bloq." : "N/D"}
    </div>
  )
}

// --- Componente principal ---

export default function VistaSemanaPistas({
  instalacionId,
  semanaBase,
  onSeleccionarSlot,
}: Props) {
  const [semanaActual, setSemanaActual] = useState<string>(semanaBase)
  const [datosSemana, setDatosSemana] = useState<
    Record<string, DatosDelDia>
  >({})
  const [cargando, setCargando] = useState(false)

  const lunesDeHoy = obtenerLunesDeHoy()
  const dias = calcularDiasSemana(semanaActual)

  // Función para cargar los 7 días de la semana en paralelo
  async function cargarSemana(lunes: string) {
    setCargando(true)
    const fechas = calcularDiasSemana(lunes)
    try {
      const respuestas = await Promise.all(
        fechas.map((fecha) =>
          fetch(
            `/api/disponibilidad?instalacionId=${instalacionId}&fecha=${fecha}`
          ).then((r) => (r.ok ? r.json() : { slots: [], festivoDelDia: null }))
        )
      )
      const nuevoDatos: Record<string, DatosDelDia> = {}
      fechas.forEach((fecha, i) => {
        nuevoDatos[fecha] = {
          slots: respuestas[i]?.slots ?? [],
          festivoDelDia: respuestas[i]?.festivoDelDia ?? null,
        }
      })
      setDatosSemana(nuevoDatos)
    } catch {
      // Error silencioso — la tabla mostrará celdas vacías
    } finally {
      setCargando(false)
    }
  }

  // Recarga cuando cambia la semana actual
  useEffect(() => {
    cargarSemana(semanaActual)
  }, [semanaActual, instalacionId])

  // Navegación de semana
  function semanaAnterior() {
    const d = new Date(semanaActual + "T00:00:00Z")
    d.setUTCDate(d.getUTCDate() - 7)
    setSemanaActual(d.toISOString().slice(0, 10))
  }

  function semanaSiguiente() {
    const d = new Date(semanaActual + "T00:00:00Z")
    d.setUTCDate(d.getUTCDate() + 7)
    setSemanaActual(d.toISOString().slice(0, 10))
  }

  const anteriorDeshabilitado = semanaActual <= lunesDeHoy

  // Calculamos las horas únicas de todos los días para construir las filas
  const todasLasHoras = new Set<string>()
  dias.forEach((fecha) => {
    datosSemana[fecha]?.slots.forEach((s) => todasLasHoras.add(s.horaInicio))
  })
  const horasUnicas = Array.from(todasLasHoras).sort()

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Cabecera de navegación */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <button
          onClick={semanaAnterior}
          disabled={anteriorDeshabilitado}
          aria-label="Semana anterior"
          className={cn(
            "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
            anteriorDeshabilitado
              ? "text-gray-300 cursor-not-allowed"
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          )}
        >
          ← Anterior
        </button>

        <span className="text-sm font-medium text-gray-700">
          {dias.length === 7
            ? formatearRangoSemana(dias[0], dias[6])
            : ""}
        </span>

        <button
          onClick={semanaSiguiente}
          aria-label="Semana siguiente"
          className="px-3 py-1.5 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        >
          Siguiente →
        </button>
      </div>

      {/* Tabla de disponibilidad semanal con scroll horizontal en móvil */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse text-sm">
          <thead>
            <tr>
              {/* Columna de horas (sticky) */}
              <th className="w-16 sticky left-0 bg-white z-10 border-b border-gray-100" />
              {/* Columnas de días */}
              {dias.map((fecha) => (
                <th
                  key={fecha}
                  className={cn(
                    "px-2 py-2 text-center font-medium border-b border-gray-100",
                    esHoy(fecha) && "bg-blue-50"
                  )}
                >
                  <div className="text-xs text-gray-500">{diaSemanaCorto(fecha)}</div>
                  <div className="text-lg font-bold text-gray-800">{numeroDia(fecha)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Si estamos cargando y no hay horas aún, mostrar filas skeleton */}
            {cargando && horasUnicas.length === 0 ? (
              // Skeleton: 3 filas de celdas grises animadas
              Array.from({ length: 3 }).map((_, fila) => (
                <tr key={`skeleton-${fila}`} className="border-t border-gray-100">
                  <td className="sticky left-0 bg-white z-10 w-16 py-2 pr-2">
                    <div className="h-4 w-12 bg-gray-200 animate-pulse rounded ml-auto" />
                  </td>
                  {dias.map((fecha) => (
                    <td key={fecha} className="px-1 py-1">
                      <div className="h-8 w-full bg-gray-200 animate-pulse rounded" />
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              horasUnicas.map((hora) => (
                <tr key={hora} className="border-t border-gray-100">
                  {/* Celda de hora (sticky) */}
                  <td className="sticky left-0 bg-white z-10 text-xs text-gray-500 pr-2 py-2 text-right font-mono w-16">
                    {hora}
                  </td>
                  {/* Celdas de slots para cada día */}
                  {dias.map((fecha) => {
                    const slot = datosSemana[fecha]?.slots.find(
                      (s) => s.horaInicio === hora
                    )
                    const esFestivo = !!datosSemana[fecha]?.festivoDelDia
                    return (
                      <td
                        key={fecha}
                        className={cn(
                          "px-1 py-1 text-center",
                          esHoy(fecha) && "bg-blue-50/30"
                        )}
                      >
                        <CeldaSlot
                          slot={slot}
                          esFestivo={esFestivo}
                          cargando={cargando}
                          onClick={() => {
                            if (slot?.estado === "libre") {
                              onSeleccionarSlot(fecha, slot)
                            }
                          }}
                        />
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
