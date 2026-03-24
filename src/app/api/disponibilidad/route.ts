import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { opcionesAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Slots disponibles: 08:00 a 22:00, de 1 hora cada uno
const HORAS_DISPONIBLES = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]

// GET /api/disponibilidad?instalacionId=xxx&fecha=2026-03-24
export async function GET(request: NextRequest) {
  const sesion = await getServerSession(opcionesAuth)
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const instalacionId = searchParams.get("instalacionId")
  const fecha = searchParams.get("fecha") // formato: "YYYY-MM-DD"

  if (!instalacionId || !fecha) {
    return NextResponse.json(
      { error: "Los parámetros instalacionId y fecha son obligatorios" },
      { status: 400 }
    )
  }

  // Verificar que la instalación existe y está activa
  const instalacion = await prisma.instalacion.findUnique({
    where: { id: instalacionId },
  })
  if (!instalacion || !instalacion.activa) {
    return NextResponse.json({ error: "Instalación no encontrada" }, { status: 404 })
  }

  // Obtener reservas activas de esa instalación en esa fecha
  const inicioDia = new Date(`${fecha}T00:00:00.000Z`)
  const finDia = new Date(`${fecha}T23:59:59.999Z`)

  const reservasDelDia = await prisma.reserva.findMany({
    where: {
      instalacionId,
      estado: "ACTIVA",
      horaInicio: { gte: inicioDia, lte: finDia },
    },
    select: { horaInicio: true, horaFin: true },
  })

  // Obtener bloqueos activos que cubran algún momento del día
  const bloqueos = await prisma.bloqueo.findMany({
    where: {
      instalacionId,
      activo: true,
      fechaInicio: { lte: finDia },
      fechaFin: { gte: inicioDia },
    },
    select: { fechaInicio: true, fechaFin: true },
  })

  const ahora = new Date()

  // Construir los 14 slots del día
  const slots = HORAS_DISPONIBLES.map((hora) => {
    const horaInicio = new Date(`${fecha}T${String(hora).padStart(2, "0")}:00:00.000Z`)
    const horaFin = new Date(`${fecha}T${String(hora + 1).padStart(2, "0")}:00:00.000Z`)

    const horaInicioStr = `${String(hora).padStart(2, "0")}:00`
    const horaFinStr = `${String(hora + 1).padStart(2, "0")}:00`

    // Slot ya pasado
    if (horaInicio <= ahora) {
      return { horaInicio: horaInicioStr, horaFin: horaFinStr, estado: "pasado" as const }
    }

    // Slot bloqueado por admin
    const estaBloqueado = bloqueos.some(
      (b) => b.fechaInicio < horaFin && b.fechaFin > horaInicio
    )
    if (estaBloqueado) {
      return { horaInicio: horaInicioStr, horaFin: horaFinStr, estado: "bloqueado" as const }
    }

    // Slot con reserva activa
    const estaOcupado = reservasDelDia.some(
      (r) => r.horaInicio.getTime() === horaInicio.getTime()
    )
    if (estaOcupado) {
      return { horaInicio: horaInicioStr, horaFin: horaFinStr, estado: "ocupado" as const }
    }

    return { horaInicio: horaInicioStr, horaFin: horaFinStr, estado: "libre" as const }
  })

  return NextResponse.json({ slots })
}
