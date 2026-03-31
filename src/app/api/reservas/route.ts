import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { opcionesAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { enviarEmailReserva } from "@/lib/email"
import { schemaCrearReserva } from "@/lib/validaciones"

/**
 * Crea un objeto Date cuyo instante UTC corresponde a la hora y minutos indicados
 * en la zona horaria Europe/Madrid (UTC+1 invierno / UTC+2 verano).
 *
 * Ejemplo (horario de invierno, UTC+1):
 *   crearHoraEnMadrid("2026-03-25", 11, 45) → 2026-03-25T10:45:00.000Z
 *   Formateado con timeZone "Europe/Madrid" → "11:45" ✓
 */
function crearHoraEnMadrid(fechaStr: string, hora: number, minutos: number = 0): Date {
  // Crear instante provisional asumiendo que la hora es UTC
  const base = new Date(`${fechaStr}T${String(hora).padStart(2, "0")}:${String(minutos).padStart(2, "0")}:00.000Z`)
  // Averiguar qué hora muestra Madrid para ese instante UTC provisional
  const horaMadrid = parseInt(
    base.toLocaleString("en-US", {
      timeZone: "Europe/Madrid",
      hour: "numeric",
      hour12: false,
    })
  )
  // diff = cuántas horas está Madrid por delante de UTC en ese momento
  let diff = horaMadrid - hora
  if (diff > 12) diff -= 24
  if (diff < -12) diff += 24
  // Restamos el offset para que Madrid muestre exactamente 'hora:minutos'
  return new Date(base.getTime() - diff * 60 * 60 * 1000)
}

// Slots válidos — deben coincidir con los de /api/disponibilidad/route.ts
const SLOTS_VALIDOS: Record<string, string> = {
  "08:00": "09:15",
  "09:15": "10:30",
  "10:30": "11:45",
  "11:45": "13:00",
  "16:45": "18:00",
  "18:00": "19:15",
  "19:15": "20:30",
}

// POST /api/reservas — crea una reserva con todas las validaciones de negocio
export async function POST(request: NextRequest) {
  const sesion = await getServerSession(opcionesAuth)
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  const body = await request.json()

  // Validar entrada con Zod
  const resultado = schemaCrearReserva.safeParse(body)
  if (!resultado.success) {
    const primerError = resultado.error.issues[0]
    return NextResponse.json(
      { error: primerError.message },
      { status: 400 }
    )
  }

  const { instalacionId, fecha, horaInicio } = resultado.data

  // Obtener la hora fin desde SLOTS_VALIDOS
  const horaFin = SLOTS_VALIDOS[horaInicio]
  if (!horaFin) {
    // Esto no debería ocurrir si Zod validó correctamente, pero para seguridad
    return NextResponse.json(
      { error: "La hora de inicio no corresponde a un slot válido" },
      { status: 400 }
    )
  }

  const [horas, minutos] = horaInicio.split(":").map(Number)
  const [horasFin, minutosFin] = horaFin.split(":").map(Number)

  // Construir fechas UTC del slot usando hora local española (Europe/Madrid)
  const horaInicioDate = crearHoraEnMadrid(fecha, horas, minutos)
  const horaFinDate = crearHoraEnMadrid(fecha, horasFin, minutosFin)

  // Validar que el slot es futuro (mínimo 1 minuto de margen)
  if (horaInicioDate.getTime() <= Date.now() + 60_000) {
    return NextResponse.json(
      { error: "No puedes reservar un slot que ya ha comenzado o está a punto de comenzar" },
      { status: 400 }
    )
  }

  // Verificar que la instalación existe, está activa Y pertenece al tenant del usuario
  const instalacion = await prisma.instalacion.findFirst({
    where: { id: instalacionId, tenantId: sesion.user.tenantId },
  })
  if (!instalacion || !instalacion.activa) {
    return NextResponse.json({ error: "Instalación no disponible" }, { status: 404 })
  }

  // Verificar bloqueo activo del tenant que cubra este slot (fuera de transacción: solo lectura)
  const bloqueo = await prisma.bloqueo.findFirst({
    where: {
      tenantId: sesion.user.tenantId,
      instalacionId,
      activo: true,
      fechaInicio: { lte: horaFinDate },
      fechaFin: { gte: horaInicioDate },
    },
  })
  if (bloqueo) {
    return NextResponse.json(
      { error: `Esta instalación está bloqueada: ${bloqueo.motivo}` },
      { status: 409 }
    )
  }

  // Crear reserva en transacción.
  // El conteo de reservas activas del ciudadano se realiza DENTRO de la transacción
  // para evitar que dos peticiones simultáneas superen el límite de 2 reservas (BUG-03).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let reserva: any
  try {
    reserva = await prisma.$transaction(async (tx) => {
      // Verificar límite de 1 reserva activa por tipo de instalación (solo ciudadanos).
      // Un ciudadano puede tener una reserva de pádel Y una de tenis simultáneamente,
      // pero no puede tener dos reservas del mismo tipo a la vez.
      if (sesion.user.rol === "CIUDADANO") {
        const reservasActivasMismoTipo = await tx.reserva.count({
          where: {
            usuarioId: sesion.user.id,
            estado: "ACTIVA",
            horaInicio: { gte: new Date() },
            instalacion: { tipo: instalacion.tipo },
          },
        })
        if (reservasActivasMismoTipo >= 1) {
          throw new Error("LIMITE_RESERVAS")
        }
      }

      // Re-verificar disponibilidad dentro de la transacción (evita race conditions)
      const reservaExistente = await tx.reserva.findFirst({
        where: {
          tenantId: sesion.user.tenantId,
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
          tenantId: sesion.user.tenantId!,
          usuarioId: sesion.user.id,
          instalacionId,
          fecha: crearHoraEnMadrid(fecha, 0),
          horaInicio: horaInicioDate,
          horaFin: horaFinDate,
          estado: "ACTIVA",
        },
        include: { instalacion: { select: { nombre: true } } },
      })
    })
  } catch (err) {
    if (err instanceof Error && err.message === "LIMITE_RESERVAS") {
      return NextResponse.json(
        { error: "Ya tienes una reserva activa de este tipo. Cancélala antes de hacer otra del mismo tipo" },
        { status: 409 }
      )
    }
    if (err instanceof Error && err.message === "SLOT_OCUPADO") {
      return NextResponse.json(
        { error: "Este slot acaba de ser reservado por otro usuario. Elige otro horario" },
        { status: 409 }
      )
    }
    throw err
  }

  // Enviar email de confirmación de forma asíncrona (el fallo no bloquea la respuesta)
  const horaInicioStr = horaInicio
  const horaFinStr = horaFin
  const datosEmail = {
    emailUsuario: sesion.user.email!,
    nombreUsuario: sesion.user.name ?? sesion.user.email!,
    nombreInstalacion: reserva.instalacion.nombre,
    fecha,
    horaInicio: horaInicioStr,
    horaFin: horaFinStr,
  }
  enviarEmailReserva(datosEmail).catch((err) =>
    console.error("[Email] Error al enviar confirmación de reserva:", err)
  )


  return NextResponse.json({ reserva }, { status: 201 })
}
