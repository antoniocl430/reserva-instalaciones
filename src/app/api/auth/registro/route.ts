import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { randomUUID } from "crypto"
import { prisma } from "@/lib/prisma"
import { schemaRegistro } from "@/lib/validaciones"
import { obtenerTenantIdPorSlug } from "@/lib/tenant"
import { enviarEmailVerificacion } from "@/lib/email"

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

    // Extraer todos los campos validados — aceptaPrivacidad se persistirá como fecha RGPD
    const { nombre, email, password, aceptaPrivacidad } = resultado.data

    // Resolver el tenant desde el header inyectado por el middleware
    const slugTenant = request.headers.get("x-tenant-slug") ?? "desarrollo"
    const tenantId = await obtenerTenantIdPorSlug(slugTenant)
    if (!tenantId) {
      return NextResponse.json(
        { error: "Servicio no disponible" },
        { status: 503 }
      )
    }

    // Comprobar si el email ya está registrado en este tenant
    const usuarioExistente = await prisma.usuario.findFirst({
      where: { email: email.toLowerCase(), tenantId },
    })

    if (usuarioExistente) {
      return NextResponse.json(
        { error: "Este email ya está registrado" },
        { status: 409 }
      )
    }

    // Hashear contraseña con coste 12
    const passwordHash = await bcrypt.hash(password, 12)

    // Crear el usuario con rol CIUDADANO por defecto en el tenant actual
    // emailVerificado=false — el usuario debe verificar su email antes de poder iniciar sesión
    // aceptaPrivacidadEn registra el instante exacto de aceptación del consentimiento RGPD
    const usuario = await prisma.usuario.create({
      data: {
        tenantId,
        nombre: nombre.trim(),
        email: email.toLowerCase(),
        passwordHash,
        rol: "CIUDADANO",
        emailVerificado: false,
        aceptaPrivacidadEn: aceptaPrivacidad ? new Date() : null,
      },
    })

    // Generar token de verificación único con expiración de 24 horas
    const token = randomUUID()
    const tokenVerificacionExpira = new Date(Date.now() + 24 * 60 * 60 * 1000)

    // Guardar el token en la BD
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        tokenVerificacion: token,
        tokenVerificacionExpira,
      },
    })

    // Construir URL base (en producción desde NEXTAUTH_URL, en desarrollo localhost)
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000"

    // Enviar email de verificación de forma asíncrona (no bloquea la respuesta)
    const promesaEmail = enviarEmailVerificacion({
      emailUsuario: usuario.email,
      nombreUsuario: usuario.nombre,
      token,
      baseUrl,
    })
    if (promesaEmail && typeof promesaEmail.catch === "function") {
      promesaEmail.catch((err: unknown) =>
        console.error("[Registro] Error enviando email de verificación:", err)
      )
    }

    // Devolver mensaje de verificación — NO hacer signIn automático
    return NextResponse.json(
      { mensaje: "Revisa tu email para verificar tu cuenta" },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error al registrar usuario:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
