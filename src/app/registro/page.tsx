"use client"

import { useState, useEffect } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"

export default function PaginaRegistro() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [destino, setDestino] = useState("/dashboard")

  // Leer y sanitizar callbackUrl desde query params
  useEffect(() => {
    const callbackUrl = searchParams.get("callbackUrl")
    const esCallbackValido = callbackUrl &&
                             callbackUrl.startsWith("/") &&
                             !callbackUrl.startsWith("/login") &&
                             !callbackUrl.startsWith("/registro")
    setDestino(esCallbackValido ? callbackUrl : "/dashboard")
  }, [searchParams])

  useEffect(() => { document.title = "Crear cuenta" }, [])

  const [nombre, setNombre] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmar, setConfirmar] = useState("")
  const [error, setError] = useState("")
  const [cargando, setCargando] = useState(false)
  const [aceptaPrivacidad, setAceptaPrivacidad] = useState(false)

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

    // Auto-login tras registro exitoso
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    router.push(destino)
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6">
          {/* Cabecera */}
          <div className="space-y-4 mb-6 text-center">
            <h1 className="text-2xl font-bold text-gray-900">Crear cuenta</h1>
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
          <div className="flex items-start gap-3">
            <Checkbox
              id="aceptaPrivacidad"
              checked={aceptaPrivacidad}
              onCheckedChange={(checked) => setAceptaPrivacidad(checked === true)}
              required
            />
            <label htmlFor="aceptaPrivacidad" className="text-sm text-gray-700">
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
          <div className="space-y-2 text-center text-sm text-gray-500 mt-6">
            <p>
              ¿Ya tienes cuenta?{" "}
              <Link href="/login" className="font-medium text-blue-600 hover:underline">
                Inicia sesión
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
