import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { schemaRegistro } from "@/lib/validaciones"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validar entrada con Zod
    const resultado = schemaRegistro.safeParse(body)
    if (!resultado.success) {
      const primerError = resultado.error.issues[0]
      return NextResponse.json(
        { error: primerError.message },
        { status: 400 }
      )
    }

    const { nombre, email, password } = resultado.data

    // Comprobar si el email ya está registrado
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (usuarioExistente) {
      return NextResponse.json(
        { error: "Este email ya está registrado" },
        { status: 409 }
      )
    }

    // Hashear contraseña con coste 12
    const passwordHash = await bcrypt.hash(password, 12)

    // Crear el usuario con rol CIUDADANO por defecto
    const usuario = await prisma.usuario.create({
      data: {
        nombre: nombre.trim(),
        email: email.toLowerCase(),
        passwordHash,
        rol: "CIUDADANO",
      },
    })

    return NextResponse.json({ ok: true, email: usuario.email }, { status: 201 })
  } catch (error) {
    console.error("Error al registrar usuario:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
