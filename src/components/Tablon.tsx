"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Clock, Bell, AlertCircle, CheckCircle, LogIn } from "lucide-react"

interface Instalacion {
  id: string
  nombre: string
  tipo: string
  descripcion: string | null
  horario: string
  activa: boolean
}

// Tipo canónico de aviso proveniente de la API (tipos en mayúsculas)
export interface Aviso {
  id: string
  fecha: string   // ISO date o string formateado
  titulo: string
  descripcion: string
  tipo: "INFO" | "AVISO" | "CIERRE"
}

interface TablonProps {
  pistas: Instalacion[]
  /** Avisos del tablón de anuncios obtenidos desde la API. */
  avisos: Aviso[]
  /** Municipio del tenant actual. Si se pasa, el título muestra "Instalaciones — {municipio}". */
  municipio?: string
}

const TIPO_COLORES: Record<string, { badge: string; icono: string }> = {
  PADEL: { badge: "bg-blue-100 text-blue-700", icono: "🎾" },
  TENIS: { badge: "bg-yellow-100 text-yellow-700", icono: "🏸" },
  FUTBOL: { badge: "bg-green-100 text-green-700", icono: "⚽" },
  BASQUETBOL: { badge: "bg-orange-100 text-orange-700", icono: "🏀" },
}

function TarjetaInstalacion({ instalacion }: { instalacion: Instalacion }) {
  const config =
    TIPO_COLORES[instalacion.tipo] || { badge: "bg-gray-100 text-gray-700", icono: "📍" }

  return (
    <Card className="flex flex-col gap-3 p-4 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200">
      {/* Encabezado con nombre y tipo */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-sm md:text-base leading-tight">
            {instalacion.nombre}
          </h3>
        </div>
        <Badge className={`${config.badge} font-medium text-xs whitespace-nowrap flex-shrink-0`}>
          {instalacion.tipo}
        </Badge>
      </div>

      {/* Descripción */}
      {instalacion.descripcion && (
        <p className="text-xs text-gray-600 line-clamp-2">{instalacion.descripcion}</p>
      )}

      {/* Horario */}
      <div className="flex items-center gap-2 text-xs text-gray-700">
        <Clock className="w-4 h-4 flex-shrink-0 text-gray-500" aria-hidden="true" />
        <span>{instalacion.horario}</span>
      </div>

      {/* Estado */}
      <div className="flex items-center gap-2 pt-1">
        {instalacion.activa ? (
          <>
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" aria-hidden="true" />
            <span className="text-xs font-medium text-green-600">Disponible</span>
          </>
        ) : (
          <>
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" aria-hidden="true" />
            <span className="text-xs font-medium text-red-600">Cerrada</span>
          </>
        )}
      </div>
    </Card>
  )
}

// Formatea una fecha ISO a texto legible en español
function formatearFechaAviso(fechaIso: string): string {
  try {
    return new Date(fechaIso).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
    })
  } catch {
    return fechaIso
  }
}

function TarjetaAviso({ aviso }: { aviso: Aviso }) {
  const iconoTipo =
    aviso.tipo === "CIERRE" ? (
      <AlertCircle className="w-5 h-5 text-red-600" aria-hidden="true" />
    ) : aviso.tipo === "AVISO" ? (
      <Bell className="w-5 h-5 text-amber-600" aria-hidden="true" />
    ) : (
      <CheckCircle className="w-5 h-5 text-blue-600" aria-hidden="true" />
    )

  return (
    <div className="flex gap-3 pb-4 border-b border-gray-200 last:border-b-0 last:pb-0">
      <div className="flex-shrink-0 pt-1">{iconoTipo}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 font-medium">{formatearFechaAviso(aviso.fecha)}</p>
        <h4 className="font-semibold text-sm text-gray-900 mt-0.5">{aviso.titulo}</h4>
        <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">{aviso.descripcion}</p>
      </div>
    </div>
  )
}

export default function Tablon({ pistas, avisos, municipio }: TablonProps) {
  if (pistas.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96 bg-gray-50">
        <p className="text-gray-600 text-base">No hay instalaciones disponibles en este momento.</p>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-b from-gray-50 to-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
        {/* Grid de dos columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna izquierda: Instalaciones (2/3 del ancho en desktop) */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                {municipio ? `Instalaciones — ${municipio}` : "Instalaciones disponibles"}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Consulta el estado y horarios de todas nuestras instalaciones deportivas
              </p>
            </div>

            {/* Aviso de acceso */}
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-5 text-sm text-blue-800">
              <LogIn className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              <span>
                <Link href="/login" className="font-semibold underline underline-offset-2 hover:text-blue-600">
                  Inicia sesión
                </Link>{" "}
                para realizar una reserva.
              </span>
            </div>

            {/* Grid de tarjetas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {pistas.map((instalacion) => (
                <TarjetaInstalacion key={instalacion.id} instalacion={instalacion} />
              ))}
            </div>
          </div>

          {/* Columna derecha: Tablón de avisos (1/3 del ancho en desktop) */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="mb-4">
                <h3 className="text-lg md:text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-gray-700" aria-hidden="true" />
                  Tablón de avisos
                </h3>
              </div>

              <Card className="bg-white border border-gray-200 p-4 space-y-4">
                {avisos.length > 0 ? (
                  avisos.map((aviso) => (
                    <TarjetaAviso key={aviso.id} aviso={aviso} />
                  ))
                ) : (
                  <p className="text-xs text-gray-500 text-center py-2">
                    No hay avisos publicados en este momento.
                  </p>
                )}
              </Card>

              {/* Pie de avisos */}
              <p className="text-xs text-gray-500 mt-3 text-center">
                Últimas actualizaciones del polideportivo municipal
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
