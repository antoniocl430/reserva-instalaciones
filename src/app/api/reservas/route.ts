import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { opcionesAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// POST /api/reservas — crea una reserva con todas las validaciones de negocio
export async function POST(request: NextRequest) {
  const sesion = await getServerSession(opcionesAuth)
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  const body = await request.json()
  const { instalacionId, fecha, horaInicio } = body

  // Validar campos requeridos
  if (!instalacionId || !fecha || !horaInicio) {
    return NextResponse.json(
      { error: "Los campos instalacionId, fecha y horaInicio son obligatorios" },
      { status: 400 }
    )
  }

  // Validar formato horaInicio (HH:MM) y que esté en rango 08-21
  const [horas, minutos] = horaInicio.split(":").map(Number)
  if (isNaN(horas) || isNaN(minutos) || minutos !== 0 || horas < 8 || horas > 21) {
    return NextResponse.json(
      { error: "La hora de inicio debe estar entre 08:00 y 21:00" },
      { status: 400 }
    )
  }

  // Construir fechas UTC del slot
  const horaInicioDate = new Date(`${fecha}T${String(horas).padStart(2, "0")}:00:00.000Z`)
  const horaFinDate = new Date(horaInicioDate.getTime() + 60 * 60 * 1000)

  // Validar que el slot es futuro (mínimo 1 minuto de margen)
  if (horaInicioDate.getTime() <= Date.now() + 60_000) {
    return NextResponse.json(
      { error: "No puedes reservar un slot que ya ha comenzado o está a punto de comenzar" },
      { status: 400 }
    )
  }

  // Verificar instalación activa
  const instalacion = await prisma.instalacion.findUnique({
    where: { id: instalacionId },
  })
  if (!instalacion || !instalacion.activa) {
    return NextResponse.json({ error: "Instalación no disponible" }, { status: 404 })
  }

  // Verificar bloqueo activo que cubra este slot
  const bloqueo = await prisma.bloqueo.findFirst({
    where: {
      instalacionId,
      activo: true,
      fechaInicio: { lte: horaFinDate },
      fechaFin: { gte: horaInicioDate },
    },
  })
  if (bloqueo) {
    return NextResponse.json(
      { error: `Esta pista está bloqueada: ${bloqueo.motivo}` },
      { status: 409 }
    )
  }

  // Verificar límite de 2 reservas activas (solo ciudadanos)
  if (sesion.user.rol === "CIUDADANO") {
    const reservasActivas = await prisma.reserva.count({
      where: {
        usuarioId: sesion.user.id,
        estado: "ACTIVA",
        horaInicio: { gte: new Date() },
      },
    })
    if (reservasActivas >= 2) {
      return NextResponse.json(
        { error: "Ya tienes 2 reservas activas. Cancela una antes de hacer una nueva" },
        { status: 409 }
      )
    }
  }

  // Crear reserva en transacción verificando doble reserva
  let reserva
  try {
    reserva = await prisma.$transaction(async (tx) => {
    // Re-verificar disponibilidad dentro de la transacción (evita race conditions)
    const reservaExistente = await tx.reserva.findFirst({
      where: {
        instalacionId,
        estado: "ACTIVA",
        horaInicio: horaInicioDate,
      },
    })
    if (reservaExistente) {
      throw new Error("SLOT_OCUPADO")
    }

    return tx.reserva.create({
      data: {
        usuarioId: sesion.user.id,
        instalacionId,
        fecha: new Date(`${fecha}T00:00:00.000Z`),
        horaInicio: horaInicioDate,
        horaFin: horaFinDate,
        estado: "ACTIVA",
      },
      include: { instalacion: { select: { nombre: true } } },
    })
    })
  } catch (err) {
    if (err instanceof Error && err.message === "SLOT_OCUPADO") {
      return NextResponse.json(
        { error: "Este slot acaba de ser reservado por otro usuario. Elige otro horario" },
        { status: 409 }
      )
    }
    throw err
  }

  return NextResponse.json({ reserva }, { status: 201 })
}
