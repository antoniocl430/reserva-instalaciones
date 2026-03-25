"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { formatearFechaCorta } from "@/lib/formato"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

interface Usuario {
  id: string
  nombre: string
  email: string
  creadoEn: string
}

export default function PaginaUsuariosAdmin() {
  const { data: session } = useSession()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogNuevo, setDialogNuevo] = useState(false)
  const [formNuevo, setFormNuevo] = useState({
    nombre: "",
    email: "",
    password: "",
  })
  const [guardando, setGuardando] = useState(false)

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

  // Crear nuevo admin
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
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Error al crear usuario")
      }

      setDialogNuevo(false)
      setFormNuevo({ nombre: "", email: "", password: "" })
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

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Cabecera */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Gestión de Usuarios Admin</h1>
            <p className="text-sm sm:text-base text-gray-500 mt-1">
              Crea y elimina cuentas de administrador del sistema
            </p>
          </div>
          <Button
            onClick={() => setDialogNuevo(true)}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
          >
            Nuevo admin
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
              Cargando usuarios...
            </div>
          ) : usuarios.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No hay usuarios administrador
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Nombre</TableHead>
                    <TableHead className="text-xs">Email</TableHead>
                    <TableHead className="text-xs">Creado el</TableHead>
                    <TableHead className="text-xs text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuarios.map((usuario) => (
                    <TableRow key={usuario.id}>
                      <TableCell className="font-medium text-sm">
                        {usuario.nombre}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {usuario.email}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {formatearFechaCorta(usuario.creadoEn)}
                      </TableCell>
                      <TableCell className="text-right">
                        {usuario.id !== session?.user?.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleEliminarUsuario(usuario.id)}
                          >
                            Eliminar
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

      {/* Dialog de crear nuevo admin */}
      <Dialog open={dialogNuevo} onOpenChange={setDialogNuevo}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Crear nuevo administrador</DialogTitle>
            <DialogDescription>
              Añade una nueva cuenta de administrador al sistema
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
                placeholder="Mínimo 6 caracteres"
                className="mt-1"
              />
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
              {guardando ? "Creando..." : "Crear admin"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
