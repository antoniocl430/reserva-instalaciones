import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { opcionesAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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

    // Construir datos de actualizacion — slug es inmutable, se ignora
    const datosActualizacion: Record<string, string> = {}
    if (body.nombre !== undefined) datosActualizacion.nombre = body.nombre
    if (body.municipio !== undefined) datosActualizacion.municipio = body.municipio
    if (body.estado !== undefined) {
      if (body.estado !== "ACTIVO" && body.estado !== "SUSPENDIDO") {
        return NextResponse.json(
          { error: "El estado debe ser ACTIVO o SUSPENDIDO" },
          { status: 400 }
        )
      }
      datosActualizacion.estado = body.estado
    }
    // slug se ignora intencionalmente (inmutable)

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
