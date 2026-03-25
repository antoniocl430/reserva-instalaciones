"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
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

interface Pista {
  id: string
  nombre: string
  tipo: string
  descripcion: string | null
  horario: string
  activa: boolean
}

export default function PaginaPistasAdmin() {
  const [pistas, setPistas] = useState<Pista[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogNueva, setDialogNueva] = useState(false)
  const [formNueva, setFormNueva] = useState({ nombre: "", descripcion: "", horario: "" })
  const [guardando, setGuardando] = useState(false)
  const [dialogEditar, setDialogEditar] = useState(false)
  const [pistaEditando, setPistaEditando] = useState<Pista | null>(null)
  const [formEditar, setFormEditar] = useState({ nombre: "", descripcion: "", horario: "" })

  // Cargar pistas
  async function cargarPistas() {
    try {
      setCargando(true)
      const res = await fetch("/api/admin/pistas")
      if (!res.ok) {
        throw new Error("Error al cargar pistas")
      }
      const data = await res.json()
      setPistas(data.instalaciones || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarPistas()
  }, [])

  // Crear nueva pista
  async function handleCrearPista() {
    if (!formNueva.nombre.trim()) {
      setError("El nombre de la pista es obligatorio")
      return
    }

    try {
      setGuardando(true)
      const res = await fetch("/api/admin/pistas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: formNueva.nombre,
          tipo: "PADEL",
          descripcion: formNueva.descripcion || null,
          horario: formNueva.horario || "Lun-Dom: 8:00-13:00 y 16:45-20:30",
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Error al crear pista")
      }

      setDialogNueva(false)
      setFormNueva({ nombre: "", descripcion: "", horario: "Lun-Dom: 8:00-13:00 y 16:45-20:30" })
      cargarPistas()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setGuardando(false)
    }
  }

  // Abrir dialog de editar
  function abrirEditar(pista: Pista) {
    setPistaEditando(pista)
    setFormEditar({ nombre: pista.nombre, descripcion: pista.descripcion || "", horario: pista.horario })
    setDialogEditar(true)
  }

  // Guardar cambios de la pista
  async function handleGuardarEdicion() {
    if (!formEditar.nombre.trim()) {
      setError("El nombre de la pista es obligatorio")
      return
    }

    if (!pistaEditando) return

    try {
      setGuardando(true)
      const res = await fetch(`/api/admin/pistas/${pistaEditando.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: formEditar.nombre,
          descripcion: formEditar.descripcion || null,
          horario: formEditar.horario || "Lun-Dom: 8:00-13:00 y 16:45-20:30",
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Error al actualizar pista")
      }

      setDialogEditar(false)
      setPistaEditando(null)
      setFormEditar({ nombre: "", descripcion: "", horario: "Lun-Dom: 8:00-13:00 y 16:45-20:30" })
      cargarPistas()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setGuardando(false)
    }
  }

  // Activar/Desactivar pista
  async function handleCambiarEstado(pista: Pista) {
    try {
      const res = await fetch(`/api/admin/pistas/${pista.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activa: !pista.activa }),
      })

      if (!res.ok) {
        throw new Error("Error al actualizar pista")
      }

      cargarPistas()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar")
    }
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Cabecera */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Gestión de Pistas</h1>
            <p className="text-sm sm:text-base text-gray-500 mt-1">
              Crea, edita y gestiona las instalaciones deportivas disponibles
            </p>
          </div>
          <Button
            onClick={() => setDialogNueva(true)}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
          >
            Nueva pista
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
              Cargando pistas...
            </div>
          ) : pistas.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No hay pistas creadas. Crea la primera pista.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Nombre</TableHead>
                    <TableHead className="text-xs">Tipo</TableHead>
                    <TableHead className="text-xs">Descripción</TableHead>
                    <TableHead className="text-xs">Horario</TableHead>
                    <TableHead className="text-xs">Estado</TableHead>
                    <TableHead className="text-xs text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pistas.map((pista) => (
                    <TableRow key={pista.id}>
                      <TableCell className="font-medium text-sm">
                        {pista.nombre}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {pista.tipo === "PADEL" ? "Padel" : pista.tipo}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {pista.descripcion ? (
                          <div className="max-w-xs truncate">{pista.descripcion}</div>
                        ) : (
                          <span className="text-gray-400 italic">Sin descripción</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        <div className="max-w-xs truncate text-xs">{pista.horario}</div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            pista.activa
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }
                        >
                          {pista.activa ? "Activa" : "Inactiva"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => abrirEditar(pista)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCambiarEstado(pista)}
                          className={
                            pista.activa
                              ? "text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                              : "text-green-600 hover:text-green-700 hover:bg-green-50"
                          }
                        >
                          {pista.activa ? "Desactivar" : "Activar"}
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

      {/* Dialog de crear nueva pista */}
      <Dialog open={dialogNueva} onOpenChange={setDialogNueva}>
        <DialogContent className="max-w-md w-[calc(100%-2rem)] sm:w-full">
          <DialogHeader>
            <DialogTitle>Crear nueva pista</DialogTitle>
            <DialogDescription>
              Añade una nueva instalación al sistema
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="nombre">Nombre de la pista</Label>
              <Input
                id="nombre"
                value={formNueva.nombre}
                onChange={(e) =>
                  setFormNueva({ ...formNueva, nombre: e.target.value })
                }
                placeholder="Ej: Pista 1, Pista 2..."
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="descripcion">Descripción (opcional)</Label>
              <Textarea
                id="descripcion"
                value={formNueva.descripcion}
                onChange={(e) =>
                  setFormNueva({ ...formNueva, descripcion: e.target.value })
                }
                placeholder="Ej: Ubicada en el pabellón norte..."
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="horario">Horario (opcional)</Label>
              <Input
                id="horario"
                value={formNueva.horario}
                onChange={(e) =>
                  setFormNueva({ ...formNueva, horario: e.target.value })
                }
                placeholder="Lun-Dom: 8:00-13:00 y 16:45-20:30"
                className="mt-1"
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700">
              El tipo de instalación es siempre Padel
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogNueva(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCrearPista}
              disabled={guardando}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {guardando ? "Creando..." : "Crear pista"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de editar pista */}
      <Dialog open={dialogEditar} onOpenChange={setDialogEditar}>
        <DialogContent className="max-w-md w-[calc(100%-2rem)] sm:w-full">
          <DialogHeader>
            <DialogTitle>Editar pista</DialogTitle>
            <DialogDescription>
              Actualiza los datos de la instalación
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="editar-nombre">Nombre de la pista</Label>
              <Input
                id="editar-nombre"
                value={formEditar.nombre}
                onChange={(e) =>
                  setFormEditar({ ...formEditar, nombre: e.target.value })
                }
                placeholder="Ej: Pista 1, Pista 2..."
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="editar-descripcion">Descripción (opcional)</Label>
              <Textarea
                id="editar-descripcion"
                value={formEditar.descripcion}
                onChange={(e) =>
                  setFormEditar({ ...formEditar, descripcion: e.target.value })
                }
                placeholder="Ej: Ubicada en el pabellón norte..."
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="editar-horario">Horario (opcional)</Label>
              <Input
                id="editar-horario"
                value={formEditar.horario}
                onChange={(e) =>
                  setFormEditar({ ...formEditar, horario: e.target.value })
                }
                placeholder="Lun-Dom: 8:00-13:00 y 16:45-20:30"
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogEditar(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleGuardarEdicion}
              disabled={guardando}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {guardando ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
