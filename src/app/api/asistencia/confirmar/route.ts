/**
 * POST /api/asistencia/confirmar
 *
 * El ciudadano confirma su asistencia escaneando el QR de la pista (generado por
 * el admin, codifica /pistas/{instalacionId}). Marca su reserva activa de esa
 * instalación en curso como asistida, de modo que no se contabilice como no-show.
 *
 * Acepta autenticación móvil (Bearer) o web (cookie) mediante obtenerSesion.
 *
 * Body: { instalacionId: string }
 * Respuesta 200: { ok, yaConfirmada, reserva: { id, instalacion, fecha, horaInicio, horaFin } }
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { obtenerSesion } from "@/lib/auth-movil-web"

// Margen antes del inicio del slot en el que ya se permite confirmar (check-in anticipado)
const MARGEN_ANTES_MS = 60 * 60 * 1000 // 1 hora

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-tenant-slug",
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(request: NextRequest) {
  const sesion = await obtenerSesion(request)
  if (!sesion) {
    return NextResponse.json(
      { error: "No autenticado" },
      { status: 401, headers: CORS_HEADERS }
    )
  }

  let body: { instalacionId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Cuerpo de la petición no válido" },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const instalacionId = body.instalacionId?.trim()
  if (!instalacionId) {
    return NextResponse.json(
      { error: "Falta la instalación del código QR" },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const { id: usuarioId, tenantId } = sesion.user

  // Verificar que la instalación existe en el tenant (el QR podría ser de otro ayuntamiento)
  const instalacion = await prisma.instalacion.findFirst({
    where: { id: instalacionId, tenantId },
    select: { id: true, nombre: true },
  })
  if (!instalacion) {
    return NextResponse.json(
      { error: "Este código QR no corresponde a ninguna instalación de tu ayuntamiento" },
      { status: 404, headers: CORS_HEADERS }
    )
  }

  const ahora = new Date()
  const limiteInicio = new Date(ahora.getTime() + MARGEN_ANTES_MS)

  // Buscar la reserva ACTIVA del ciudadano en esta instalación cuyo slot esté en curso:
  //   horaInicio <= ahora + 1h  (ya empezó o está a punto)   Y   horaFin >= ahora (no ha terminado)
  const reserva = await prisma.reserva.findFirst({
    where: {
      tenantId,
      usuarioId,
      instalacionId,
      estado: "ACTIVA",
      horaInicio: { lte: limiteInicio },
      horaFin: { gte: ahora },
    },
    include: { instalacion: { select: { id: true, nombre: true } } },
    orderBy: { horaInicio: "asc" },
  })

  if (!reserva) {
    return NextResponse.json(
      {
        error:
          "No tienes ninguna reserva activa en esta instalación en este momento. La asistencia solo puede confirmarse cerca de la hora de tu reserva.",
      },
      { status: 404, headers: CORS_HEADERS }
    )
  }

  const yaConfirmada = reserva.asistenciaConfirmada

  if (!yaConfirmada) {
    await prisma.reserva.update({
      where: { id: reserva.id },
      data: { asistenciaConfirmada: true, confirmadaEn: ahora, noShow: false },
    })
  }

  return NextResponse.json(
    {
      ok: true,
      yaConfirmada,
      reserva: {
        id: reserva.id,
        instalacion: reserva.instalacion,
        fecha: reserva.fecha.toISOString(),
        horaInicio: reserva.horaInicio.toISOString(),
        horaFin: reserva.horaFin.toISOString(),
      },
    },
    { status: 200, headers: CORS_HEADERS }
  )
}
