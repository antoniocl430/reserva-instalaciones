"use client"

import { useState, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Clock, ChevronUp, ChevronDown } from "lucide-react"
import { motion } from "framer-motion"

// Tipo de instalación recibido por props
interface Instalacion {
  id: string
  nombre: string
  tipo: string
  descripcion: string | null
  horario: string
  activa: boolean
}

interface CarruselPistasProps {
  pistas: Instalacion[]
}

// Descripción por defecto cuando la pista no tiene una definida
const DESCRIPCION_DEFECTO = "Pista de pádel cubierta con iluminación LED"

// Devuelve la etiqueta legible del tipo de instalación
function etiquetaTipo(tipo: string): string {
  switch (tipo) {
    case "PADEL": return "Pádel"
    case "TENIS": return "Tenis"
    case "FUTBOL": return "Fútbol"
    case "PISCINA": return "Piscina"
    case "BASQUETBOL": return "Baloncesto"
    default: return tipo
  }
}

export default function CarruselPistas({ pistas }: CarruselPistasProps) {
  const [indiceActivo, setIndiceActivo] = useState(0)

  const irAnterior = useCallback(() => {
    setIndiceActivo((prev) => (prev === 0 ? pistas.length - 1 : prev - 1))
  }, [pistas.length])

  const irSiguiente = useCallback(() => {
    setIndiceActivo((prev) => (prev === pistas.length - 1 ? 0 : prev + 1))
  }, [pistas.length])

  const irA = useCallback((indice: number) => {
    setIndiceActivo(indice)
  }, [])

  if (pistas.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-green-800 via-green-700 to-blue-900">
        <p className="text-white text-lg">No hay pistas disponibles en este momento.</p>
      </div>
    )
  }

  const pista = pistas[indiceActivo]

  return (
    <div className="relative flex-1 overflow-hidden">
      {/* Slide activo */}
      <motion.div
        key={indiceActivo}
        className="w-full h-full flex flex-col items-center justify-center px-6 py-12
                   bg-gradient-to-br from-green-800 via-green-700 to-blue-900"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Patrón de red de pádel (decorativo) */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,255,255,0.4) 40px, rgba(255,255,255,0.4) 41px), repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(255,255,255,0.4) 40px, rgba(255,255,255,0.4) 41px)",
          }}
          aria-hidden="true"
        />

        {/* Contenido del slide */}
        <div className="relative z-10 w-full max-w-lg space-y-6 text-center">
          {/* Badge de tipo */}
          <div className="flex justify-center">
            <Badge className="bg-green-400 text-green-900 font-bold text-sm px-4 py-1 tracking-widest uppercase">
              {etiquetaTipo(pista.tipo)}
            </Badge>
          </div>

          {/* Nombre de la pista */}
          <h2 className="text-4xl font-bold text-white leading-tight drop-shadow-lg">
            {pista.nombre}
          </h2>

          {/* Línea divisoria decorativa */}
          <div className="mx-auto w-16 h-1 rounded-full bg-green-400 opacity-80" />

          {/* Descripción */}
          <p className="text-green-100 text-base md:text-lg leading-relaxed">
            {pista.descripcion ?? DESCRIPCION_DEFECTO}
          </p>

          {/* Horario */}
          <div className="flex items-center justify-center gap-2 text-green-200">
            <Clock className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            <span className="text-sm md:text-base">{pista.horario}</span>
          </div>

          {/* Badge disponibilidad */}
          <div className="flex justify-center">
            <Badge className="bg-green-500 hover:bg-green-500 text-white font-semibold text-sm px-4 py-1.5 shadow-lg">
              Disponible para reserva
            </Badge>
          </div>
        </div>
      </motion.div>

      {/* Flecha arriba */}
      <button
        onClick={irAnterior}
        aria-label="Pista anterior"
        className="absolute top-4 left-1/2 -translate-x-1/2 z-20
                   w-10 h-10 rounded-full bg-white/20 hover:bg-white/40
                   backdrop-blur-sm border border-white/30
                   flex items-center justify-center
                   transition-colors duration-200"
      >
        <ChevronUp className="w-5 h-5 text-white" />
      </button>

      {/* Flecha abajo */}
      <button
        onClick={irSiguiente}
        aria-label="Pista siguiente"
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20
                   w-10 h-10 rounded-full bg-white/20 hover:bg-white/40
                   backdrop-blur-sm border border-white/30
                   flex items-center justify-center
                   transition-colors duration-200"
      >
        <ChevronDown className="w-5 h-5 text-white" />
      </button>

      {/* Indicadores laterales de posición */}
      <div
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20
                   flex flex-col gap-2"
        aria-label="Indicador de posición"
      >
        {pistas.map((p, i) => (
          <button
            key={p.id}
            onClick={() => irA(i)}
            aria-label={`Ir a ${p.nombre}`}
            aria-current={i === indiceActivo ? "true" : undefined}
            className={`w-2.5 rounded-full transition-all duration-300
              ${
                i === indiceActivo
                  ? "h-6 bg-green-400 shadow-lg shadow-green-400/50"
                  : "h-2.5 bg-white/40 hover:bg-white/70"
              }`}
          />
        ))}
      </div>
    </div>
  )
}
