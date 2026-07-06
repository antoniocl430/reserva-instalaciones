import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Ruta pública: no requiere autenticación
// Devuelve los datos de la reserva asociada al token QR
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const { token } = params

  const reserva = await prisma.reserva.findUnique({
    where: { qrToken: token },
    include: {
      instalacion: { select: { id: true, nombre: true } },
      usuario: { select: { nombre: true, email: true } },
    },
  })

  if (!reserva) {
    return NextResponse.json({ valida: false, error: "Token no encontrado" }, { status: 404 })
  }

  const ahora = new Date()
  const esActiva = reserva.estado === "ACTIVA"
  const esFutura = reserva.horaInicio > ahora
  const esHoy = reserva.horaInicio.toDateString() === ahora.toDateString()

  return NextResponse.json({
    valida: esActiva,
    estado: reserva.estado,
    esHoy,
    esFutura,
    reserva: {
      id: reserva.id,
      fecha: reserva.fecha.toISOString(),
      horaInicio: reserva.horaInicio.toISOString(),
      horaFin: reserva.horaFin.toISOString(),
      estado: reserva.estado,
      instalacion: reserva.instalacion,
      ciudadano: reserva.usuario.nombre,
    },
  })
}
