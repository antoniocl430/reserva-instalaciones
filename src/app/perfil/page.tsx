"use client"

import { useState, useEffect, useRef } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2, ChevronLeft, Camera, Bell, Shield, Download, Trash2, Lock, User, Palette } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
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
import { TemaSwitch } from "@/components/TemaToggle"
import { useToast } from "@/hooks/use-toast"
import {
  registrarServiceWorker,
  suscribirAPush,
  desuscribirDePush,
  obtenerEstadoSuscripcion,
} from "@/lib/push-client"

interface DatosUsuario {
  id: string
  nombre: string
  email: string
  rol: string
  avatarUrl: string | null
  creadoEn: string
}

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

// Sección visual reutilizable con título e ícono
function Seccion({ titulo, icono, children }: { titulo: string; icono: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center gap-2.5">
        <span className="text-muted-foreground">{icono}</span>
        <h2 className="font-semibold text-foreground text-sm">{titulo}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

export default function PaginaPerfil() {
  const { data: sesion, status, update } = useSession()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => { document.title = "Mi perfil" }, [])

  const [nombre, setNombre] = useState("")
  const [email, setEmail] = useState("")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [cargandoDatos, setCargandoDatos] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [subiendoAvatar, setSubiendoAvatar] = useState(false)
  const inputArchivoRef = useRef<HTMLInputElement>(null)
  const [exportando, setExportando] = useState(false)
  const [dialogAbierto, setDialogAbierto] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [estadoPush, setEstadoPush] = useState<"activo" | "inactivo" | "no-soportado" | "denegado">("inactivo")
  const [passwordActual, setPasswordActual] = useState("")
  const [passwordNueva, setPasswordNueva] = useState("")
  const [confirmarPassword, setConfirmarPassword] = useState("")
  const [errorPassword, setErrorPassword] = useState("")
  const [cambiandoPassword, setCambiandoPassword] = useState(false)
  const [datosPerfil, setDatosPerfil] = useState<DatosPerfil | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login?callbackUrl=/perfil")
  }, [status, router])

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

  useEffect(() => {
    fetch("/api/perfil")
      .then((r) => r.json())
      .then((data: DatosPerfil) => setDatosPerfil(data))
      .catch(() => {})
  }, [])

  useEffect(() => { obtenerEstadoSuscripcion().then(setEstadoPush) }, [])

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
    } finally {
      setExportando(false)
    }
  }

  function alSeleccionarArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    if (!archivo) return
    const avatarUrlAnterior = avatarUrl
    const urlPreview = URL.createObjectURL(archivo)
    setAvatarUrl(urlPreview)
    const formData = new FormData()
    formData.append("avatar", archivo)
    setSubiendoAvatar(true)
    fetch("/api/cuenta/avatar", { method: "POST", body: formData })
      .then(async (r) => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((data: { avatarUrl: string }) => {
        setAvatarUrl(data.avatarUrl)
        toast({ title: "Avatar actualizado" })
      })
      .catch(() => {
        toast({ title: "Error al subir imagen", description: "No se pudo subir la imagen.", variant: "destructive" })
        setAvatarUrl(avatarUrlAnterior)
      })
      .finally(() => setSubiendoAvatar(false))
  }

  async function alGuardarCambios(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    try {
      const respuesta = await fetch("/api/cuenta", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre }),
      })
      if (!respuesta.ok) throw new Error()
      toast({ title: "Cambios guardados", description: "Tu perfil ha sido actualizado." })
      await update()
    } catch {
      toast({ title: "Error al guardar", description: "No se pudieron guardar los cambios.", variant: "destructive" })
    } finally {
      setGuardando(false)
    }
  }

  async function alCambiarPassword(e: React.FormEvent) {
    e.preventDefault()
    setErrorPassword("")
    if (passwordNueva !== confirmarPassword) {
      setErrorPassword("Las contraseñas no coinciden.")
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
        setErrorPassword(datos.error ?? "Error al cambiar la contraseña.")
        return
      }
      setPasswordActual("")
      setPasswordNueva("")
      setConfirmarPassword("")
      toast({ title: "Contraseña actualizada", description: "Tu contraseña ha sido cambiada correctamente." })
    } catch {
      setErrorPassword("Error al cambiar la contraseña.")
    } finally {
      setCambiandoPassword(false)
    }
  }

  async function toggleNotificaciones() {
    if (estadoPush === "activo") {
      const exito = await desuscribirDePush()
      if (exito) {
        setEstadoPush("inactivo")
        toast({ title: "Notificaciones desactivadas" })
      } else {
        toast({ title: "Error al desactivar", variant: "destructive" } as Parameters<typeof toast>[0])
      }
    } else {
      const exito = await suscribirAPush()
      if (exito) {
        setEstadoPush("activo")
        toast({ title: "Notificaciones activadas" })
      } else {
        const nuevoEstado = await obtenerEstadoSuscripcion()
        setEstadoPush(nuevoEstado)
        if (nuevoEstado === "denegado") {
          toast({
            title: "Permiso denegado",
            description: "Activa las notificaciones desde la configuración del navegador.",
            variant: "destructive",
          } as Parameters<typeof toast>[0])
        } else if (nuevoEstado !== "no-soportado") {
          toast({
            title: "No se pudo activar",
            description: "Comprueba tu conexión a internet e inténtalo de nuevo.",
            variant: "destructive",
          } as Parameters<typeof toast>[0])
        }
      }
    }
  }

  async function alEliminarCuenta() {
    setEliminando(true)
    try {
      const res = await fetch("/api/perfil/eliminar", { method: "DELETE" })
      if (res.ok) {
        await signOut({ callbackUrl: "/" })
      } else {
        toast({ title: "Error al eliminar cuenta", description: "No se pudo eliminar la cuenta.", variant: "destructive" })
        setEliminando(false)
      }
    } catch {
      toast({ title: "Error", description: "Error de conexión.", variant: "destructive" })
      setEliminando(false)
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-10 space-y-4">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10 space-y-4">
        {/* Cabecera */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5"
          >
            <ChevronLeft className="w-4 h-4" />
            Inicio
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Mi perfil</h1>
          <p className="text-muted-foreground mt-1 text-sm">Gestiona tu información personal y preferencias</p>
        </div>

        {/* Foto de perfil */}
        <Seccion titulo="Foto de perfil" icono={<Camera className="w-4 h-4" />}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {cargandoDatos ? (
              <Skeleton className="w-20 h-20 rounded-full shrink-0" />
            ) : (
              <AvatarUsuario nombre={nombre} avatarUrl={avatarUrl} className="w-20 h-20 text-xl shrink-0" />
            )}
            <div className="space-y-2">
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
                size="sm"
                onClick={() => inputArchivoRef.current?.click()}
                disabled={subiendoAvatar}
                className="gap-2"
              >
                {subiendoAvatar ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Subiendo...</> : <><Camera className="h-3.5 w-3.5" />Cambiar foto</>}
              </Button>
              <p className="text-xs text-muted-foreground">JPEG, PNG o WebP · máximo 5 MB</p>
            </div>
          </div>
        </Seccion>

        {/* Datos del perfil */}
        <Seccion titulo="Datos personales" icono={<User className="w-4 h-4" />}>
          <form onSubmit={alGuardarCambios} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nombre">Nombre completo</Label>
              {cargandoDatos ? <Skeleton className="h-10 w-full" /> : (
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
            <div className="space-y-1.5">
              <Label htmlFor="email">Correo electrónico</Label>
              {cargandoDatos ? <Skeleton className="h-10 w-full" /> : (
                <Input id="email" type="email" value={email} disabled className="opacity-60" />
              )}
              <p className="text-xs text-muted-foreground">El correo electrónico no se puede cambiar.</p>
            </div>
            <Button type="submit" disabled={guardando || cargandoDatos} size="sm" className="gap-2">
              {guardando ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Guardando...</> : "Guardar cambios"}
            </Button>
          </form>
        </Seccion>

        {/* Cambiar contraseña */}
        <Seccion titulo="Seguridad" icono={<Lock className="w-4 h-4" />}>
          <form onSubmit={alCambiarPassword} className="space-y-4">
            {[
              { id: "password-actual", label: "Contraseña actual", value: passwordActual, onChange: setPasswordActual, autoComplete: "current-password" },
              { id: "password-nueva", label: "Nueva contraseña", value: passwordNueva, onChange: setPasswordNueva, autoComplete: "new-password" },
              { id: "confirmar-password", label: "Confirmar nueva contraseña", value: confirmarPassword, onChange: setConfirmarPassword, autoComplete: "new-password" },
            ].map(({ id, label, value, onChange, autoComplete }) => (
              <div key={id} className="space-y-1.5">
                <Label htmlFor={id}>{label}</Label>
                <Input
                  id={id}
                  type="password"
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  autoComplete={autoComplete}
                />
              </div>
            ))}
            {errorPassword && (
              <p className="text-sm text-destructive" role="alert">{errorPassword}</p>
            )}
            <Button type="submit" disabled={cambiandoPassword} size="sm" className="gap-2">
              {cambiandoPassword ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Cambiando...</> : "Cambiar contraseña"}
            </Button>
          </form>
        </Seccion>

        {/* Apariencia — modo oscuro */}
        <Seccion titulo="Apariencia" icono={<Palette className="w-4 h-4" />}>
          <TemaSwitch />
        </Seccion>

        {/* Penalizaciones — solo CIUDADANO */}
        {datosPerfil?.rol === "CIUDADANO" && (
          <Seccion titulo="Penalizaciones" icono={<Shield className="w-4 h-4" />}>
            {datosPerfil.noShows === 0 && !datosPerfil.suspendidoHasta ? (
              <p className="text-sm text-muted-foreground">No tienes penalizaciones registradas. ✓</p>
            ) : (
              <div className="space-y-3">
                {datosPerfil.noShows > 0 && (
                  <div className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400">
                    {datosPerfil.noShows} no-shows acumulados
                  </div>
                )}
                {datosPerfil.suspendidoHasta && new Date(datosPerfil.suspendidoHasta) > new Date() && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      Cuenta suspendida hasta{" "}
                      {new Date(datosPerfil.suspendidoHasta).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })}
                      {datosPerfil.motivoSuspension && <>. Motivo: {datosPerfil.motivoSuspension}</>}
                    </AlertDescription>
                  </Alert>
                )}
                {datosPerfil.suspendidoHasta && new Date(datosPerfil.suspendidoHasta) <= new Date() && (
                  <p className="text-sm text-muted-foreground">
                    Última suspensión finalizada el{" "}
                    {new Date(datosPerfil.suspendidoHasta).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })}
                  </p>
                )}
              </div>
            )}
          </Seccion>
        )}

        {/* Notificaciones push — solo CIUDADANO */}
        {datosPerfil?.rol === "CIUDADANO" && (
          <Seccion titulo="Notificaciones push" icono={<Bell className="w-4 h-4" />}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-foreground">Estado</p>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                estadoPush === "activo"
                  ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"
                  : "bg-muted text-muted-foreground"
              }`}>
                {estadoPush === "activo" ? "● Activas" : "○ Inactivas"}
              </span>
            </div>
            {estadoPush === "no-soportado" ? (
              <p className="text-sm text-muted-foreground">Tu navegador no soporta notificaciones push.</p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  Recibirás avisos de reservas confirmadas, recordatorios y cancelaciones en este dispositivo.
                </p>
                {estadoPush === "denegado" && (
                  <p className="text-sm text-amber-600 dark:text-amber-400 mb-3">
                    Debes permitir las notificaciones en la configuración de tu navegador.
                  </p>
                )}
                <Button
                  onClick={toggleNotificaciones}
                  variant={estadoPush === "activo" ? "outline" : "default"}
                  size="sm"
                  className={estadoPush === "activo" ? "text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30" : ""}
                >
                  {estadoPush === "activo" ? "Desactivar notificaciones" : "Activar notificaciones"}
                </Button>
              </>
            )}
          </Seccion>
        )}

        {/* Preferencias de notificación — solo CIUDADANO */}
        {datosPerfil?.rol === "CIUDADANO" && (
          <Seccion titulo="Preferencias de notificación" icono={<Bell className="w-4 h-4" />}>
            <PreferenciasNotificacion onGuardado={() => toast({ title: "Preferencias guardadas" })} />
          </Seccion>
        )}

        {/* Mis datos RGPD */}
        <Seccion titulo="Mis datos (RGPD)" icono={<Download className="w-4 h-4" />}>
          <p className="text-sm text-muted-foreground mb-4">
            Conforme al RGPD, puedes descargar una copia de todos tus datos en cualquier momento.
          </p>
          <Button variant="outline" size="sm" onClick={alExportarDatos} disabled={exportando} className="gap-2">
            {exportando ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Exportando...</> : <><Download className="h-3.5 w-3.5" />Exportar mis datos</>}
          </Button>
        </Seccion>

        {/* Zona de peligro */}
        <section className="bg-card border border-red-200 dark:border-red-900/50 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-red-200 dark:border-red-900/50 flex items-center gap-2.5">
            <Trash2 className="w-4 h-4 text-red-500" />
            <h2 className="font-semibold text-red-700 dark:text-red-400 text-sm">Zona de peligro</h2>
          </div>
          <div className="p-5">
            <p className="text-sm text-muted-foreground mb-4">
              Eliminar tu cuenta es una acción permanente. No podrás recuperar tus datos.
            </p>
            <Button variant="destructive" size="sm" onClick={() => setDialogAbierto(true)} className="gap-2">
              <Trash2 className="h-3.5 w-3.5" />
              Eliminar mi cuenta
            </Button>
          </div>
        </section>
      </div>

      {/* Dialog eliminación */}
      <Dialog open={dialogAbierto} onOpenChange={setDialogAbierto}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>¿Eliminar tu cuenta?</DialogTitle>
            <DialogDescription>
              Esta acción es irreversible. Se cancelarán todas tus reservas activas y se eliminarán permanentemente todos tus datos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAbierto(false)} disabled={eliminando}>Cancelar</Button>
            <Button variant="destructive" onClick={alEliminarCuenta} disabled={eliminando}>
              {eliminando ? "Eliminando..." : "Confirmar eliminación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
