import { headers } from "next/headers"
import { getServerSession } from "next-auth"
import { opcionesAuth } from "@/lib/auth"
import Tablon, { Aviso } from "@/components/Tablon"
import { prisma } from "@/lib/prisma"
import { extraerSlugDelHost, obtenerTenantPorSlug } from "@/lib/tenant"

// Tipo de instalación
interface Instalacion {
  id: string
  nombre: string
  tipo: string
  descripcion: string | null
  horario: string
  activa: boolean
}

// Obtiene las pistas del tenant directamente desde la BD (sin fetch HTTP propio)
async function obtenerPistas(tenantId: string | undefined): Promise<Instalacion[]> {
  if (!tenantId) return []
  try {
    return await prisma.instalacion.findMany({
      where: { tenantId },
      select: { id: true, nombre: true, tipo: true, descripcion: true, horario: true, activa: true },
      orderBy: { nombre: "asc" },
    })
  } catch {
    return []
  }
}

// Obtiene los avisos activos y vigentes del tenant directamente desde la BD
async function obtenerAvisos(tenantId: string | undefined): Promise<Aviso[]> {
  if (!tenantId) return []
  try {
    const inicioDia = new Date()
    inicioDia.setUTCHours(0, 0, 0, 0)
    const avisos = await prisma.aviso.findMany({
      where: {
        tenantId,
        activo: true,
        OR: [
          { caducaEn: null },
          { caducaEn: { gte: inicioDia } },
        ],
      },
      select: { id: true, titulo: true, descripcion: true, tipo: true, fecha: true },
      orderBy: { fecha: "desc" },
    })
    // Serializar fechas a string ISO para que sean compatibles con el tipo Aviso del cliente
    return avisos.map((a) => ({ ...a, fecha: a.fecha.toISOString(), tipo: a.tipo as Aviso["tipo"] }))
  } catch {
    return []
  }
}

// Server Component — no lleva "use client"
export default async function Inicio() {
  // Resolver tenant desde el host
  const headersList = await headers()
  const host = headersList.get("host") ?? ""
  const slug = extraerSlugDelHost(host)
  const tenant = await obtenerTenantPorSlug(slug)
  const tenantId = tenant?.id

  const [pistas, avisos, sesion] = await Promise.all([
    obtenerPistas(tenantId),
    obtenerAvisos(tenantId),
    getServerSession(opcionesAuth),
  ])

  return (
    <main id="contenido-principal">
      <Tablon pistas={pistas} avisos={avisos} municipio={tenant?.municipio} sesionActiva={!!sesion} />
    </main>
  )
}
