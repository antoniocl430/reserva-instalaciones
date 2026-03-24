import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

// Regex simple para validar formato de email
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nombre, email, password } = body

    // Validar que los campos existen y no están vacíos
    if (!nombre?.trim() || !email?.trim() || !password?.trim()) {
      return NextResponse.json(
        { error: "Los campos nombre, email y contraseña son obligatorios" },
        { status: 400 }
      )
    }

    // Validar formato de email
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: "El formato del email no es válido" },
        { status: 400 }
      )
    }

    // Validar longitud mínima de contraseña
    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      )
    }

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
