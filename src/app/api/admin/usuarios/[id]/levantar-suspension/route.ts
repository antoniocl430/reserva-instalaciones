import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { opcionesAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * PATCH /api/admin/usuarios/[id]/levantar-suspension
 *
 * Levanta la suspensión activa de un ciudadano.
 * Establece suspendidoHasta y motivoSuspension a null.
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

  const { id: usuarioId } = params

  try {
    // Verificar que el usuario pertenece al tenant del admin
    const usuario = await prisma.usuario.findFirst({
      where: { id: usuarioId, tenantId: sesion.user.tenantId },
      select: { id: true },
    })

    if (!usuario) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Levantar suspensión
    await prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        suspendidoHasta: null,
        motivoSuspension: null,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[PATCH /api/admin/usuarios/[id]/levantar-suspension]", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
