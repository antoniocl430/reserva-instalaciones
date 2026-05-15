/**
 * API Route: POST /api/valoraciones
 * Permite a un CIUDADANO valorar una instalación tras completar una reserva.
 *
 * Reglas de negocio:
 *   - Solo ciudadanos pueden valorar (no admins)
 *   - Una valoración por reserva (@unique en reservaId)
 *   - Solo se puede valorar cuando la reserva ya ha terminado (horaFin < now)
 *   - La reserva debe pertenecer al ciudadano y al tenant
 */

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { opcionesAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { schemaCrearValoracion } from "@/lib/validaciones"

export async function POST(request: NextRequest) {
  // Validar sesión
  const sesion = await getServerSession(opcionesAuth)
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  // Solo ciudadanos pueden valorar
  if (sesion.user.rol !== "CIUDADANO") {
    return NextResponse.json({ error: "Solo los ciudadanos pueden crear valoraciones" }, { status: 403 })
  }

  // Validar body con Zod
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo de la petición no válido" }, { status: 400 })
  }

  const validacion = schemaCrearValoracion.safeParse(body)
  if (!validacion.success) {
    return NextResponse.json({ error: validacion.error.errors }, { status: 400 })
  }

  const { reservaId, puntuacion, comentario } = validacion.data
  const { id: usuarioId, tenantId } = sesion.user

  // Buscar la reserva verificando que pertenece al ciudadano y al tenant
  const reserva = await prisma.reserva.findFirst({
    where: {
      id: reservaId,
      usuarioId,
      tenantId,
    },
  })

  if (!reserva) {
    return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 })
  }

  // Verificar que la reserva ya ha terminado (horaFin < now)
  const ahora = new Date()
  if (reserva.horaFin > ahora) {
    return NextResponse.json(
      { error: "Solo se puede valorar una reserva una vez que ha finalizado" },
      { status: 422 }
    )
  }

  // Crear la valoración — capturar error P2002 si ya existe (unique constraint)
  try {
    const valoracion = await prisma.valoracion.create({
      data: {
        tenantId,
        usuarioId,
        instalacionId: reserva.instalacionId,
        reservaId,
        puntuacion,
        comentario,
      },
    })

    return NextResponse.json({ valoracion }, { status: 201 })
  } catch (err: unknown) {
    // Error de unique constraint — la reserva ya fue valorada
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Esta reserva ya ha sido valorada" },
        { status: 409 }
      )
    }

    console.error("Error al crear valoración:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
