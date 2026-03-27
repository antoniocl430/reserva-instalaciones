import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { opcionesAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { schemaActualizarTenantSuperadmin } from "@/lib/validaciones"

// PATCH /api/superadmin/tenants/[id] — actualiza nombre, municipio, estado de un tenant
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sesion = await getServerSession(opcionesAuth)
  if (!sesion || sesion.user.rol !== "SUPERADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const { id } = params

    // Verificar que el tenant existe
    const tenantExistente = await prisma.tenant.findUnique({ where: { id } })
    if (!tenantExistente) {
      return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 })
    }

    const body = await request.json()

    // Validar con Zod — slug es inmutable, no se acepta
    const validacion = schemaActualizarTenantSuperadmin.safeParse(body)
    if (!validacion.success) {
      return NextResponse.json(
        { error: "Datos inválidos", detalles: validacion.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { nombre, municipio, estado } = validacion.data
    const datosActualizacion: Record<string, string> = {}
    if (nombre !== undefined) datosActualizacion.nombre = nombre
    if (municipio !== undefined) datosActualizacion.municipio = municipio
    if (estado !== undefined) datosActualizacion.estado = estado

    const tenantActualizado = await prisma.tenant.update({
      where: { id },
      data: datosActualizacion,
    })

    return NextResponse.json({ tenant: tenantActualizado })
  } catch (err) {
    console.error("Error al actualizar tenant:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
