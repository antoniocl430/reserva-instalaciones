/**
 * API Route: /api/admin/comunicados
 * Gestión de comunicados masivos — solo accesible por ADMIN
 *
 * GET  — lista todos los comunicados del tenant, ordenados por enviadoEn desc
 * POST — crea un comunicado y lo envía por el canal indicado (EMAIL | PUSH | AMBOS)
 */

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"

import { opcionesAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { enviarEmailComunicadoMasivo } from "@/lib/email"
import { enviarPushComunicadoMasivo } from "@/lib/push"

// Esquema de validación para crear un comunicado
const schemaCrearComunicado = z.object({
  titulo: z.string().min(1).max(100),
  cuerpo: z.string().min(1).max(1000),
  canal: z.enum(["EMAIL", "PUSH", "AMBOS"]),
})

// ─── GET /api/admin/comunicados ───────────────────────────────────────────────

export async function GET(_request: NextRequest) {
  // Validar sesión y rol
  const sesion = await getServerSession(opcionesAuth)
  if (!sesion) return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  if (sesion.user.rol !== "ADMIN") return NextResponse.json({ error: "Sin permisos" }, { status: 403 })

  const tenantId = sesion.user.tenantId!

  const comunicados = await prisma.comunicado.findMany({
    where: { tenantId },
    orderBy: { enviadoEn: "desc" },
  })

  return NextResponse.json({ comunicados })
}

// ─── POST /api/admin/comunicados ──────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Validar sesión y rol
  const sesion = await getServerSession(opcionesAuth)
  if (!sesion) return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  if (sesion.user.rol !== "ADMIN") return NextResponse.json({ error: "Sin permisos" }, { status: 403 })

  // Validar body
  const body = await request.json()
  const validacion = schemaCrearComunicado.safeParse(body)
  if (!validacion.success) {
    return NextResponse.json({ error: validacion.error.errors }, { status: 400 })
  }

  const { titulo, cuerpo, canal } = validacion.data
  const tenantId = sesion.user.tenantId!

  let emailsEnviados = 0
  let pushEnviados = 0

  // Obtener config del tenant para el nombre del servicio
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { nombre: true },
  })
  const nombreServicio = tenant?.nombre ?? "Ayuntamiento"

  if (canal === "EMAIL" || canal === "AMBOS") {
    // Obtener ciudadanos activos con email y preferencias
    const ciudadanos = await prisma.usuario.findMany({
      where: { tenantId, rol: "CIUDADANO", activo: true },
      select: {
        email: true,
        preferenciaNotificaciones: {
          select: { notificacionesEmail: true, notificacionesAviso: true },
        },
      },
    })

    // Filtrar por preferencias: sin registro → incluir por defecto
    const emails = ciudadanos
      .filter((u) => {
        const pref = u.preferenciaNotificaciones[0]
        if (!pref) return true
        return pref.notificacionesEmail !== false && pref.notificacionesAviso !== false
      })
      .map((u) => u.email)

    emailsEnviados = await enviarEmailComunicadoMasivo({ emails, titulo, cuerpo, nombreServicio })
  }

  if (canal === "PUSH" || canal === "AMBOS") {
    pushEnviados = await enviarPushComunicadoMasivo({ tenantId, titulo, cuerpo })
  }

  // Guardar el comunicado en BD
  const comunicado = await prisma.comunicado.create({
    data: { tenantId, titulo, cuerpo, canal },
  })

  return NextResponse.json(
    { comunicado, enviados: { email: emailsEnviados, push: pushEnviados } },
    { status: 201 }
  )
}
