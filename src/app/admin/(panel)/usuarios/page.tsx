"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { formatearFechaCorta } from "@/lib/formato"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
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

interface Usuario {
  id: string
  nombre: string
  email: string
  rol: string
  creadoEn: string
  noShows: number
  suspendidoHasta: string | null
  motivoSuspension: string | null
}

/** Devuelve true si la fecha de suspensión es futura */
function tieneSuspensionActiva(suspendidoHasta: string | null): boolean {
  if (!suspendidoHasta) return false
  return new Date(suspendidoHasta) > new Date()
}

/** Formatea una fecha ISO a DD/MM/AAAA */
function formatearFechaDD(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })
}

/** Calcula la fecha mínima para el input de fecha (mañana) */
function fechaMinimaSuspension(): string {
  const manana = new Date()
  manana.setDate(manana.getDate() + 1)
  return manana.toISOString().split("T")[0]
}

export default function PaginaUsuariosAdmin() {
  const { data: session } = useSession()

  // Título de la pestaña del navegador
  useEffect(() => { document.title = "Usuarios" }, [])

  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogNuevo, setDialogNuevo] = useState(false)
  const [formNuevo, setFormNuevo] = useState({
    nombre: "",
    email: "",
    password: "",
    rol: "ADMIN",
  })
  const [guardando, setGuardando] = useState(false)

  // ── Estado de suspensión manual ───────────────────────────────────────────
  const [dialogSuspender, setDialogSuspender] = useState(false)
  const [usuarioParaSuspender, setUsuarioParaSuspender] = useState<Usuario | null>(null)
  const [formSuspension, setFormSuspension] = useState({
    suspendidoHasta: "",
    motivoSuspension: "",
  })
  const [suspendiendo, setSuspendiendo] = useState(false)

  const [dialogLevantarSuspension, setDialogLevantarSuspension] = useState(false)
  const [usuarioParaLevantar, setUsuarioParaLevantar] = useState<Usuario | null>(null)
  const [levantando, setLevantando] = useState(false)

  // Cargar usuarios
  async function cargarUsuarios() {
    try {
      setCargando(true)
      const res = await fetch("/api/admin/usuarios")
      if (!res.ok) {
        throw new Error("Error al cargar usuarios")
      }
      const data = await res.json()
      setUsuarios(data.usuarios || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarUsuarios()
  }, [])

  // Crear nuevo usuario
  async function handleCrearAdmin() {
    if (!formNuevo.nombre.trim()) {
      setError("El nombre es obligatorio")
      return
    }
    if (!formNuevo.email.trim()) {
      setError("El email es obligatorio")
      return
    }
    if (!formNuevo.password.trim()) {
      setError("La contraseña es obligatoria")
      return
    }
    if (formNuevo.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres")
      return
    }

    try {
      setGuardando(true)
      const res = await fetch("/api/admin/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: formNuevo.nombre,
          email: formNuevo.email,
          password: formNuevo.password,
          rol: formNuevo.rol,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Error al crear usuario")
      }

      setDialogNuevo(false)
      setFormNuevo({ nombre: "", email: "", password: "", rol: "ADMIN" })
      cargarUsuarios()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setGuardando(false)
    }
  }

  // Eliminar usuario
  async function handleEliminarUsuario(id: string) {
    if (!confirm("¿Estás seguro de que deseas eliminar este usuario?")) return

    try {
      const res = await fetch(`/api/admin/usuarios/${id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Error al eliminar usuario")
      }

      cargarUsuarios()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar")
    }
  }

  // Suspender usuario manualmente
  async function handleSuspender() {
    if (!usuarioParaSuspender) return

    if (!formSuspension.suspendidoHasta) {
      setError("La fecha de fin es obligatoria")
      return
    }
    if (!formSuspension.motivoSuspension.trim()) {
      setError("El motivo es obligatorio")
      return
    }

    try {
      setSuspendiendo(true)
      const res = await fetch(`/api/admin/usuarios/${usuarioParaSuspender.id}/suspender`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          suspendidoHasta: new Date(formSuspension.suspendidoHasta).toISOString(),
          motivoSuspension: formSuspension.motivoSuspension,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Error al suspender usuario")
      }

      setDialogSuspender(false)
      setUsuarioParaSuspender(null)
      setFormSuspension({ suspendidoHasta: "", motivoSuspension: "" })
      cargarUsuarios()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al suspender")
    } finally {
      setSuspendiendo(false)
    }
  }

  // Levantar suspensión
  async function handleLevantarSuspension() {
    if (!usuarioParaLevantar) return

    try {
      setLevantando(true)
      const res = await fetch(`/api/admin/usuarios/${usuarioParaLevantar.id}/levantar-suspension`, {
        method: "PATCH",
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Error al levantar la suspensión")
      }

      setDialogLevantarSuspension(false)
      setUsuarioParaLevantar(null)
      cargarUsuarios()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al levantar la suspensión")
    } finally {
      setLevantando(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Cabecera */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Gestión de Usuarios</h1>
            <p className="text-sm sm:text-base text-gray-500 mt-1">
              Crea y elimina cuentas de usuario (admins e instructores)
            </p>
          </div>
          <Button
            onClick={() => setDialogNuevo(true)}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
          >
            Nuevo usuario
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
          ) : usuarios.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No hay usuarios en el sistema
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Nombre</TableHead>
                    <TableHead className="text-xs">Email</TableHead>
                    <TableHead className="text-xs">Rol</TableHead>
                    <TableHead className="text-xs">Creado el</TableHead>
                    <TableHead className="text-xs text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuarios.map((usuario) => {
                    const suspendido = tieneSuspensionActiva(usuario.suspendidoHasta)
                    return (
                      <TableRow key={usuario.id}>
                        <TableCell className="font-medium text-sm">
                          <div className="flex flex-wrap items-center gap-2">
                            <span>{usuario.nombre}</span>
                            {/* Badge de suspensión activa */}
                            {suspendido && usuario.suspendidoHasta && (
                              <Badge className="bg-red-100 text-red-700 text-xs whitespace-nowrap">
                                Suspendido hasta {formatearFechaDD(usuario.suspendidoHasta)}
                              </Badge>
                            )}
                            {/* Badge de no-shows */}
                            {usuario.noShows > 0 && (
                              <Badge className="bg-gray-100 text-gray-600 text-xs whitespace-nowrap">
                                {usuario.noShows} no-shows
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {usuario.email}
                        </TableCell>
                        <TableCell>
                          <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {usuario.rol}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {formatearFechaCorta(usuario.creadoEn)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap items-center justify-end gap-1">
                            {/* Botón suspender / levantar suspensión */}
                            {usuario.id !== session?.user?.id && (
                              <>
                                {suspendido ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                    onClick={() => {
                                      setUsuarioParaLevantar(usuario)
                                      setDialogLevantarSuspension(true)
                                    }}
                                  >
                                    Levantar suspensión
                                  </Button>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                    onClick={() => {
                                      setUsuarioParaSuspender(usuario)
                                      setFormSuspension({ suspendidoHasta: "", motivoSuspension: "" })
                                      setError(null)
                                      setDialogSuspender(true)
                                    }}
                                  >
                                    Suspender
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleEliminarUsuario(usuario.id)}
                                >
                                  Eliminar
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* Dialog de crear nuevo usuario */}
      <Dialog open={dialogNuevo} onOpenChange={setDialogNuevo}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Crear nuevo usuario</DialogTitle>
            <DialogDescription>
              Añade una nueva cuenta de administrador o instructor
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="nombre">Nombre completo</Label>
              <Input
                id="nombre"
                value={formNuevo.nombre}
                onChange={(e) =>
                  setFormNuevo({ ...formNuevo, nombre: e.target.value })
                }
                placeholder="Ej: Juan García"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formNuevo.email}
                onChange={(e) =>
                  setFormNuevo({ ...formNuevo, email: e.target.value })
                }
                placeholder="Ej: juan@ayuntamiento.es"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={formNuevo.password}
                onChange={(e) =>
                  setFormNuevo({ ...formNuevo, password: e.target.value })
                }
                placeholder="Mínimo 6 caracteres, una mayúscula"
                className="mt-1"
              />
              {formNuevo.password.length > 0 && formNuevo.password.length < 6 && (
                <p className="text-xs text-red-600 mt-1">Mínimo 6 caracteres</p>
              )}
              {formNuevo.password.length >= 6 && !/[A-Z]/.test(formNuevo.password) && (
                <p className="text-xs text-red-600 mt-1">Debe contener al menos una letra mayúscula</p>
              )}
            </div>

            <div>
              <Label>Rol</Label>
              <div className="space-y-2 mt-1">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="rol"
                    value="ADMIN"
                    checked={formNuevo.rol === "ADMIN"}
                    onChange={(e) => setFormNuevo({ ...formNuevo, rol: e.target.value })}
                  />
                  <span className="text-sm">Administrador</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="rol"
                    value="INSTRUCTOR"
                    checked={formNuevo.rol === "INSTRUCTOR"}
                    onChange={(e) => setFormNuevo({ ...formNuevo, rol: e.target.value })}
                  />
                  <span className="text-sm">Instructor</span>
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogNuevo(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCrearAdmin}
              disabled={guardando}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {guardando ? "Creando..." : "Crear usuario"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de suspensión manual */}
      <Dialog open={dialogSuspender} onOpenChange={setDialogSuspender}>
        <DialogContent className="max-w-md w-[calc(100%-2rem)] sm:w-full">
          <DialogHeader>
            <DialogTitle>Suspender usuario</DialogTitle>
            <DialogDescription>
              {usuarioParaSuspender
                ? `Indica el período de suspensión para ${usuarioParaSuspender.nombre}`
                : "Configura la suspensión del usuario"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="suspension-fecha-fin">Fecha fin</Label>
              <Input
                id="suspension-fecha-fin"
                type="date"
                min={fechaMinimaSuspension()}
                value={formSuspension.suspendidoHasta}
                onChange={(e) =>
                  setFormSuspension({ ...formSuspension, suspendidoHasta: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="suspension-motivo">Motivo</Label>
              <Input
                id="suspension-motivo"
                type="text"
                placeholder="Motivo de la suspensión"
                value={formSuspension.motivoSuspension}
                onChange={(e) =>
                  setFormSuspension({ ...formSuspension, motivoSuspension: e.target.value })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogSuspender(false)
                setUsuarioParaSuspender(null)
              }}
              disabled={suspendiendo}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleSuspender}
              disabled={suspendiendo}
            >
              {suspendiendo ? "Suspendiendo..." : "Confirmar suspensión"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de levantar suspensión */}
      <Dialog open={dialogLevantarSuspension} onOpenChange={setDialogLevantarSuspension}>
        <DialogContent className="max-w-md w-[calc(100%-2rem)] sm:w-full">
          <DialogHeader>
            <DialogTitle>Levantar suspensión</DialogTitle>
            <DialogDescription>
              {usuarioParaLevantar
                ? `¿Confirmas que deseas levantar la suspensión de ${usuarioParaLevantar.nombre}?`
                : "¿Confirmas que deseas levantar la suspensión?"}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogLevantarSuspension(false)
                setUsuarioParaLevantar(null)
              }}
              disabled={levantando}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleLevantarSuspension}
              disabled={levantando}
            >
              {levantando ? "Procesando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
