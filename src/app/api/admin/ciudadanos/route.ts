import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { opcionesAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/admin/ciudadanos — lista todos los ciudadanos activos
export async function GET(request: NextRequest) {
  const sesion = await getServerSession(opcionesAuth)
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  if (sesion.user.rol !== "ADMIN") {
    return NextResponse.json(
      { error: "No tienes permiso para acceder a esta ruta" },
      { status: 403 }
    )
  }

  try {
    const ciudadanos = await prisma.usuario.findMany({
      where: {
        rol: "CIUDADANO",
        activo: true,
      },
      select: {
        id: true,
        nombre: true,
        email: true,
      },
      orderBy: { nombre: "asc" },
    })

    return NextResponse.json({ ciudadanos })
  } catch (err) {
    console.error("Error al obtener ciudadanos:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
