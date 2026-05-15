"use client"

/**
 * Página de administración — Comunicados masivos
 *
 * Permite al administrador enviar mensajes por email y/o push
 * a todos los ciudadanos del ayuntamiento.
 *
 * Ruta: /admin/comunicados
 * Acceso: solo ADMIN (protegido por el layout /admin/(panel))
 */

import { useEffect, useState } from "react"
import { Megaphone, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

// ─── Tipos ────────────────────────────────────────────────────────────────────

type CanalComunicado = "EMAIL" | "PUSH" | "AMBOS"

interface Comunicado {
  id: string
  titulo: string
  cuerpo: string
  canal: CanalComunicado
  enviadoEn: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Formatea una fecha ISO a formato legible en español */
function formatearFecha(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return iso
  }
}

/** Configuración de estilos y etiquetas para cada canal */
const ESTILOS_CANAL: Record<CanalComunicado, { clase: string; etiqueta: string }> = {
  EMAIL: { clase: "bg-blue-100 text-blue-700", etiqueta: "Email" },
  PUSH: { clase: "bg-purple-100 text-purple-700", etiqueta: "Push" },
  AMBOS: { clase: "bg-green-100 text-green-700", etiqueta: "Email y push" },
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function PaginaComunicados() {
  const { toast } = useToast()

  // Estado del historial
  const [comunicados, setComunicados] = useState<Comunicado[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Estado del formulario
  const [titulo, setTitulo] = useState("")
  const [cuerpo, setCuerpo] = useState("")
  const [canal, setCanal] = useState<CanalComunicado>("AMBOS")

  // Estado del dialog de confirmación
  const [dialogAbierto, setDialogAbierto] = useState(false)
  const [enviando, setEnviando] = useState(false)

  // ── Carga del historial ────────────────────────────────────────────────────

  async function cargarComunicados() {
    setCargando(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/comunicados")
      if (!res.ok) throw new Error("Error al cargar los comunicados")
      const data = await res.json()
      setComunicados(data.comunicados)
    } catch {
      setError("No se pudieron cargar los comunicados")
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarComunicados()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Envío del comunicado ───────────────────────────────────────────────────

  function abrirConfirmacion() {
    setDialogAbierto(true)
  }

  async function confirmarEnvio() {
    setEnviando(true)
    try {
      const res = await fetch("/api/admin/comunicados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo, cuerpo, canal }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Error al enviar el comunicado")
      }

      const data = await res.json()
      const { email, push } = data.enviados

      toast({
        title: "Comunicado enviado",
        description: `${email} destinatarios por email, ${push} por push`,
      })

      // Limpiar formulario y recargar historial
      setTitulo("")
      setCuerpo("")
      setCanal("AMBOS")
      setDialogAbierto(false)
      await cargarComunicados()
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error al enviar",
        description: err instanceof Error ? err.message : "Error desconocido",
      })
    } finally {
      setEnviando(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Cabecera */}
        <div className="flex items-center gap-3">
          <Megaphone className="h-7 w-7 text-primary" aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-bold">Comunicados masivos</h1>
            <p className="text-sm text-muted-foreground">
              Envía mensajes por email y/o push a todos los ciudadanos del ayuntamiento
            </p>
          </div>
        </div>

        {/* Formulario de envío */}
        <div className="border rounded-lg p-6 space-y-5 bg-white">
          <h2 className="text-base font-semibold">Nuevo comunicado</h2>

          {/* Campo: título */}
          <div className="space-y-1.5">
            <label htmlFor="com-titulo" className="text-sm font-medium">
              Título
            </label>
            <input
              id="com-titulo"
              type="text"
              placeholder="Asunto del comunicado"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Campo: cuerpo */}
          <div className="space-y-1.5">
            <label htmlFor="com-cuerpo" className="text-sm font-medium">
              Cuerpo
            </label>
            <textarea
              id="com-cuerpo"
              placeholder="Escribe aquí el mensaje para los ciudadanos..."
              value={cuerpo}
              onChange={(e) => setCuerpo(e.target.value)}
              maxLength={1000}
              rows={5}
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {cuerpo.length}/1000 caracteres
            </p>
          </div>

          {/* Selector: canal */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Canal de envío</label>
            <Select
              defaultValue={canal}
              onValueChange={(v) => setCanal(v as CanalComunicado)}
            >
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Selecciona canal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EMAIL">Solo email</SelectItem>
                <SelectItem value="PUSH">Solo notificación push</SelectItem>
                <SelectItem value="AMBOS">Email y push</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Botón enviar */}
          <div className="flex justify-end">
            <Button
              onClick={abrirConfirmacion}
              disabled={!titulo.trim() || !cuerpo.trim()}
            >
              <Send className="h-4 w-4 mr-2" aria-hidden="true" />
              Enviar comunicado
            </Button>
          </div>
        </div>

        {/* Historial de comunicados */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold">Historial de comunicados</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">
              {error}
            </div>
          )}

          {cargando ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border rounded-lg p-4 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          ) : comunicados.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm border rounded-lg">
              Aún no se han enviado comunicados
            </div>
          ) : (
            <div className="space-y-2">
              {comunicados.map((c) => {
                const estilo = ESTILOS_CANAL[c.canal] ?? { clase: "bg-gray-100 text-gray-700", etiqueta: c.canal }
                return (
                  <div
                    key={c.id}
                    className="border rounded-lg px-4 py-3 bg-white space-y-1"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <span className="font-medium text-sm">{c.titulo}</span>
                      <Badge className={`${estilo.clase} text-xs font-medium w-fit`}>
                        {estilo.etiqueta}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{c.cuerpo}</p>
                    <p className="text-xs text-muted-foreground">{formatearFecha(c.enviadoEn)}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Dialog de confirmación de envío */}
      <Dialog open={dialogAbierto} onOpenChange={setDialogAbierto}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Enviar a todos los ciudadanos?</DialogTitle>
            <DialogDescription>
              Este comunicado se enviará por{" "}
              <strong>{ESTILOS_CANAL[canal]?.etiqueta ?? canal}</strong> a todos los
              ciudadanos registrados en el ayuntamiento. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogAbierto(false)}
              disabled={enviando}
            >
              Cancelar
            </Button>
            <Button onClick={confirmarEnvio} disabled={enviando}>
              {enviando ? "Enviando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
