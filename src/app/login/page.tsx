"use client"

import { useState, useEffect } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

export default function PaginaLogin() {
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

    console.log("[LOGIN] callbackUrl desde URL:", callbackUrl, "| destino final:", dest)
    setDestino(dest)
  }, [])

  useEffect(() => { document.title = "Iniciar sesión" }, [])
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [errorEmailNoVerificado, setErrorEmailNoVerificado] = useState(false)
  const [cargando, setCargando] = useState(false)

  // Estado del formulario de reenvío de verificación
  const [emailReenvio, setEmailReenvio] = useState("")
  const [enviandoReenvio, setEnviandoReenvio] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setErrorEmailNoVerificado(false)
    setCargando(true)

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      if (result.error === "EMAIL_NO_VERIFICADO") {
        // Error específico: email pendiente de verificación
        setErrorEmailNoVerificado(true)
        setEmailReenvio(email) // Pre-rellenar con el email del login
      } else {
        setError("Email o contraseña incorrectos")
      }
      setCargando(false)
      return
    }

    if (result?.ok) {
      // Redirigir a callbackUrl si es válido, sino a /dashboard
      console.log("[LOGIN] Redirigiendo a:", destino)
      setTimeout(() => router.push(destino), 0)
    }
  }

  async function handleReenviarVerificacion(e: React.FormEvent) {
    e.preventDefault()
    setEnviandoReenvio(true)

    try {
      const respuesta = await fetch("/api/reenviar-verificacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailReenvio }),
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

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6">
          {/* Cabecera */}
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-foreground">Iniciar sesión</h1>
            <p className="text-sm text-muted-foreground mt-1">Reservas Deportivas Municipales</p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error genérico de credenciales */}
          {error && (
            <div role="alert" aria-live="assertive" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:border-red-900 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Error específico: email no verificado */}
          {errorEmailNoVerificado && (
            <div
              role="alert"
              aria-live="assertive"
              className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300"
            >
              <p className="font-medium">Debes verificar tu email antes de iniciar sesión.</p>
              <p className="mt-1 text-amber-700 dark:text-amber-400">
                Revisa tu bandeja de entrada o solicita un nuevo enlace.
              </p>
            </div>
          )}

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
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-center font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {cargando ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Entrando...
              </span>
            ) : "Entrar"}
          </button>
          </form>

          {/* Formulario de reenvío de verificación (visible solo cuando hay error de email no verificado) */}
          {errorEmailNoVerificado && (
            <div className="mt-4 border-t pt-4">
              <p className="text-xs text-muted-foreground mb-2">Reenviar enlace de verificación:</p>
              <form onSubmit={handleReenviarVerificacion} className="flex gap-2">
                <Input
                  type="email"
                  inputMode="email"
                  required
                  autoComplete="email"
                  value={emailReenvio}
                  onChange={(e) => setEmailReenvio(e.target.value)}
                  placeholder="tu@email.com"
                  className="flex-1 text-sm"
                />
                <button
                  type="submit"
                  disabled={enviandoReenvio}
                  className="shrink-0 rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {enviandoReenvio ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : "Reenviar enlace"}
                </button>
              </form>
            </div>
          )}

          {/* Pie */}
          <div className="space-y-2 text-center text-sm text-muted-foreground mt-6">
            <p>
              <Link href="/recuperar-password" className="font-medium text-blue-600 hover:underline">
                ¿Olvidaste tu contraseña?
              </Link>
            </p>
            <p>
              ¿No tienes cuenta?{" "}
              <Link href="/registro" className="font-medium text-blue-600 hover:underline">
                Regístrate
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
