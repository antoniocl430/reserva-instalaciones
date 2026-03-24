import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/instalaciones — devuelve todas las pistas activas (ruta pública)
export async function GET() {
  const instalaciones = await prisma.instalacion.findMany({
    where: { activa: true },
    select: { id: true, nombre: true, tipo: true, descripcion: true, activa: true },
    orderBy: { nombre: "asc" },
  })

  return NextResponse.json({ instalaciones })
}
