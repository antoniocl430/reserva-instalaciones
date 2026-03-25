import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { opcionesAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { schemaCrearReservaAdmin } from "@/lib/validaciones"

// Regex para validar formato YYYY-MM-DD
const REGEX_FECHA = /^\d{4}-\d{2}-\d{2}$/

// Slots válidos — deben coincidir con los de /api/reservas/route.ts
const SLOTS_VALIDOS: Record<string, string> = {
  "08:00": "09:15",
  "09:15": "10:30",
  "10:30": "11:45",
  "11:45": "13:00",
  "16:45": "18:00",
  "18:00": "19:15",
  "19:15": "20:30",
}

/**
 * Crea un objeto Date cuyo instante UTC corresponde a la hora y minutos indicados
 * en la zona horaria Europe/Madrid (UTC+1 invierno / UTC+2 verano).
 */
function crearHoraEnMadrid(fechaStr: string, hora: number, minutos: number = 0): Date {
  const base = new Date(`${fechaStr}T${String(hora).padStart(2, "0")}:${String(minutos).padStart(2, "0")}:00.000Z`)
  const horaMadrid = parseInt(
    base.toLocaleString("en-US", {
      timeZone: "Europe/Madrid",
      hour: "numeric",
      hour12: false,
    })
  )
  let diff = horaMadrid - hora
  if (diff > 12) diff -= 24
  if (diff < -12) diff += 24
  return new Date(base.getTime() - diff * 60 * 60 * 1000)
}

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

// POST /api/admin/reservas — crea una reserva manualmente a nombre de un ciudadano
export async function POST(request: NextRequest) {
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
    const body = await request.json()

    // Validar entrada con Zod
    const resultado = schemaCrearReservaAdmin.safeParse(body)
    if (!resultado.success) {
      const primerError = resultado.error.issues[0]
      return NextResponse.json(
        { error: primerError.message },
        { status: 400 }
      )
    }

    const { usuarioId, instalacionId, fecha, horaInicio } = resultado.data

    // Obtener la hora fin desde SLOTS_VALIDOS
    const horaFin = SLOTS_VALIDOS[horaInicio]
    if (!horaFin) {
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

    // Verificar que el usuario existe y está activo
    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { activo: true, email: true, nombre: true },
    })
    if (!usuario || !usuario.activo) {
      return NextResponse.json(
        { error: "El usuario no existe o no está activo" },
        { status: 404 }
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

    // Crear reserva en transacción
    // Nota: NO verificamos el límite de 2 reservas para admins (saltean esta regla)
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
            usuarioId,
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
      if (err instanceof Error && err.message === "SLOT_OCUPADO") {
        return NextResponse.json(
          { error: "Este slot acaba de ser reservado por otro usuario. Elige otro horario" },
          { status: 409 }
        )
      }
      throw err
    }

    return NextResponse.json({ reserva }, { status: 201 })
  } catch (err) {
    console.error("Error al crear reserva admin:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
