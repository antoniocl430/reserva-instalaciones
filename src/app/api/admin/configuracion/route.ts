/**
 * Endpoint de configuración del tenant
 *
 * GET  /api/admin/configuracion  — devuelve la configuración completa del tenant actual
 * PATCH /api/admin/configuracion — actualiza campos del tenant con merge profundo en configuracion
 *
 * Acceso: solo ADMIN
 */

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { opcionesAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { schemaActualizarTenant } from "@/lib/validaciones"
import { parsearConfiguracion, mergearConfiguracion } from "@/lib/tenant"

// ─── GET /api/admin/configuracion ─────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // 1. Validar sesión
  const sesion = await getServerSession(opcionesAuth)
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  // 2. Validar rol ADMIN
  if (sesion.user.rol !== "ADMIN") {
    return NextResponse.json(
      { error: "No tienes permiso para acceder a esta ruta" },
      { status: 403 }
    )
  }

  try {
    // 3. Obtener el tenant del admin autenticado
    const tenant = await prisma.tenant.findUnique({
      where: { id: sesion.user.tenantId },
    })

    if (!tenant) {
      console.error(
        `Tenant no encontrado para el admin ${sesion.user.id} (tenantId=${sesion.user.tenantId})`
      )
      return NextResponse.json(
        { error: "Error interno: tenant no encontrado" },
        { status: 500 }
      )
    }

    // 4. Parsear el campo configuracion (JSON string → objeto)
    const configuracionParseada = parsearConfiguracion(tenant.configuracion)

    return NextResponse.json({
      id: tenant.id,
      slug: tenant.slug,
      nombre: tenant.nombre,
      municipio: tenant.municipio,
      logoUrl: tenant.logoUrl,
      configuracion: configuracionParseada,
      estado: tenant.estado,
    })
  } catch (err) {
    console.error("Error al obtener configuración del tenant:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// ─── PATCH /api/admin/configuracion ───────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  // 1. Validar sesión
  const sesion = await getServerSession(opcionesAuth)
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  // 2. Validar rol ADMIN
  if (sesion.user.rol !== "ADMIN") {
    return NextResponse.json(
      { error: "No tienes permiso para acceder a esta ruta" },
      { status: 403 }
    )
  }

  // 3. Parsear y validar el body con Zod
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 })
  }

  const resultado = schemaActualizarTenant.safeParse(body)
  if (!resultado.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalles: resultado.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const datos = resultado.data

  try {
    // 4. Obtener la configuración actual del tenant para hacer merge profundo
    const tenantActual = await prisma.tenant.findUnique({
      where: { id: sesion.user.tenantId },
    })

    if (!tenantActual) {
      console.error(
        `Tenant no encontrado para el admin ${sesion.user.id} (tenantId=${sesion.user.tenantId})`
      )
      return NextResponse.json(
        { error: "Error interno: tenant no encontrado" },
        { status: 500 }
      )
    }

    // 5. Calcular la nueva configuracion con merge profundo
    let configuracionFinal: string | undefined
    if (datos.configuracion !== undefined) {
      const configuracionBase = parsearConfiguracion(tenantActual.configuracion)
      const configuracionMergeada = mergearConfiguracion(configuracionBase, datos.configuracion)
      configuracionFinal = JSON.stringify(configuracionMergeada)
    }

    // 6. Construir el objeto de actualización
    // Nunca se incluyen slug ni estado — están excluidos del schema de entrada
    const datosActualizacion: {
      nombre?: string
      municipio?: string
      logoUrl?: string | null
      configuracion?: string
    } = {}

    if (datos.nombre !== undefined) datosActualizacion.nombre = datos.nombre
    if (datos.municipio !== undefined) datosActualizacion.municipio = datos.municipio
    if ("logoUrl" in datos) datosActualizacion.logoUrl = datos.logoUrl ?? null
    if (configuracionFinal !== undefined) datosActualizacion.configuracion = configuracionFinal

    // 7. Actualizar el tenant en BD
    const tenantActualizado = await prisma.tenant.update({
      where: { id: sesion.user.tenantId },
      data: datosActualizacion,
    })

    // 8. Devolver el tenant actualizado con la configuracion parseada
    const configuracionParseada = parsearConfiguracion(tenantActualizado.configuracion)

    return NextResponse.json({
      id: tenantActualizado.id,
      slug: tenantActualizado.slug,
      nombre: tenantActualizado.nombre,
      municipio: tenantActualizado.municipio,
      logoUrl: tenantActualizado.logoUrl,
      configuracion: configuracionParseada,
      estado: tenantActualizado.estado,
    })
  } catch (err) {
    console.error("Error al actualizar configuración del tenant:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
