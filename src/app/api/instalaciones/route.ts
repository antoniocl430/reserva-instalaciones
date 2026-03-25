import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/instalaciones — devuelve todas las pistas activas (ruta pública)
export async function GET() {
  try {
    const instalaciones = await prisma.instalacion.findMany({
      where: { activa: true },
      select: { id: true, nombre: true, tipo: true, descripcion: true, horario: true, activa: true },
      orderBy: { nombre: "asc" },
    })

    return NextResponse.json({ instalaciones })
  } catch (err) {
    console.error("Error al obtener instalaciones:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
