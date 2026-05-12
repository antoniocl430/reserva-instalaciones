/**
 * API Routes: PATCH /api/avisos/[id] — DELETE /api/avisos/[id]
 *
 * PATCH  — solo ADMIN: actualiza un aviso existente del tenant
 * DELETE — solo ADMIN: desactiva un aviso (soft delete, activo = false) del tenant
 *
 * Seguridad: se usa findFirst con { id, tenantId } para evitar que un admin de un tenant
 * pueda modificar avisos de otro tenant (aunque conozca el ID).
 */

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { opcionesAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { schemaActualizarAviso } from "@/lib/validaciones"

// ─── PATCH /api/avisos/[id] ──────────────────────────────────────────────────
// Solo ADMIN

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  // 1. Verificar sesión
  const sesion = await getServerSession(opcionesAuth)
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  // 2. Verificar rol ADMIN
  if (sesion.user.rol !== "ADMIN") {
    return NextResponse.json(
      { error: "No tienes permiso para realizar esta acción" },
      { status: 403 }
    )
  }

  const { id } = params

  try {
    // 3. Parsear y validar el cuerpo
    const cuerpo = await request.json()
    const resultado = schemaActualizarAviso.safeParse(cuerpo)

    if (!resultado.success) {
      return NextResponse.json(
        { error: resultado.error.issues[0].message },
        { status: 400 }
      )
    }

    // 4. Verificar que el aviso existe Y pertenece al tenant del admin
    // (findFirst con id + tenantId evita acceso cruzado entre tenants)
    const avisoExistente = await prisma.aviso.findFirst({
      where: { id, tenantId: sesion.user.tenantId },
    })
    if (!avisoExistente) {
      return NextResponse.json(
        { error: "Aviso no encontrado" },
        { status: 404 }
      )
    }

    // 5. Construir los datos de actualización
    const { titulo, descripcion, tipo, fecha, activo } = resultado.data
    const datosActualizacion: Record<string, unknown> = {}

    if (titulo !== undefined) datosActualizacion.titulo = titulo
    if (descripcion !== undefined) datosActualizacion.descripcion = descripcion
    if (tipo !== undefined) datosActualizacion.tipo = tipo
    if (fecha !== undefined) datosActualizacion.fecha = new Date(fecha)
    if (activo !== undefined) datosActualizacion.activo = activo

    // 6. Actualizar el aviso
    const avisoActualizado = await prisma.aviso.update({
      where: { id },
      data: datosActualizacion,
    })

    return NextResponse.json(avisoActualizado, { status: 200 })
  } catch (error) {
    console.error(`[PATCH /api/avisos/${id}] Error:`, error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// ─── DELETE /api/avisos/[id] ─────────────────────────────────────────────────
// Solo ADMIN — soft delete (marca activo = false, no elimina el registro)

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  // 1. Verificar sesión
  const sesion = await getServerSession(opcionesAuth)
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  // 2. Verificar rol ADMIN
  if (sesion.user.rol !== "ADMIN") {
    return NextResponse.json(
      { error: "No tienes permiso para realizar esta acción" },
      { status: 403 }
    )
  }

  const { id } = params

  try {
    // 3. Verificar que el aviso existe Y pertenece al tenant del admin
    // (findFirst con id + tenantId evita acceso cruzado entre tenants)
    const avisoExistente = await prisma.aviso.findFirst({
      where: { id, tenantId: sesion.user.tenantId },
    })
    if (!avisoExistente) {
      return NextResponse.json(
        { error: "Aviso no encontrado" },
        { status: 404 }
      )
    }

    // 4. Soft delete: desactivar el aviso en lugar de eliminarlo físicamente
    // Esto permite auditoría y recuperación posterior
    await prisma.aviso.update({
      where: { id },
      data: { activo: false },
    })

    return NextResponse.json(
      { mensaje: "Aviso desactivado correctamente" },
      { status: 200 }
    )
  } catch (error) {
    console.error(`[DELETE /api/avisos/${id}] Error:`, error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
