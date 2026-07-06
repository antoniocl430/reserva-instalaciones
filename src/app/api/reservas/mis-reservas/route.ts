import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { opcionesAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/reservas/mis-reservas — reservas del usuario autenticado en su tenant
export async function GET() {
  const sesion = await getServerSession(opcionesAuth)
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  const ahora = new Date()
  // El tenantId viene de la sesión (inyectado por NextAuth desde la BD)
  const { id: usuarioId, tenantId } = sesion.user

  const [activas, historial] = await Promise.all([
    // Reservas activas con hora de inicio futura, filtradas por tenant
    prisma.reserva.findMany({
      where: {
        tenantId,
        usuarioId,
        estado: "ACTIVA",
        horaInicio: { gte: ahora },
      },
      include: { instalacion: { select: { id: true, nombre: true } } },
      orderBy: { horaInicio: "asc" },
    }),
    // Historial: canceladas o cuya hora ya pasó, filtradas por tenant
    // Incluye la valoración (si existe) para que el frontend sepa si ya fue valorada
    prisma.reserva.findMany({
      where: {
        tenantId,
        usuarioId,
        OR: [{ estado: "CANCELADA" }, { horaInicio: { lt: ahora } }],
      },
      include: {
        instalacion: { select: { id: true, nombre: true } },
        valoracion: { select: { id: true, puntuacion: true, comentario: true } },
      },
      orderBy: { horaInicio: "desc" },
      take: 20, // últimas 20 entradas del historial
    }),
  ])

  return NextResponse.json({ activas, historial })
}
