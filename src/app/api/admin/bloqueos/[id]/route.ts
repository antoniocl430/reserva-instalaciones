import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { opcionesAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// DELETE /api/admin/bloqueos/[id] — elimina un bloqueo del tenant del admin
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    // Verificar que el bloqueo existe Y pertenece al tenant del admin
    // (findFirst con id + tenantId evita acceso cruzado entre tenants)
    const bloqueo = await prisma.bloqueo.findFirst({
      where: { id: params.id, tenantId: sesion.user.tenantId },
    })

    if (!bloqueo) {
      return NextResponse.json(
        { error: "Bloqueo no encontrado" },
        { status: 404 }
      )
    }

    // Eliminar el bloqueo
    await prisma.bloqueo.delete({
      where: { id: params.id },
    })

    return NextResponse.json({
      ok: true,
      mensaje: "Bloqueo eliminado correctamente",
    })
  } catch (err) {
    console.error("Error al eliminar bloqueo:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
