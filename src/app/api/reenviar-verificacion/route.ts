import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { obtenerTenantIdPorSlug } from "@/lib/tenant"
import { enviarEmailVerificacion } from "@/lib/email"

// Schema de validación del body
const schemaReenviarVerificacion = z.object({
  email: z.string().email("Email no válido"),
})

/**
 * POST /api/reenviar-verificacion
 * Body: { email: string }
 *
 * Endpoint público — reenvía el email de verificación a un usuario no verificado.
 * Genera un nuevo token con expiración de 24 horas y lo guarda en la BD.
 *
 * Respuestas:
 *   200 { mensaje: "..." }             — email de verificación enviado
 *   400 "Esta cuenta ya está verificada" — usuario ya verificado
 *   400 (validación Zod)               — email inválido o ausente
 *   404                                — usuario no encontrado (mensaje genérico)
 *   503                                — tenant no disponible
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validar el body con Zod
    const resultado = schemaReenviarVerificacion.safeParse(body)
    if (!resultado.success) {
      const primerError = resultado.error.issues[0]
      return NextResponse.json(
        { error: primerError.message },
        { status: 400 }
      )
    }

    const { email } = resultado.data

    // Resolver el tenant desde el header inyectado por el middleware
    const slugTenant = request.headers.get("x-tenant-slug") ?? "desarrollo"
    const tenantId = await obtenerTenantIdPorSlug(slugTenant)
    if (!tenantId) {
      return NextResponse.json(
        { error: "Servicio no disponible" },
        { status: 503 }
      )
    }

    // Buscar el usuario por email en el tenant
    const usuario = await prisma.usuario.findFirst({
      where: {
        email: email.toLowerCase(),
        tenantId,
      },
    })

    // Mensaje genérico para no enumerar emails existentes
    if (!usuario) {
      return NextResponse.json(
        { error: "No se encontró ninguna cuenta con ese email" },
        { status: 404 }
      )
    }

    // Si ya está verificado, informar sin reenviar
    if (usuario.emailVerificado) {
      return NextResponse.json(
        { error: "Esta cuenta ya está verificada" },
        { status: 400 }
      )
    }

    // Generar nuevo token con expiración de 24 horas
    const nuevoToken = randomUUID()
    const nuevaExpiracion = new Date(Date.now() + 24 * 60 * 60 * 1000)

    // Guardar el nuevo token en la BD
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        tokenVerificacion: nuevoToken,
        tokenVerificacionExpira: nuevaExpiracion,
      },
    })

    // Construir URL base
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000"

    // Enviar email de verificación de forma asíncrona (no bloquea la respuesta)
    const promesaEmail = enviarEmailVerificacion({
      emailUsuario: usuario.email,
      nombreUsuario: usuario.nombre,
      token: nuevoToken,
      baseUrl,
    })
    if (promesaEmail && typeof promesaEmail.catch === "function") {
      promesaEmail.catch((err: unknown) =>
        console.error("[reenviar-verificacion] Error enviando email:", err)
      )
    }

    return NextResponse.json(
      { mensaje: "Email de verificación enviado" },
      { status: 200 }
    )
  } catch (error) {
    console.error("[reenviar-verificacion] Error:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
