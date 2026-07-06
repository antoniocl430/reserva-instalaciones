import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { opcionesAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { enviarEmailSuspension } from "@/lib/email"

/**
 * PATCH /api/admin/usuarios/[id]/suspender
 *
 * Suspende manualmente la cuenta de un ciudadano hasta la fecha indicada.
 * Solo ADMIN del mismo tenant puede llamar este endpoint.
 *
 * Body: { suspendidoHasta: string (ISO date), motivoSuspension: string }
 */
export async function PATCH(
  request: NextRequest,
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

  const { id: usuarioId } = params

  try {
    const body = await request.json()
    const { suspendidoHasta: suspendidoHastaStr, motivoSuspension } = body

    // Validar que se proporcionaron los campos requeridos
    if (!suspendidoHastaStr || typeof suspendidoHastaStr !== "string") {
      return NextResponse.json(
        { error: "El campo suspendidoHasta es obligatorio" },
        { status: 400 }
      )
    }
    if (!motivoSuspension || typeof motivoSuspension !== "string" || !motivoSuspension.trim()) {
      return NextResponse.json(
        { error: "El campo motivoSuspension es obligatorio" },
        { status: 400 }
      )
    }

    const suspendidoHasta = new Date(suspendidoHastaStr)

    // Validar que la fecha es futura
    if (isNaN(suspendidoHasta.getTime()) || suspendidoHasta <= new Date()) {
      return NextResponse.json(
        { error: "La fecha de suspensión debe ser futura" },
        { status: 400 }
      )
    }

    // Verificar que el usuario pertenece al tenant del admin
    const usuario = await prisma.usuario.findFirst({
      where: { id: usuarioId, tenantId: sesion.user.tenantId },
      select: { id: true, email: true, nombre: true },
    })

    if (!usuario) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Actualizar suspensión
    await prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        suspendidoHasta,
        motivoSuspension: motivoSuspension.trim(),
      },
    })

    // Enviar email de suspensión (fire-and-forget)
    enviarEmailSuspension(
      usuario.email,
      usuario.nombre,
      suspendidoHasta,
      motivoSuspension.trim()
    ).catch((err) =>
      console.error("[PATCH /api/admin/usuarios/[id]/suspender] Error enviando email:", err)
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[PATCH /api/admin/usuarios/[id]/suspender]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
