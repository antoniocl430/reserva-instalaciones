/**
 * POST /api/auth/mobile/login
 * Login para la app móvil Flutter mediante JWT Bearer token.
 * Solo permite acceso a usuarios con rol CIUDADANO.
 *
 * Headers requeridos:
 *   Content-Type: application/json
 *   x-tenant-slug: <slug-del-municipio>
 *
 * Body:
 *   { email: string, password: string }
 *
 * Respuesta exitosa (200):
 *   { token: string, usuario: { id, nombre, email, rol, avatarUrl, noShows, suspendidoHasta } }
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { crearTokenMovil } from '@/lib/jwt-mobile'
import { verificarRateLimit, resetearRateLimit } from '@/lib/rate-limit'

// ─── Cabeceras CORS para clientes móviles ────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-tenant-slug',
}

// ─── Validación de entrada ────────────────────────────────────────────────────

const schemaLogin = z.object({
  email: z.string().email('Email no válido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
})

// Hash dummy para evitar timing attack (igual que en auth.ts)
const HASH_DUMMY = '$2a$12$dummy.hash.para.evitar.timing.attack.en.login.movil'

// ─── Handler OPTIONS — preflight CORS ────────────────────────────────────────

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

// ─── Handler POST ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // Extraer IP para rate limiting
    const ip =
      request.headers.get('cf-connecting-ip') ??
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
      request.headers.get('x-real-ip') ??
      'unknown'

    // Verificar rate limiting: máximo 5 intentos fallidos en 15 minutos
    const { bloqueado } = verificarRateLimit(ip, 5, 15 * 60 * 1000)
    if (bloqueado) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Inténtalo de nuevo en 15 minutos.' },
        { status: 429, headers: CORS_HEADERS }
      )
    }

    // Leer y validar body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'El cuerpo de la petición no es JSON válido' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const resultado = schemaLogin.safeParse(body)
    if (!resultado.success) {
      const primerError = resultado.error.issues[0]
      return NextResponse.json(
        { error: primerError.message },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const { email, password } = resultado.data

    // Limitar longitud de contraseña para evitar DoS (bcrypt procesa 72 bytes)
    if (password.length > 72) {
      return NextResponse.json(
        { error: 'Credenciales incorrectas' },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    // Obtener slug del tenant desde el header
    const slugTenant = request.headers.get('x-tenant-slug')
    if (!slugTenant) {
      return NextResponse.json(
        { error: 'Falta el header x-tenant-slug' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    // Buscar el tenant en BD
    const tenant = await prisma.tenant.findFirst({
      where: { slug: slugTenant, estado: 'ACTIVO' },
    })

    if (!tenant) {
      return NextResponse.json(
        { error: 'Municipio no encontrado' },
        { status: 404, headers: CORS_HEADERS }
      )
    }

    // Buscar usuario por email + tenantId con rol CIUDADANO
    const usuario = await prisma.usuario.findFirst({
      where: {
        email: email.toLowerCase().trim(),
        tenantId: tenant.id,
        rol: 'CIUDADANO',
      },
    })

    // Siempre ejecutar bcrypt para igualar tiempos y prevenir enumeración de emails
    const hashComparar = usuario?.passwordHash ?? HASH_DUMMY
    const passwordValida = await bcrypt.compare(password, hashComparar)

    if (!usuario || !passwordValida) {
      return NextResponse.json(
        { error: 'Credenciales incorrectas' },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    // Verificar que la cuenta está activa
    if (!usuario.activo) {
      return NextResponse.json(
        { error: 'Credenciales incorrectas' },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    // Login exitoso: resetear rate limit
    resetearRateLimit(ip)

    // Generar token JWT para móvil
    const token = await crearTokenMovil({
      sub: usuario.id,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      rol: usuario.rol,
      email: usuario.email,
      nombre: usuario.nombre,
    })

    return NextResponse.json(
      {
        token,
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          email: usuario.email,
          rol: usuario.rol,
          avatarUrl: usuario.avatarUrl ?? null,
          noShows: null,
          suspendidoHasta: null,
        },
      },
      { status: 200, headers: CORS_HEADERS }
    )
  } catch (error) {
    console.error('[Mobile Login] Error inesperado:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
