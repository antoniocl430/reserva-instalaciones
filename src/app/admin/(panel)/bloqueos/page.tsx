"use client"

import { useEffect, useState } from "react"
import { formatearFechaCorta } from "@/lib/formato"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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

interface Bloqueo {
  id: string
  fechaInicio: string
  fechaFin: string
  motivo: string
  instalacion: {
    id: string
    nombre: string
  }
}

interface Pista {
  id: string
  nombre: string
}

export default function PaginaBloqueoAdmin() {
  // Título de la pestaña del navegador
  useEffect(() => { document.title = "Bloqueos" }, [])

  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([])
  const [pistas, setPistas] = useState<Pista[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogNuevo, setDialogNuevo] = useState(false)
  const [formNuevo, setFormNuevo] = useState({
    instalacionId: "",
    fechaInicio: "",
    fechaFin: "",
    motivo: "",
  })
  const [guardando, setGuardando] = useState(false)

  // Cargar bloqueos y pistas
  async function cargarDatos() {
    try {
      setCargando(true)
      const [resBloqueos, resPistas] = await Promise.all([
        fetch("/api/admin/bloqueos"),
        fetch("/api/admin/pistas"),
      ])

      if (!resBloqueos.ok || !resPistas.ok) {
        throw new Error("Error al cargar datos")
      }

      const dataBloqueos = await resBloqueos.json()
      const dataPistas = await resPistas.json()

      setBloqueos(dataBloqueos.bloqueos || [])
      setPistas(dataPistas.instalaciones || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  // Crear nuevo bloqueo
  async function handleCrearBloqueo() {
    if (!formNuevo.instalacionId.trim()) {
      setError("Debes seleccionar una pista")
      return
    }
    if (!formNuevo.fechaInicio.trim()) {
      setError("La fecha de inicio es obligatoria")
      return
    }
    if (!formNuevo.fechaFin.trim()) {
      setError("La fecha de fin es obligatoria")
      return
    }

    try {
      setGuardando(true)
      const res = await fetch("/api/admin/bloqueos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instalacionId: formNuevo.instalacionId,
          fechaInicio: formNuevo.fechaInicio,
          fechaFin: formNuevo.fechaFin,
          motivo: formNuevo.motivo || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Error al crear bloqueo")
      }

      setDialogNuevo(false)
      setFormNuevo({
        instalacionId: "",
        fechaInicio: "",
        fechaFin: "",
        motivo: "",
      })
      cargarDatos()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setGuardando(false)
    }
  }

  // Eliminar bloqueo
  async function handleEliminarBloqueo(id: string) {
    if (!confirm("¿Estás seguro de que deseas eliminar este bloqueo?")) return

    try {
      const res = await fetch(`/api/admin/bloqueos/${id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        throw new Error("Error al eliminar bloqueo")
      }

      cargarDatos()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar")
    }
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Cabecera */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Gestión de Bloqueos</h1>
            <p className="text-sm sm:text-base text-gray-500 mt-1">
              Bloquea fechas y franjas horarias para mantenimiento o eventos
            </p>
          </div>
          <Button
            onClick={() => setDialogNuevo(true)}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
          >
            Nuevo bloqueo
          </Button>
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
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
            </div>
          ) : bloqueos.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No hay bloqueos activos
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Pista</TableHead>
                    <TableHead className="text-xs">Fecha inicio</TableHead>
                    <TableHead className="text-xs">Fecha fin</TableHead>
                    <TableHead className="text-xs">Motivo</TableHead>
                    <TableHead className="text-xs text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bloqueos.map((bloqueo) => (
                    <TableRow key={bloqueo.id}>
                      <TableCell className="font-medium text-sm">
                        {bloqueo.instalacion.nombre}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatearFechaCorta(bloqueo.fechaInicio)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatearFechaCorta(bloqueo.fechaFin)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {bloqueo.motivo || "Sin especificar"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleEliminarBloqueo(bloqueo.id)}
                        >
                          Eliminar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* Dialog de crear nuevo bloqueo */}
      <Dialog open={dialogNuevo} onOpenChange={setDialogNuevo}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Crear bloqueo</DialogTitle>
            <DialogDescription>
              Bloquea una pista durante un período de fechas
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="pista">Seleccionar pista</Label>
              <Select
                value={formNuevo.instalacionId}
                onValueChange={(value) =>
                  setFormNuevo({ ...formNuevo, instalacionId: value })
                }
              >
                <SelectTrigger id="pista" className="mt-1">
                  <SelectValue placeholder="Selecciona una pista..." />
                </SelectTrigger>
                <SelectContent>
                  {pistas.map((pista) => (
                    <SelectItem key={pista.id} value={pista.id}>
                      {pista.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="fechaInicio">Fecha de inicio</Label>
              <Input
                id="fechaInicio"
                type="date"
                value={formNuevo.fechaInicio}
                onChange={(e) =>
                  setFormNuevo({ ...formNuevo, fechaInicio: e.target.value })
                }
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="fechaFin">Fecha de fin</Label>
              <Input
                id="fechaFin"
                type="date"
                value={formNuevo.fechaFin}
                onChange={(e) =>
                  setFormNuevo({ ...formNuevo, fechaFin: e.target.value })
                }
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="motivo">Motivo (opcional)</Label>
              <Textarea
                id="motivo"
                value={formNuevo.motivo}
                onChange={(e) =>
                  setFormNuevo({ ...formNuevo, motivo: e.target.value })
                }
                placeholder="Ej: Mantenimiento, evento especial..."
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogNuevo(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCrearBloqueo}
              disabled={guardando}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {guardando ? "Creando..." : "Crear bloqueo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
