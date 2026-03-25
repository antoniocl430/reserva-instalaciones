import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { Prisma } from "@prisma/client"
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

    // Eliminar el usuario
    await prisma.usuario.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ mensaje: "Usuario eliminado correctamente" })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2025") {
        return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
      }
      if (err.code === "P2003") {
        return NextResponse.json(
          { error: "No se puede eliminar este usuario porque tiene datos asociados" },
          { status: 409 }
        )
      }
    }
    console.error("Error al eliminar usuario:", err)
    throw err
  }
}
