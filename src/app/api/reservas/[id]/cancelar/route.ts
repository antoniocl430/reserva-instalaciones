import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { opcionesAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { enviarEmailCancelacion, enviarEmailCancelacionAdmins } from "@/lib/email"
import { enviarPushCancelacion } from "@/lib/push"

// PATCH /api/reservas/[id]/cancelar — cancela una reserva del tenant del usuario autenticado
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sesion = await getServerSession(opcionesAuth)
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  // datosReserva se usa después del try/catch para enviar el email y el push
  let datosReserva: {
    usuarioId: string
    horaInicio: Date
    horaFin: Date
    fecha: Date
    instalacion: { nombre: string }
    usuario: { nombre: string; email: string }
  } | null = null

  // esAdminCancela se determina dentro de la transacción y se usa para las notificaciones post-transacción
  let esAdminCancela = false

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

      await tx.reserva.update({
        where: { id: params.id },
        data: {
          estado: "CANCELADA",
          canceladoEn: new Date(),
          canceladoPor: sesion.user.id,
        },
      })

      // Registrar si quien cancela es admin para usarlo después de la transacción
      esAdminCancela = esAdmin

      // Devolver los datos necesarios para email y push — incluye usuarioId para el push
      return {
        usuarioId: reserva.usuarioId,
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
default:
        console.error("Error al cancelar reserva:", err)
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
    }
  }

  // Enviar notificaciones de cancelación de forma asíncrona (el fallo no bloquea la respuesta)
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
    const datosEmail = {
      emailUsuario: datosReserva.usuario.email,
      nombreUsuario: datosReserva.usuario.nombre,
      nombreInstalacion: datosReserva.instalacion.nombre,
      fecha: fechaStr,
      horaInicio: horaInicioStr,
      horaFin: horaFinStr,
    }

    // Email al ciudadano — subject y plantilla diferenciados según quién cancela
    enviarEmailCancelacion({
      ...datosEmail,
      canceladoPorAdmin: esAdminCancela,
    }).catch((err) => console.error("[Email] Error al enviar email de cancelación:", err))

    // Email a admins solo cuando cancela el ciudadano (no cuando el admin cancela)
    if (!esAdminCancela) {
      prisma.usuario.findMany({
        where: { tenantId: sesion.user.tenantId, rol: "ADMIN", activo: true },
        select: { email: true },
      }).then((admins) => {
        const emailsAdmins = admins.map((a) => a.email)
        return enviarEmailCancelacionAdmins(
          {
            ...datosEmail,
            nombreCiudadano: datosReserva!.usuario.nombre,
          },
          emailsAdmins
        )
      }).catch((err) => console.error("[Email] Error al notificar admins de cancelación:", err))
    }

    // Push: notificar al usuario en dos casos:
    // 1. Admin cancela una reserva ajena → notificar al dueño de la reserva
    if (esAdminCancela && datosReserva.usuarioId !== sesion.user.id) {
      enviarPushCancelacion({
        usuarioId: datosReserva.usuarioId,
        nombreInstalacion: datosReserva.instalacion.nombre,
        fecha: fechaStr,
        horaInicio: horaInicioStr,
        canceladoPorAdmin: true,
      }).catch((err) => console.error("[Push] Error al notificar cancelación:", err))
    }
    // 2. Ciudadano cancela su propia reserva
    if (!esAdminCancela) {
      enviarPushCancelacion({
        usuarioId: datosReserva.usuarioId,
        nombreInstalacion: datosReserva.instalacion.nombre,
        fecha: fechaStr,
        horaInicio: horaInicioStr,
        canceladoPorAdmin: false,
      }).catch((err) => console.error("[Push] Error al notificar cancelación:", err))
    }
  }

  return NextResponse.json({ ok: true })
}
