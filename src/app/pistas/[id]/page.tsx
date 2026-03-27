"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatearFechaLocal } from "@/lib/formato"

// Tipos de datos de la API
interface Slot {
  horaInicio: string
  horaFin: string
  estado: "libre" | "ocupado" | "pasado" | "bloqueado"
}

interface Instalacion {
  id: string
  nombre: string
  tipo: string
  descripcion: string
  horario: string
  activa: boolean
}

// Props de la página con parámetro dinámico
interface Props {
  params: { id: string }
}

export default function PaginaDetallePista({ params }: Props) {
  const router = useRouter()
  const { id } = params

  // Fecha seleccionada: por defecto hoy en formato YYYY-MM-DD
  // Usamos Intl para obtener la fecha local en Madrid (toISOString devolvería UTC)
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date())
  const [fecha, setFecha] = useState<string>(hoy)

  // Datos de la pista
  const [pista, setPista] = useState<Instalacion | null>(null)

  // Slots de disponibilidad
  const [slots, setSlots] = useState<Slot[]>([])
  const [cargandoSlots, setCargandoSlots] = useState(false)
  const [errorSlots, setErrorSlots] = useState("")

  // Dialog de confirmación de reserva
  const [slotSeleccionado, setSlotSeleccionado] = useState<Slot | null>(null)
  const [dialogAbierto, setDialogAbierto] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [errorConfirmacion, setErrorConfirmacion] = useState("")
  const [exito, setExito] = useState(false)

  // Carga info de la pista desde /api/instalaciones
  useEffect(() => {
    async function cargarPista() {
      try {
        const res = await fetch("/api/instalaciones")
        if (!res.ok) return
        const json = await res.json()
        const encontrada = (json.instalaciones as Instalacion[]).find((p) => p.id === id)
        if (encontrada) setPista(encontrada)
      } catch {
        // Si no carga la info, mostramos nombre genérico
      }
    }

    cargarPista()
  }, [id])

  // Carga los slots de disponibilidad para la pista y fecha seleccionada
  const cargarDisponibilidad = useCallback(async () => {
    setCargandoSlots(true)
    setErrorSlots("")
    setExito(false)

    try {
      const res = await fetch(`/api/disponibilidad?instalacionId=${id}&fecha=${fecha}`)
      if (!res.ok) throw new Error("Error al cargar disponibilidad")
      const json = await res.json()
      setSlots(json.slots ?? [])
    } catch {
      setErrorSlots("No se pudo cargar la disponibilidad. Inténtalo de nuevo.")
    } finally {
      setCargandoSlots(false)
    }
  }, [id, fecha])

  // Recarga disponibilidad cuando cambia la fecha
  useEffect(() => {
    cargarDisponibilidad()
  }, [cargarDisponibilidad])

  // Maneja el click en un slot libre
  function seleccionarSlot(slot: Slot) {
    if (slot.estado !== "libre") return
    setSlotSeleccionado(slot)
    setErrorConfirmacion("")
    setDialogAbierto(true)
  }

  // Cierra el dialog de confirmación
  function cerrarDialog() {
    if (confirmando) return
    setDialogAbierto(false)
    setSlotSeleccionado(null)
    setErrorConfirmacion("")
  }

  // Confirma la reserva llamando a POST /api/reservas
  async function confirmarReserva() {
    if (!slotSeleccionado) return
    setConfirmando(true)
    setErrorConfirmacion("")

    try {
      const res = await fetch("/api/reservas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instalacionId: id,
          fecha,
          horaInicio: slotSeleccionado.horaInicio,
        }),
      })

      if (res.status === 401) {
        router.push("/login")
        return
      }

      const json = await res.json()

      if (!res.ok) {
        setErrorConfirmacion(json.error ?? "Error al crear la reserva")
        return
      }

      // Reserva creada con éxito
      setDialogAbierto(false)
      setSlotSeleccionado(null)
      setExito(true)
      await cargarDisponibilidad()
    } catch {
      setErrorConfirmacion("Error de conexión. Inténtalo de nuevo.")
    } finally {
      setConfirmando(false)
    }
  }

  // Devuelve las clases CSS del slot según su estado
  function clasesSlot(estado: Slot["estado"]): string {
    const base = "rounded-lg border px-3 py-2 text-sm font-medium text-center transition-colors"
    switch (estado) {
      case "libre":
        return cn(base, "bg-green-50 border-green-200 text-green-800 cursor-pointer hover:bg-green-100")
      case "ocupado":
        return cn(base, "bg-red-50 border-red-200 text-red-700 cursor-not-allowed opacity-75")
      case "bloqueado":
      case "pasado":
      default:
        return cn(base, "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed")
    }
  }

  // Etiqueta de estado del slot
  function etiquetaEstado(estado: Slot["estado"]): string {
    switch (estado) {
      case "libre": return "Disponible"
      case "ocupado": return "Ocupado"
      case "bloqueado": return "Bloqueado"
      case "pasado": return "Pasado"
    }
  }

  const nombrePista = pista?.nombre ?? "Instalación"

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-4 sm:py-8 space-y-6">
        {/* Cabecera con botón volver */}
        <div>
          <button
            onClick={() => router.push("/pistas")}
            className="text-xs sm:text-sm text-gray-500 hover:text-gray-700 transition-colors mb-2"
          >
            ← Volver
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{nombrePista}</h1>
            {pista?.descripcion && (
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{pista.descripcion}</p>
            )}
            {pista?.horario && (
              <p className="text-xs text-gray-600 mt-1">
                <span className="font-medium">Horario:</span> {pista.horario}
              </p>
            )}
          </div>
        </div>

        {/* Mensaje de éxito al reservar */}
        {exito && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm">
            Reserva creada con éxito. Tu instalación queda reservada.
          </div>
        )}

        {/* Selector de fecha */}
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Selecciona una fecha
          </label>
          <input
            type="date"
            value={fecha}
            min={hoy}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full sm:w-auto rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {fecha && (
            <p className="text-xs text-gray-500 mt-1 capitalize">
              {formatearFechaLocal(fecha)}
            </p>
          )}
        </div>

        {/* Grilla de slots */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Disponibilidad</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Haz click en un slot verde para reservar
            </p>
          </div>

          {/* Leyenda de colores */}
          <div className="px-4 py-2 border-b border-gray-100 flex flex-wrap gap-3 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-green-200 inline-block" /> Disponible
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-red-200 inline-block" /> Ocupado
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-gray-200 inline-block" /> No disponible
            </span>
          </div>

          <div className="p-4">
            {cargandoSlots ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 space-y-2">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : errorSlots ? (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {errorSlots}
              </div>
            ) : slots.length === 0 ? (
              <p className="text-center text-sm text-gray-500 py-4">
                No hay slots disponibles para esta fecha
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {slots.map((slot) => (
                  <div
                    key={slot.horaInicio}
                    className={clasesSlot(slot.estado)}
                    onClick={() => seleccionarSlot(slot)}
                    role={slot.estado === "libre" ? "button" : undefined}
                    tabIndex={slot.estado === "libre" ? 0 : undefined}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") seleccionarSlot(slot)
                    }}
                  >
                    <div className="font-semibold">{slot.horaInicio}–{slot.horaFin}</div>
                    <div className="text-xs opacity-75">{etiquetaEstado(slot.estado)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dialog de confirmación de reserva */}
      <Dialog open={dialogAbierto} onOpenChange={(abierto) => { if (!abierto) cerrarDialog() }}>
        <DialogContent className="max-w-md w-[calc(100%-2rem)] sm:w-full">
          <DialogHeader>
            <DialogTitle>Confirmar reserva</DialogTitle>
            <DialogDescription>
              Revisa los detalles antes de confirmar
            </DialogDescription>
          </DialogHeader>

          {/* Resumen de la reserva */}
          {slotSeleccionado && (
            <div className="space-y-2 py-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Instalación</span>
                <span className="font-medium text-gray-800">{nombrePista}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Fecha</span>
                <span className="font-medium text-gray-800 capitalize">{formatearFechaLocal(fecha)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Hora</span>
                <span className="font-medium text-gray-800">
                  {slotSeleccionado.horaInicio} – {slotSeleccionado.horaFin}
                </span>
              </div>
            </div>
          )}

          {/* Error de confirmación */}
          {errorConfirmacion && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {errorConfirmacion}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={cerrarDialog}
              disabled={confirmando}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmarReserva}
              disabled={confirmando}
            >
              {confirmando ? "Cargando..." : "Confirmar reserva"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
