"use client"

/**
 * Página de configuración del tenant.
 *
 * Permite al administrador personalizar:
 *   - Identidad del ayuntamiento (nombre, municipio, logo)
 *   - Nombre del servicio (aparece en el header)
 *   - Colores primario y secundario (con vista previa en tiempo real)
 *   - Título y descripción SEO (metadata)
 *   - Horarios y slots (duración de cada slot y franjas horarias)
 *
 * Ruta: /admin/configuracion
 * Acceso: solo ADMIN (protegido por el layout /admin/(panel))
 */

import { useEffect, useState, useMemo, useRef } from "react"
import { Settings, AlertCircle, CheckCircle2, Clock, ShieldAlert, CalendarCheck, Upload, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { generarSlots, SLOTS_CONFIG_DEFAULT, type SlotsConfig } from "@/lib/slots"

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
  slots?: SlotsConfig
  penalizaciones?: {
    maxNoShows?: number
    diasSuspension?: number
  }
  limiteReservasActivas?: number
}

interface Franja {
  inicio: string
  fin: string
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

const DURACIONES_VALIDAS = [60, 75, 90] as const
type DuracionValida = typeof DURACIONES_VALIDAS[number]

// ─── Componente principal ─────────────────────────────────────────────────────

export default function PaginaConfiguracion() {
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [formulario, setFormulario] = useState<EstadoFormulario>(ESTADO_INICIAL)
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)
  const [mensajeError, setMensajeError] = useState<string | null>(null)

  // ── Estado de la sección de identidad del ayuntamiento ────────────────────
  const [nombreTenant, setNombreTenant] = useState("")
  const [municipio, setMunicipio] = useState("")
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [subiendoLogo, setSubiendoLogo] = useState(false)
  const inputLogoRef = useRef<HTMLInputElement>(null)

  // ── Estado de la sección de horarios y slots ───────────────────────────────
  const [duracionMinutos, setDuracionMinutos] = useState<DuracionValida>(
    SLOTS_CONFIG_DEFAULT.duracionMinutos as DuracionValida
  )
  const [franjas, setFranjas] = useState<Franja[]>(SLOTS_CONFIG_DEFAULT.franjas)
  const [errorSlots, setErrorSlots] = useState<string | null>(null)

  // ── Estado de la sección de penalizaciones ────────────────────────────────
  const [maxNoShows, setMaxNoShows] = useState<number>(3)
  const [diasSuspension, setDiasSuspension] = useState<number>(14)

  // ── Estado de la sección de reservas ──────────────────────────────────────
  const [limiteReservasActivas, setLimiteReservasActivas] = useState<number>(2)

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
        // Cargar datos de identidad del ayuntamiento
        setNombreTenant(datos.nombre ?? "")
        setMunicipio(datos.municipio ?? "")
        setLogoUrl(datos.logoUrl ?? null)
        // Cargar slots desde la config guardada o usar defaults
        const slotsConfig = config.slots ?? SLOTS_CONFIG_DEFAULT
        const duracion = DURACIONES_VALIDAS.includes(slotsConfig.duracionMinutos as DuracionValida)
          ? (slotsConfig.duracionMinutos as DuracionValida)
          : SLOTS_CONFIG_DEFAULT.duracionMinutos as DuracionValida
        setDuracionMinutos(duracion)
        setFranjas(slotsConfig.franjas)
        // Cargar penalizaciones desde la config guardada o usar defaults
        if (config.penalizaciones) {
          setMaxNoShows(config.penalizaciones.maxNoShows ?? 3)
          setDiasSuspension(config.penalizaciones.diasSuspension ?? 14)
        }
        // Cargar límite de reservas activas desde la config guardada o usar default
        if (config.limiteReservasActivas !== undefined) {
          setLimiteReservasActivas(config.limiteReservasActivas)
        }
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

  // ── Actualizar campo del formulario principal ──────────────────────────────

  function actualizarCampo(campo: keyof EstadoFormulario, valor: string) {
    setFormulario((prev) => ({ ...prev, [campo]: valor }))
    // Limpiar mensajes al editar
    setMensajeExito(null)
    setMensajeError(null)
  }

  // ── Actualizar franja horaria ──────────────────────────────────────────────

  function actualizarFranja(indice: number, campo: "inicio" | "fin", valor: string) {
    setFranjas((prev) => {
      const nuevas = [...prev]
      nuevas[indice] = { ...nuevas[indice], [campo]: valor }
      return nuevas
    })
    setErrorSlots(null)
    setMensajeExito(null)
    setMensajeError(null)
  }

  // ── Vista previa calculada en tiempo real ──────────────────────────────────

  const slotsPrevisualizados = useMemo(() => {
    try {
      return generarSlots({ duracionMinutos, franjas })
    } catch {
      return []
    }
  }, [duracionMinutos, franjas])

  // ── Validación de franjas ──────────────────────────────────────────────────

  function validarFranjas(): boolean {
    for (let i = 0; i < franjas.length; i++) {
      const { inicio, fin } = franjas[i]
      if (inicio >= fin) {
        setErrorSlots(
          `La franja ${i === 0 ? "mañana" : "tarde"}: el inicio debe ser anterior al fin`
        )
        return false
      }
    }
    return true
  }

  // ── Subir logo del ayuntamiento ───────────────────────────────────────────

  async function manejarSubidaLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSubiendoLogo(true)
    setMensajeError(null)
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch("/api/admin/logo", { method: "POST", body: form })
      if (!res.ok) {
        const err = await res.json()
        setMensajeError(err.error ?? "No se pudo subir el logo")
        return
      }
      const data = await res.json()
      setLogoUrl(data.logoUrl)
      setMensajeExito("Logo actualizado correctamente")
    } finally {
      setSubiendoLogo(false)
      e.target.value = ""
    }
  }

  // ── Eliminar logo del ayuntamiento ────────────────────────────────────────

  async function eliminarLogo() {
    const res = await fetch("/api/admin/configuracion", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logoUrl: null }),
    })
    if (res.ok) {
      setLogoUrl(null)
      setMensajeExito("Logo eliminado")
    }
  }

  // ── Guardar cambios ────────────────────────────────────────────────────────

  async function guardarConfiguracion() {
    setMensajeExito(null)
    setMensajeError(null)
    setErrorSlots(null)

    // Validar franjas antes de enviar
    if (!validarFranjas()) return

    setGuardando(true)

    const payload = {
      nombre: nombreTenant,
      municipio: municipio,
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
        slots: {
          duracionMinutos,
          franjas,
        },
        penalizaciones: {
          maxNoShows,
          diasSuspension,
        },
        limiteReservasActivas,
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

        {/* Sección: Identidad del ayuntamiento */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-gray-800">
              Identidad del ayuntamiento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Nombre del ayuntamiento */}
            <div className="space-y-2">
              <Label htmlFor="nombreTenant">Nombre del ayuntamiento</Label>
              <Input
                id="nombreTenant"
                value={nombreTenant}
                onChange={(e) => {
                  setNombreTenant(e.target.value)
                  setMensajeExito(null)
                  setMensajeError(null)
                }}
                placeholder="Ej: Ayuntamiento de Sevilla"
                disabled={guardando}
              />
            </div>

            {/* Municipio */}
            <div className="space-y-2">
              <Label htmlFor="municipio">Municipio</Label>
              <Input
                id="municipio"
                value={municipio}
                onChange={(e) => {
                  setMunicipio(e.target.value)
                  setMensajeExito(null)
                  setMensajeError(null)
                }}
                placeholder="Ej: Sevilla"
                disabled={guardando}
              />
            </div>

            {/* Logo */}
            <div className="space-y-3">
              <Label>Logo</Label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">

                {/* Preview o placeholder */}
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo del ayuntamiento"
                    className="h-16 w-auto object-contain border rounded p-1"
                  />
                ) : (
                  <div className="h-16 w-32 border rounded flex items-center justify-center text-gray-400 text-sm">
                    Sin logo
                  </div>
                )}

                {/* Botones de acción */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => inputLogoRef.current?.click()}
                    disabled={subiendoLogo || guardando}
                  >
                    <Upload className="w-4 h-4 mr-2" aria-hidden="true" />
                    {subiendoLogo ? "Subiendo..." : "Subir logo"}
                  </Button>

                  {logoUrl && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={eliminarLogo}
                      disabled={guardando}
                    >
                      <Trash2 className="w-4 h-4 mr-2" aria-hidden="true" />
                      Eliminar logo
                    </Button>
                  )}
                </div>

                {/* Input file oculto */}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={inputLogoRef}
                  onChange={manejarSubidaLogo}
                />
              </div>
              <p className="text-xs text-gray-500">
                PNG, JPG o SVG — máx. 200 KB
              </p>
            </div>

          </CardContent>
        </Card>

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

        {/* Sección: Horarios y slots */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-600" aria-hidden="true" />
              Horarios y slots
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* Mensaje de error de validación de slots */}
            {errorSlots && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                <span>{errorSlots}</span>
              </div>
            )}

            {/* Selector de duración */}
            <div className="space-y-2">
              <Label htmlFor="duracionSlot">Duración de cada slot</Label>
              <Select
                value={String(duracionMinutos)}
                onValueChange={(val) => {
                  const num = Number(val) as DuracionValida
                  setDuracionMinutos(num)
                  setErrorSlots(null)
                  setMensajeExito(null)
                  setMensajeError(null)
                }}
              >
                <SelectTrigger id="duracionSlot" className="w-44">
                  <SelectValue placeholder="Seleccionar duración" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="60">60 minutos</SelectItem>
                  <SelectItem value="75">75 minutos</SelectItem>
                  <SelectItem value="90">90 minutos</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Duración de cada turno de reserva. Afecta al número de slots disponibles por día.
              </p>
            </div>

            {/* Franjas horarias */}
            <div className="space-y-3">
              <Label>Franjas horarias</Label>
              {franjas.map((franja, i) => (
                <div
                  key={i}
                  className="border border-gray-200 rounded-lg p-4 space-y-3"
                >
                  <p className="text-sm font-medium text-gray-700">
                    {i === 0 ? "Franja mañana" : "Franja tarde"}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 space-y-1">
                      <Label htmlFor={`franja-${i}-inicio`} className="text-xs text-gray-600">
                        Inicio
                      </Label>
                      <Input
                        id={`franja-${i}-inicio`}
                        data-testid={`input-franja-${i}-inicio`}
                        type="time"
                        value={franja.inicio}
                        onChange={(e) => actualizarFranja(i, "inicio", e.target.value)}
                        disabled={guardando}
                        className="font-mono"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label htmlFor={`franja-${i}-fin`} className="text-xs text-gray-600">
                        Fin
                      </Label>
                      <Input
                        id={`franja-${i}-fin`}
                        data-testid={`input-franja-${i}-fin`}
                        type="time"
                        value={franja.fin}
                        onChange={(e) => actualizarFranja(i, "fin", e.target.value)}
                        disabled={guardando}
                        className="font-mono"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Vista previa de slots */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-700">Vista previa de slots generados:</p>
                <Badge variant="secondary" className="text-xs">
                  {slotsPrevisualizados.length} slots
                </Badge>
              </div>
              {slotsPrevisualizados.length === 0 ? (
                <p className="text-sm text-gray-400 italic">
                  No se generan slots con la configuración actual.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {slotsPrevisualizados.map((slot, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-mono border border-blue-100"
                    >
                      {slot.horaInicio}–{slot.horaFin}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sección: Reservas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-gray-600" aria-hidden="true" />
              Reservas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="limiteReservasActivas">
                Límite de reservas activas por ciudadano
              </Label>
              <Input
                id="limiteReservasActivas"
                data-testid="input-limite-reservas-activas"
                type="number"
                min={1}
                max={10}
                value={limiteReservasActivas}
                onChange={(e) =>
                  setLimiteReservasActivas(
                    Math.min(10, Math.max(1, Number(e.target.value)))
                  )
                }
                disabled={guardando}
                className="w-28"
              />
              <p className="text-xs text-gray-500">
                Número máximo de reservas activas simultáneas que puede tener un ciudadano.
                Por defecto: 2.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Sección: Penalizaciones por no-show */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-gray-600" aria-hidden="true" />
              Penalizaciones por no-show
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* No-shows para suspensión automática */}
            <div className="space-y-2">
              <Label htmlFor="maxNoShows">No-shows para suspensión automática</Label>
              <Input
                id="maxNoShows"
                data-testid="input-max-noshows"
                type="number"
                min={1}
                max={10}
                value={maxNoShows}
                onChange={(e) => setMaxNoShows(Math.min(10, Math.max(1, Number(e.target.value))))}
                disabled={guardando}
                className="w-28"
              />
              <p className="text-xs text-gray-500">
                Número de reservas sin presentarse para activar la suspensión automática.
              </p>
            </div>

            {/* Duración de la suspensión automática */}
            <div className="space-y-2">
              <Label htmlFor="diasSuspension">Duración de la suspensión automática</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="diasSuspension"
                  data-testid="input-dias-suspension"
                  type="number"
                  min={1}
                  max={365}
                  value={diasSuspension}
                  onChange={(e) => setDiasSuspension(Math.min(365, Math.max(1, Number(e.target.value))))}
                  disabled={guardando}
                  className="w-28"
                />
                <span className="text-sm text-gray-600">días</span>
              </div>
              <p className="text-xs text-gray-500">
                Período de suspensión aplicado automáticamente al alcanzar el límite de no-shows.
              </p>
            </div>

            {/* Ejemplo explicativo */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm text-blue-800">
              Con la configuración actual, un usuario queda suspendido{" "}
              <strong>{diasSuspension} días</strong> al acumular{" "}
              <strong>{maxNoShows} reservas</strong> sin presentarse.
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
