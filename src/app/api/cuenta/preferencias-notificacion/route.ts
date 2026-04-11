/**
 * API Route: GET/PATCH /api/cuenta/preferencias-notificacion
 *
 * Permite a los usuarios autenticados (CIUDADANO) obtener y actualizar
 * sus preferencias de notificación.
 *
 * Reglas de negocio:
 *   - Solo CIUDADANO puede acceder (no ADMIN)
 *   - GET devuelve preferencias del usuario (o valores por defecto)
 *   - PATCH hace upsert: crea o actualiza las preferencias del usuario
 */

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { prisma } from "@/lib/prisma"
import { opcionesAuth } from "@/lib/auth"
import { schemaPreferenciasNotificacion } from "@/lib/validaciones"

// ─── Valores por defecto para preferencias de notificación ─────────────────

const PREFERENCIAS_DEFECTO = {
  notificacionesEmail: true,
  notificacionesPush: true,
  recordatorioReserva: true,
  recordatorioCancel: true,
  notificacionesAviso: true,
}

// ─── GET /api/cuenta/preferencias-notificacion ────────────────────────────

export async function GET(request: NextRequest) {
  try {
    // Validar sesión
    const sesion = await getServerSession(opcionesAuth)
    if (!sesion) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      )
    }

    // Validar rol: solo CIUDADANO
    if (sesion.user.rol !== "CIUDADANO") {
      return NextResponse.json(
        { error: "No tienes permiso para acceder a este recurso" },
        { status: 403 }
      )
    }

    // Obtener preferencias del usuario
    const preferencias = await prisma.preferenciaNotificacion.findUnique({
      where: { usuarioId: sesion.user.id },
    })

    // Si no existen, devolver con valores por defecto
    if (!preferencias) {
      return NextResponse.json(
        {
          usuarioId: sesion.user.id,
          ...PREFERENCIAS_DEFECTO,
        },
        { status: 200 }
      )
    }

    return NextResponse.json(preferencias, { status: 200 })
  } catch (error) {
    console.error("[GET /api/cuenta/preferencias-notificacion]", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// ─── PATCH /api/cuenta/preferencias-notificacion ───────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    // Validar sesión
    const sesion = await getServerSession(opcionesAuth)
    if (!sesion) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      )
    }

    // Validar rol: solo CIUDADANO
    if (sesion.user.rol !== "CIUDADANO") {
      return NextResponse.json(
        { error: "No tienes permiso para acceder a este recurso" },
        { status: 403 }
      )
    }

    // Parsear y validar el body
    const body = await request.json()
    const validacion = schemaPreferenciasNotificacion.safeParse(body)

    if (!validacion.success) {
      return NextResponse.json(
        {
          error: "Datos inválidos",
          detalles: validacion.error.errors,
        },
        { status: 400 }
      )
    }

    // Hacer upsert de las preferencias
    // En update: solo actualizar los campos que se enviaron (partial update)
    // En create: valores enviados + valores por defecto
    const camposActualizar = Object.fromEntries(
      Object.entries(validacion.data).filter(([, valor]) => valor !== undefined)
    )

    const preferenciasActualizadas = await prisma.preferenciaNotificacion.upsert({
      where: { usuarioId: sesion.user.id },
      update: camposActualizar,
      create: {
        usuarioId: sesion.user.id,
        tenantId: sesion.user.tenantId,
        ...PREFERENCIAS_DEFECTO,
        ...validacion.data,
      },
    })

    return NextResponse.json(preferenciasActualizadas, { status: 200 })
  } catch (error) {
    console.error("[PATCH /api/cuenta/preferencias-notificacion]", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
