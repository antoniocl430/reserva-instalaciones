import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { opcionesAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { enviarEmailCancelacion } from "@/lib/email"

// PATCH /api/reservas/[id]/cancelar — cancela una reserva del tenant del usuario autenticado
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sesion = await getServerSession(opcionesAuth)
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  // datosReserva se usa después del try/catch para enviar el email
  let datosReserva: {
    horaInicio: Date
    horaFin: Date
    fecha: Date
    instalacion: { nombre: string }
    usuario: { nombre: string; email: string }
  } | null = null

  try {
    // Toda la lógica de validación y el update se ejecutan dentro de la misma
    // transacción para evitar race conditions entre la validación y el update.
    // La transacción devuelve los datos de la reserva para el email.
    datosReserva = await prisma.$transaction(async (tx) => {
      // Buscar la reserva filtrando por id Y tenantId simultáneamente.
      // Esto garantiza que un usuario no puede cancelar reservas de otro tenant
      // aunque conozca el ID (evita información filtrada y race conditions).
      const reserva = await tx.reserva.findFirst({
        where: { id: params.id, tenantId: sesion.user.tenantId },
        include: {
          instalacion: { select: { nombre: true } },
          usuario: { select: { nombre: true, email: true } },
        },
      })

      if (!reserva) {
        throw new Error("RESERVA_NO_ENCONTRADA")
      }

      // Verificar que el usuario es el dueño o es admin
      const esDueno = reserva.usuarioId === sesion.user.id
      const esAdmin = sesion.user.rol === "ADMIN"
      if (!esDueno && !esAdmin) {
        throw new Error("SIN_PERMISO")
      }

      // Verificar que la reserva está activa
      if (reserva.estado !== "ACTIVA") {
        throw new Error("YA_CANCELADA")
      }

      // Si es ciudadano, verificar que faltan más de 2 horas para el inicio
      if (!esAdmin) {
        const dosHorasAntes = new Date(reserva.horaInicio.getTime() - 2 * 60 * 60 * 1000)
        if (new Date() >= dosHorasAntes) {
          throw new Error("FUERA_DE_PLAZO")
        }
      }

      await tx.reserva.update({
        where: { id: params.id },
        data: {
          estado: "CANCELADA",
          canceladoEn: new Date(),
          canceladoPor: sesion.user.id,
        },
      })

      // Devolver los datos necesarios para el email de cancelación
      return {
        horaInicio: reserva.horaInicio,
        horaFin: reserva.horaFin,
        fecha: reserva.fecha,
        instalacion: reserva.instalacion,
        usuario: reserva.usuario,
      }
    })
  } catch (err) {
    if (!(err instanceof Error)) throw err

    switch (err.message) {
      case "RESERVA_NO_ENCONTRADA":
        return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 })
      case "SIN_PERMISO":
        return NextResponse.json(
          { error: "No tienes permiso para cancelar esta reserva" },
          { status: 403 }
        )
      case "YA_CANCELADA":
        return NextResponse.json({ error: "Esta reserva ya está cancelada" }, { status: 409 })
      case "FUERA_DE_PLAZO":
        return NextResponse.json(
          { error: "Solo puedes cancelar con más de 2 horas de antelación" },
          { status: 409 }
        )
      default:
        console.error("Error al cancelar reserva:", err)
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
    }
  }

  // Enviar email de cancelación de forma asíncrona (el fallo no bloquea la respuesta)
  if (datosReserva) {
    const horaInicioStr = datosReserva.horaInicio.toLocaleString("en-US", {
      timeZone: "Europe/Madrid",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    const horaFinStr = datosReserva.horaFin.toLocaleString("en-US", {
      timeZone: "Europe/Madrid",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    const fechaStr = datosReserva.fecha.toISOString().split("T")[0]

    enviarEmailCancelacion({
      emailUsuario: datosReserva.usuario.email,
      nombreUsuario: datosReserva.usuario.nombre,
      nombreInstalacion: datosReserva.instalacion.nombre,
      fecha: fechaStr,
      horaInicio: horaInicioStr,
      horaFin: horaFinStr,
    }).catch((err) => console.error("[Email] Error al enviar email de cancelación:", err))
  }

  return NextResponse.json({ ok: true })
}
