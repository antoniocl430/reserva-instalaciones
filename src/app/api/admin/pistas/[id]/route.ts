import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { opcionesAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { schemaActualizarPistaAdmin } from "@/lib/validaciones"

// DELETE /api/admin/pistas/[id] — elimina una instalación sin historial de reservas
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sesion = await getServerSession(opcionesAuth)
  if (!sesion) return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  if (sesion.user.rol !== "ADMIN") {
    return NextResponse.json({ error: "No tienes permiso para acceder a esta ruta" }, { status: 403 })
  }

  const instalacion = await prisma.instalacion.findFirst({
    where: { id: params.id, tenantId: sesion.user.tenantId },
  })
  if (!instalacion) {
    return NextResponse.json({ error: "Instalación no encontrada" }, { status: 404 })
  }

  // Bloquear si tiene reservas vinculadas (preservar historial)
  const totalReservas = await prisma.reserva.count({
    where: { instalacionId: params.id, tenantId: sesion.user.tenantId },
  })
  if (totalReservas > 0) {
    return NextResponse.json(
      { error: "La instalación tiene reservas vinculadas. Usa 'Desactivar' para ocultarla sin perder el historial." },
      { status: 409 }
    )
  }

  // Sin reservas: eliminar bloqueos, grupos de recurrencia y la instalación
  try {
    await prisma.$transaction([
      prisma.bloqueo.deleteMany({ where: { instalacionId: params.id } }),
      prisma.grupoRecurrencia.deleteMany({ where: { instalacionId: params.id } }),
      prisma.instalacion.delete({ where: { id: params.id } }),
    ])
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Error al eliminar instalación:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// PATCH /api/admin/pistas/[id] — actualiza una instalación existente
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
      { error: "No tienes permiso para acceder a esta ruta" },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()

    // Validar entrada con Zod
    const resultado = schemaActualizarPistaAdmin.safeParse(body)
    if (!resultado.success) {
      const primerError = resultado.error.issues[0]
      return NextResponse.json(
        { error: primerError.message },
        { status: 400 }
      )
    }

    // Verificar que la instalación existe Y pertenece al tenant del admin
    // (findFirst con id + tenantId evita acceso cruzado entre tenants)
    const instalacionExistente = await prisma.instalacion.findFirst({
      where: { id: params.id, tenantId: sesion.user.tenantId },
    })

    if (!instalacionExistente) {
      return NextResponse.json(
        { error: "Instalación no encontrada" },
        { status: 404 }
      )
    }

    // Construir objeto de actualización dinámicamente
    type UpdateData = {
      nombre?: string
      descripcion?: string | null
      activa?: boolean
      horario?: string
    }

    const updateData: UpdateData = {}
    const { nombre, descripcion, activa, horario } = resultado.data

    if (nombre !== undefined) {
      updateData.nombre = nombre.trim()
    }

    if (descripcion !== undefined) {
      updateData.descripcion = descripcion?.trim() || null
    }

    if (activa !== undefined) {
      updateData.activa = Boolean(activa)
    }

    if (horario !== undefined) {
      updateData.horario = horario.trim()
    }

    const instalacion = await prisma.instalacion.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json({ instalacion })
  } catch (err) {
    console.error("Error al actualizar instalación:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
