"use client"

import { useEffect, useState } from "react"
import { formatearFechaCorta, formatearHora } from "@/lib/formato"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface Reserva {
  id: string
  horaInicio: string
  horaFin: string
  estado: string
  usuario: {
    nombre: string
    email: string
  }
  instalacion: {
    nombre: string
  }
}

interface Ciudadano {
  id: string
  nombre: string
  email: string
}

interface Pista {
  id: string
  nombre: string
}

export default function PaginaReservasAdmin() {
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtroEstado, setFiltroEstado] = useState("")
  const [filtroFecha, setFiltroFecha] = useState("")
  const [dialogCancelar, setDialogCancelar] = useState(false)
  const [reservaSeleccionada, setReservaSeleccionada] = useState<Reserva | null>(null)
  const [cancelando, setCancelando] = useState(false)

  // Dialog para crear nueva reserva
  const [dialogNuevaReserva, setDialogNuevaReserva] = useState(false)
  const [ciudadanos, setCiudadanos] = useState<Ciudadano[]>([])
  const [pistas, setPistas] = useState<Pista[]>([])
  const [cargandoSelects, setCargandoSelects] = useState(false)
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState("")
  const [pistaSeleccionada, setPistaSeleccionada] = useState("")
  const [fechaNuevaReserva, setFechaNuevaReserva] = useState("")
  const [horaNuevaReserva, setHoraNuevaReserva] = useState("")
  const [creandoReserva, setCreandoReserva] = useState(false)

  const SLOTS_DISPONIBLES = ["08:00", "09:15", "10:30", "11:45", "16:45", "18:00", "19:15"]

  // Cargar reservas
  async function cargarReservas() {
    try {
      setCargando(true)
      const params = new URLSearchParams()
      if (filtroEstado) params.append("estado", filtroEstado)
      if (filtroFecha) params.append("fecha", filtroFecha)

      const res = await fetch(`/api/admin/reservas?${params.toString()}`)
      if (!res.ok) {
        throw new Error("Error al cargar reservas")
      }
      const data = await res.json()
      setReservas(data.reservas || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setCargando(false)
    }
  }

  // Cargar ciudadanos y pistas para el dialog
  async function cargarSelectores() {
    try {
      setCargandoSelects(true)
      const [resCiudadanos, resPistas] = await Promise.all([
        fetch("/api/admin/ciudadanos"),
        fetch("/api/admin/pistas"),
      ])

      if (!resCiudadanos.ok || !resPistas.ok) {
        throw new Error("Error al cargar datos")
      }

      const dataCiudadanos = await resCiudadanos.json()
      const dataPistas = await resPistas.json()

      setCiudadanos(dataCiudadanos.ciudadanos || [])
      setPistas(dataPistas.instalaciones || [])
    } catch (err) {
      console.error("Error cargando selectores:", err)
    } finally {
      setCargandoSelects(false)
    }
  }

  // Crear nueva reserva
  async function handleCrearReserva() {
    if (!usuarioSeleccionado || !pistaSeleccionada || !fechaNuevaReserva || !horaNuevaReserva) {
      setError("Completa todos los campos requeridos")
      return
    }

    try {
      setCreandoReserva(true)
      const res = await fetch("/api/admin/reservas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuarioId: usuarioSeleccionado,
          instalacionId: pistaSeleccionada,
          fecha: fechaNuevaReserva,
          horaInicio: horaNuevaReserva,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Error al crear reserva")
      }

      // Reset del formulario y cierre del dialog
      setDialogNuevaReserva(false)
      setUsuarioSeleccionado("")
      setPistaSeleccionada("")
      setFechaNuevaReserva("")
      setHoraNuevaReserva("")

      // Recargar lista
      cargarReservas()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear reserva")
    } finally {
      setCreandoReserva(false)
    }
  }

  useEffect(() => {
    cargarReservas()
  }, [filtroEstado, filtroFecha])

  // Cargar selectores cuando se abre el dialog
  useEffect(() => {
    if (dialogNuevaReserva) {
      cargarSelectores()
    }
  }, [dialogNuevaReserva])

  // Cancelar reserva
  async function handleCancelar() {
    if (!reservaSeleccionada) return

    try {
      setCancelando(true)
      const res = await fetch(`/api/admin/reservas/${reservaSeleccionada.id}/cancelar`, {
        method: "PATCH",
      })

      if (!res.ok) {
        throw new Error("Error al cancelar reserva")
      }

      setDialogCancelar(false)
      setReservaSeleccionada(null)
      cargarReservas()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cancelar")
    } finally {
      setCancelando(false)
    }
  }

  const badgeColorPorEstado = {
    ACTIVA: "bg-green-100 text-green-700",
    CANCELADA: "bg-gray-100 text-gray-700",
    COMPLETADA: "bg-blue-100 text-blue-700",
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Cabecera */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Gestión de Reservas</h1>
            <p className="text-sm sm:text-base text-gray-500 mt-1">Visualiza y gestiona todas las reservas del sistema</p>
          </div>
          <Button
            onClick={() => {
              setDialogNuevaReserva(true)
              setError(null)
            }}
            className="sm:w-auto"
          >
            Nueva reserva
          </Button>
        </div>

        {/* Filtros */}
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 space-y-3 sm:space-y-0 sm:flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="flex-1 sm:min-w-48">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Estado
            </label>
            <Select value={filtroEstado || "todos"} onValueChange={(v) => setFiltroEstado(v === "todos" ? "" : v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="ACTIVA">Activas</SelectItem>
                <SelectItem value="CANCELADA">Canceladas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 sm:min-w-48">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Fecha
            </label>
            <Input
              type="date"
              value={filtroFecha}
              onChange={(e) => setFiltroFecha(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => {
                setFiltroEstado("")
                setFiltroFecha("")
              }}
              className="w-full sm:w-auto"
            >
              Limpiar filtros
            </Button>
          </div>
        </div>

        {/* Mensaje de error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Tabla */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {cargando ? (
            <div className="p-8 text-center text-gray-500">
              Cargando reservas...
            </div>
          ) : reservas.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No hay reservas que mostrar
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Pista</TableHead>
                    <TableHead className="text-xs">Usuario</TableHead>
                    <TableHead className="text-xs">Fecha</TableHead>
                    <TableHead className="text-xs">Hora</TableHead>
                    <TableHead className="text-xs">Estado</TableHead>
                    <TableHead className="text-xs text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reservas.map((reserva) => (
                    <TableRow key={reserva.id}>
                      <TableCell className="font-medium text-sm">
                        {reserva.instalacion.nombre}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        <div>{reserva.usuario.nombre}</div>
                        <div className="text-xs text-gray-400">{reserva.usuario.email}</div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatearFechaCorta(reserva.horaInicio)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatearHora(reserva.horaInicio)} – {formatearHora(reserva.horaFin)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            badgeColorPorEstado[
                              reserva.estado as keyof typeof badgeColorPorEstado
                            ] || "bg-gray-100 text-gray-700"
                          }
                        >
                          {reserva.estado === "ACTIVA"
                            ? "Activa"
                            : reserva.estado === "CANCELADA"
                            ? "Cancelada"
                            : "Completada"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {reserva.estado === "ACTIVA" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              setReservaSeleccionada(reserva)
                              setDialogCancelar(true)
                            }}
                          >
                            Cancelar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* Dialog de confirmación de cancelación */}
      <Dialog open={dialogCancelar} onOpenChange={setDialogCancelar}>
        <DialogContent className="max-w-md w-[calc(100%-2rem)] sm:w-full">
          <DialogHeader>
            <DialogTitle>Cancelar reserva</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas cancelar esta reserva?
            </DialogDescription>
          </DialogHeader>

          {reservaSeleccionada && (
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium">Pista:</span> {reservaSeleccionada.instalacion.nombre}
              </p>
              <p>
                <span className="font-medium">Usuario:</span> {reservaSeleccionada.usuario.nombre}
              </p>
              <p>
                <span className="font-medium">Fecha:</span>{" "}
                {formatearFechaCorta(reservaSeleccionada.horaInicio)}
              </p>
              <p>
                <span className="font-medium">Hora:</span>{" "}
                {formatearHora(reservaSeleccionada.horaInicio)} –{" "}
                {formatearHora(reservaSeleccionada.horaFin)}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogCancelar(false)}>
              No, mantener
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelar}
              disabled={cancelando}
            >
              {cancelando ? "Cancelando..." : "Sí, cancelar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para crear nueva reserva */}
      <Dialog open={dialogNuevaReserva} onOpenChange={setDialogNuevaReserva}>
        <DialogContent className="max-w-md w-[calc(100%-2rem)] sm:w-full">
          <DialogHeader>
            <DialogTitle>Nueva reserva</DialogTitle>
            <DialogDescription>
              Crea una reserva manualmente a nombre de un ciudadano
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Select de usuario */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ciudadano
              </label>
              <Select value={usuarioSeleccionado} onValueChange={setUsuarioSeleccionado}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona un ciudadano" />
                </SelectTrigger>
                <SelectContent>
                  {cargandoSelects ? (
                    <div className="p-2 text-sm text-gray-500">Cargando...</div>
                  ) : ciudadanos.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500">No hay ciudadanos disponibles</div>
                  ) : (
                    ciudadanos.map((ciudadano) => (
                      <SelectItem key={ciudadano.id} value={ciudadano.id}>
                        {ciudadano.nombre} ({ciudadano.email})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Select de pista */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pista
              </label>
              <Select value={pistaSeleccionada} onValueChange={setPistaSeleccionada}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona una pista" />
                </SelectTrigger>
                <SelectContent>
                  {cargandoSelects ? (
                    <div className="p-2 text-sm text-gray-500">Cargando...</div>
                  ) : pistas.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500">No hay pistas disponibles</div>
                  ) : (
                    pistas.map((pista) => (
                      <SelectItem key={pista.id} value={pista.id}>
                        {pista.nombre}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Input de fecha */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha
              </label>
              <Input
                type="date"
                value={fechaNuevaReserva}
                onChange={(e) => setFechaNuevaReserva(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Select de hora */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hora de inicio
              </label>
              <Select value={horaNuevaReserva} onValueChange={setHoraNuevaReserva}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona una hora" />
                </SelectTrigger>
                <SelectContent>
                  {SLOTS_DISPONIBLES.map((slot) => (
                    <SelectItem key={slot} value={slot}>
                      {slot}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogNuevaReserva(false)}
              disabled={creandoReserva}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCrearReserva}
              disabled={creandoReserva}
            >
              {creandoReserva ? "Creando..." : "Crear reserva"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
