import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/verificar-email?token=xxx
 *
 * Endpoint público — verifica el email de un usuario mediante un token de un solo uso.
 * No requiere autenticación. El tenantId no es necesario porque el token es globalmente único.
 *
 * Respuestas:
 *   200 { ok: true }           — token válido, email verificado correctamente
 *   400 "Token inválido"       — token no encontrado en BD
 *   400 "El enlace ha caducado..." — token expirado
 */
export async function GET(request: NextRequest) {
  try {
    // Extraer el token del query string
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json(
        { error: "Token requerido" },
        { status: 400 }
      )
    }

    // Buscar usuario con ese token de verificación
    const usuario = await prisma.usuario.findFirst({
      where: { tokenVerificacion: token },
    })

    if (!usuario) {
      return NextResponse.json(
        { error: "Token inválido" },
        { status: 400 }
      )
    }

    // Comprobar si el token ha expirado
    const ahora = new Date()
    if (!usuario.tokenVerificacionExpira || usuario.tokenVerificacionExpira < ahora) {
      return NextResponse.json(
        { error: "El enlace ha caducado. Solicita uno nuevo." },
        { status: 400 }
      )
    }

    // Marcar el email como verificado y limpiar el token
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        emailVerificado: true,
        tokenVerificacion: null,
        tokenVerificacionExpira: null,
      },
    })

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    console.error("[verificar-email] Error:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
