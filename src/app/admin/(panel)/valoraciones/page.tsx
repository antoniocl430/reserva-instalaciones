"use client"

import { useEffect, useState } from "react"
import { Star } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import StarRating from "@/components/StarRating"

// Tipo de valoración devuelta por la API
interface Valoracion {
  id: string
  puntuacion: number
  comentario: string | null
  creadoEn: string
  instalacion: {
    nombre: string
  }
  usuario: {
    nombre: string
    email: string
  }
}

// Formatea una fecha ISO a texto legible en español
function formatearFechaCorta(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Europe/Madrid",
    })
  } catch {
    return iso
  }
}

// Calcula la media aritmética de un array de números, redondeada a 1 decimal
function calcularMedia(valores: number[]): number {
  if (valores.length === 0) return 0
  const suma = valores.reduce((acc, v) => acc + v, 0)
  return Math.round((suma / valores.length) * 10) / 10
}

export default function PaginaAdminValoraciones() {
  const [valoraciones, setValoraciones] = useState<Valoracion[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Carga las valoraciones desde la API
  async function cargarValoraciones() {
    setCargando(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/valoraciones")
      if (!res.ok) throw new Error("Error al cargar valoraciones")
      const data = await res.json()
      setValoraciones(data.valoraciones ?? [])
    } catch {
      setError("No se pudieron cargar las valoraciones")
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarValoraciones()
  }, [])

  // Estadísticas globales
  const totalValoraciones = valoraciones.length
  const media = calcularMedia(valoraciones.map((v) => v.puntuacion))

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Cabecera */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Star className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Valoraciones</h1>
              <p className="text-sm text-muted-foreground">
                Opiniones de los ciudadanos sobre las instalaciones deportivas
              </p>
            </div>
          </div>
        </div>

        {/* Estadísticas globales */}
        {!cargando && !error && totalValoraciones > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
            <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col gap-1">
              <p className="text-xs text-muted-foreground">Total valoraciones</p>
              <p className="text-2xl font-bold text-gray-900">{totalValoraciones}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col gap-2">
              <p className="text-xs text-muted-foreground">Media global</p>
              <div className="flex items-center gap-2">
                <StarRating value={Math.round(media)} size="md" />
                <span className="text-lg font-semibold text-gray-900">{media.toFixed(1)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">
            {error}
          </div>
        )}

        {/* Tabla de valoraciones */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Instalación</TableHead>
                <TableHead>Ciudadano</TableHead>
                <TableHead>Puntuación</TableHead>
                <TableHead>Comentario</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cargando ? (
                // Esqueleto de carga
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : valoraciones.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No hay valoraciones todavía
                  </TableCell>
                </TableRow>
              ) : (
                valoraciones.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.instalacion.nombre}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{v.usuario.nombre}</span>
                        <span className="text-xs text-muted-foreground">{v.usuario.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StarRating value={v.puntuacion} size="sm" />
                    </TableCell>
                    <TableCell className="max-w-xs">
                      {v.comentario ? (
                        <span className="text-sm text-gray-700 line-clamp-2">{v.comentario}</span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                      {formatearFechaCorta(v.creadoEn)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
