import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { opcionesAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// DELETE /api/admin/usuarios/[id] — elimina una cuenta de admin
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
    // No puede eliminarse a sí mismo
    if (params.id === sesion.user.id) {
      return NextResponse.json(
        { error: "No puedes eliminar tu propia cuenta" },
        { status: 409 }
      )
    }

    // Eliminar el usuario — el filtro por tenantId previene IDOR entre tenants
    const usuarioEliminado = await prisma.usuario.deleteMany({
      where: { id: params.id, tenantId: sesion.user.tenantId },
    })

    if (usuarioEliminado.count === 0) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ mensaje: "Usuario eliminado correctamente" })
  } catch (err) {
    console.error("Error al eliminar usuario:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
