import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/instalaciones — devuelve todas las pistas activas del tenant (ruta pública)
export async function GET(request: NextRequest) {
  // Obtener el tenantId inyectado por el middleware en cada request
  const tenantId = request.headers.get("x-tenant-id")

  if (!tenantId) {
    return NextResponse.json({ error: "Tenant no identificado" }, { status: 400 })
  }

  try {
    const instalaciones = await prisma.instalacion.findMany({
      where: { tenantId, activa: true },
      select: { id: true, nombre: true, tipo: true, descripcion: true, horario: true, activa: true },
      orderBy: { nombre: "asc" },
    })

    return NextResponse.json({ instalaciones })
  } catch (err) {
    console.error("Error al obtener instalaciones:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
