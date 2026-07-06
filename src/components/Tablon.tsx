"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Clock, Bell, AlertCircle, CheckCircle, ChevronRight, Info, MapPin } from "lucide-react"
import StarRating from "@/components/StarRating"

interface Instalacion {
  id: string
  nombre: string
  tipo: string
  descripcion: string | null
  horario: string
  activa: boolean
  mediaValoracion?: number | null
  totalValoraciones?: number
}

export interface Aviso {
  id: string
  fecha: string
  titulo: string
  descripcion: string
  tipo: "INFO" | "AVISO" | "CIERRE"
}

interface TablonProps {
  pistas: Instalacion[]
  avisos: Aviso[]
  municipio?: string
  sesionActiva?: boolean
}

// Configuración visual por tipo de deporte
const CONFIG_TIPO: Record<string, { color: string; bgLight: string; bgDark: string; emoji: string; label: string }> = {
  PADEL:     { color: "bg-blue-500",   bgLight: "bg-blue-50 dark:bg-blue-950/30",   bgDark: "border-blue-500",   emoji: "🏓", label: "Pádel" },
  TENIS:     { color: "bg-yellow-500", bgLight: "bg-yellow-50 dark:bg-yellow-950/30", bgDark: "border-yellow-500", emoji: "🎾", label: "Tenis" },
  FUTBOL:    { color: "bg-green-500",  bgLight: "bg-green-50 dark:bg-green-950/30",  bgDark: "border-green-500",  emoji: "⚽", label: "Fútbol" },
  BASQUETBOL:{ color: "bg-orange-500", bgLight: "bg-orange-50 dark:bg-orange-950/30",bgDark: "border-orange-500", emoji: "🏀", label: "Baloncesto" },
  PISCINA:   { color: "bg-cyan-500",   bgLight: "bg-cyan-50 dark:bg-cyan-950/30",   bgDark: "border-cyan-500",   emoji: "🏊", label: "Piscina" },
}

function obtenerConfig(tipo: string) {
  return CONFIG_TIPO[tipo] ?? { color: "bg-slate-500", bgLight: "bg-slate-50 dark:bg-slate-900/30", bgDark: "border-slate-500", emoji: "📍", label: tipo }
}

function TarjetaInstalacion({ instalacion }: { instalacion: Instalacion }) {
  const cfg = obtenerConfig(instalacion.tipo)

  const contenido = (
    <div className={`group relative bg-card border border-border rounded-xl overflow-hidden transition-all duration-200 ${
      instalacion.activa
        ? "hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
        : "opacity-50 cursor-not-allowed"
    }`}>
      {/* Franja de color superior */}
      <div className={`h-1 w-full ${cfg.color}`} />

      <div className="p-5">
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl shrink-0" aria-hidden="true">{cfg.emoji}</span>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground text-sm leading-tight truncate">{instalacion.nombre}</h3>
              <span className="text-xs text-muted-foreground">{cfg.label}</span>
            </div>
          </div>
          {/* Indicador de disponibilidad */}
          <div className={`shrink-0 flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
            instalacion.activa
              ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"
              : "bg-muted text-muted-foreground"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${instalacion.activa ? "bg-green-500" : "bg-gray-400"}`} />
            {instalacion.activa ? "Disponible" : "Cerrada"}
          </div>
        </div>

        {/* Descripción */}
        {instalacion.descripcion && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">{instalacion.descripcion}</p>
        )}

        {/* Valoraciones */}
        {(instalacion.totalValoraciones ?? 0) > 0 && instalacion.mediaValoracion != null && (
          <div className="flex items-center gap-1.5 mb-3">
            <StarRating value={Math.round(instalacion.mediaValoracion)} size="sm" />
            <span className="text-xs text-muted-foreground">
              {instalacion.mediaValoracion.toFixed(1)}
              <span className="ml-1 opacity-60">({instalacion.totalValoraciones})</span>
            </span>
          </div>
        )}

        {/* Horario */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-3 border-t border-border">
          <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{instalacion.horario}</span>
        </div>
      </div>

      {/* Flecha hover */}
      {instalacion.activa && (
        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
    </div>
  )

  if (!instalacion.activa) return contenido
  return <Link href={`/pistas/${instalacion.id}`} className="block">{contenido}</Link>
}

function formatearFechaAviso(fechaIso: string): string {
  try {
    const fecha = new Date(fechaIso)
    const partes = new Intl.DateTimeFormat("es-ES", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Europe/Madrid",
    }).formatToParts(fecha)

    const get = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? ""
    return `${get("day")} ${get("month")}, ${get("hour").padStart(2, "0")}:${get("minute")}`
  } catch {
    return fechaIso
  }
}

function TarjetaAviso({ aviso }: { aviso: Aviso }) {
  const [fechaTexto, setFechaTexto] = useState("")
  useEffect(() => { setFechaTexto(formatearFechaAviso(aviso.fecha)) }, [aviso.fecha])

  const config = {
    CIERRE: { icon: <AlertCircle className="w-4 h-4 text-red-500" />, bg: "bg-red-50 dark:bg-red-950/20", border: "border-red-200 dark:border-red-900" },
    AVISO:  { icon: <Bell className="w-4 h-4 text-amber-500" />, bg: "bg-amber-50 dark:bg-amber-950/20", border: "border-amber-200 dark:border-amber-900" },
    INFO:   { icon: <Info className="w-4 h-4 text-blue-500" />, bg: "bg-blue-50 dark:bg-blue-950/20", border: "border-blue-200 dark:border-blue-900" },
  }[aviso.tipo] ?? { icon: <CheckCircle className="w-4 h-4 text-green-500" />, bg: "bg-muted", border: "border-border" }

  return (
    <div className={`rounded-lg border p-3 ${config.bg} ${config.border}`}>
      <div className="flex gap-2.5">
        <div className="shrink-0 mt-0.5">{config.icon}</div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground tabular-nums mb-0.5">{fechaTexto}</p>
          <p className="text-sm font-medium text-foreground leading-snug">{aviso.titulo}</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{aviso.descripcion}</p>
        </div>
      </div>
    </div>
  )
}

export default function Tablon({ pistas, avisos, municipio, sesionActiva }: TablonProps) {
  const pistasActivas = pistas.filter((p) => p.activa).length

  if (pistas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center px-4">
        <MapPin className="w-10 h-10 text-muted-foreground/40" />
        <p className="text-muted-foreground">No hay instalaciones disponibles en este momento.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-b from-blue-50/80 to-background dark:from-blue-950/20 dark:to-background py-10 md:py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="max-w-2xl">
            {/* Indicador de instalaciones activas */}
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 px-3 py-1 rounded-full mb-5">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse shrink-0" />
              {pistasActivas} {pistasActivas === 1 ? "instalación disponible" : "instalaciones disponibles"}
            </div>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight tracking-tight">
              {municipio ? (
                <>Instalaciones de<br /><span className="text-blue-600">{municipio}</span></>
              ) : (
                "Instalaciones deportivas"
              )}
            </h1>
            <p className="text-muted-foreground mt-3 text-base md:text-lg leading-relaxed">
              Consulta disponibilidad y reserva tu pista en segundos
            </p>

            {/* CTAs para usuarios no registrados */}
            {!sesionActiva && (
              <div className="flex flex-wrap gap-3 mt-7">
                <Link
                  href="/registro"
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium text-sm transition-colors shadow-sm"
                >
                  Crear cuenta gratis
                  <ChevronRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 border border-border bg-background hover:bg-muted text-foreground px-5 py-2.5 rounded-lg font-medium text-sm transition-colors"
                >
                  Ya tengo cuenta
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
          {/* Instalaciones (2/3) */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Instalaciones
              </h2>
              <Link
                href="/pistas"
                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 transition-colors"
              >
                Ver todas
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {pistas.map((instalacion) => (
                <TarjetaInstalacion key={instalacion.id} instalacion={instalacion} />
              ))}
            </div>
          </div>

          {/* Tablón de avisos (1/3) */}
          <div className="lg:col-span-1">
            <div className="sticky top-20">
              <div className="flex items-center gap-2 mb-5">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Tablón de avisos
                </h3>
              </div>

              <div className="space-y-3">
                {avisos.length > 0 ? (
                  avisos.map((aviso) => (
                    <TarjetaAviso key={aviso.id} aviso={aviso} />
                  ))
                ) : (
                  <div className="bg-card border border-border rounded-xl p-6 text-center">
                    <Bell className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">No hay avisos publicados</p>
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground/60 mt-4 text-center">
                Información del ayuntamiento
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
