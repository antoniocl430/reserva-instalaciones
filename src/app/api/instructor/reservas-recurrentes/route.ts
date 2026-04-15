import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { opcionesAuth } from "@/lib/auth"
import { schemaCrearReservaRecurrente } from "@/lib/validaciones"
import { enviarEmailConfirmacionGrupo } from "@/lib/email"

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

const SLOTS_VALIDOS: Record<string, string> = {
  "08:00": "09:15",
  "09:15": "10:30",
  "10:30": "11:45",
  "11:45": "13:00",
  "16:45": "18:00",
  "18:00": "19:15",
  "19:15": "20:30",
}

export async function POST(request: NextRequest) {
  try {
    const sesion = await getServerSession(opcionesAuth)
    if (!sesion) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    if (sesion.user.rol !== "INSTRUCTOR") {
      return NextResponse.json(
        { error: "Solo instructores pueden crear reservas recurrentes" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validacion = schemaCrearReservaRecurrente.safeParse(body)

    if (!validacion.success) {
      const primerError = validacion.error.issues[0]
      return NextResponse.json(
        { error: primerError.message },
        { status: 400 }
      )
    }

    const { instalacionId, horaInicio, fechaInicio, fechaFin, frecuencia } = validacion.data

    // Calcular todas las fechas
    const fechas: Date[] = []
    let current = new Date(fechaInicio)
    const end = new Date(fechaFin)
    const incremento = frecuencia === "SEMANAL" ? 7 : 14

    while (current <= end && fechas.length < 52) {
      fechas.push(new Date(current))
      current.setDate(current.getDate() + incremento)
    }

    if (fechas.length === 0) {
      return NextResponse.json(
        { error: "No hay fechas válidas en el rango especificado" },
        { status: 400 }
      )
    }

    // Transacción
    const resultado = await prisma.$transaction(async (tx: any) => {
      const conflictos: string[] = []

      // Verificar conflictos para TODAS las fechas primero
      for (const fecha of fechas) {
        const [hInicio, mInicio] = horaInicio.split(":").map(Number)
        const horaInicioDate = crearHoraEnMadrid(fecha.toISOString().split("T")[0], hInicio, mInicio)
        const horaFinStr = SLOTS_VALIDOS[horaInicio]
        const [hFin, mFin] = horaFinStr.split(":").map(Number)
        const horaFinDate = crearHoraEnMadrid(fecha.toISOString().split("T")[0], hFin, mFin)

        // Buscar reserva conflictiva
        const reservaConflictiva = await tx.reserva.findFirst({
          where: {
            instalacionId,
            estado: "ACTIVA",
            horaInicio: horaInicioDate,
          },
        })

        if (reservaConflictiva) {
          conflictos.push(fecha.toISOString().split("T")[0])
          continue
        }

        // Buscar bloqueo conflictivo
        const bloqueoConflictivo = await tx.bloqueo.findFirst({
          where: {
            instalacionId,
            activo: true,
            fechaInicio: { lte: horaFinDate },
            fechaFin: { gte: horaInicioDate },
          },
        })

        if (bloqueoConflictivo) {
          conflictos.push(fecha.toISOString().split("T")[0])
        }
      }

      if (conflictos.length > 0) {
        throw new Error(`CONFLICTOS:${conflictos.join(",")}`)
      }

      // Crear grupo
      const grupo = await tx.grupoRecurrencia.create({
        data: {
          tenantId: sesion.user.tenantId!,
          usuarioId: sesion.user.id,
          instalacionId,
          horaInicio,
          frecuencia,
          fechaInicio: new Date(fechaInicio),
          fechaFin: new Date(fechaFin),
          activo: true,
        },
        include: {
          instalacion: {
            select: { nombre: true },
          },
        },
      })

      // Crear todas las reservas
      const reservas = await Promise.all(
        fechas.map((fecha) => {
          const fechaStr = fecha.toISOString().split("T")[0]
          const [hInicio, mInicio] = horaInicio.split(":").map(Number)
          const horaInicioDate = crearHoraEnMadrid(fechaStr, hInicio, mInicio)
          const horaFinStr = SLOTS_VALIDOS[horaInicio]
          const [hFin, mFin] = horaFinStr.split(":").map(Number)
          const horaFinDate = crearHoraEnMadrid(fechaStr, hFin, mFin)

          return tx.reserva.create({
            data: {
              tenantId: sesion.user.tenantId!,
              usuarioId: sesion.user.id,
              instalacionId,
              fecha: new Date(fechaStr),
              horaInicio: horaInicioDate,
              horaFin: horaFinDate,
              estado: "ACTIVA",
              grupoRecurrenciaId: grupo.id,
            },
          })
        })
      )

      return { grupo, reservas }
    })

    // Enviar email de confirmación (fire-and-forget)
    const horaInicioStr = resultado.grupo.horaInicio
    const horaFinStr = SLOTS_VALIDOS[horaInicioStr] || "22:00"

    enviarEmailConfirmacionGrupo(sesion.user.email!, sesion.user.name || "Instructor", {
      instalacion: resultado.grupo.instalacion || { nombre: "" },
      horaInicio: horaInicioStr,
      frecuencia: resultado.grupo.frecuencia,
      fechaInicio: resultado.grupo.fechaInicio,
      fechaFin: resultado.grupo.fechaFin,
      reservas: resultado.reservas.map((r: any) => ({
        horaInicio: horaInicioStr,
        horaFin: horaFinStr,
        fecha: r.fecha,
      })),
    }).catch((error) => {
      console.error("[POST /api/instructor/reservas-recurrentes] Error enviando email:", error)
    })

    return NextResponse.json(resultado, { status: 201 })
  } catch (error: any) {
    if (error.message?.startsWith("CONFLICTOS:")) {
      const conflictos = error.message.split(":")[1].split(",")
      return NextResponse.json(
        { error: "Hay conflictos en estas fechas", conflictos },
        { status: 409 }
      )
    }

    console.error("[POST /api/instructor/reservas-recurrentes]", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const sesion = await getServerSession(opcionesAuth)
    if (!sesion) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    if (sesion.user.rol !== "INSTRUCTOR") {
      return NextResponse.json(
        { error: "Acceso denegado" },
        { status: 403 }
      )
    }

    const grupos = await prisma.grupoRecurrencia.findMany({
      where: {
        usuarioId: sesion.user.id,
        tenantId: sesion.user.tenantId,
        activo: true,
      },
      include: {
        instalacion: {
          select: { nombre: true },
        },
        reservas: {
          orderBy: { horaInicio: "asc" },
        },
      },
      orderBy: { fechaInicio: "desc" },
    })

    return NextResponse.json({ grupos }, { status: 200 })
  } catch (error) {
    console.error("[GET /api/instructor/reservas-recurrentes]", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
