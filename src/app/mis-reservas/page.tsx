"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatearFecha, formatearHora } from "@/lib/formato"
import { useToast } from "@/hooks/use-toast"

// Tipos de la API
interface Reserva {
  id: string
  fecha: string
  horaInicio: string
  horaFin: string
  estado: "ACTIVA" | "CANCELADA"
  instalacion: {
    id: string
    nombre: string
  }
}

interface DatosReservas {
  activas: Reserva[]
  historial: Reserva[]
}

interface EntradaEspera {
  id: string
  instalacionId: string
  fecha: string
  horaInicio: string
  estado: "ESPERANDO" | "NOTIFICADO"
  posicion: number
  expiraEn: string | null
  instalacion: { id: string; nombre: string }
}

export default function PaginaMisReservas() {
  const router = useRouter()
  const { toast } = useToast()

  // Título de la pestaña del navegador
  useEffect(() => { document.title = "Mis reservas" }, [])

  const [datos, setDatos] = useState<DatosReservas | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState("")

  // Estado del tab Lista de espera
  const [entradasEspera, setEntradasEspera] = useState<EntradaEspera[]>([])
  const [accionandoEspera, setAccionandoEspera] = useState<string | null>(null)

  // Estado del dialog de cancelación
  const [reservaACancelar, setReservaACancelar] = useState<Reserva | null>(null)
  const [dialogAbierto, setDialogAbierto] = useState(false)
  const [cancelando, setCancelando] = useState(false)
  const [errorCancelacion, setErrorCancelacion] = useState("")

  // Carga las reservas y la lista de espera del usuario
  async function cargarReservas() {
    try {
      const [resReservas, resEspera] = await Promise.all([
        fetch("/api/reservas/mis-reservas"),
        fetch("/api/lista-espera"),
      ])
      if (resReservas.status === 401) {
        router.push("/login?callbackUrl=/mis-reservas")
        return
      }
      if (!resReservas.ok) throw new Error("Error al cargar las reservas")
      const jsonReservas = await resReservas.json()
      setDatos(jsonReservas)
      if (resEspera.ok) {
        const jsonEspera = await resEspera.json()
        setEntradasEspera(jsonEspera.entradas ?? [])
      }
    } catch {
      setError("No se pudieron cargar tus reservas. Inténtalo de nuevo.")
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarReservas()
  }, [])

  // Abandona la lista de espera para una entrada
  async function abandonarEspera(entrada: EntradaEspera) {
    setAccionandoEspera(entrada.id)
    try {
      const res = await fetch(`/api/lista-espera/${entrada.id}`, { method: "DELETE" })
      if (res.ok) {
        toast({ title: "Eliminado de la lista de espera" })
        const json = await fetch("/api/lista-espera").then((r) => r.json())
        setEntradasEspera(json.entradas ?? [])
      }
    } catch {
      toast({ title: "Error al abandonar la lista", variant: "destructive" } as Parameters<typeof toast>[0])
    } finally {
      setAccionandoEspera(null)
    }
  }

  // Confirma la reserva desde la lista de espera
  async function confirmarDesdeEspera(entrada: EntradaEspera) {
    setAccionandoEspera(entrada.id)
    try {
      const res = await fetch(`/api/lista-espera/${entrada.id}/confirmar`, { method: "POST" })
      if (res.ok) {
        toast({ title: "Reserva confirmada", description: "Tu reserva está activa." })
        await cargarReservas()
      } else {
        const json = await res.json()
        toast({ title: json.error ?? "Error al confirmar", variant: "destructive" } as Parameters<typeof toast>[0])
      }
    } catch {
      toast({ title: "Error de conexión", variant: "destructive" } as Parameters<typeof toast>[0])
    } finally {
      setAccionandoEspera(null)
    }
  }

  // Abre el dialog de confirmación de cancelación
  function abrirCancelacion(reserva: Reserva) {
    setReservaACancelar(reserva)
    setErrorCancelacion("")
    setDialogAbierto(true)
  }

  // Cierra el dialog de cancelación
  function cerrarDialog() {
    if (cancelando) return
    setDialogAbierto(false)
    setReservaACancelar(null)
    setErrorCancelacion("")
  }

  // Confirma la cancelación llamando a PATCH /api/reservas/[id]/cancelar
  async function confirmarCancelacion() {
    if (!reservaACancelar) return
    setCancelando(true)
    setErrorCancelacion("")

    try {
      const res = await fetch(`/api/reservas/${reservaACancelar.id}/cancelar`, {
        method: "PATCH",
      })

      const json = await res.json()

      if (!res.ok) {
        setErrorCancelacion(json.error ?? "Error al cancelar la reserva")
        return
      }

      // Cancelación exitosa: cerrar dialog, mostrar confirmación y recargar reservas
      setDialogAbierto(false)
      setReservaACancelar(null)
      toast({
        title: "Reserva cancelada",
        description: "La reserva ha sido cancelada correctamente.",
      })
      setCargando(true)
      await cargarReservas()
    } catch {
      setErrorCancelacion("Error de conexión. Inténtalo de nuevo.")
    } finally {
      setCancelando(false)
    }
  }

  // Determina el badge de estado para reservas del historial
  function badgeHistorial(reserva: Reserva) {
    if (reserva.estado === "CANCELADA") {
      return <Badge variant="destructive">Cancelada</Badge>
    }
    // Estado ACTIVA en historial significa que ya pasó (completada)
    return (
      <Badge variant="secondary" className="bg-gray-100 text-gray-600">
        Completada
      </Badge>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-4 sm:py-8 space-y-6">
        {/* Cabecera */}
        <div>
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 mb-4"
          >
            ← Volver al inicio
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Mis reservas</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Gestiona tus reservas de pistas de pádel
          </p>
        </div>

        {/* Error global de carga */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Estado de carga */}
        {cargando ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : (
          <Tabs defaultValue="activas" className="w-full">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="activas">
                Activas
                {datos && datos.activas.length > 0 && (
                  <span className="ml-1.5 bg-blue-100 text-blue-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                    {datos.activas.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="historial">Historial</TabsTrigger>
              <TabsTrigger value="espera">
                Lista de espera
                {entradasEspera.length > 0 && (
                  <span className="ml-1.5 bg-orange-100 text-orange-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                    {entradasEspera.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Pestaña: Reservas activas */}
            <TabsContent value="activas">
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mt-2">
                {datos?.activas.length === 0 || !datos ? (
                  <div className="px-4 py-10 text-center text-sm text-gray-500">
                    No tienes reservas activas
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {datos.activas.map((reserva) => (
                      <li key={reserva.id} className="px-4 py-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          {/* Info de la reserva */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-gray-800 truncate">
                                {reserva.instalacion.nombre}
                              </p>
                              <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0 text-xs">
                                Activa
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">
                              {formatearFecha(reserva.fecha)}
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatearHora(reserva.horaInicio)} – {formatearHora(reserva.horaFin)}
                            </p>
                          </div>

                          {/* Botón cancelar */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 shrink-0"
                            onClick={() => abrirCancelacion(reserva)}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </TabsContent>

            {/* Pestaña: Historial */}
            <TabsContent value="historial">
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mt-2">
                {datos?.historial.length === 0 || !datos ? (
                  <div className="px-4 py-10 text-center text-sm text-gray-500">
                    No hay reservas en el historial
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {datos.historial.map((reserva) => (
                      <li key={reserva.id} className="px-4 py-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-gray-700">
                                {reserva.instalacion.nombre}
                              </p>
                              {badgeHistorial(reserva)}
                            </div>
                            <p className="text-sm text-gray-500">
                              {formatearFecha(reserva.fecha)}
                            </p>
                            <p className="text-sm text-gray-400">
                              {formatearHora(reserva.horaInicio)} – {formatearHora(reserva.horaFin)}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </TabsContent>

            {/* Pestaña: Lista de espera */}
            <TabsContent value="espera">
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mt-2">
                {entradasEspera.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-gray-500">
                    No estás en ninguna lista de espera
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {entradasEspera.map((entrada) => {
                      const notificado = entrada.estado === "NOTIFICADO"
                      return (
                        <li key={entrada.id} className="px-4 py-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-semibold text-gray-800">
                                  {entrada.instalacion.nombre}
                                </p>
                                {notificado ? (
                                  <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-0 text-xs">
                                    ¡Turno disponible!
                                  </Badge>
                                ) : (
                                  <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100 border-0 text-xs">
                                    posición {entrada.posicion}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">
                                {formatearFecha(entrada.fecha)}
                              </p>
                              <p className="text-sm text-gray-500">{entrada.horaInicio}</p>
                            </div>

                            {notificado ? (
                              <Button
                                size="sm"
                                className="bg-orange-500 hover:bg-orange-600 text-white shrink-0"
                                onClick={() => confirmarDesdeEspera(entrada)}
                                disabled={accionandoEspera === entrada.id}
                              >
                                {accionandoEspera === entrada.id ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                    Confirmando...
                                  </>
                                ) : "Confirmar reserva"}
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-gray-600 shrink-0"
                                onClick={() => abandonarEspera(entrada)}
                                disabled={accionandoEspera === entrada.id}
                              >
                                Abandonar
                              </Button>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Dialog de confirmación de cancelación */}
      <Dialog open={dialogAbierto} onOpenChange={(abierto) => { if (!abierto) cerrarDialog() }}>
        <DialogContent className="max-w-md w-[calc(100%-2rem)] sm:w-full max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cancelar reserva</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>

          {/* Detalles de la reserva a cancelar */}
          {reservaACancelar && (
            <div className="space-y-2 py-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Pista</span>
                <span className="font-medium text-gray-800">{reservaACancelar.instalacion.nombre}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Fecha</span>
                <span className="font-medium text-gray-800">
                  {formatearFecha(reservaACancelar.fecha)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Hora</span>
                <span className="font-medium text-gray-800">
                  {formatearHora(reservaACancelar.horaInicio)} – {formatearHora(reservaACancelar.horaFin)}
                </span>
              </div>
            </div>
          )}

          {/* Error de cancelación */}
          {errorCancelacion && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {errorCancelacion}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={cerrarDialog}
              disabled={cancelando}
            >
              Volver
            </Button>
            <Button
              variant="destructive"
              onClick={confirmarCancelacion}
              disabled={cancelando}
              className="flex items-center gap-2"
            >
              {cancelando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cancelando...
                </>
              ) : "Confirmar cancelación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
