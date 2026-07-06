import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { extraerSlugDelHost, obtenerTenantIdPorSlug } from "@/lib/tenant"

// Resuelve el tenantId desde x-tenant-slug (inyectado por el middleware) o el host.
// NO se acepta x-tenant-id desde el cliente — podría usarse para acceder a datos de otro tenant.
async function resolverTenantId(request: NextRequest): Promise<string | null> {
  const slug =
    request.headers.get("x-tenant-slug") ??
    extraerSlugDelHost(request.headers.get("host") ?? "")
  return obtenerTenantIdPorSlug(slug)
}

// GET /api/instalaciones — devuelve todas las instalaciones del tenant (ruta pública)
// Las inactivas se incluyen para que el tablón pueda mostrarlas como "no disponibles"
export async function GET(request: NextRequest) {
  const tenantId = await resolverTenantId(request)

  if (!tenantId) {
    return NextResponse.json({ error: "Tenant no identificado" }, { status: 400 })
  }

  try {
    const instalaciones = await prisma.instalacion.findMany({
      where: { tenantId },
      select: { id: true, nombre: true, tipo: true, descripcion: true, horario: true, activa: true },
      orderBy: { nombre: "asc" },
    })

    // Calcular la media de valoraciones por instalación
    const mediasValoraciones = await prisma.valoracion.groupBy({
      by: ["instalacionId"],
      where: { tenantId },
      _avg: { puntuacion: true },
      _count: { id: true },
    })

    // Mapear instalaciones con su media y número de valoraciones
    const mediasPorInstalacion = new Map(
      mediasValoraciones.map((m) => [
        m.instalacionId,
        { mediaValoracion: m._avg.puntuacion, totalValoraciones: m._count.id },
      ])
    )

    const instalacionesConMedia = instalaciones.map((inst) => ({
      ...inst,
      mediaValoracion: mediasPorInstalacion.get(inst.id)?.mediaValoracion ?? null,
      totalValoraciones: mediasPorInstalacion.get(inst.id)?.totalValoraciones ?? 0,
    }))

    return NextResponse.json({ instalaciones: instalacionesConMedia })
  } catch (err) {
    console.error("Error al obtener instalaciones:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
