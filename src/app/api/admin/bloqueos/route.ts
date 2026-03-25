import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { opcionesAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { schemaCrearBloqueo } from "@/lib/validaciones"

// GET /api/admin/bloqueos — lista todos los bloqueos
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
    const bloqueos = await prisma.bloqueo.findMany({
      include: { instalacion: { select: { nombre: true } } },
      orderBy: { fechaInicio: "desc" },
    })

    return NextResponse.json({ bloqueos })
  } catch (err) {
    console.error("Error al obtener bloqueos:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// POST /api/admin/bloqueos — crea un bloqueo
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
    const resultado = schemaCrearBloqueo.safeParse(body)
    if (!resultado.success) {
      const primerError = resultado.error.issues[0]
      return NextResponse.json(
        { error: primerError.message },
        { status: 400 }
      )
    }

    const { instalacionId, fechaInicio, fechaFin, motivo } = resultado.data

    // Parsear fechas
    const fechaInicioDate = new Date(`${fechaInicio}T00:00:00.000Z`)
    const fechaFinDate = new Date(`${fechaFin}T23:59:59.999Z`)

    // Verificar que la instalación existe
    const instalacion = await prisma.instalacion.findUnique({
      where: { id: instalacionId },
    })

    if (!instalacion) {
      return NextResponse.json(
        { error: "Instalación no encontrada" },
        { status: 404 }
      )
    }

    // Crear el bloqueo
    const bloqueo = await prisma.bloqueo.create({
      data: {
        instalacionId,
        fechaInicio: fechaInicioDate,
        fechaFin: fechaFinDate,
        motivo: motivo?.trim() || "Sin especificar",
        creadoPorId: sesion.user.id,
        activo: true,
      },
      include: { instalacion: { select: { nombre: true } } },
    })

    return NextResponse.json({ bloqueo }, { status: 201 })
  } catch (err) {
    console.error("Error al crear bloqueo:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
