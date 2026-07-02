"use client"

import { useState } from "react"
import { signOut } from "next-auth/react"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

// Página personalizada de cierre de sesión, en español.
// Sustituye a la plantilla por defecto de NextAuth (en inglés) que se
// muestra al navegar directamente a /api/auth/signout. Se registra en
// `opcionesAuth.pages.signOut` (src/lib/auth.ts).
export default function PaginaCerrarSesion() {
  const [cerrando, setCerrando] = useState(false)

  async function handleCerrarSesion() {
    setCerrando(true)
    await signOut({ callbackUrl: "/" })
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Cerrar sesión</h1>
          <p className="text-sm text-muted-foreground mb-6">
            ¿Seguro que quieres cerrar sesión?
          </p>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={handleCerrarSesion}
              disabled={cerrando}
              className="w-full rounded-lg bg-red-600 px-4 py-3 text-center font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {cerrando ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cerrando sesión...
                </span>
              ) : (
                "Cerrar sesión"
              )}
            </button>
            <Link
              href="/"
              className="w-full rounded-lg border border-input px-4 py-3 text-center font-medium text-foreground hover:bg-accent transition-colors"
            >
              Cancelar
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
