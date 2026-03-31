import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { opcionesAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Esquema de validación para suscribir un endpoint push
const schemaSuscribir = z.object({
  endpoint: z.string().url("El endpoint debe ser una URL válida"),
  keys: z.object({
    p256dh: z.string().min(1, "La clave p256dh es obligatoria"),
    auth: z.string().min(1, "La clave auth es obligatoria"),
  }),
})

// Esquema de validación para eliminar (marcar inactiva) una suscripción
const schemaEliminar = z.object({
  endpoint: z.string().url("El endpoint debe ser una URL válida"),
})

/**
 * POST /api/push/suscribir
 * Guarda (o reactiva) la suscripción Web Push del usuario autenticado.
 * Usa upsert con la restricción @@unique([usuarioId, endpoint]) para evitar duplicados.
 */
export async function POST(request: NextRequest) {
  const sesion = await getServerSession(opcionesAuth)
  console.log("[Push] POST suscribir — sesion:", sesion?.user?.id ?? "null")
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 })
  }

  const validacion = schemaSuscribir.safeParse(body)
  if (!validacion.success) {
    return NextResponse.json(
      { error: "Datos de suscripción inválidos", detalles: validacion.error.flatten() },
      { status: 400 }
    )
  }

  const { endpoint, keys } = validacion.data

  try {
    await prisma.suscripcionPush.upsert({
      where: {
        usuarioId_endpoint: {
          usuarioId: sesion.user.id,
          endpoint,
        },
      },
      update: {
        // Reactivar si existía desactivada y actualizar las claves
        activa: true,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      create: {
        tenantId: sesion.user.tenantId!,
        usuarioId: sesion.user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[Push] Error al guardar suscripción:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

/**
 * DELETE /api/push/suscribir
 * Marca como inactiva la suscripción del usuario para un endpoint dado.
 * No borra el registro para mantener el historial de suscripciones.
 */
export async function DELETE(request: NextRequest) {
  const sesion = await getServerSession(opcionesAuth)
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 })
  }

  const validacion = schemaEliminar.safeParse(body)
  if (!validacion.success) {
    return NextResponse.json(
      { error: "Endpoint inválido", detalles: validacion.error.flatten() },
      { status: 400 }
    )
  }

  const { endpoint } = validacion.data

  try {
    await prisma.suscripcionPush.updateMany({
      where: {
        usuarioId: sesion.user.id,
        endpoint,
      },
      data: { activa: false },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[Push] Error al eliminar suscripción:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
