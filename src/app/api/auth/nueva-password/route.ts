import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { schemaResetearPassword } from "@/lib/validaciones"
import { obtenerTenantIdPorSlug } from "@/lib/tenant"

/**
 * POST /api/auth/nueva-password
 * Resetea la contraseña usando un token válido y no expirado.
 *
 * Seguridad multi-tenant: el token se valida contra el tenant del request (x-tenant-slug),
 * evitando que un token emitido por el tenant A sea usado en el tenant B.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validar entrada con Zod
    const resultado = schemaResetearPassword.safeParse(body)
    if (!resultado.success) {
      const primerError = resultado.error.issues[0]
      return NextResponse.json(
        { error: primerError.message },
        { status: 400 }
      )
    }

    const { token, password } = resultado.data

    // Resolver el tenant desde el header inyectado por el middleware
    const slugTenant = request.headers.get("x-tenant-slug") ?? "desarrollo"
    const tenantId = await obtenerTenantIdPorSlug(slugTenant)

    // Si el tenant no existe, el token nunca puede ser válido
    if (!tenantId) {
      return NextResponse.json(
        { error: "Token inválido" },
        { status: 400 }
      )
    }

    // Buscar token en base de datos filtrando también por tenantId
    // Esto evita que un token del tenant B sea usado en el tenant A
    const tokenRecuperacion = await prisma.tokenRecuperacion.findFirst({
      where: { token, tenantId },
      include: { usuario: true },
    })

    // Token no existe (o pertenece a otro tenant)
    if (!tokenRecuperacion) {
      return NextResponse.json(
        { error: "Token inválido" },
        { status: 400 }
      )
    }

    // Token ya fue utilizado
    if (tokenRecuperacion.usado) {
      return NextResponse.json(
        { error: "Este enlace ya fue utilizado" },
        { status: 400 }
      )
    }

    // Token expirado
    if (tokenRecuperacion.expiraEn < new Date()) {
      return NextResponse.json(
        { error: "El enlace ha expirado" },
        { status: 400 }
      )
    }

    // Hashear nueva contraseña
    const passwordHash = await bcrypt.hash(password, 12)

    // Actualizar contraseña y marcar token como usado en transacción
    await prisma.$transaction([
      prisma.usuario.update({
        where: { id: tokenRecuperacion.usuario.id },
        data: { passwordHash },
      }),
      prisma.tokenRecuperacion.update({
        where: { id: tokenRecuperacion.id },
        data: { usado: true },
      }),
    ])

    return NextResponse.json(
      { ok: true },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error al resetear contraseña:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
