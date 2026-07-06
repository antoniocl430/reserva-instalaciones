/**
 * API Route: GET /api/admin/valoraciones
 * Devuelve todas las valoraciones del tenant al ADMIN.
 *
 * Solo accesible por usuarios con rol ADMIN.
 * Incluye información de instalación y usuario para facilitar la revisión.
 */

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { opcionesAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(_request: NextRequest) {
  // Validar sesión y rol
  const sesion = await getServerSession(opcionesAuth)
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  if (sesion.user.rol !== "ADMIN") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const tenantId = sesion.user.tenantId!

  try {
    const valoraciones = await prisma.valoracion.findMany({
      where: { tenantId },
      include: {
        instalacion: { select: { nombre: true } },
        usuario: { select: { nombre: true, email: true } },
      },
      orderBy: { creadoEn: "desc" },
    })

    return NextResponse.json({ valoraciones })
  } catch (err) {
    console.error("Error al obtener valoraciones:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
