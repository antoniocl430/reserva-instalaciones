/**
 * POST /api/auth/mobile/registro
 * Registro de nuevos ciudadanos desde la app móvil Flutter.
 * Crea el usuario con rol CIUDADANO y devuelve un JWT Bearer token.
 *
 * Headers requeridos:
 *   Content-Type: application/json
 *   x-tenant-slug: <slug-del-municipio>
 *
 * Body:
 *   { nombre: string, email: string, password: string }
 *
 * Respuesta exitosa (201):
 *   { token: string, usuario: { id, nombre, email, rol, avatarUrl, noShows, suspendidoHasta } }
 *
 * Notas:
 *   - No se envía email de verificación (simplificado para mobile)
 *   - La contraseña se hashea con bcryptjs (salt rounds: 10)
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { crearTokenMovil } from '@/lib/jwt-mobile'

// ─── Cabeceras CORS para clientes móviles ────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-tenant-slug',
}

// ─── Validación de entrada ────────────────────────────────────────────────────

const schemaRegistroMovil = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email no válido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres'),
})

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
      return NextResponse.json(
        { error: 'El cuerpo de la petición no es JSON válido' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const resultado = schemaRegistroMovil.safeParse(body)
    if (!resultado.success) {
      const primerError = resultado.error.issues[0]
      return NextResponse.json(
        { error: primerError.message },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const { nombre, email, password } = resultado.data

    // Obtener slug del tenant desde el header
    const slugTenant = request.headers.get('x-tenant-slug')
    if (!slugTenant) {
      return NextResponse.json(
        { error: 'Falta el header x-tenant-slug' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    // Verificar que el tenant existe y está ACTIVO
    const tenant = await prisma.tenant.findFirst({
      where: { slug: slugTenant, estado: 'ACTIVO' },
    })

    if (!tenant) {
      return NextResponse.json(
        { error: 'Municipio no encontrado o no disponible' },
        { status: 404, headers: CORS_HEADERS }
      )
    }

    const emailNormalizado = email.toLowerCase().trim()

    // Verificar que el email no está ya registrado en este tenant
    const usuarioExistente = await prisma.usuario.findFirst({
      where: { email: emailNormalizado, tenantId: tenant.id },
    })

    if (usuarioExistente) {
      return NextResponse.json(
        { error: 'Este email ya está registrado en este municipio' },
        { status: 409, headers: CORS_HEADERS }
      )
    }

    // Hashear contraseña con salt rounds 10 (más rápido en mobile, suficientemente seguro)
    const passwordHash = await bcrypt.hash(password, 10)

    // Crear el usuario con rol CIUDADANO
    const usuario = await prisma.usuario.create({
      data: {
        tenantId: tenant.id,
        nombre: nombre.trim(),
        email: emailNormalizado,
        passwordHash,
        rol: 'CIUDADANO',
        activo: true,
      },
    })

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
      { status: 201, headers: CORS_HEADERS }
    )
  } catch (error) {
    console.error('[Mobile Registro] Error inesperado:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
