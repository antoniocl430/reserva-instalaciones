import { headers } from "next/headers"
import { getServerSession } from "next-auth"
import Link from "next/link"
import { opcionesAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { obtenerTenantPorSlug } from "@/lib/tenant"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

// Tipo que devuelve Prisma para una instalacion
interface Instalacion {
  id: string
  nombre: string
  tipo: string
  descripcion: string | null
  horario: string
  activa: boolean
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

  const instalaciones: Instalacion[] = await prisma.instalacion.findMany({
    where: { activa: true, ...(tenantId ? { tenantId } : {}) },
    select: { id: true, nombre: true, tipo: true, descripcion: true, horario: true, activa: true },
    orderBy: { nombre: "asc" },
  })

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
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${
                      pista.tipo === "PADEL" ? "bg-blue-100" : "bg-cyan-100"
                    }`}
                  >
                    <span
                      className={`text-lg font-bold ${
                        pista.tipo === "PADEL" ? "text-blue-600" : "text-cyan-600"
                      }`}
                    >
                      {pista.tipo === "PADEL" ? "P" : pista.tipo[0]}
                    </span>
                  </div>
                  <CardTitle className="text-base leading-tight">{pista.nombre}</CardTitle>
                  <CardDescription>
                    <Badge
                      variant="secondary"
                      className="text-xs font-medium uppercase tracking-wide text-blue-700 bg-blue-50 hover:bg-blue-50"
                    >
                      {etiquetaTipo(pista.tipo)}
                    </Badge>
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1 space-y-2">
                  {pista.descripcion ? (
                    <p className="text-sm text-gray-600">{pista.descripcion}</p>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Sin descripción</p>
                  )}
                  <div className="text-xs text-gray-600 border-t border-gray-200 pt-2 mt-2">
                    <p className="font-medium">Horario:</p>
                    <p>{pista.horario}</p>
                  </div>
                </CardContent>

                <CardFooter>
                  <Link
                    href={`/pistas/${pista.id}`}
                    className="w-full inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
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
