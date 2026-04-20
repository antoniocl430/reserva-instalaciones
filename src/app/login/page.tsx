"use client"

import { useState, useEffect } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"

export default function PaginaLogin() {
  const router = useRouter()
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
  const [cargando, setCargando] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setCargando(true)

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError("Email o contraseña incorrectos")
      setCargando(false)
      return
    }

    if (result?.ok) {
      // Redirigir a callbackUrl si es válido, sino a /dashboard
      console.log("[LOGIN] Redirigiendo a:", destino)
      setTimeout(() => router.push(destino), 0)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6">
          {/* Cabecera */}
          <div className="space-y-4 mb-6 text-center">
            <h1 className="text-2xl font-bold text-gray-900">Iniciar sesión</h1>
            <p className="text-sm text-gray-500">Reservas Deportivas Municipales</p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div role="alert" aria-live="assertive" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
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

          {/* Pie */}
          <div className="space-y-2 text-center text-sm text-gray-500 mt-6">
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
            <Link href="/" className="block text-gray-400 hover:text-gray-600">
              ← Volver al inicio
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
