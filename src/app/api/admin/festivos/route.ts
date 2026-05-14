import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { schemaCrearFestivo } from "@/lib/validaciones"

export async function GET(req: NextRequest) {
  const sesion = await getServerSession(authOptions)
  if (!sesion) return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  if (sesion.user.rol !== "ADMIN") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const añoParam = searchParams.get("año")

  const where: Record<string, unknown> = { tenantId: sesion.user.tenantId }

  if (añoParam) {
    const año = parseInt(añoParam)
    if (!isNaN(año)) {
      where.fecha = {
        gte: new Date(`${año}-01-01T00:00:00.000Z`),
        lte: new Date(`${año}-12-31T23:59:59.999Z`),
      }
    }
  }

  const festivos = await prisma.festivo.findMany({
    where,
    orderBy: { fecha: "asc" },
  })

  return NextResponse.json({ festivos })
}

export async function POST(req: NextRequest) {
  const sesion = await getServerSession(authOptions)
  if (!sesion) return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  if (sesion.user.rol !== "ADMIN") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const resultado = schemaCrearFestivo.safeParse(body)
  if (!resultado.success) {
    return NextResponse.json({ error: "Datos inválidos", detalles: resultado.error.flatten() }, { status: 400 })
  }

  const { fecha, nombre, repetirAnual } = resultado.data

  try {
    const festivo = await prisma.festivo.create({
      data: {
        tenantId: sesion.user.tenantId!,
        fecha: new Date(`${fecha}T00:00:00.000Z`),
        nombre,
        repetirAnual: repetirAnual ?? false,
      },
    })
    return NextResponse.json({ festivo }, { status: 201 })
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Ya existe un festivo en esa fecha" }, { status: 409 })
    }
    throw error
  }
}
