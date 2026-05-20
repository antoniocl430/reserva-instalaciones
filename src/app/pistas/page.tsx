import { headers } from "next/headers"
import { getServerSession } from "next-auth"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Clock } from "lucide-react"
import { opcionesAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { obtenerTenantPorSlug } from "@/lib/tenant"
import { Badge } from "@/components/ui/badge"
import StarRating from "@/components/StarRating"

export const metadata = { title: "Instalaciones" }

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

// Configuración visual por tipo de deporte
const CONFIG_TIPO: Record<string, { color: string; emoji: string; label: string; accent: string }> = {
  PADEL:      { color: "bg-blue-500",   emoji: "🏓", label: "Pádel",      accent: "text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400" },
  TENIS:      { color: "bg-yellow-500", emoji: "🎾", label: "Tenis",      accent: "text-yellow-700 bg-yellow-50 dark:bg-yellow-950/40 dark:text-yellow-400" },
  FUTBOL:     { color: "bg-green-500",  emoji: "⚽", label: "Fútbol",     accent: "text-green-700 bg-green-50 dark:bg-green-950/40 dark:text-green-400" },
  PISCINA:    { color: "bg-cyan-500",   emoji: "🏊", label: "Piscina",    accent: "text-cyan-700 bg-cyan-50 dark:bg-cyan-950/40 dark:text-cyan-400" },
  BASQUETBOL: { color: "bg-orange-500", emoji: "🏀", label: "Baloncesto", accent: "text-orange-700 bg-orange-50 dark:bg-orange-950/40 dark:text-orange-400" },
}

function obtenerConfig(tipo: string) {
  return CONFIG_TIPO[tipo] ?? { color: "bg-slate-500", emoji: "📍", label: tipo, accent: "text-slate-700 bg-slate-50 dark:bg-slate-800/40 dark:text-slate-400" }
}

export default async function PaginaPistas() {
  const sesion = await getServerSession(opcionesAuth)

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
    <main className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-6 sm:py-10">
        {/* Cabecera */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5"
          >
            <ChevronLeft className="w-4 h-4" />
            Inicio
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            Instalaciones deportivas
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {sesion
              ? "Selecciona una instalación para ver su disponibilidad y reservar"
              : "Consulta la disponibilidad. Inicia sesión para reservar."}
          </p>
        </div>

        {/* Sin instalaciones */}
        {instalaciones.length === 0 && (
          <div className="bg-card border border-border rounded-xl px-4 py-14 text-center text-sm text-muted-foreground">
            No hay instalaciones disponibles en este momento
          </div>
        )}

        {/* Grid de instalaciones */}
        {instalaciones.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {instalaciones.map((pista) => {
              const cfg = obtenerConfig(pista.tipo)
              return (
                <Link
                  key={pista.id}
                  href={`/pistas/${pista.id}`}
                  className="group bg-card border border-border rounded-xl overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col"
                >
                  {/* Franja de color */}
                  <div className={`h-1 w-full ${cfg.color}`} />

                  <div className="p-5 flex flex-col flex-1">
                    {/* Tipo badge */}
                    <span className={`self-start text-xs font-medium px-2.5 py-1 rounded-full mb-3 ${cfg.accent}`}>
                      {cfg.emoji} {cfg.label}
                    </span>

                    <h2 className="font-semibold text-foreground text-base leading-tight mb-2 group-hover:text-blue-600 transition-colors">
                      {pista.nombre}
                    </h2>

                    {pista.descripcion ? (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed flex-1">
                        {pista.descripcion}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground/50 italic mb-4 flex-1">Sin descripción</p>
                    )}

                    {/* Valoraciones */}
                    {(pista.totalValoraciones ?? 0) > 0 && pista.mediaValoracion != null && (
                      <div className="flex items-center gap-1.5 mb-3">
                        <StarRating value={Math.round(pista.mediaValoracion)} size="sm" />
                        <span className="text-xs text-muted-foreground">
                          {pista.mediaValoracion.toFixed(1)}
                          <span className="ml-1 opacity-60">({pista.totalValoraciones})</span>
                        </span>
                      </div>
                    )}

                    {/* Horario */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-3 border-t border-border">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{pista.horario}</span>
                    </div>
                  </div>

                  {/* Footer CTA */}
                  <div className="px-5 pb-4">
                    <div className="flex items-center justify-between text-sm font-medium text-blue-600 group-hover:text-blue-700 transition-colors">
                      <span>Ver disponibilidad</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
