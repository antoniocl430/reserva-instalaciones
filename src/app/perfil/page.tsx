"use client"

import { useState, useEffect, useRef } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { AvatarUsuario } from "@/components/AvatarUsuario"
import { useToast } from "@/hooks/use-toast"
import {
  suscribirAPush,
  desuscribirDePush,
  obtenerEstadoSuscripcion,
} from "@/lib/push-client"

// Datos del usuario cargados desde la API
interface DatosUsuario {
  id: string
  nombre: string
  email: string
  rol: string
  avatarUrl: string | null
  creadoEn: string
}

export default function PaginaPerfil() {
  const { data: sesion, status, update } = useSession()
  const router = useRouter()
  const { toast } = useToast()

  // Estado del formulario de datos
  const [nombre, setNombre] = useState("")
  const [email, setEmail] = useState("")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  // Estado de carga inicial
  const [cargandoDatos, setCargandoDatos] = useState(true)

  // Estado del formulario al guardar
  const [guardando, setGuardando] = useState(false)

  // Estado del avatar
  const [subiendoAvatar, setSubiendoAvatar] = useState(false)
  const inputArchivoRef = useRef<HTMLInputElement>(null)

  // Estado de exportación de datos
  const [exportando, setExportando] = useState(false)

  // Estado del dialog de confirmación de eliminación
  const [dialogAbierto, setDialogAbierto] = useState(false)
  const [eliminando, setEliminando] = useState(false)

  // Estado de las notificaciones push
  const [estadoPush, setEstadoPush] = useState<'activo' | 'inactivo' | 'no-soportado' | 'denegado'>('inactivo')

  // Protección de ruta: si no hay sesión, redirigir a /login
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  // Cargar datos del perfil al montar el componente
  useEffect(() => {
    fetch("/api/cuenta")
      .then((r) => r.json())
      .then((data: { usuario: DatosUsuario }) => {
        setNombre(data.usuario.nombre)
        setEmail(data.usuario.email)
        setAvatarUrl(data.usuario.avatarUrl)
      })
      .finally(() => setCargandoDatos(false))
  }, [])

  // Cargar estado actual de las notificaciones push al montar
  useEffect(() => {
    obtenerEstadoSuscripcion().then(setEstadoPush)
  }, [])

  // Exportar datos personales como JSON
  async function alExportarDatos() {
    setExportando(true)
    try {
      const respuesta = await fetch("/api/cuenta/exportar")
      if (!respuesta.ok) throw new Error("Error al exportar")
      const blob = await respuesta.blob()
      const url = URL.createObjectURL(blob)
      const enlace = document.createElement("a")
      enlace.href = url
      enlace.download = "mis-datos.json"
      enlace.click()
      URL.revokeObjectURL(url)
    } catch {
      // Si falla no bloqueamos al usuario
    } finally {
      setExportando(false)
    }
  }

  // Manejar selección de archivo de avatar
  function alSeleccionarArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    if (!archivo) return

    // Guardar el avatar actual para restaurarlo si la subida falla
    const avatarUrlAnterior = avatarUrl

    // Preview inmediata
    const urlPreview = URL.createObjectURL(archivo)
    setAvatarUrl(urlPreview)

    // Subir al servidor
    const formData = new FormData()
    formData.append("avatar", archivo)

    setSubiendoAvatar(true)

    fetch("/api/cuenta/avatar", {
      method: "POST",
      body: formData,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("Error al subir la imagen")
        return r.json()
      })
      .then((data: { avatarUrl: string }) => {
        setAvatarUrl(data.avatarUrl)
        toast({ title: "Avatar actualizado" })
      })
      .catch(() => {
        toast({
          title: "Error al subir imagen",
          description: "No se pudo subir la imagen. Inténtalo de nuevo.",
          variant: "destructive",
        })
        // Restaurar el avatar que había antes del intento fallido
        setAvatarUrl(avatarUrlAnterior)
      })
      .finally(() => setSubiendoAvatar(false))
  }

  // Guardar cambios del perfil
  async function alGuardarCambios(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)

    try {
      const respuesta = await fetch("/api/cuenta", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre }),
      })

      if (!respuesta.ok) {
        throw new Error("Error al guardar los cambios")
      }

      toast({
        title: "Cambios guardados",
        description: "Tu perfil ha sido actualizado correctamente.",
      })
      // Actualizar la sesión para que el nombre aparezca reflejado en el navbar
      await update()
    } catch {
      toast({
        title: "Error al guardar",
        description: "No se pudieron guardar los cambios. Inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setGuardando(false)
    }
  }

  // Activar o desactivar notificaciones push
  async function toggleNotificaciones() {
    if (estadoPush === 'activo') {
      const exito = await desuscribirDePush()
      if (exito) {
        setEstadoPush('inactivo')
        toast({ title: "Notificaciones desactivadas" })
      } else {
        toast({
          title: "Error al desactivar",
          description: "No se pudieron desactivar las notificaciones. Inténtalo de nuevo.",
          variant: "destructive",
        })
      }
    } else {
      const exito = await suscribirAPush()
      if (exito) {
        setEstadoPush('activo')
        toast({ title: "Notificaciones activadas" })
      } else {
        // Volver a consultar el estado real (puede que el permiso haya sido denegado)
        const nuevoEstado = await obtenerEstadoSuscripcion()
        setEstadoPush(nuevoEstado)
        if (nuevoEstado !== 'denegado' && nuevoEstado !== 'no-soportado') {
          toast({
            title: "Error al activar",
            description: "No se pudieron activar las notificaciones. Inténtalo de nuevo.",
            variant: "destructive",
          })
        }
      }
    }
  }

  // Eliminar cuenta
  async function alEliminarCuenta() {
    setEliminando(true)

    try {
      const respuesta = await fetch("/api/cuenta", {
        method: "DELETE",
      })

      if (!respuesta.ok) {
        throw new Error("Error al eliminar la cuenta")
      }

      setDialogAbierto(false)
      await signOut({ callbackUrl: "/" })
    } catch {
      setEliminando(false)
      setDialogAbierto(false)
    }
  }

  // Mostrar skeleton mientras carga la sesión
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <Skeleton className="w-24 h-24 rounded-full mb-4" />
            <Skeleton className="h-8 w-32" />
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Cabecera */}
        <div className="mb-6 py-4 sm:py-8">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 mb-4"
          >
            ← Volver al inicio
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Mi perfil</h1>
          <p className="text-sm text-gray-600 mt-1">Gestiona tu información personal</p>
        </div>

        {/* Tarjeta de avatar */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Foto de perfil</h2>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Avatar */}
            {cargandoDatos ? (
              <Skeleton className="w-24 h-24 rounded-full shrink-0" />
            ) : (
              <AvatarUsuario
                nombre={nombre}
                avatarUrl={avatarUrl}
                className="w-24 h-24 text-2xl"
              />
            )}

            <div className="space-y-2">
              {/* Input file oculto */}
              <input
                ref={inputArchivoRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={alSeleccionarArchivo}
                aria-label="Seleccionar archivo de imagen"
              />
              <Button
                variant="outline"
                onClick={() => inputArchivoRef.current?.click()}
                disabled={subiendoAvatar}
              >
                {subiendoAvatar ? "Subiendo..." : "Cambiar foto"}
              </Button>
              <p className="text-xs text-gray-500">
                Formatos admitidos: JPEG, PNG, WebP. Máximo 5 MB.
              </p>
            </div>
          </div>
        </div>

        {/* Tarjeta de datos del perfil */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Datos del perfil</h2>

          <form onSubmit={alGuardarCambios} className="space-y-4">
            {/* Campo nombre */}
            <div className="space-y-1">
              <Label htmlFor="nombre">Nombre completo</Label>
              {cargandoDatos ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Input
                  id="nombre"
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Tu nombre completo"
                  autoComplete="name"
                />
              )}
            </div>

            {/* Campo email (deshabilitado) */}
            <div className="space-y-1">
              <Label htmlFor="email">Correo electrónico</Label>
              {cargandoDatos ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="bg-gray-50 text-gray-500"
                />
              )}
              <p className="text-xs text-gray-500">
                El correo electrónico no se puede cambiar.
              </p>
            </div>

            {/* Botón guardar */}
            <Button
              type="submit"
              disabled={guardando || cargandoDatos}
              className="w-full sm:w-auto"
            >
              {guardando ? "Guardando..." : "Guardar cambios"}
            </Button>
          </form>
        </div>

        {/* Sección notificaciones */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Notificaciones</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Notificaciones push</p>
              <p className="text-sm text-gray-500">
                Recibe avisos de reservas y cancelaciones en tu dispositivo
              </p>
            </div>
            <Button
              onClick={toggleNotificaciones}
              variant={estadoPush === 'activo' ? 'destructive' : 'default'}
              size="sm"
            >
              {estadoPush === 'activo' ? 'Desactivar' : 'Activar'}
            </Button>
          </div>
          {estadoPush === 'denegado' && (
            <p className="mt-2 text-xs text-red-500">
              Has bloqueado los permisos. Actívalos desde la configuración de tu navegador.
            </p>
          )}
          {estadoPush === 'no-soportado' && (
            <p className="mt-2 text-xs text-gray-500">
              Tu navegador no soporta notificaciones push.
            </p>
          )}
        </div>

        {/* Tarjeta de exportación de datos (RGPD) */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-1">Mis datos</h2>
          <p className="text-sm text-gray-600 mb-4">
            Conforme al RGPD, puedes descargar una copia de todos tus datos en cualquier momento.
          </p>
          <Button
            variant="outline"
            onClick={alExportarDatos}
            disabled={exportando}
          >
            {exportando ? "Exportando..." : "Exportar mis datos"}
          </Button>
        </div>

        {/* Zona de peligro */}
        <div className="bg-red-50 rounded-xl border border-red-200 p-6">
          <h2 className="text-base font-semibold text-red-800 mb-2">Zona de peligro</h2>
          <p className="text-sm text-red-700 mb-4">
            Eliminar tu cuenta es una acción permanente. No podrás recuperar tus datos.
          </p>
          <Button
            variant="destructive"
            onClick={() => setDialogAbierto(true)}
          >
            Eliminar mi cuenta
          </Button>
        </div>
      </div>

      {/* Dialog de confirmación de eliminación */}
      <Dialog open={dialogAbierto} onOpenChange={setDialogAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar tu cuenta?</DialogTitle>
            <DialogDescription>
              Esta acción es irreversible. Se cancelarán todas tus reservas activas y se
              eliminarán permanentemente todos tus datos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogAbierto(false)}
              disabled={eliminando}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={alEliminarCuenta}
              disabled={eliminando}
            >
              {eliminando ? "Eliminando..." : "Confirmar eliminación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
