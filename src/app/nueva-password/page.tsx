"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function PaginaNuevaPassword() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [password, setPassword] = useState("")
  const [confirmarPassword, setConfirmarPassword] = useState("")
  const [error, setError] = useState("")
  const [cargando, setCargando] = useState(false)
  const [completado, setCompletado] = useState(false)

  // Verificar que hay token en la URL
  useEffect(() => {
    if (!token) {
      setError("Enlace inválido")
    }
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    // Validaciones client-side
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres")
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
    } catch (err) {
      setError("Error al procesar la solicitud")
      setCargando(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-sm space-y-6">
        {/* Cabecera */}
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Establecer nueva contraseña</h1>
          <p className="text-sm text-gray-500">Reservas Deportivas Municipales</p>
        </div>

        {/* Mensaje de éxito */}
        {completado && (
          <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            Contraseña cambiad correctamente. Ahora puedes iniciar sesión.
          </div>
        )}

        {/* Mensaje de enlace inválido */}
        {error === "Enlace inválido" && !completado && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            Enlace inválido o expirado
          </div>
        )}

        {/* Formulario */}
        {!completado && token && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && error !== "Enlace inválido" && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Nueva contraseña
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="confirmarPassword" className="block text-sm font-medium text-gray-700">
                Confirmar contraseña
              </label>
              <input
                id="confirmarPassword"
                type="password"
                required
                autoComplete="new-password"
                value={confirmarPassword}
                onChange={(e) => setConfirmarPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
        <div className="space-y-2 text-center text-sm text-gray-500">
          {completado && (
            <Link href="/login" className="block font-medium text-blue-600 hover:underline">
              Ir a iniciar sesión
            </Link>
          )}
          {!completado && (
            <Link href="/login" className="block text-gray-400 hover:text-gray-600">
              ← Volver al login
            </Link>
          )}
        </div>
      </div>
    </main>
  )
}
