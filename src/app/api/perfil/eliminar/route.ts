/**
 * DELETE /api/perfil/eliminar
 * Anonimiza y desactiva la cuenta del ciudadano autenticado.
 * Cancela reservas activas y limpia datos relacionados en transacción.
 */

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { opcionesAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE(_request: NextRequest) {
  // 1. Verificar sesión activa
  const sesion = await getServerSession(opcionesAuth)
  if (!sesion?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  const usuarioId = sesion.user.id
  const tenantId = sesion.user.tenantId

  try {
    // 2. Ejecutar todas las operaciones en una única transacción atómica
    await prisma.$transaction(async (tx) => {
      // Cancelar todas las reservas activas del usuario
      await tx.reserva.updateMany({
        where: { usuarioId, tenantId, estado: "ACTIVA" },
        data: { estado: "CANCELADA", canceladoEn: new Date() },
      })

      // Eliminar entradas de lista de espera
      await tx.listaEspera.deleteMany({
        where: { usuarioId },
      })

      // Eliminar suscripciones push
      await tx.suscripcionPush.deleteMany({
        where: { usuarioId },
      })

      // Eliminar tokens de recuperación de contraseña
      await tx.tokenRecuperacion.deleteMany({
        where: { usuarioId },
      })

      // Eliminar preferencias de notificación
      await tx.preferenciaNotificacion.deleteMany({
        where: { usuarioId },
      })

      // Anonimizar el usuario: sustituir datos personales e inactivar la cuenta
      await tx.usuario.update({
        where: { id: usuarioId },
        data: {
          nombre: "Usuario eliminado",
          email: `eliminado-${usuarioId}@eliminado.local`,
          passwordHash: "",
          avatarUrl: null,
          activo: false,
          aceptaPrivacidadEn: null,
          suspendidoHasta: null,
          motivoSuspension: null,
        },
      })
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[DELETE /api/perfil/eliminar] Error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
