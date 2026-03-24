import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { opcionesAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// PATCH /api/reservas/[id]/cancelar — cancela una reserva
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sesion = await getServerSession(opcionesAuth)
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  const reserva = await prisma.reserva.findUnique({
    where: { id: params.id },
  })

  if (!reserva) {
    return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 })
  }

  // Verificar que el usuario es el dueño o es admin
  const esDueno = reserva.usuarioId === sesion.user.id
  const esAdmin = sesion.user.rol === "ADMIN"
  if (!esDueno && !esAdmin) {
    return NextResponse.json({ error: "No tienes permiso para cancelar esta reserva" }, { status: 403 })
  }

  // Verificar que la reserva está activa
  if (reserva.estado !== "ACTIVA") {
    return NextResponse.json({ error: "Esta reserva ya está cancelada" }, { status: 409 })
  }

  // Si es ciudadano, verificar que faltan más de 2 horas para el inicio
  if (!esAdmin) {
    const dosHorasAntes = new Date(reserva.horaInicio.getTime() - 2 * 60 * 60 * 1000)
    if (new Date() >= dosHorasAntes) {
      return NextResponse.json(
        { error: "Solo puedes cancelar con más de 2 horas de antelación" },
        { status: 409 }
      )
    }
  }

  await prisma.reserva.update({
    where: { id: params.id },
    data: {
      estado: "CANCELADA",
      canceladoEn: new Date(),
      canceladoPor: sesion.user.id,
    },
  })

  return NextResponse.json({ ok: true })
}
