import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { opcionesAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// PATCH /api/admin/reservas/[id]/cancelar — cancela una reserva sin restricción de 2h
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    // Toda la lógica dentro de una transacción para evitar race conditions
    const reserva = await prisma.$transaction(async (tx) => {
      const reservaEncontrada = await tx.reserva.findUnique({
        where: { id: params.id },
      })

      if (!reservaEncontrada) {
        throw new Error("RESERVA_NO_ENCONTRADA")
      }

      if (reservaEncontrada.estado !== "ACTIVA") {
        throw new Error("NO_ACTIVA")
      }

      // El admin puede cancelar sin restricción de tiempo
      const reservaActualizada = await tx.reserva.update({
        where: { id: params.id },
        data: {
          estado: "CANCELADA",
          canceladoEn: new Date(),
          canceladoPor: sesion.user.id,
        },
        include: {
          usuario: { select: { nombre: true, email: true } },
          instalacion: { select: { nombre: true } },
        },
      })

      return reservaActualizada
    })

    return NextResponse.json({ reserva })
  } catch (err) {
    if (!(err instanceof Error)) throw err

    switch (err.message) {
      case "RESERVA_NO_ENCONTRADA":
        return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 })
      case "NO_ACTIVA":
        return NextResponse.json(
          { error: "La reserva no está activa" },
          { status: 409 }
        )
      default:
        console.error("Error al cancelar reserva:", err)
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
    }
  }
}
