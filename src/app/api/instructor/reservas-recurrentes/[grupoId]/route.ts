import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { opcionesAuth } from "@/lib/auth"

export async function DELETE(
  request: NextRequest,
  { params }: { params: { grupoId: string } }
) {
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

    const grupo = await prisma.grupoRecurrencia.findUnique({
      where: { id: params.grupoId },
    })

    if (!grupo) {
      return NextResponse.json({ error: "Grupo no encontrado" }, { status: 404 })
    }

    if (grupo.usuarioId !== sesion.user.id || grupo.tenantId !== sesion.user.tenantId) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const resultado = await prisma.$transaction(async (tx: any) => {
      // Actualizar grupo como inactivo
      const grupoActualizado = await tx.grupoRecurrencia.update({
        where: { id: params.grupoId },
        data: { activo: false },
      })

      // Cancelar reservas futuras
      const ahora = new Date()
      const { count } = await tx.reserva.updateMany({
        where: {
          grupoRecurrenciaId: params.grupoId,
          estado: "ACTIVA",
          horaInicio: { gt: ahora },
        },
        data: {
          estado: "CANCELADA",
          canceladoEn: ahora,
          canceladoPor: sesion.user.id,
        },
      })

      return { grupo: grupoActualizado, reservasCanceladas: count }
    })

    return NextResponse.json(resultado, { status: 200 })
  } catch (error) {
    console.error("[DELETE /api/instructor/reservas-recurrentes/[grupoId]]", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
