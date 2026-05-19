"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { Loader2 } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
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
import VistaSemanaPistas, { obtenerLunesDeHoy } from "@/components/VistaSemanaPistas"

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
  const pathname = usePathname()
  const { data: sesion } = useSession()
  const { toast } = useToast()
  const { id } = params

  // Fecha seleccionada: por defecto hoy en formato YYYY-MM-DD
  // Usamos Intl para obtener la fecha local en Madrid (toISOString devolvería UTC)
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date())
  const [fecha, setFecha] = useState<string>(hoy)

  // Control de vista: día individual o semana completa
  const [vista, setVista] = useState<"dia" | "semana">("dia")
  const [semanaBase, setSemanaBase] = useState<string>(() => obtenerLunesDeHoy())

  // Datos de la pista
  const [pista, setPista] = useState<Instalacion | null>(null)

  // Slots de disponibilidad
  const [slots, setSlots] = useState<Slot[]>([])
  const [cargandoSlots, setCargandoSlots] = useState(false)
  const [errorSlots, setErrorSlots] = useState("")
  const [festivoDelDia, setFestivoDelDia] = useState<{ nombre: string } | null>(null)

  // Dialog de confirmación de reserva
  const [slotSeleccionado, setSlotSeleccionado] = useState<Slot | null>(null)
  const [dialogAbierto, setDialogAbierto] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [errorConfirmacion, setErrorConfirmacion] = useState("")

  // Dialog de conversión para visitantes anónimos
  const [mostrarDialogoConversion, setMostrarDialogoConversion] = useState(false)

  // Estados para reservas recurrentes (solo instructores)
  const [esRecurrente, setEsRecurrente] = useState(false)
  const [frecuencia, setFrecuencia] = useState("SEMANAL")
  const [fechaFin, setFechaFin] = useState("")

  // Lista de espera: slots en los que el ciudadano ya está apuntado
  const [miListaEspera, setMiListaEspera] = useState<{ horaInicio: string; posicion: number }[]>([])
  const [apuntandose, setApuntandose] = useState<string | null>(null)

  // Carga info de la pista desde /api/instalaciones
  useEffect(() => {
    async function cargarPista() {
      try {
        const res = await fetch("/api/instalaciones")
        if (!res.ok) return
        const json = await res.json()
        const encontrada = (json.instalaciones as Instalacion[]).find((p) => p.id === id)
        if (encontrada) {
          setPista(encontrada)
          document.title = `Reservar — ${encontrada.nombre}`
        }
      } catch {
        // Si no carga la info, mostramos nombre genérico
        document.title = "Reservar pista"
      }
    }

    cargarPista()
  }, [id])

  // Carga los slots de disponibilidad para la pista y fecha seleccionada
  const cargarDisponibilidad = useCallback(async () => {
    setCargandoSlots(true)
    setErrorSlots("")

    try {
      const res = await fetch(`/api/disponibilidad?instalacionId=${id}&fecha=${fecha}`)
      if (!res.ok) throw new Error("Error al cargar disponibilidad")
      const json = await res.json()
      setSlots(json.slots ?? [])
      setFestivoDelDia(json.festivoDelDia ?? null)
    } catch {
      setErrorSlots("No se pudo cargar la disponibilidad. Inténtalo de nuevo.")
    } finally {
      setCargandoSlots(false)
    }
  }, [id, fecha])

  // Carga la lista de espera del ciudadano para esta instalación y fecha
  const cargarMiListaEspera = useCallback(async () => {
    try {
      const res = await fetch("/api/lista-espera")
      if (!res.ok) return
      const json = await res.json()
      const paraEstaPistaYFecha = (json.entradas ?? [])
        .filter((e: { instalacionId: string; fecha: string; estado: string; horaInicio: string; posicion: number }) =>
          e.instalacionId === id &&
          e.fecha.startsWith(fecha) &&
          (e.estado === "ESPERANDO" || e.estado === "NOTIFICADO")
        )
        .map((e: { horaInicio: string; posicion: number }) => ({ horaInicio: e.horaInicio, posicion: e.posicion }))
      setMiListaEspera(paraEstaPistaYFecha)
    } catch {
      // Error silencioso — la lista de espera es información secundaria
    }
  }, [id, fecha])

  // Apuntarse a la lista de espera de un slot ocupado
  async function apuntarseALista(slot: Slot) {
    if (!sesion) {
      router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`)
      return
    }
    setApuntandose(slot.horaInicio)
    try {
      const res = await fetch("/api/lista-espera", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instalacionId: id, fecha, horaInicio: slot.horaInicio }),
      })
      const json = await res.json()
      if (res.ok) {
        toast({ title: "Apuntado a la lista de espera", description: "Te avisaremos si se libera el slot." })
        await cargarMiListaEspera()
      } else {
        toast({ title: json.error ?? "Error al apuntarse", variant: "destructive" } as Parameters<typeof toast>[0])
      }
    } catch {
      toast({ title: "Error de conexión", variant: "destructive" } as Parameters<typeof toast>[0])
    } finally {
      setApuntandose(null)
    }
  }

  // Recarga disponibilidad cuando cambia la fecha
  useEffect(() => {
    cargarDisponibilidad()
  }, [cargarDisponibilidad])

  // Carga la lista de espera solo para ciudadanos, cuando cambia fecha o instalación
  const rol = sesion?.user?.rol
  useEffect(() => {
    if (rol === "CIUDADANO") {
      cargarMiListaEspera()
    }
  }, [cargarMiListaEspera, rol])

  // Maneja el click en un slot libre
  function seleccionarSlot(slot: Slot) {
    if (slot.estado !== "libre") return
    if (!sesion) {
      // Mostrar dialog de conversión en lugar de redirigir directamente
      setMostrarDialogoConversion(true)
      return
    }
    setSlotSeleccionado(slot)
    setErrorConfirmacion("")
    setDialogAbierto(true)
  }

  // Abre el dialog de confirmación con el slot dado (usado desde la vista semanal)
  function abrirDialogoReserva(slot: Slot) {
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

  // Confirma la reserva llamando a POST /api/reservas o /api/instructor/reservas-recurrentes
  async function confirmarReserva() {
    if (!slotSeleccionado) return
    setConfirmando(true)
    setErrorConfirmacion("")

    try {
      const body = esRecurrente
        ? {
            instalacionId: id,
            horaInicio: slotSeleccionado.horaInicio,
            fechaInicio: fecha,
            fechaFin,
            frecuencia,
          }
        : {
            instalacionId: id,
            fecha,
            horaInicio: slotSeleccionado.horaInicio,
          }

      const endpoint = esRecurrente
        ? "/api/instructor/reservas-recurrentes"
        : "/api/reservas"

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
      setEsRecurrente(false)
      setFrecuencia("SEMANAL")
      setFechaFin("")
      toast({
        title: "Reserva creada con éxito",
        description: "Tu instalación queda reservada.",
      })
      await cargarDisponibilidad()
    } catch {
      setErrorConfirmacion("Error de conexión. Inténtalo de nuevo.")
    } finally {
      setConfirmando(false)
    }
  }

  // Devuelve las clases CSS del slot según su estado
  function clasesSlot(estado: Slot["estado"]): string {
    const base = "rounded-lg border px-3 py-3 text-sm font-medium text-center transition-colors min-h-[56px] flex flex-col items-center justify-center gap-1"
    switch (estado) {
      case "libre":
        return cn(base, "bg-green-50 border-green-200 text-green-800 cursor-pointer hover:bg-green-100 hover:border-green-300")
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
            onClick={() => router.back()}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors py-2 -ml-1 mb-2"
            aria-label="Volver a instalaciones"
          >
            ← Volver
          </button>
          {pista && (
            <nav aria-label="Ruta de navegación" className="flex items-center gap-1 text-xs text-gray-400 mb-3 min-w-0">
              <span className="shrink-0">Instalaciones</span>
              <span aria-hidden="true">›</span>
              <span className="truncate text-gray-600 font-medium">{pista.nombre}</span>
            </nav>
          )}
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

        {/* Toggle vista día / semana */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          <button
            onClick={() => setVista("dia")}
            className={cn(
              "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
              vista === "dia"
                ? "bg-white shadow text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            Día
          </button>
          <button
            onClick={() => setVista("semana")}
            className={cn(
              "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
              vista === "semana"
                ? "bg-white shadow text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            Semana
          </button>
        </div>

        {/* Vista de día: selector de fecha + banner de festivo + grilla */}
        {vista === "dia" && (
          <>
        {/* Selector de fecha */}
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-4">
          <label htmlFor="selector-fecha" className="block text-sm font-medium text-gray-700 mb-2">
            Selecciona una fecha
          </label>
          <input
            id="selector-fecha"
            type="date"
            value={fecha}
            min={hoy}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full sm:w-auto rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {fecha && (
            <p className="text-xs text-gray-500 mt-1.5">
              {formatearFechaLocal(fecha)}
            </p>
          )}
        </div>

        {/* Banner de festivo */}
        {festivoDelDia && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2 text-amber-800">
            <span className="text-lg">🎉</span>
            <span className="font-medium">Festivo: {festivoDelDia.nombre}</span>
            <span className="text-amber-600 text-sm">— Este día no hay disponibilidad</span>
          </div>
        )}

        {/* Grilla de slots */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Disponibilidad</h2>
            <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">
              {sesion
                ? "Selecciona un slot verde para reservar"
                : (
                  <>
                    Consulta horarios sin registrarte. Para reservar,{" "}
                    <Link
                      href={`/registro?callbackUrl=${encodeURIComponent(pathname)}`}
                      className="font-medium underline underline-offset-2 hover:text-gray-700"
                    >
                      crea tu cuenta gratis
                    </Link>.
                  </>
                )
              }
            </p>
          </div>

          {/* Leyenda de colores */}
          <div className="px-4 py-2.5 border-b border-gray-100 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-gray-600">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-green-200 inline-block shrink-0" aria-hidden="true" /> Disponible
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-red-200 inline-block shrink-0" aria-hidden="true" /> Ocupado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-gray-200 inline-block shrink-0" aria-hidden="true" /> No disponible
            </span>
          </div>

          <div className="p-4">
            {cargandoSlots ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : errorSlots ? (
              <div role="alert" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {errorSlots}
              </div>
            ) : slots.length === 0 ? (
              <p className="text-center text-sm text-gray-500 py-4">
                No hay slots disponibles para esta fecha
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {slots.map((slot) => {
                  const enEspera = miListaEspera.find((e) => e.horaInicio === slot.horaInicio)
                  return (
                    <div
                      key={slot.horaInicio}
                      className={clasesSlot(slot.estado)}
                      onClick={() => seleccionarSlot(slot)}
                      role={slot.estado === "libre" ? "button" : undefined}
                      tabIndex={slot.estado === "libre" ? 0 : undefined}
                      aria-label={
                        slot.estado === "libre"
                          ? `Reservar de ${slot.horaInicio} a ${slot.horaFin}`
                          : slot.estado === "ocupado"
                          ? `Ocupado de ${slot.horaInicio} a ${slot.horaFin}`
                          : slot.estado === "pasado"
                          ? `Pasado — ${slot.horaInicio} a ${slot.horaFin}`
                          : `Bloqueado — ${slot.horaInicio} a ${slot.horaFin}`
                      }
                      aria-disabled={slot.estado !== "libre"}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") seleccionarSlot(slot)
                      }}
                    >
                      <div className="font-semibold leading-tight">{slot.horaInicio}–{slot.horaFin}</div>
                      <div className="text-xs opacity-75 mt-0.5">{etiquetaEstado(slot.estado)}</div>
                      {slot.estado === "ocupado" && sesion?.user?.rol === "CIUDADANO" && (
                        <button
                          className="mt-2 text-xs underline text-red-600 hover:text-red-800 disabled:opacity-50 leading-tight"
                          onClick={(e) => { e.stopPropagation(); apuntarseALista(slot) }}
                          disabled={apuntandose === slot.horaInicio}
                        >
                          {apuntandose === slot.horaInicio
                            ? "Apuntando..."
                            : enEspera
                            ? `En lista (${enEspera.posicion})`
                            : "Apuntarme"}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
          </>
        )}

        {/* Vista semanal */}
        {vista === "semana" && (
          <VistaSemanaPistas
            instalacionId={id}
            semanaBase={semanaBase}
            onSeleccionarSlot={(fechaSlot, slot) => {
              if (!sesion) {
                setMostrarDialogoConversion(true)
                return
              }
              setFecha(fechaSlot)
              abrirDialogoReserva(slot as { horaInicio: string; horaFin: string; estado: "libre" | "ocupado" | "pasado" | "bloqueado" })
            }}
          />
        )}
      </div>

      {/* Dialog de conversión para visitantes anónimos */}
      <Dialog open={mostrarDialogoConversion} onOpenChange={setMostrarDialogoConversion}>
        <DialogContent className="max-w-md w-[calc(100%-2rem)] sm:w-full">
          <DialogHeader>
            <DialogTitle>Reserva esta franja</DialogTitle>
            <DialogDescription>
              Para realizar una reserva necesitas una cuenta. Es gratuito y tarda menos de un minuto.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Link
              href={`/registro?callbackUrl=${encodeURIComponent(pathname)}`}
              className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Crear cuenta gratis
            </Link>
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(pathname)}`}
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              Ya tengo cuenta
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmación de reserva */}
      <Dialog open={dialogAbierto} onOpenChange={(abierto) => { if (!abierto) cerrarDialog() }}>
        <DialogContent className="max-w-md w-[calc(100%-2rem)] sm:w-full max-h-[90dvh] overflow-y-auto">
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
                <span className="font-medium text-gray-800">{formatearFechaLocal(fecha)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Hora</span>
                <span className="font-medium text-gray-800">
                  {slotSeleccionado.horaInicio} – {slotSeleccionado.horaFin}
                </span>
              </div>
            </div>
          )}

          {/* Toggle recurrente para instructores */}
          {sesion?.user?.rol === "INSTRUCTOR" && (
            <div className="border-t pt-4 mt-4">
              <label className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={esRecurrente}
                  onChange={(e) => setEsRecurrente(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Reserva recurrente</span>
              </label>

              {esRecurrente && (
                <div className="space-y-4 mt-4 p-4 bg-blue-50 rounded">
                  <div>
                    <label className="block text-sm font-medium mb-2">Frecuencia</label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="frecuencia"
                          value="SEMANAL"
                          checked={frecuencia === "SEMANAL"}
                          onChange={(e) => setFrecuencia(e.target.value)}
                        />
                        <span className="text-sm">Semanal</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="frecuencia"
                          value="QUINCENAL"
                          checked={frecuencia === "QUINCENAL"}
                          onChange={(e) => setFrecuencia(e.target.value)}
                        />
                        <span className="text-sm">Quincenal</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Hasta</label>
                    <input
                      type="date"
                      value={fechaFin}
                      onChange={(e) => setFechaFin(e.target.value)}
                      className="w-full border rounded px-3 py-2 text-sm"
                    />
                  </div>

                  {fechaFin && (
                    <div className="text-xs text-gray-600">
                      Se crearán aproximadamente{" "}
                      {frecuencia === "SEMANAL"
                        ? Math.ceil(
                            (new Date(fechaFin).getTime() -
                              new Date(fecha).getTime()) /
                              (7 * 24 * 60 * 60 * 1000)
                          )
                        : Math.ceil(
                            (new Date(fechaFin).getTime() -
                              new Date(fecha).getTime()) /
                              (14 * 24 * 60 * 60 * 1000)
                          )}{" "}
                      sesiones
                    </div>
                  )}
                </div>
              )}
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
              {confirmando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Reservando...
                </>
              ) : "Confirmar reserva"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
