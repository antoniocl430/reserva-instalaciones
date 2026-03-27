import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { opcionesAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { schemaCrearPistaAdmin } from "@/lib/validaciones"

// GET /api/admin/pistas — lista todas las instalaciones (activas e inactivas)
export async function GET(request: NextRequest) {
  const sesion = await getServerSession(opcionesAuth)
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  if (sesion.user.rol !== "ADMIN") {
    return NextResponse.json(
      { error: "No tienes permiso para acceder a esta ruta" },
      { status: 403 }
    )
  }

  try {
    const instalaciones = await prisma.instalacion.findMany({
      where: { tenantId: sesion.user.tenantId },
      orderBy: { nombre: "asc" },
    })

    return NextResponse.json({ instalaciones })
  } catch (err) {
    console.error("Error al obtener instalaciones:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// POST /api/admin/pistas — crea una nueva instalación
export async function POST(request: NextRequest) {
  const sesion = await getServerSession(opcionesAuth)
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  if (sesion.user.rol !== "ADMIN") {
    return NextResponse.json(
      { error: "No tienes permiso para acceder a esta ruta" },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()

    // Validar entrada con Zod
    const resultado = schemaCrearPistaAdmin.safeParse(body)
    if (!resultado.success) {
      const primerError = resultado.error.issues[0]
      return NextResponse.json(
        { error: primerError.message },
        { status: 400 }
      )
    }

    const { nombre, tipo, descripcion, horario } = resultado.data

    // Verificar que el nombre no exista ya dentro del mismo tenant
    const existente = await prisma.instalacion.findFirst({
      where: { nombre: nombre.trim(), tenantId: sesion.user.tenantId },
    })

    if (existente) {
      return NextResponse.json(
        { error: "Ya existe una instalación con ese nombre" },
        { status: 409 }
      )
    }

    const instalacion = await prisma.instalacion.create({
      data: {
        tenantId: sesion.user.tenantId!,
        nombre: nombre.trim(),
        tipo,
        descripcion: descripcion?.trim() || null,
        horario: horario?.trim() || "Lun-Dom: 8:00-13:00 y 16:45-20:30",
        activa: true,
      },
    })

    return NextResponse.json({ instalacion }, { status: 201 })
  } catch (err) {
    console.error("Error al crear instalación:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
