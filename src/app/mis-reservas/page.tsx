"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2, ChevronLeft, Calendar, Clock, QrCode, X, Star, ClockIcon, ListOrdered } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
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
import QRCode from "react-qr-code"
import StarRating from "@/components/StarRating"

interface Valoracion {
  id: string
  puntuacion: number
  comentario: string | null
}

interface Reserva {
  id: string
  fecha: string
  horaInicio: string
  horaFin: string
  estado: "ACTIVA" | "CANCELADA"
  qrToken: string | null
  instalacion: { id: string; nombre: string }
  valoracion: Valoracion | null
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

  useEffect(() => { document.title = "Mis reservas" }, [])

  const [datos, setDatos] = useState<DatosReservas | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState("")
  const [entradasEspera, setEntradasEspera] = useState<EntradaEspera[]>([])
  const [accionandoEspera, setAccionandoEspera] = useState<string | null>(null)
  const [reservaACancelar, setReservaACancelar] = useState<Reserva | null>(null)
  const [dialogAbierto, setDialogAbierto] = useState(false)
  const [cancelando, setCancelando] = useState(false)
  const [errorCancelacion, setErrorCancelacion] = useState("")
  const [reservaQR, setReservaQR] = useState<Reserva | null>(null)
  const [dialogQRAbierto, setDialogQRAbierto] = useState(false)
  const [reservaAValorar, setReservaAValorar] = useState<Reserva | null>(null)
  const [dialogValoracionAbierto, setDialogValoracionAbierto] = useState(false)
  const [puntuacionSeleccionada, setPuntuacionSeleccionada] = useState(0)
  const [comentarioValoracion, setComentarioValoracion] = useState("")
  const [enviandoValoracion, setEnviandoValoracion] = useState(false)
  const [errorValoracion, setErrorValoracion] = useState("")

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

  useEffect(() => { cargarReservas() }, [])

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

  function abrirCancelacion(reserva: Reserva) {
    setReservaACancelar(reserva)
    setErrorCancelacion("")
    setDialogAbierto(true)
  }

  function cerrarDialog() {
    if (cancelando) return
    setDialogAbierto(false)
    setReservaACancelar(null)
    setErrorCancelacion("")
  }

  async function confirmarCancelacion() {
    if (!reservaACancelar) return
    setCancelando(true)
    setErrorCancelacion("")
    try {
      const res = await fetch(`/api/reservas/${reservaACancelar.id}/cancelar`, { method: "PATCH" })
      const json = await res.json()
      if (!res.ok) {
        setErrorCancelacion(json.error ?? "Error al cancelar la reserva")
        return
      }
      setDialogAbierto(false)
      setReservaACancelar(null)
      toast({ title: "Reserva cancelada", description: "La reserva ha sido cancelada correctamente." })
      setCargando(true)
      await cargarReservas()
    } catch {
      setErrorCancelacion("Error de conexión. Inténtalo de nuevo.")
    } finally {
      setCancelando(false)
    }
  }

  function abrirValoracion(reserva: Reserva) {
    setReservaAValorar(reserva)
    setPuntuacionSeleccionada(0)
    setComentarioValoracion("")
    setErrorValoracion("")
    setDialogValoracionAbierto(true)
  }

  function cerrarDialogValoracion() {
    if (enviandoValoracion) return
    setDialogValoracionAbierto(false)
    setReservaAValorar(null)
    setErrorValoracion("")
  }

  async function enviarValoracion() {
    if (!reservaAValorar || puntuacionSeleccionada === 0) return
    setEnviandoValoracion(true)
    setErrorValoracion("")
    try {
      const res = await fetch("/api/valoraciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservaId: reservaAValorar.id,
          puntuacion: puntuacionSeleccionada,
          comentario: comentarioValoracion.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setErrorValoracion(json.error ?? "Error al enviar la valoración")
        return
      }
      setDialogValoracionAbierto(false)
      setReservaAValorar(null)
      if (datos) {
        setDatos({
          ...datos,
          historial: datos.historial.map((r) =>
            r.id === reservaAValorar.id ? { ...r, valoracion: json.valoracion } : r
          ),
        })
      }
      toast({ title: "Valoración enviada", description: "Gracias por tu opinión." })
    } catch {
      setErrorValoracion("Error de conexión. Inténtalo de nuevo.")
    } finally {
      setEnviandoValoracion(false)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10">
        {/* Cabecera */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5"
          >
            <ChevronLeft className="w-4 h-4" />
            Inicio
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Mis reservas</h1>
          <p className="text-muted-foreground mt-1 text-sm">Gestiona tus reservas de instalaciones deportivas</p>
        </div>

        {/* Error global */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        {/* Skeleton de carga */}
        {cargando ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <Tabs defaultValue="activas" className="w-full">
            {/* Tabs */}
            <TabsList className="grid w-full grid-cols-3 bg-muted/60 p-1 rounded-xl h-auto mb-6">
              <TabsTrigger value="activas" className="rounded-lg text-xs sm:text-sm py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Calendar className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" />
                Activas
                {datos && datos.activas.length > 0 && (
                  <span className="ml-1.5 bg-blue-600 text-white text-xs font-semibold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {datos.activas.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="historial" className="rounded-lg text-xs sm:text-sm py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <ClockIcon className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" />
                Historial
              </TabsTrigger>
              <TabsTrigger value="espera" className="rounded-lg text-xs sm:text-sm py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <ListOrdered className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" />
                <span className="hidden sm:inline">Lista de espera</span>
                <span className="sm:hidden">Espera</span>
                {entradasEspera.length > 0 && (
                  <span className="ml-1.5 bg-orange-500 text-white text-xs font-semibold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {entradasEspera.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Reservas activas */}
            <TabsContent value="activas">
              {datos?.activas.length === 0 || !datos ? (
                <div className="bg-card border border-border rounded-xl px-4 py-14 text-center">
                  <Calendar className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No tienes reservas activas</p>
                  <Link href="/pistas" className="inline-flex items-center gap-1 mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors">
                    Ver instalaciones →
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {datos.activas.map((reserva) => (
                    <div key={reserva.id} className="bg-card border border-border rounded-xl p-5 hover:shadow-sm transition-shadow">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-foreground truncate">{reserva.instalacion.nombre}</p>
                            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400">
                              <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                              Activa
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              {formatearFecha(reserva.fecha)}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              {formatearHora(reserva.horaInicio)} – {formatearHora(reserva.horaFin)}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          {reserva.qrToken && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => { setReservaQR(reserva); setDialogQRAbierto(true) }}
                              className="gap-1.5"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                              QR
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:hover:bg-red-950/30 gap-1.5"
                            onClick={() => abrirCancelacion(reserva)}
                          >
                            <X className="w-3.5 h-3.5" />
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Historial */}
            <TabsContent value="historial">
              {datos?.historial.length === 0 || !datos ? (
                <div className="bg-card border border-border rounded-xl px-4 py-14 text-center">
                  <ClockIcon className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No hay reservas en el historial</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {datos.historial.map((reserva) => (
                    <div key={reserva.id} className="bg-card border border-border rounded-xl p-5 hover:shadow-sm transition-shadow">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-foreground/80 truncate">{reserva.instalacion.nombre}</p>
                            {reserva.estado === "CANCELADA" ? (
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400">
                                Cancelada
                              </span>
                            ) : (
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                Completada
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              {formatearFecha(reserva.fecha)}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              {formatearHora(reserva.horaInicio)} – {formatearHora(reserva.horaFin)}
                            </span>
                          </div>
                        </div>
                        {reserva.estado !== "CANCELADA" && (
                          <div className="shrink-0">
                            {reserva.valoracion ? (
                              <StarRating value={reserva.valoracion.puntuacion} size="sm" />
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => abrirValoracion(reserva)}
                                className="gap-1.5"
                              >
                                <Star className="w-3.5 h-3.5" />
                                Valorar
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Lista de espera */}
            <TabsContent value="espera">
              {entradasEspera.length === 0 ? (
                <div className="bg-card border border-border rounded-xl px-4 py-14 text-center">
                  <ListOrdered className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No estás en ninguna lista de espera</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {entradasEspera.map((entrada) => {
                    const notificado = entrada.estado === "NOTIFICADO"
                    return (
                      <div key={entrada.id} className={`bg-card border rounded-xl p-5 hover:shadow-sm transition-shadow ${notificado ? "border-orange-300 dark:border-orange-800" : "border-border"}`}>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-foreground truncate">{entrada.instalacion.nombre}</p>
                              {notificado ? (
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400 animate-pulse">
                                  ¡Turno disponible!
                                </span>
                              ) : (
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                  Posición {entrada.posicion}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                {formatearFecha(entrada.fecha)}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                {entrada.horaInicio}
                              </span>
                            </div>
                          </div>
                          {notificado ? (
                            <Button
                              size="sm"
                              className="bg-orange-500 hover:bg-orange-600 text-white shrink-0"
                              onClick={() => confirmarDesdeEspera(entrada)}
                              disabled={accionandoEspera === entrada.id}
                            >
                              {accionandoEspera === entrada.id ? (
                                <><Loader2 className="h-4 w-4 animate-spin mr-1" />Confirmando...</>
                              ) : "Confirmar reserva"}
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-muted-foreground shrink-0"
                              onClick={() => abandonarEspera(entrada)}
                              disabled={accionandoEspera === entrada.id}
                            >
                              Abandonar
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Dialog valoración */}
      <Dialog open={dialogValoracionAbierto} onOpenChange={(o) => { if (!o) cerrarDialogValoracion() }}>
        <DialogContent className="max-w-md w-[calc(100%-2rem)] sm:w-full max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Valorar instalación</DialogTitle>
            {reservaAValorar && (
              <DialogDescription>
                {reservaAValorar.instalacion.nombre} — {formatearFecha(reservaAValorar.fecha)}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex flex-col items-center gap-2">
              <p className="text-sm text-muted-foreground">¿Cómo valorarías esta instalación?</p>
              <StarRating value={puntuacionSeleccionada} interactive size="lg" onChange={setPuntuacionSeleccionada} />
            </div>
            <div className="space-y-1">
              <label htmlFor="comentario-valoracion" className="text-sm font-medium text-foreground">
                ¿Algo que reportar? (opcional)
              </label>
              <Textarea
                id="comentario-valoracion"
                placeholder="Escribe tu comentario aquí..."
                value={comentarioValoracion}
                onChange={(e) => setComentarioValoracion(e.target.value)}
                maxLength={500}
                className="resize-none"
                rows={3}
              />
              <p className="text-xs text-muted-foreground text-right">{comentarioValoracion.length}/500</p>
            </div>
            {errorValoracion && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
                {errorValoracion}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={cerrarDialogValoracion} disabled={enviandoValoracion}>Cancelar</Button>
            <Button onClick={enviarValoracion} disabled={puntuacionSeleccionada === 0 || enviandoValoracion}>
              {enviandoValoracion ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Enviando...</> : "Enviar valoración"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog QR */}
      <Dialog open={dialogQRAbierto} onOpenChange={setDialogQRAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Código QR de tu reserva</DialogTitle>
            <DialogDescription>Muestra este código en la entrada para verificar tu reserva.</DialogDescription>
          </DialogHeader>
          {reservaQR?.qrToken && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="bg-white p-4 rounded-xl">
                <QRCode value={`${typeof window !== "undefined" ? window.location.origin : ""}/verificar/${reservaQR.qrToken}`} size={200} />
              </div>
              <p className="text-sm text-muted-foreground text-center">{reservaQR.instalacion.nombre}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog cancelación */}
      <Dialog open={dialogAbierto} onOpenChange={(o) => { if (!o) cerrarDialog() }}>
        <DialogContent className="max-w-md w-[calc(100%-2rem)] sm:w-full max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cancelar reserva</DialogTitle>
            <DialogDescription>Esta acción no se puede deshacer.</DialogDescription>
          </DialogHeader>
          {reservaACancelar && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              {[
                { label: "Instalación", value: reservaACancelar.instalacion.nombre },
                { label: "Fecha", value: formatearFecha(reservaACancelar.fecha) },
                { label: "Hora", value: `${formatearHora(reservaACancelar.horaInicio)} – ${formatearHora(reservaACancelar.horaFin)}` },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium text-foreground">{value}</span>
                </div>
              ))}
            </div>
          )}
          {errorCancelacion && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
              {errorCancelacion}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={cerrarDialog} disabled={cancelando}>Volver</Button>
            <Button variant="destructive" onClick={confirmarCancelacion} disabled={cancelando}>
              {cancelando ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Cancelando...</> : "Confirmar cancelación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
