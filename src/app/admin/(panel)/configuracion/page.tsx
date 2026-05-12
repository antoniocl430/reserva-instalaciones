"use client"

/**
 * Página de configuración del tenant.
 *
 * Permite al administrador personalizar:
 *   - Nombre del servicio (aparece en el header)
 *   - Colores primario y secundario (con vista previa en tiempo real)
 *   - Título y descripción SEO (metadata)
 *
 * Ruta: /admin/configuracion
 * Acceso: solo ADMIN (protegido por el layout /admin/(panel))
 */

import { useEffect, useState } from "react"
import { Settings, AlertCircle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ConfiguracionTenant {
  nombreServicio?: string
  colores?: {
    primario?: string
    secundario?: string
  }
  metadata?: {
    title?: string
    description?: string
  }
}

interface EstadoFormulario {
  nombreServicio: string
  colorPrimario: string
  colorSecundario: string
  metadataTitle: string
  metadataDescription: string
}

const ESTADO_INICIAL: EstadoFormulario = {
  nombreServicio: "",
  colorPrimario: "#2563eb",
  colorSecundario: "#16a34a",
  metadataTitle: "",
  metadataDescription: "",
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function PaginaConfiguracion() {
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [formulario, setFormulario] = useState<EstadoFormulario>(ESTADO_INICIAL)
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)
  const [mensajeError, setMensajeError] = useState<string | null>(null)

  // Título de la pestaña del navegador
  useEffect(() => { document.title = "Configuración" }, [])

  // ── Carga inicial ──────────────────────────────────────────────────────────

  useEffect(() => {
    async function cargarConfiguracion() {
      setCargando(true)
      setMensajeError(null)
      try {
        const res = await fetch("/api/admin/configuracion")
        if (!res.ok) throw new Error("Error al cargar la configuración")
        const datos = await res.json()
        const config: ConfiguracionTenant = datos.configuracion ?? {}
        setFormulario({
          nombreServicio: config.nombreServicio ?? "",
          colorPrimario: config.colores?.primario ?? "#2563eb",
          colorSecundario: config.colores?.secundario ?? "#16a34a",
          metadataTitle: config.metadata?.title ?? "",
          metadataDescription: config.metadata?.description ?? "",
        })
      } catch (err) {
        setMensajeError(
          err instanceof Error ? err.message : "Error al cargar la configuración"
        )
      } finally {
        setCargando(false)
      }
    }
    cargarConfiguracion()
  }, [])

  // ── Actualizar campo ───────────────────────────────────────────────────────

  function actualizarCampo(campo: keyof EstadoFormulario, valor: string) {
    setFormulario((prev) => ({ ...prev, [campo]: valor }))
    // Limpiar mensajes al editar
    setMensajeExito(null)
    setMensajeError(null)
  }

  // ── Guardar cambios ────────────────────────────────────────────────────────

  async function guardarConfiguracion() {
    setGuardando(true)
    setMensajeExito(null)
    setMensajeError(null)

    const payload = {
      configuracion: {
        nombreServicio: formulario.nombreServicio,
        colores: {
          primario: formulario.colorPrimario,
          secundario: formulario.colorSecundario,
        },
        metadata: {
          title: formulario.metadataTitle,
          description: formulario.metadataDescription,
        },
      },
    }

    try {
      const res = await fetch("/api/admin/configuracion", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const cuerpo = await res.json()
        throw new Error(`Error al guardar: ${cuerpo.error ?? "Error del servidor"}`)
      }

      setMensajeExito("Configuración guardada. Recarga la página para ver el nuevo nombre en el logo.")
    } catch (err) {
      setMensajeError(
        err instanceof Error ? err.message : "Error al guardar la configuración"
      )
    } finally {
      setGuardando(false)
    }
  }

  // ── Render: cargando ───────────────────────────────────────────────────────

  if (cargando) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <div className="max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    )
  }

  // ── Render principal ───────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Cabecera */}
        <div className="flex items-center gap-2">
          <Settings className="w-6 h-6 text-gray-700" aria-hidden="true" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Configuración</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Personaliza la apariencia y datos de tu ayuntamiento
            </p>
          </div>
        </div>

        {/* Mensaje de éxito */}
        {mensajeExito && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span>{mensajeExito}</span>
          </div>
        )}

        {/* Mensaje de error */}
        {mensajeError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span>{mensajeError}</span>
          </div>
        )}

        {/* Sección: Nombre del servicio */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-gray-800">
              Nombre del servicio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombreServicio">Nombre del servicio</Label>
              <Input
                id="nombreServicio"
                value={formulario.nombreServicio}
                onChange={(e) => actualizarCampo("nombreServicio", e.target.value)}
                placeholder="Ej: Deportes Municipales"
                disabled={guardando}
              />
              <p className="text-xs text-gray-500">
                Este nombre aparece en el encabezado de la aplicación.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Sección: Personalización visual */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-gray-800">
              Personalización visual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* Color primario */}
            <div className="space-y-2">
              <Label htmlFor="colorPrimario">Color primario</Label>
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <input
                  type="color"
                  id="colorPrimario"
                  value={formulario.colorPrimario}
                  onChange={(e) => actualizarCampo("colorPrimario", e.target.value)}
                  disabled={guardando}
                  className="h-10 w-16 cursor-pointer rounded border border-gray-300 p-1 disabled:opacity-50"
                />
                <Input
                  id="colorPrimarioHex"
                  value={formulario.colorPrimario}
                  onChange={(e) => actualizarCampo("colorPrimario", e.target.value)}
                  placeholder="#2563eb"
                  disabled={guardando}
                  className="max-w-36 font-mono text-sm"
                />
                {/* Vista previa */}
                <div
                  className="h-10 w-20 rounded-md border border-gray-200 flex-shrink-0"
                  style={{ backgroundColor: formulario.colorPrimario }}
                  role="img"
                  aria-label="Muestra del color seleccionado como primario"
                />
              </div>
              <p className="text-xs text-gray-500">
                Color principal de botones y elementos destacados. Formato hexadecimal (ej: #2563eb).
              </p>
            </div>

            {/* Color secundario */}
            <div className="space-y-2">
              <Label htmlFor="colorSecundario">Color secundario</Label>
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <input
                  type="color"
                  id="colorSecundario"
                  value={formulario.colorSecundario}
                  onChange={(e) => actualizarCampo("colorSecundario", e.target.value)}
                  disabled={guardando}
                  className="h-10 w-16 cursor-pointer rounded border border-gray-300 p-1 disabled:opacity-50"
                />
                <Input
                  id="colorSecundarioHex"
                  value={formulario.colorSecundario}
                  onChange={(e) => actualizarCampo("colorSecundario", e.target.value)}
                  placeholder="#16a34a"
                  disabled={guardando}
                  className="max-w-36 font-mono text-sm"
                />
                {/* Vista previa */}
                <div
                  className="h-10 w-20 rounded-md border border-gray-200 flex-shrink-0"
                  style={{ backgroundColor: formulario.colorSecundario }}
                  role="img"
                  aria-label="Muestra del color seleccionado como secundario"
                />
              </div>
              <p className="text-xs text-gray-500">
                Color de acento y elementos secundarios. Formato hexadecimal (ej: #16a34a).
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Sección: SEO y metadata */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-gray-800">
              SEO y metadata
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="metadataTitle">Título de la página</Label>
              <Input
                id="metadataTitle"
                value={formulario.metadataTitle}
                onChange={(e) => actualizarCampo("metadataTitle", e.target.value)}
                placeholder="Ej: Reservas Deportivas — Ayuntamiento de Sevilla"
                disabled={guardando}
              />
              <p className="text-xs text-gray-500">
                Título que aparece en la pestaña del navegador y en buscadores.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="metadataDescription">Descripción</Label>
              <Textarea
                id="metadataDescription"
                value={formulario.metadataDescription}
                onChange={(e) => actualizarCampo("metadataDescription", e.target.value)}
                placeholder="Breve descripción del servicio para buscadores"
                rows={3}
                disabled={guardando}
              />
              <p className="text-xs text-gray-500">
                Descripción que aparece en resultados de búsqueda. Recomendado: menos de 160 caracteres.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Botón guardar */}
        <div className="flex justify-end pb-8">
          <Button
            onClick={guardarConfiguracion}
            disabled={guardando}
            className="w-full sm:w-auto min-w-36"
          >
            {guardando ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </div>
    </div>
  )
}
