"use client"

import { useState, useEffect, useRef } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { AvatarUsuario } from "@/components/AvatarUsuario"
import PreferenciasNotificacion from "@/components/PreferenciasNotificacion"
import { useToast } from "@/hooks/use-toast"
import {
  registrarServiceWorker,
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

// Datos extendidos de penalizaciones cargados desde /api/perfil
interface DatosPerfil {
  id: string
  nombre: string
  email: string
  rol: string
  noShows: number
  suspendidoHasta: string | null
  motivoSuspension: string | null
  creadoEn: string
}

export default function PaginaPerfil() {
  const { data: sesion, status, update } = useSession()
  const router = useRouter()
  const { toast } = useToast()

  // Título de la pestaña del navegador
  useEffect(() => { document.title = "Mi perfil" }, [])

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

  // Estado del formulario de cambio de contraseña
  const [passwordActual, setPasswordActual] = useState("")
  const [passwordNueva, setPasswordNueva] = useState("")
  const [confirmarPassword, setConfirmarPassword] = useState("")
  const [errorPassword, setErrorPassword] = useState("")
  const [cambiandoPassword, setCambiandoPassword] = useState(false)

  // Estado de datos de penalizaciones (cargados desde /api/perfil)
  const [datosPerfil, setDatosPerfil] = useState<DatosPerfil | null>(null)

  // Protección de ruta: si no hay sesión, redirigir a /login
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/perfil")
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

  // Cargar datos extendidos de perfil (penalizaciones, rol, etc.)
  useEffect(() => {
    fetch("/api/perfil")
      .then((r) => r.json())
      .then((data: DatosPerfil) => {
        setDatosPerfil(data)
      })
      .catch(() => {
        // Si el endpoint no está disponible, no bloqueamos la página
      })
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

  // Cambiar la contraseña del usuario
  async function alCambiarPassword(e: React.FormEvent) {
    e.preventDefault()
    setErrorPassword("")

    // Validación frontend: nueva y confirmación deben coincidir
    if (passwordNueva !== confirmarPassword) {
      setErrorPassword("Las contraseñas no coinciden. Revisa los campos e inténtalo de nuevo.")
      return
    }

    setCambiandoPassword(true)
    try {
      const respuesta = await fetch("/api/perfil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passwordActual, passwordNueva }),
      })

      if (!respuesta.ok) {
        const datos = await respuesta.json()
        // Mensaje de error inline si la contraseña actual es incorrecta
        setErrorPassword(datos.error ?? "Error al cambiar la contraseña. Inténtalo de nuevo.")
        return
      }

      // Limpiar formulario tras éxito
      setPasswordActual("")
      setPasswordNueva("")
      setConfirmarPassword("")
      toast({ title: "Contraseña actualizada", description: "Tu contraseña ha sido cambiada correctamente." })
    } catch {
      setErrorPassword("Error al cambiar la contraseña. Inténtalo de nuevo.")
    } finally {
      setCambiandoPassword(false)
    }
  }

  // Activar o desactivar notificaciones push
  async function toggleNotificaciones() {
    if (estadoPush === 'activo') {
      // Desactivar: desuscribir del servicio push
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
      // Activar: primero registrar el service worker y luego suscribir
      await registrarServiceWorker()
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
      const res = await fetch("/api/perfil/eliminar", { method: "DELETE" })
      if (res.ok) {
        await signOut({ callbackUrl: "/" })
      } else {
        toast({ title: "Error al eliminar cuenta", description: "No se pudo eliminar la cuenta. Inténtalo de nuevo.", variant: "destructive" })
        setEliminando(false)
      }
    } catch {
      toast({ title: "Error", description: "Error de conexión. Inténtalo de nuevo.", variant: "destructive" })
      setEliminando(false)
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
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
        {/* Cabecera */}
        <div className="mb-6">
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
                className="sr-only"
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
              className="w-full sm:w-auto flex items-center gap-2"
            >
              {guardando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : "Guardar cambios"}
            </Button>
          </form>
        </div>

        {/* Sección cambio de contraseña */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Cambiar contraseña</h2>

          <form onSubmit={alCambiarPassword} className="space-y-4">
            {/* Contraseña actual */}
            <div className="space-y-1">
              <Label htmlFor="password-actual">Contraseña actual</Label>
              <Input
                id="password-actual"
                type="password"
                value={passwordActual}
                onChange={(e) => setPasswordActual(e.target.value)}
                placeholder="Tu contraseña actual"
                autoComplete="current-password"
              />
            </div>

            {/* Nueva contraseña */}
            <div className="space-y-1">
              <Label htmlFor="password-nueva">Nueva contraseña</Label>
              <Input
                id="password-nueva"
                type="password"
                value={passwordNueva}
                onChange={(e) => setPasswordNueva(e.target.value)}
                placeholder="Nueva contraseña"
                autoComplete="new-password"
              />
            </div>

            {/* Confirmar nueva contraseña */}
            <div className="space-y-1">
              <Label htmlFor="confirmar-password">Confirmar nueva contraseña</Label>
              <Input
                id="confirmar-password"
                type="password"
                value={confirmarPassword}
                onChange={(e) => setConfirmarPassword(e.target.value)}
                placeholder="Repite la nueva contraseña"
                autoComplete="new-password"
              />
            </div>

            {/* Error inline de contraseñas */}
            {errorPassword && (
              <p className="text-sm text-red-600" role="alert">
                {errorPassword}
              </p>
            )}

            {/* Botón cambiar contraseña */}
            <Button
              type="submit"
              disabled={cambiandoPassword}
              className="w-full sm:w-auto flex items-center gap-2"
            >
              {cambiandoPassword ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cambiando...
                </>
              ) : "Cambiar contraseña"}
            </Button>
          </form>
        </div>

        {/* Sección penalizaciones — solo visible para CIUDADANO */}
        {datosPerfil?.rol === "CIUDADANO" && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">Penalizaciones</h2>

            {/* Sin penalizaciones */}
            {datosPerfil.noShows === 0 && !datosPerfil.suspendidoHasta && (
              <p className="text-sm text-gray-500">No tienes penalizaciones registradas.</p>
            )}

            {/* Badge de no-shows cuando hay alguno */}
            {datosPerfil.noShows > 0 && (
              <Badge variant="destructive" className="mb-3">
                {datosPerfil.noShows} no-shows acumulados
              </Badge>
            )}

            {/* Alerta de suspensión activa (fecha futura) */}
            {datosPerfil.suspendidoHasta && new Date(datosPerfil.suspendidoHasta) > new Date() && (
              <Alert variant="destructive" className="mt-3">
                <AlertDescription>
                  Tu cuenta está suspendida hasta{" "}
                  {new Date(datosPerfil.suspendidoHasta).toLocaleDateString("es-ES", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                  {datosPerfil.motivoSuspension && (
                    <>. Motivo: {datosPerfil.motivoSuspension}</>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Suspensión ya finalizada (fecha pasada) */}
            {datosPerfil.suspendidoHasta && new Date(datosPerfil.suspendidoHasta) <= new Date() && (
              <p className="text-sm text-gray-400 mt-2">
                Última suspensión finalizada el{" "}
                {new Date(datosPerfil.suspendidoHasta).toLocaleDateString("es-ES", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </p>
            )}
          </div>
        )}

        {/* Sección notificaciones push — solo visible para CIUDADANO */}
        {datosPerfil?.rol === "CIUDADANO" && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-base font-semibold text-gray-800">Notificaciones push</h2>
              <Badge
                variant={estadoPush === 'activo' ? 'default' : 'secondary'}
              >
                {estadoPush === 'activo' ? 'Activa' : 'Inactiva'}
              </Badge>
            </div>

            {/* Aviso si el navegador no soporta push */}
            {estadoPush === 'no-soportado' ? (
              <p className="text-sm text-gray-500 mb-4">
                Tu navegador no soporta notificaciones push.
              </p>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  Recibirás avisos de reservas confirmadas, recordatorios y cancelaciones
                  directamente en este dispositivo.
                </p>

                {/* Aviso si el permiso está denegado */}
                {estadoPush === 'denegado' && (
                  <p className="text-sm text-amber-600 mb-4">
                    Debes permitir las notificaciones en tu navegador.
                  </p>
                )}

                <Button
                  onClick={toggleNotificaciones}
                  variant={estadoPush === 'activo' ? 'destructive' : 'default'}
                  size="sm"
                >
                  {estadoPush === 'activo' ? 'Desactivar notificaciones' : 'Activar notificaciones'}
                </Button>
              </>
            )}
          </div>
        )}

        {/* Sección preferencias de notificación — solo visible para CIUDADANO */}
        {datosPerfil?.rol === "CIUDADANO" && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">Preferencias de notificación</h2>
            <PreferenciasNotificacion
              onGuardado={() => {
                toast({ title: "Preferencias guardadas" })
              }}
            />
          </div>
        )}

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
        <div className="bg-red-50 rounded-xl border border-red-200 p-6 mb-8">
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
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
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
