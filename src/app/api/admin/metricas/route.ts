import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { opcionesAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/admin/metricas — devuelve métricas del día actual
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
    // Obtener hoy a las 00:00:00 UTC
    const hoy = new Date()
    hoy.setUTCHours(0, 0, 0, 0)
    const mañana = new Date(hoy)
    mañana.setUTCDate(mañana.getUTCDate() + 1)

    // Reservas creadas hoy
    const reservasHoy = await prisma.reserva.count({
      where: {
        creadoEn: { gte: hoy, lt: mañana },
      },
    })

    // Reservas con estado ACTIVA
    const reservasActivas = await prisma.reserva.count({
      where: {
        estado: "ACTIVA",
      },
    })

    // Instalaciones con activa = true
    const pistasActivas = await prisma.instalacion.count({
      where: {
        activa: true,
      },
    })

    // Cancelaciones hoy
    const cancelacionesHoy = await prisma.reserva.count({
      where: {
        estado: "CANCELADA",
        canceladoEn: { gte: hoy, lt: mañana },
      },
    })

    return NextResponse.json({
      reservasHoy,
      reservasActivas,
      pistasActivas,
      cancelacionesHoy,
    })
  } catch (err) {
    console.error("Error al obtener métricas:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
