import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"

import { opcionesAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const sesion = await getServerSession(opcionesAuth)
  if (!sesion) return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  if (sesion.user.rol !== "ADMIN") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })

  const festivo = await prisma.festivo.findFirst({
    where: { id: params.id, tenantId: sesion.user.tenantId! },
  })

  if (!festivo) {
    return NextResponse.json({ error: "Festivo no encontrado" }, { status: 404 })
  }

  await prisma.festivo.delete({ where: { id: params.id } })

  return NextResponse.json({ ok: true, mensaje: "Festivo eliminado correctamente" })
}
