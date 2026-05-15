import { headers } from "next/headers"
import { getServerSession } from "next-auth"
import Link from "next/link"
import { opcionesAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { obtenerTenantPorSlug } from "@/lib/tenant"

export const metadata = { title: "Instalaciones" }
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import StarRating from "@/components/StarRating"

// Tipo que devuelve Prisma para una instalacion
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

// Devuelve la etiqueta legible del tipo de instalacion
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

// Devuelve los colores y emoji para cada tipo de instalación
function obtenerEstiloTipo(tipo: string): { bgColor: string; textColor: string; emoji: string; badgeBg: string; badgeText: string } {
  switch (tipo) {
    case "PADEL":
      return { bgColor: "bg-blue-100", textColor: "text-blue-600", emoji: "🏓", badgeBg: "bg-blue-50", badgeText: "text-blue-700" }
    case "TENIS":
      return { bgColor: "bg-yellow-100", textColor: "text-yellow-600", emoji: "🎾", badgeBg: "bg-yellow-50", badgeText: "text-yellow-700" }
    case "FUTBOL":
      return { bgColor: "bg-green-100", textColor: "text-green-600", emoji: "⚽", badgeBg: "bg-green-50", badgeText: "text-green-700" }
    case "PISCINA":
      return { bgColor: "bg-cyan-100", textColor: "text-cyan-600", emoji: "🏊", badgeBg: "bg-cyan-50", badgeText: "text-cyan-700" }
    case "BASQUETBOL":
      return { bgColor: "bg-orange-100", textColor: "text-orange-600", emoji: "🏀", badgeBg: "bg-orange-50", badgeText: "text-orange-700" }
    default:
      return { bgColor: "bg-gray-100", textColor: "text-gray-600", emoji: "📌", badgeBg: "bg-gray-50", badgeText: "text-gray-700" }
  }
}

export default async function PaginaPistas() {
  const sesion = await getServerSession(opcionesAuth)

  // Obtener tenantId: si hay sesión lo tomamos de ella; si no, del header del middleware
  let tenantId: string | undefined = sesion?.user?.tenantId ?? undefined
  if (!tenantId) {
    const headersList = await headers()
    const slug = headersList.get("x-tenant-slug") ?? "desarrollo"
    const tenant = await obtenerTenantPorSlug(slug)
    tenantId = tenant?.id
  }

  const instalacionesRaw = await prisma.instalacion.findMany({
    where: { activa: true, ...(tenantId ? { tenantId } : {}) },
    select: {
      id: true,
      nombre: true,
      tipo: true,
      descripcion: true,
      horario: true,
      activa: true,
      _count: { select: { valoraciones: true } },
    },
    orderBy: { nombre: "asc" },
  })

  // Calcular la media de valoraciones para cada instalación
  const instalaciones: Instalacion[] = await Promise.all(
    instalacionesRaw.map(async ({ _count, ...inst }) => {
      if (_count.valoraciones === 0) {
        return { ...inst, mediaValoracion: null, totalValoraciones: 0 }
      }
      const agg = await prisma.valoracion.aggregate({
        where: { instalacionId: inst.id },
        _avg: { puntuacion: true },
        _count: { puntuacion: true },
      })
      return {
        ...inst,
        mediaValoracion: agg._avg.puntuacion,
        totalValoraciones: agg._count.puntuacion,
      }
    })
  )

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-4 sm:py-8 space-y-6">
        {/* Cabecera */}
        <div>
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 mb-4"
          >
            ← Volver al inicio
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Instalaciones deportivas</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            {sesion
              ? "Selecciona una instalación para ver su disponibilidad y reservar"
              : "Consulta la disponibilidad de cada instalación. Inicia sesión para reservar."}
          </p>
        </div>

        {/* Sin instalaciones disponibles */}
        {instalaciones.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-10 text-center text-sm text-gray-500">
            No hay instalaciones disponibles en este momento
          </div>
        )}

        {/* Grid de tarjetas de instalaciones */}
        {instalaciones.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {instalaciones.map((pista) => (
              <Card key={pista.id} className="flex flex-col">
                <CardHeader>
                  {/* Indicador visual del tipo de pista */}
                  {(() => {
                    const estilo = obtenerEstiloTipo(pista.tipo)
                    return (
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${estilo.bgColor}`}>
                        <span className="text-lg" aria-hidden="true">{estilo.emoji}</span>
                      </div>
                    )
                  })()}
                  <CardTitle className="text-base leading-tight">{pista.nombre}</CardTitle>
                  <CardDescription>
                    {(() => {
                      const estilo = obtenerEstiloTipo(pista.tipo)
                      return (
                        <Badge
                          variant="secondary"
                          className={`text-xs font-medium uppercase tracking-wide ${estilo.badgeText} ${estilo.badgeBg} hover:${estilo.badgeBg}`}
                        >
                          {etiquetaTipo(pista.tipo)}
                        </Badge>
                      )
                    })()}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1 space-y-3">
                  {pista.descripcion ? (
                    <p className="text-sm text-gray-600 line-clamp-3">{pista.descripcion}</p>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Sin descripción</p>
                  )}

                  {/* Media de valoraciones — solo si hay valoraciones */}
                  {pista.totalValoraciones && pista.totalValoraciones > 0 && pista.mediaValoracion != null && (
                    <div className="flex items-center gap-1.5">
                      <StarRating value={Math.round(pista.mediaValoracion)} size="sm" />
                      <span className="text-xs text-gray-500">
                        {pista.mediaValoracion.toFixed(1)}{" "}
                        <span className="text-gray-400">({pista.totalValoraciones} valoraciones)</span>
                      </span>
                    </div>
                  )}

                  <div className="text-xs text-gray-600 border-t border-gray-200 pt-3">
                    <p className="font-medium mb-0.5">Horario:</p>
                    <p>{pista.horario}</p>
                  </div>
                </CardContent>

                <CardFooter className="pt-0">
                  <Link
                    href={`/pistas/${pista.id}`}
                    className="w-full inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                  >
                    Ver disponibilidad
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
