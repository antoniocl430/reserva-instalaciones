import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { opcionesAuth } from "@/lib/auth"
import { schemaCrearReservaRecurrente } from "@/lib/validaciones"
import { enviarEmailConfirmacionGrupo } from "@/lib/email"
import { crearHoraEnMadrid, generarMapaSlots, SLOTS_CONFIG_DEFAULT } from "@/lib/slots"
import { parsearConfiguracion } from "@/lib/tenant"

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

    // Verificar si el instructor tiene una suspensión vigente
    const usuarioInstructor = await prisma.usuario.findUnique({
      where: { id: sesion.user.id },
      select: { suspendidoHasta: true, motivoSuspension: true },
    })
    if (usuarioInstructor?.suspendidoHasta && usuarioInstructor.suspendidoHasta > new Date()) {
      return NextResponse.json(
        {
          error: `Tu cuenta está suspendida hasta el ${usuarioInstructor.suspendidoHasta.toLocaleDateString("es-ES")}. Motivo: ${usuarioInstructor.motivoSuspension ?? ""}`,
        },
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

    // Cargar la configuración de slots del tenant desde BD
    const tenantData = await prisma.tenant.findUnique({
      where: { id: sesion.user.tenantId },
      select: { configuracion: true },
    })
    const configTenant = parsearConfiguracion(tenantData?.configuracion ?? null)
    const slotsValidos = generarMapaSlots(configTenant.slots ?? SLOTS_CONFIG_DEFAULT)

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
        const fechaStr = fecha.toISOString().split("T")[0]
        const horaInicioDate = crearHoraEnMadrid(fechaStr, horaInicio)
        const horaFinStr = slotsValidos[horaInicio]
        const horaFinDate = crearHoraEnMadrid(fechaStr, horaFinStr)

        // Buscar reserva conflictiva
        const reservaConflictiva = await tx.reserva.findFirst({
          where: {
            instalacionId,
            estado: "ACTIVA",
            horaInicio: horaInicioDate,
          },
        })

        if (reservaConflictiva) {
          conflictos.push(fechaStr)
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
          conflictos.push(fechaStr)
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
          const horaInicioDate = crearHoraEnMadrid(fechaStr, horaInicio)
          const horaFinStr = slotsValidos[horaInicio]
          const horaFinDate = crearHoraEnMadrid(fechaStr, horaFinStr)

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
    const horaFinStr = slotsValidos[horaInicioStr] || "22:00"

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
