"use client"

import { Suspense, useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useRouter } from "next/navigation"
import Link from "next/link"

function FormularioNuevaPassword() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [password, setPassword] = useState("")
  const [confirmarPassword, setConfirmarPassword] = useState("")
  const [error, setError] = useState("")
  const [cargando, setCargando] = useState(false)
  const [completado, setCompletado] = useState(false)

  // Título de la pestaña del navegador
  useEffect(() => { document.title = "Nueva contraseña" }, [])

  // Verificar que hay token en la URL
  useEffect(() => {
    if (!token) {
      setError("Enlace inválido")
    }
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres")
      return
    }
    if (password !== confirmarPassword) {
      setError("Las contraseñas no coinciden")
      return
    }

    if (!token) {
      setError("Enlace inválido")
      return
    }

    setCargando(true)

    try {
      const respuesta = await fetch("/api/auth/nueva-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })

      const data = await respuesta.json()

      if (!respuesta.ok) {
        setError(data.error || "Error al cambiar la contraseña")
        setCargando(false)
        return
      }

      setCompletado(true)
    } catch {
      setError("Error al procesar la solicitud")
      setCargando(false)
    }
  }

  return (
    <>
      {/* Mensaje de éxito */}
      {completado && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 dark:bg-green-950/40 dark:border-green-900 dark:text-green-400">
          Contraseña cambiada correctamente. Ahora puedes iniciar sesión.
        </div>
      )}

      {/* Mensaje de enlace inválido */}
      {error === "Enlace inválido" && !completado && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:border-red-900 dark:text-red-400" role="alert">
          Enlace inválido o expirado
        </div>
      )}

      {/* Formulario */}
      {!completado && token && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && error !== "Enlace inválido" && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:border-red-900 dark:text-red-400" role="alert">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="password" className="block text-sm font-medium text-foreground">
              Nueva contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Mínimo 8 caracteres"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="confirmarPassword" className="block text-sm font-medium text-foreground">
              Confirmar contraseña
            </label>
            <input
              id="confirmarPassword"
              type="password"
              required
              autoComplete="new-password"
              value={confirmarPassword}
              onChange={(e) => setConfirmarPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-center font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {cargando ? "Cargando..." : "Cambiar contraseña"}
          </button>
        </form>
      )}

      {/* Pie */}
      <div className="space-y-2 text-center text-sm text-muted-foreground">
        {completado && (
          <Link href="/login" className="block font-medium text-blue-600 hover:underline">
            Ir a iniciar sesión
          </Link>
        )}
        {!completado && (
          <Link href="/login" className="block text-muted-foreground/60 hover:text-muted-foreground transition-colors">
            ← Volver al login
          </Link>
        )}
      </div>
    </>
  )
}

export default function PaginaNuevaPassword() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold text-foreground">Establecer nueva contraseña</h1>
          <p className="text-sm text-muted-foreground">Reservas Deportivas Municipales</p>
        </div>

        <Suspense fallback={<div className="text-center text-sm text-muted-foreground">Cargando...</div>}>
          <FormularioNuevaPassword />
        </Suspense>
      </div>
    </main>
  )
}
