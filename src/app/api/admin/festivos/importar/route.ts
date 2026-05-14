import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { obtenerFestivosNacionales } from "@/lib/festivos-nacionales"

export async function POST(req: NextRequest) {
  const sesion = await getServerSession(authOptions)
  if (!sesion) return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  if (sesion.user.rol !== "ADMIN") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const año = body?.año

  if (typeof año !== "number" || isNaN(año) || año < 2000 || año > 2100) {
    return NextResponse.json({ error: "Se debe proporcionar un año válido" }, { status: 400 })
  }

  const festivosNacionales = obtenerFestivosNacionales(año)
  const tenantId = sesion.user.tenantId!

  let importados = 0
  for (const { fecha, nombre } of festivosNacionales) {
    await prisma.festivo.upsert({
      where: { tenantId_fecha: { tenantId, fecha: new Date(`${fecha}T00:00:00.000Z`) } },
      update: {},
      create: {
        tenantId,
        fecha: new Date(`${fecha}T00:00:00.000Z`),
        nombre,
        repetirAnual: true,
      },
    })
    importados++
  }

  return NextResponse.json({ ok: true, importados, año })
}
