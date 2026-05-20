"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Loader2, CheckCircle2, XCircle, Mail } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

// Estados posibles de la verificación
type EstadoVerificacion = "cargando" | "exito" | "error"

export default function PaginaVerificarEmail() {
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const token = searchParams.get("token")

  const [estado, setEstado] = useState<EstadoVerificacion>("cargando")
  const [mensajeError, setMensajeError] = useState("")
  const [emailReenvio, setEmailReenvio] = useState("")
  const [enviandoReenvio, setEnviandoReenvio] = useState(false)

  useEffect(() => {
    document.title = "Verificar email"

    // Sin token — mostrar error directamente
    if (!token) {
      setMensajeError("No se encontró un token de verificación en la URL.")
      setEstado("error")
      return
    }

    // Llamar al API de verificación
    async function verificarToken() {
      try {
        const respuesta = await fetch(`/api/verificar-email?token=${encodeURIComponent(token!)}`, {
          method: "GET",
        })
        const data = await respuesta.json()

        if (respuesta.ok && data.ok) {
          setEstado("exito")
        } else {
          setMensajeError(data.error || "Error al verificar el email.")
          setEstado("error")
        }
      } catch {
        setMensajeError("Error de conexión. Inténtalo de nuevo.")
        setEstado("error")
      }
    }

    verificarToken()
  }, [token])

  async function handleReenviar(e: React.FormEvent) {
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

          {/* Estado: cargando */}
          {estado === "cargando" && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
              <p className="text-muted-foreground">Verificando tu cuenta...</p>
            </div>
          )}

          {/* Estado: éxito */}
          {estado === "exito" && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <div>
                <h1 className="text-xl font-bold text-foreground">¡Cuenta verificada!</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Tu cuenta ha sido activada correctamente. Ya puedes iniciar sesión.
                </p>
              </div>
              <Link
                href="/login"
                className="w-full rounded-lg bg-blue-600 px-4 py-3 text-center font-medium text-white hover:bg-blue-700 transition-colors"
              >
                Iniciar sesión
              </Link>
            </div>
          )}

          {/* Estado: error */}
          {estado === "error" && (
            <div className="flex flex-col gap-4 py-2">
              <div className="flex flex-col items-center gap-3 text-center">
                <XCircle className="h-12 w-12 text-red-500" />
                <div>
                  <h1 className="text-xl font-bold text-foreground">Error de verificación</h1>
                  <p className="text-sm text-muted-foreground mt-1">{mensajeError}</p>
                </div>
              </div>

              {/* Formulario para reenviar el enlace */}
              <div className="border-t pt-4 mt-2">
                <p className="text-sm text-muted-foreground mb-3 text-center">
                  ¿Quieres recibir un nuevo enlace de verificación?
                </p>
                <form onSubmit={handleReenviar} className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="email-reenvio">Email</Label>
                    <Input
                      id="email-reenvio"
                      type="email"
                      inputMode="email"
                      required
                      autoComplete="email"
                      value={emailReenvio}
                      onChange={(e) => setEmailReenvio(e.target.value)}
                      placeholder="tu@email.com"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={enviandoReenvio}
                    className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-center font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {enviandoReenvio ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Enviando...
                      </span>
                    ) : "Reenviar enlace"}
                  </button>
                </form>
              </div>

              <div className="text-center">
                <Link href="/login" className="text-sm text-blue-600 hover:underline">
                  Volver al inicio de sesión
                </Link>
              </div>
            </div>
          )}

        </CardContent>
      </Card>
    </main>
  )
}
