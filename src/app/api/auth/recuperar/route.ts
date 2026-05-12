import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { prisma } from "@/lib/prisma"
import { schemaSolicitarRecuperacion } from "@/lib/validaciones"
import { enviarEmailRecuperacion } from "@/lib/email"
import { obtenerTenantIdPorSlug } from "@/lib/tenant"

/**
 * POST /api/auth/recuperar
 * Solicita recuperación de contraseña: genera un token y envía email
 * Devuelve 200 siempre para no revelar si el email existe
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validar entrada con Zod
    const resultado = schemaSolicitarRecuperacion.safeParse(body)
    if (!resultado.success) {
      const primerError = resultado.error.issues[0]
      return NextResponse.json(
        { error: primerError.message },
        { status: 400 }
      )
    }

    const { email } = resultado.data
    const emailNormalizado = email.toLowerCase()

    // Resolver el tenant desde el header inyectado por el middleware
    const slugTenant = request.headers.get("x-tenant-slug") ?? "desarrollo"
    const tenantId = await obtenerTenantIdPorSlug(slugTenant)

    // Si no existe el tenant, devolver 200 igual (no revelar información)
    if (!tenantId) {
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    // Buscar usuario activo con ese email en este tenant
    const usuario = await prisma.usuario.findFirst({
      where: {
        email: emailNormalizado,
        tenantId,
        activo: true,
      },
    })

    // No revelar si el email existe — siempre devolver 200
    if (!usuario) {
      return NextResponse.json(
        { ok: true },
        { status: 200 }
      )
    }

    // Generar token único
    const token = randomUUID()

    // Guardar token en base de datos con expiración de 1 hora
    await prisma.tokenRecuperacion.create({
      data: {
        tenantId,
        token,
        usuarioId: usuario.id,
        expiraEn: new Date(Date.now() + 3600000), // 1 hora
      },
    })

    // Construir URL de reset
    const urlReset = `${process.env.NEXTAUTH_URL}/nueva-password?token=${token}`

    // Enviar email (no bloquea respuesta si falla)
    enviarEmailRecuperacion(usuario.email, usuario.nombre, urlReset).catch((error) => {
      console.error("[Email] Error al enviar email de recuperación:", error)
    })

    return NextResponse.json(
      { ok: true },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error en recuperación de contraseña:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
