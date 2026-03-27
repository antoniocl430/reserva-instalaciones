import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { extraerSlugDelHost, obtenerTenantIdPorSlug } from "@/lib/tenant"

// Resuelve el tenantId desde x-tenant-id, x-tenant-slug o el host
async function resolverTenantId(request: NextRequest): Promise<string | null> {
  const tenantId = request.headers.get("x-tenant-id")
  if (tenantId) return tenantId
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

    return NextResponse.json({ instalaciones })
  } catch (err) {
    console.error("Error al obtener instalaciones:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
