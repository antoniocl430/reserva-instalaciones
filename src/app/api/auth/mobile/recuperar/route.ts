/**
 * POST /api/auth/mobile/recuperar
 * Solicita recuperación de contraseña desde la app móvil Flutter.
 *
 * Headers requeridos:
 *   Content-Type: application/json
 *   x-tenant-slug: <slug-del-municipio>
 *
 * Body:
 *   { email: string }
 *
 * Respuesta (siempre 200 — anti-enumeración):
 *   { mensaje: "Si el email existe recibirás un enlace" }
 *
 * Notas:
 *   - Siempre devuelve 200 independientemente de si el email existe o no.
 *   - Si el usuario existe, crea un TokenRecuperacion en BD y envía email.
 *   - El enlace de reset apunta a la web (NEXTAUTH_URL/nueva-password?token=...).
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { enviarEmailRecuperacion } from '@/lib/email'

// ─── Cabeceras CORS para clientes móviles ────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-tenant-slug',
}

// ─── Validación de entrada ────────────────────────────────────────────────────

const schemaRecuperar = z.object({
  email: z.string().email('Email no válido'),
})

// Respuesta genérica anti-enumeración
const RESPUESTA_GENERICA = { mensaje: 'Si el email existe recibirás un enlace' }

// ─── Handler OPTIONS — preflight CORS ────────────────────────────────────────

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

// ─── Handler POST ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // Leer y validar body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      // Incluso con JSON inválido devolvemos 200 para no revelar información
      return NextResponse.json(RESPUESTA_GENERICA, { status: 200, headers: CORS_HEADERS })
    }

    const resultado = schemaRecuperar.safeParse(body)
    if (!resultado.success) {
      // Devolver 200 incluso con email inválido (anti-enumeración)
      return NextResponse.json(RESPUESTA_GENERICA, { status: 200, headers: CORS_HEADERS })
    }

    const { email } = resultado.data
    const emailNormalizado = email.toLowerCase().trim()

    // Obtener slug del tenant desde el header
    const slugTenant = request.headers.get('x-tenant-slug')
    if (!slugTenant) {
      // Sin tenant tampoco revelamos nada
      return NextResponse.json(RESPUESTA_GENERICA, { status: 200, headers: CORS_HEADERS })
    }

    // Buscar el tenant (no filtramos por ACTIVO aquí — anti-enumeración)
    const tenant = await prisma.tenant.findFirst({
      where: { slug: slugTenant, estado: 'ACTIVO' },
    })

    if (!tenant) {
      return NextResponse.json(RESPUESTA_GENERICA, { status: 200, headers: CORS_HEADERS })
    }

    // Buscar usuario activo con ese email en este tenant
    const usuario = await prisma.usuario.findFirst({
      where: {
        email: emailNormalizado,
        tenantId: tenant.id,
        activo: true,
      },
    })

    // Si no existe el usuario, devolver 200 igualmente
    if (!usuario) {
      return NextResponse.json(RESPUESTA_GENERICA, { status: 200, headers: CORS_HEADERS })
    }

    // Generar token único de recuperación
    const token = randomUUID()

    // Guardar token en base de datos con expiración de 1 hora
    await prisma.tokenRecuperacion.create({
      data: {
        tenantId: tenant.id,
        token,
        usuarioId: usuario.id,
        expiraEn: new Date(Date.now() + 3600000), // 1 hora
      },
    })

    // Construir URL de reset (apunta a la web)
    const urlReset = `${process.env.NEXTAUTH_URL}/nueva-password?token=${token}`

    // Enviar email (no bloquea la respuesta si falla)
    enviarEmailRecuperacion(usuario.email, usuario.nombre, urlReset).catch((error) => {
      console.error('[Mobile Recuperar] Error al enviar email de recuperación:', error)
    })

    return NextResponse.json(RESPUESTA_GENERICA, { status: 200, headers: CORS_HEADERS })
  } catch (error) {
    console.error('[Mobile Recuperar] Error inesperado:', error)
    // Incluso ante error interno devolvemos 200 para no revelar información
    return NextResponse.json(RESPUESTA_GENERICA, { status: 200, headers: CORS_HEADERS })
  }
}
