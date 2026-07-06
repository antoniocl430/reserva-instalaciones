"use client"

import { useState } from "react"

// Props del componente StarRating
export interface StarRatingProps {
  /** Puntuación actual (0-5) */
  value: number
  /** Callback al cambiar la valoración (solo en modo interactivo) */
  onChange?: (n: number) => void
  /** Si es true, las estrellas son clicables y tienen efecto hover */
  interactive?: boolean
  /** Tamaño de las estrellas: sm=16px, md=24px, lg=32px */
  size?: "sm" | "md" | "lg"
}

// Mapeo de tamaños a clases de Tailwind
const TAMAÑOS: Record<string, string> = {
  sm: "text-base",   // ~16px
  md: "text-2xl",   // ~24px
  lg: "text-3xl",   // ~32px
}

/**
 * Componente de valoración con estrellas.
 * Soporta modo lectura (solo visualización) y modo interactivo (clicable).
 */
export default function StarRating({
  value,
  onChange,
  interactive = false,
  size = "md",
}: StarRatingProps) {
  // Estado interno de hover (solo en modo interactivo)
  const [hover, setHover] = useState<number>(0)

  // El valor que se muestra: hover tiene prioridad sobre value
  const valorActivo = hover > 0 ? hover : value

  const clasesTamaño = TAMAÑOS[size] ?? TAMAÑOS.md

  if (interactive) {
    return (
      <div
        data-testid="star-rating"
        className="flex items-center gap-0.5"
        role="group"
        aria-label="Valoración con estrellas"
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="button"
            aria-label={`${n} estrella${n > 1 ? "s" : ""}`}
            data-testid={`star-btn-${n}`}
            className={`leading-none cursor-pointer transition-transform hover:scale-110 focus:outline-none ${
              n <= valorActivo ? "text-yellow-400" : "text-gray-300"
            } ${clasesTamaño}`}
            onClick={() => onChange?.(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
          >
            ★
          </button>
        ))}
      </div>
    )
  }

  // Modo lectura: estrellas con aria-hidden para lectores de pantalla
  return (
    <div
      data-testid="star-rating"
      className="flex items-center gap-0.5"
      aria-label={`Valoración: ${value} de 5 estrellas`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          role="img"
          aria-hidden="true"
          className={`leading-none ${
            n <= value ? "text-yellow-400" : "text-gray-300"
          } ${clasesTamaño}`}
        >
          ★
        </span>
      ))}
    </div>
  )
}
