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

    // Obtener preferencias del usuario (puede haber múltiples, una por tipoAlerta)
    const preferenciasDB = await prisma.preferenciaNotificacion.findMany({
      where: { usuarioId: sesion.user.id, tenantId: sesion.user.tenantId },
    })

    // Consolidar en un objeto: tipoAlerta → activa
    const preferenciasConsolidadas: Record<string, boolean> = {
      recordatorioReserva: true,
      cancelacionPropia: true,
      cancelacionAdmin: true,
    }

    preferenciasDB.forEach((pref) => {
      const tipoMap: Record<string, string> = {
        'RECORDATORIO_RESERVA': 'recordatorioReserva',
        'CANCELACION_PROPIA': 'cancelacionPropia',
        'CANCELACION_ADMIN': 'cancelacionAdmin',
      }
      const campoLocal = tipoMap[pref.tipoAlerta]
      if (campoLocal) {
        preferenciasConsolidadas[campoLocal] = pref.activa
      }
    })

    return NextResponse.json(preferenciasConsolidadas, { status: 200 })
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

    // Hacer upsert de cada preferencia por tipoAlerta
    const tipoMap: Record<string, string> = {
      'recordatorioReserva': 'RECORDATORIO_RESERVA',
      'cancelacionPropia': 'CANCELACION_PROPIA',
      'cancelacionAdmin': 'CANCELACION_ADMIN',
    }

    // Actualizar cada preferencia que se envió en validacion.data
    for (const [campo, activa] of Object.entries(validacion.data)) {
      if (activa !== undefined) {
        const tipoAlerta = tipoMap[campo]
        if (tipoAlerta) {
          await prisma.preferenciaNotificacion.upsert({
            where: {
              usuarioId_tenantId_tipoAlerta: {
                usuarioId: sesion.user.id,
                tenantId: sesion.user.tenantId,
                tipoAlerta,
              },
            },
            update: { activa: activa === true },
            create: {
              usuarioId: sesion.user.id,
              tenantId: sesion.user.tenantId,
              tipoAlerta,
              activa: activa === true,
            },
          })
        }
      }
    }

    // Devolver las preferencias consolidadas (como en GET)
    const preferenciasActualizadas = await prisma.preferenciaNotificacion.findMany({
      where: { usuarioId: sesion.user.id, tenantId: sesion.user.tenantId },
    })

    const resultado: Record<string, boolean> = {
      recordatorioReserva: true,
      cancelacionPropia: true,
      cancelacionAdmin: true,
    }

    preferenciasActualizadas.forEach((pref) => {
      const campoLocal = Object.entries(tipoMap).find(([_, tipo]) => tipo === pref.tipoAlerta)?.[0]
      if (campoLocal) {
        resultado[campoLocal] = pref.activa
      }
    })

    return NextResponse.json(resultado, { status: 200 })
  } catch (error) {
    console.error("[PATCH /api/cuenta/preferencias-notificacion]", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
