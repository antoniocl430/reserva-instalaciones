/**
 * GET /api/cuenta — devuelve el perfil del usuario autenticado
 * PATCH /api/cuenta — actualiza el nombre del usuario autenticado
 * DELETE /api/cuenta — elimina la cuenta del usuario (solo CIUDADANO, RGPD)
 */

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { opcionesAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { schemaActualizarPerfil } from "@/lib/validaciones"

/**
 * GET /api/cuenta
 * Devuelve el perfil completo del usuario autenticado (sin passwordHash).
 */
export async function GET(request: NextRequest) {
  // 1. Verificar sesión activa
  const sesion = await getServerSession(opcionesAuth)
  if (!sesion?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: sesion.user.id },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        avatarUrl: true,
        creadoEn: true,
      },
    })

    if (!usuario) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ usuario })
  } catch (error) {
    console.error("Error al obtener perfil:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

/**
 * PATCH /api/cuenta
 * Actualiza el nombre del usuario autenticado.
 * Solo modifica el usuario que pertenece al tenant de la sesión.
 */
export async function PATCH(request: NextRequest) {
  // 1. Verificar sesión activa
  const sesion = await getServerSession(opcionesAuth)
  if (!sesion?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 })
  }

  // 2. Validar el cuerpo con el schema
  const resultado = schemaActualizarPerfil.safeParse(body)
  if (!resultado.success) {
    const mensajeError = resultado.error.issues[0]?.message ?? "Datos inválidos"
    return NextResponse.json({ error: mensajeError }, { status: 400 })
  }

  const { nombre } = resultado.data

  // Si no se envía ningún campo con valor, no hay nada que actualizar
  if (nombre === undefined) {
    return NextResponse.json({ error: "Se debe proporcionar al menos un campo para actualizar" }, { status: 400 })
  }

  try {
    // 3. Actualizar filtrando por id Y tenantId para garantizar aislamiento multi-tenant
    const usuarioActualizado = await prisma.usuario.update({
      where: {
        id: sesion.user.id,
        tenantId: sesion.user.tenantId,
      },
      data: { nombre },
      select: {
        nombre: true,
        email: true,
        avatarUrl: true,
      },
    })

    return NextResponse.json({ usuario: usuarioActualizado })
  } catch (error) {
    console.error("Error al actualizar perfil:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  // 1. Verificar sesión activa
  const sesion = await getServerSession(opcionesAuth)
  if (!sesion?.user) {
    return NextResponse.json(
      { error: "No autenticado" },
      { status: 401 }
    )
  }

  // 2. Solo ciudadanos pueden usar este endpoint
  if (sesion.user.rol !== "CIUDADANO") {
    return NextResponse.json(
      { error: "Solo los ciudadanos pueden eliminar su propia cuenta desde aquí" },
      { status: 403 }
    )
  }

  const usuarioId = sesion.user.id
  const tenantId = sesion.user.tenantId

  try {
    // 3. Ejecutar eliminación en transacción atómica
    await prisma.$transaction(async (tx) => {
      // a. Cancelar todas las reservas ACTIVAS del usuario
      await tx.reserva.updateMany({
        where: {
          usuarioId,
          tenantId,
          estado: "ACTIVA",
        },
        data: {
          estado: "CANCELADA",
          canceladoEn: new Date(),
          canceladoPor: usuarioId,
        },
      })

      // b. Eliminar tokens de recuperación del usuario
      await tx.tokenRecuperacion.deleteMany({
        where: {
          usuarioId,
          tenantId,
        },
      })

      // c. Eliminar al usuario
      await tx.usuario.delete({
        where: { id: usuarioId },
      })
    })

    // 4. Responder con éxito
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    console.error("Error al eliminar cuenta:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
