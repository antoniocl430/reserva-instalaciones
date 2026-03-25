import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { opcionesAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Regex para validar formato YYYY-MM-DD
const REGEX_FECHA = /^\d{4}-\d{2}-\d{2}$/

// GET /api/admin/reservas — lista todas las reservas con filtros opcionales
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
    const { searchParams } = request.nextUrl

    // Parámetros opcionales de filtro
    const estado = searchParams.get("estado")
    const instalacionId = searchParams.get("instalacionId")
    const fecha = searchParams.get("fecha")

    // Validar formato de fecha si se proporciona
    if (fecha && !REGEX_FECHA.test(fecha)) {
      return NextResponse.json(
        { error: "El parámetro fecha debe tener formato YYYY-MM-DD" },
        { status: 400 }
      )
    }

    // Construir objeto where dinámicamente
    type WhereInput = {
      estado?: string
      instalacionId?: string
      fecha?: { gte: Date; lt: Date }
    }

    const where: WhereInput = {}

    if (estado && (estado === "ACTIVA" || estado === "CANCELADA")) {
      where.estado = estado
    }

    if (instalacionId) {
      where.instalacionId = instalacionId
    }

    if (fecha) {
      const fechaDate = new Date(`${fecha}T00:00:00.000Z`)
      const fechaProxima = new Date(fechaDate)
      fechaProxima.setUTCDate(fechaProxima.getUTCDate() + 1)
      where.fecha = { gte: fechaDate, lt: fechaProxima }
    }

    const reservas = await prisma.reserva.findMany({
      where,
      include: {
        usuario: { select: { nombre: true, email: true } },
        instalacion: { select: { nombre: true } },
      },
      orderBy: [{ fecha: "desc" }, { horaInicio: "desc" }],
    })

    return NextResponse.json({ reservas })
  } catch (err) {
    console.error("Error al obtener reservas:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
