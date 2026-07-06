"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2, Mail } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

export default function PaginaRegistro() {
  const router = useRouter()
  const { toast } = useToast()
  const [destino, setDestino] = useState("/dashboard")

  // Leer callbackUrl directamente de window.location (solución para bug de useSearchParams en Next.js)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const callbackUrl = params.get("callbackUrl")

    const esCallbackValido = callbackUrl &&
                             callbackUrl.startsWith("/") &&
                             !callbackUrl.startsWith("/login") &&
                             !callbackUrl.startsWith("/registro")
    const dest = esCallbackValido ? callbackUrl : "/dashboard"

    console.log("[REGISTRO] callbackUrl desde URL:", callbackUrl, "| destino final:", dest)
    setDestino(dest)
  }, [])

  useEffect(() => { document.title = "Crear cuenta" }, [])

  const [nombre, setNombre] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmar, setConfirmar] = useState("")
  const [error, setError] = useState("")
  const [cargando, setCargando] = useState(false)
  const [aceptaPrivacidad, setAceptaPrivacidad] = useState(false)

  // Estado para mostrar la pantalla de confirmación de email
  const [emailEnviado, setEmailEnviado] = useState(false)
  const [enviandoReenvio, setEnviandoReenvio] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    // Validaciones client-side
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres")
      return
    }
    if (password !== confirmar) {
      setError("Las contraseñas no coinciden")
      return
    }

    setCargando(true)

    // Llamar a la API de registro
    const respuesta = await fetch("/api/auth/registro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, email, password, aceptaPrivacidad }),
    })

    const data = await respuesta.json()

    if (!respuesta.ok) {
      setError(data.error || "Error al crear la cuenta")
      setCargando(false)
      return
    }

    // El backend devuelve 201 con { mensaje } — mostrar pantalla de confirmación
    // No hay auto-login; el usuario debe verificar su email primero
    setEmailEnviado(true)
    setCargando(false)
  }

  async function handleReenviar() {
    setEnviandoReenvio(true)

    try {
      const respuesta = await fetch("/api/reenviar-verificacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await respuesta.json()

      if (respuesta.ok) {
        toast({
          title: "Email reenviado",
          description: "Revisa tu bandeja de entrada y la carpeta de spam.",
        })
      } else {
        toast({
          title: "Error al reenviar",
          description: data.error || "No se pudo reenviar el email.",
          variant: "destructive",
        })
      }
    } catch {
      toast({
        title: "Error de conexión",
        description: "Inténtalo de nuevo más tarde.",
        variant: "destructive",
      })
    } finally {
      setEnviandoReenvio(false)
    }
  }

  // Pantalla de confirmación: se muestra tras el registro exitoso
  if (emailEnviado) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              {/* Icono de sobre / email */}
              <div className="rounded-full bg-blue-50 p-4 dark:bg-blue-950/40">
                <Mail className="h-10 w-10 text-blue-600" />
              </div>

              <div>
                <h1 className="text-xl font-bold text-foreground">
                  Revisa tu bandeja de entrada
                </h1>
                <p className="text-sm text-muted-foreground mt-2">
                  Te hemos enviado un enlace de verificación a{" "}
                  <span className="font-medium text-foreground">{email}</span>.
                  Haz clic en él para activar tu cuenta.
                </p>
              </div>

              {/* Aviso de caducidad */}
              <p className="text-xs text-muted-foreground/70 bg-muted rounded-lg px-3 py-2">
                El enlace caduca en 24 horas. Si no lo ves, revisa la carpeta de spam.
              </p>

              {/* Botón de reenvío */}
              <button
                type="button"
                onClick={handleReenviar}
                disabled={enviandoReenvio}
                className="w-full rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-center text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-400"
              >
                {enviandoReenvio ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </span>
                ) : "Reenviar email"}
              </button>

              <Link
                href="/login"
                className="text-sm text-muted-foreground/60 hover:text-muted-foreground transition-colors"
              >
                Ir al inicio de sesión
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6">
          {/* Cabecera */}
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-foreground">Crear cuenta</h1>
            <p className="text-sm text-muted-foreground mt-1">Reservas Deportivas Municipales</p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div role="alert" aria-live="assertive" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:border-red-900 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="nombre">Nombre completo</Label>
            <Input
              id="nombre"
              type="text"
              required
              autoComplete="name"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Juan García"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              inputMode="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="confirmar">Confirmar contraseña</Label>
            <Input
              id="confirmar"
              type="password"
              required
              autoComplete="new-password"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {/* Aceptación de política de privacidad — obligatorio según RGPD */}
          <div className="flex items-start gap-3 py-1">
            <Checkbox
              id="aceptaPrivacidad"
              checked={aceptaPrivacidad}
              onCheckedChange={(checked) => setAceptaPrivacidad(checked === true)}
              required
              className="mt-0.5 shrink-0"
            />
            <label htmlFor="aceptaPrivacidad" className="text-sm text-foreground leading-relaxed cursor-pointer">
              He leído y acepto la{" "}
              <Link
                href="/privacidad"
                className="text-blue-600 underline hover:text-blue-800"
                target="_blank"
              >
                política de privacidad
              </Link>
              {" "}y el{" "}
              <Link
                href="/legal"
                className="text-blue-600 underline hover:text-blue-800"
                target="_blank"
              >
                aviso legal
              </Link>
            </label>
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-center font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {cargando ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Creando cuenta...
              </span>
            ) : "Crear cuenta"}
          </button>
          </form>

          {/* Pie */}
          <div className="space-y-2 text-center text-sm text-muted-foreground mt-6">
            <p>
              ¿Ya tienes cuenta?{" "}
              <Link href="/login" className="font-medium text-blue-600 hover:underline">
                Inicia sesión
              </Link>
            </p>
            <Link href="/" className="block text-muted-foreground/60 hover:text-muted-foreground transition-colors">
              ← Volver al inicio
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
