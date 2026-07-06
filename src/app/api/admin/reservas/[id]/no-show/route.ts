import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { opcionesAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { parsearConfiguracion } from "@/lib/tenant"
import { enviarEmailSuspension } from "@/lib/email"

/**
 * PATCH /api/admin/reservas/[id]/no-show
 *
 * Marca una reserva como no-show (el ciudadano no se presentó).
 * Incrementa el contador de no-shows del usuario y,
 * si alcanza el límite configurado, suspende la cuenta automáticamente.
 *
 * Solo ADMIN del mismo tenant puede llamar este endpoint.
 */
export async function PATCH(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sesion = await getServerSession(opcionesAuth)
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  if (sesion.user.rol !== "ADMIN") {
    return NextResponse.json(
      { error: "No tienes permiso para realizar esta acción" },
      { status: 403 }
    )
  }

  const { id: reservaId } = params

  try {
    // Cargar la reserva verificando que pertenece al tenant del admin
    const reserva = await prisma.reserva.findFirst({
      where: {
        id: reservaId,
        tenantId: sesion.user.tenantId,
      },
      include: {
        usuario: {
          select: {
            id: true,
            email: true,
            nombre: true,
            noShows: true,
            suspendidoHasta: true,
          },
        },
      },
    })

    if (!reserva) {
      return NextResponse.json(
        { error: "Reserva no encontrada" },
        { status: 404 }
      )
    }

    // La reserva no puede ser futura
    if (reserva.horaInicio > new Date()) {
      return NextResponse.json(
        { error: "No se puede marcar no-show en una reserva futura" },
        { status: 400 }
      )
    }

    // Ya estaba marcada como no-show
    if (reserva.noShow) {
      return NextResponse.json(
        { error: "Esta reserva ya está marcada como no-show" },
        { status: 409 }
      )
    }

    // Cargar configuración de penalizaciones del tenant
    const tenantData = await prisma.tenant.findUnique({
      where: { id: sesion.user.tenantId },
      select: { configuracion: true },
    })
    const config = parsearConfiguracion(tenantData?.configuracion ?? null)
    const maxNoShows = config.penalizaciones?.maxNoShows ?? 3
    const diasSuspension = config.penalizaciones?.diasSuspension ?? 14

    const noShowsActuales = reserva.usuario.noShows
    const noShowsNuevos = noShowsActuales + 1
    const debeSerSuspendido =
      noShowsNuevos >= maxNoShows &&
      (reserva.usuario.suspendidoHasta === null || reserva.usuario.suspendidoHasta < new Date())

    let suspendidoHasta: Date | null = null
    let motivoSuspension: string | null = null

    if (debeSerSuspendido) {
      suspendidoHasta = new Date(Date.now() + diasSuspension * 24 * 60 * 60 * 1000)
      motivoSuspension = `Suspensión automática por no presentarse a ${maxNoShows} reservas`
    }

    // Ejecutar actualizaciones en transacción
    await prisma.$transaction(async (tx) => {
      // Marcar la reserva como no-show
      await tx.reserva.update({
        where: { id: reservaId },
        data: { noShow: true },
      })

      // Incrementar contador y suspender si corresponde
      const dataUsuario: Record<string, unknown> = {
        noShows: { increment: 1 },
      }

      if (debeSerSuspendido) {
        dataUsuario.suspendidoHasta = suspendidoHasta
        dataUsuario.motivoSuspension = motivoSuspension
      }

      await tx.usuario.update({
        where: { id: reserva.usuarioId },
        data: dataUsuario,
      })
    })

    // Enviar email de suspensión si corresponde (fire-and-forget)
    if (debeSerSuspendido && suspendidoHasta && motivoSuspension) {
      enviarEmailSuspension(
        reserva.usuario.email,
        reserva.usuario.nombre,
        suspendidoHasta,
        motivoSuspension
      ).catch((err) =>
        console.error("[PATCH /api/admin/reservas/[id]/no-show] Error enviando email de suspensión:", err)
      )
    }

    return NextResponse.json({
      ok: true,
      suspendido: debeSerSuspendido,
      ...(debeSerSuspendido && suspendidoHasta ? { suspendidoHasta } : {}),
    })
  } catch (err) {
    console.error("[PATCH /api/admin/reservas/[id]/no-show]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
