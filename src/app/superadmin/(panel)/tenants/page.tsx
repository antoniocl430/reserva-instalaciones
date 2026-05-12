"use client"

import { useEffect, useState } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Tenant {
  id: string
  slug: string
  nombre: string
  municipio: string
  estado: string
  _count: {
    usuarios: number
    instalaciones: number
    reservas: number
  }
}

interface FormCrear {
  nombre: string
  slug: string
  municipio: string
  emailAdmin: string
  nombreAdmin: string
  passwordAdmin: string
  confirmarPassword: string
}

interface FormEditar {
  nombre: string
  municipio: string
  estado: string
}

const formCrearInicial: FormCrear = {
  nombre: "",
  slug: "",
  municipio: "",
  emailAdmin: "",
  nombreAdmin: "",
  passwordAdmin: "",
  confirmarPassword: "",
}

export default function SuperadminTenants() {
  // Título de la pestaña del navegador
  useEffect(() => { document.title = "Centros" }, [])

  const [tenants, setTenants] = useState<Tenant[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dialog crear
  const [dialogCrear, setDialogCrear] = useState(false)
  const [formCrear, setFormCrear] = useState<FormCrear>(formCrearInicial)
  const [errorCrear, setErrorCrear] = useState<string | null>(null)
  const [guardandoCrear, setGuardandoCrear] = useState(false)

  // Dialog editar
  const [dialogEditar, setDialogEditar] = useState(false)
  const [tenantEditando, setTenantEditando] = useState<Tenant | null>(null)
  const [formEditar, setFormEditar] = useState<FormEditar>({ nombre: "", municipio: "", estado: "" })
  const [errorEditar, setErrorEditar] = useState<string | null>(null)
  const [guardandoEditar, setGuardandoEditar] = useState(false)

  async function cargarTenants() {
    try {
      setCargando(true)
      const res = await fetch("/api/superadmin/tenants")
      if (!res.ok) {
        throw new Error("Error al cargar tenants")
      }
      const data = await res.json()
      setTenants(data.tenants ?? data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarTenants()
  }, [])

  // Crear tenant
  async function handleCrear() {
    setErrorCrear(null)

    // Validaciones del formulario
    if (!formCrear.nombre.trim()) {
      setErrorCrear("El nombre es obligatorio")
      return
    }
    if (!formCrear.slug.trim()) {
      setErrorCrear("El slug es obligatorio")
      return
    }
    if (!/^[a-z0-9-]+$/.test(formCrear.slug)) {
      setErrorCrear("El slug solo puede contener letras minusculas, numeros y guiones")
      return
    }
    if (!formCrear.municipio.trim()) {
      setErrorCrear("El municipio es obligatorio")
      return
    }
    if (!formCrear.emailAdmin.trim()) {
      setErrorCrear("El email del admin es obligatorio")
      return
    }
    if (!formCrear.passwordAdmin.trim() || formCrear.passwordAdmin.length < 8) {
      setErrorCrear("La contrasena debe tener al menos 8 caracteres")
      return
    }
    if (formCrear.passwordAdmin !== formCrear.confirmarPassword) {
      setErrorCrear("Las contrasenas no coinciden")
      return
    }

    try {
      setGuardandoCrear(true)
      const res = await fetch("/api/superadmin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: formCrear.nombre,
          slug: formCrear.slug,
          municipio: formCrear.municipio,
          emailAdmin: formCrear.emailAdmin,
          passwordAdmin: formCrear.passwordAdmin,
          nombreAdmin: formCrear.nombreAdmin || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Error al crear tenant")
      }

      setDialogCrear(false)
      setFormCrear(formCrearInicial)
      cargarTenants()
    } catch (err) {
      setErrorCrear(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setGuardandoCrear(false)
    }
  }

  // Abrir dialog editar
  function abrirEditar(tenant: Tenant) {
    setTenantEditando(tenant)
    setFormEditar({
      nombre: tenant.nombre,
      municipio: tenant.municipio,
      estado: tenant.estado,
    })
    setErrorEditar(null)
    setDialogEditar(true)
  }

  // Guardar edicion
  async function handleGuardarEdicion() {
    if (!tenantEditando) return
    setErrorEditar(null)

    if (!formEditar.nombre.trim()) {
      setErrorEditar("El nombre es obligatorio")
      return
    }
    if (!formEditar.municipio.trim()) {
      setErrorEditar("El municipio es obligatorio")
      return
    }

    try {
      setGuardandoEditar(true)
      const res = await fetch(`/api/superadmin/tenants/${tenantEditando.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: formEditar.nombre,
          municipio: formEditar.municipio,
          estado: formEditar.estado,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Error al actualizar tenant")
      }

      setDialogEditar(false)
      setTenantEditando(null)
      cargarTenants()
    } catch (err) {
      setErrorEditar(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setGuardandoEditar(false)
    }
  }

  // Cambiar estado (suspender/activar)
  async function handleCambiarEstado(tenant: Tenant) {
    const nuevoEstado = tenant.estado === "ACTIVO" ? "SUSPENDIDO" : "ACTIVO"
    try {
      const res = await fetch(`/api/superadmin/tenants/${tenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      })

      if (!res.ok) {
        throw new Error("Error al actualizar estado")
      }

      cargarTenants()
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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Gestión de Centros</h1>
            <p className="text-sm sm:text-base text-gray-500 mt-1">
              Crea, edita y gestiona los centros deportivos del sistema
            </p>
          </div>
          <Button
            onClick={() => {
              setFormCrear(formCrearInicial)
              setErrorCrear(null)
              setDialogCrear(true)
            }}
            className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700"
          >
            Nuevo centro
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
            <div className="p-8">
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </div>
          ) : tenants.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No hay centros creados todavía.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Nombre</TableHead>
                    <TableHead className="text-xs">Slug</TableHead>
                    <TableHead className="text-xs">Municipio</TableHead>
                    <TableHead className="text-xs">Estado</TableHead>
                    <TableHead className="text-xs text-center">Usuarios</TableHead>
                    <TableHead className="text-xs text-center">Instalaciones</TableHead>
                    <TableHead className="text-xs text-center">Reservas</TableHead>
                    <TableHead className="text-xs text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell className="font-medium text-sm">
                        {tenant.nombre}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 font-mono">
                        {tenant.slug}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {tenant.municipio}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            tenant.estado === "ACTIVO"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }
                        >
                          {tenant.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 text-center">
                        {tenant._count.usuarios}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 text-center">
                        {tenant._count.instalaciones}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 text-center">
                        {tenant._count.reservas}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => abrirEditar(tenant)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCambiarEstado(tenant)}
                          className={
                            tenant.estado === "ACTIVO"
                              ? "text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                              : "text-green-600 hover:text-green-700 hover:bg-green-50"
                          }
                        >
                          {tenant.estado === "ACTIVO" ? "Suspender" : "Activar"}
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

      {/* Dialog de crear nuevo tenant */}
      <Dialog open={dialogCrear} onOpenChange={setDialogCrear}>
        <DialogContent className="max-w-md w-[calc(100%-2rem)] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear nuevo centro</DialogTitle>
            <DialogDescription>
              Registra un nuevo centro deportivo en el sistema
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {errorCrear && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
                {errorCrear}
              </div>
            )}

            <div>
              <Label htmlFor="crear-nombre">Nombre del ayuntamiento *</Label>
              <Input
                id="crear-nombre"
                value={formCrear.nombre}
                onChange={(e) => setFormCrear({ ...formCrear, nombre: e.target.value })}
                placeholder="Ej: Ayuntamiento de Sevilla"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="crear-slug">Slug *</Label>
              <Input
                id="crear-slug"
                value={formCrear.slug}
                onChange={(e) => setFormCrear({ ...formCrear, slug: e.target.value.toLowerCase() })}
                placeholder="Ej: sevilla"
                className="mt-1 font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">Solo letras minusculas, numeros y guiones</p>
            </div>

            <div>
              <Label htmlFor="crear-municipio">Municipio *</Label>
              <Input
                id="crear-municipio"
                value={formCrear.municipio}
                onChange={(e) => setFormCrear({ ...formCrear, municipio: e.target.value })}
                placeholder="Ej: Sevilla"
                className="mt-1"
              />
            </div>

            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Administrador inicial</p>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="crear-email">Email del admin *</Label>
                  <Input
                    id="crear-email"
                    type="email"
                    value={formCrear.emailAdmin}
                    onChange={(e) => setFormCrear({ ...formCrear, emailAdmin: e.target.value })}
                    placeholder="admin@ayuntamiento.es"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="crear-nombre-admin">Nombre del admin (opcional)</Label>
                  <Input
                    id="crear-nombre-admin"
                    value={formCrear.nombreAdmin}
                    onChange={(e) => setFormCrear({ ...formCrear, nombreAdmin: e.target.value })}
                    placeholder="Ej: Juan Garcia"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="crear-password">Contrasena *</Label>
                  <Input
                    id="crear-password"
                    type="password"
                    value={formCrear.passwordAdmin}
                    onChange={(e) => setFormCrear({ ...formCrear, passwordAdmin: e.target.value })}
                    placeholder="Minimo 8 caracteres"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="crear-confirmar-password">Confirmar contrasena *</Label>
                  <Input
                    id="crear-confirmar-password"
                    type="password"
                    value={formCrear.confirmarPassword}
                    onChange={(e) => setFormCrear({ ...formCrear, confirmarPassword: e.target.value })}
                    placeholder="Repite la contrasena"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogCrear(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCrear}
              disabled={guardandoCrear}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {guardandoCrear ? "Creando..." : "Crear centro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de editar tenant */}
      <Dialog open={dialogEditar} onOpenChange={setDialogEditar}>
        <DialogContent className="max-w-md w-[calc(100%-2rem)] sm:w-full">
          <DialogHeader>
            <DialogTitle>Editar centro</DialogTitle>
            <DialogDescription>
              Actualiza los datos del centro deportivo
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {errorEditar && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
                {errorEditar}
              </div>
            )}

            <div>
              <Label htmlFor="editar-nombre">Nombre</Label>
              <Input
                id="editar-nombre"
                value={formEditar.nombre}
                onChange={(e) => setFormEditar({ ...formEditar, nombre: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="editar-municipio">Municipio</Label>
              <Input
                id="editar-municipio"
                value={formEditar.municipio}
                onChange={(e) => setFormEditar({ ...formEditar, municipio: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="editar-estado">Estado</Label>
              <Select
                value={formEditar.estado}
                onValueChange={(valor) => setFormEditar({ ...formEditar, estado: valor })}
              >
                <SelectTrigger className="mt-1" id="editar-estado">
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVO">ACTIVO</SelectItem>
                  <SelectItem value="SUSPENDIDO">SUSPENDIDO</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogEditar(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleGuardarEdicion}
              disabled={guardandoEditar}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {guardandoEditar ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
