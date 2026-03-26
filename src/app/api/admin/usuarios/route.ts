import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import bcrypt from "bcryptjs"
import { opcionesAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { schemaCrearUsuarioAdmin } from "@/lib/validaciones"

// GET /api/admin/usuarios — lista todos los usuarios admin
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
    const usuarios = await prisma.usuario.findMany({
      where: { tenantId: sesion.user.tenantId, rol: "ADMIN" },
      select: {
        id: true,
        nombre: true,
        email: true,
        creadoEn: true,
      },
      orderBy: { creadoEn: "desc" },
    })

    return NextResponse.json({ usuarios })
  } catch (err) {
    console.error("Error al obtener usuarios admin:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// POST /api/admin/usuarios — crea un nuevo usuario admin
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
    const resultado = schemaCrearUsuarioAdmin.safeParse(body)
    if (!resultado.success) {
      const primerError = resultado.error.issues[0]
      return NextResponse.json(
        { error: primerError.message },
        { status: 400 }
      )
    }

    const { nombre, email, password } = resultado.data

    // Comprobar si el email ya está registrado en este tenant
    const usuarioExistente = await prisma.usuario.findFirst({
      where: { email: email.toLowerCase(), tenantId: sesion.user.tenantId },
    })

    if (usuarioExistente) {
      return NextResponse.json(
        { error: "Este email ya está registrado" },
        { status: 409 }
      )
    }

    // Hashear contraseña con coste 12
    const passwordHash = await bcrypt.hash(password, 12)

    // Crear el usuario con rol ADMIN en el tenant actual
    const usuario = await prisma.usuario.create({
      data: {
        tenantId: sesion.user.tenantId,
        nombre: nombre.trim(),
        email: email.toLowerCase(),
        passwordHash,
        rol: "ADMIN",
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        creadoEn: true,
      },
    })

    return NextResponse.json({ usuario }, { status: 201 })
  } catch (err) {
    console.error("Error al crear usuario admin:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
