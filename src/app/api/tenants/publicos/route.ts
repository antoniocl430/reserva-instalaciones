/**
 * GET /api/tenants/publicos
 * Devuelve la lista de todos los tenants activos para el selector de municipio
 * de la app móvil Flutter. No requiere autenticación.
 *
 * Respuesta (200):
 *   [{ id, slug, nombre, municipio, logoUrl }]
 *   Ordenados alfabéticamente por nombre.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// ─── Cabeceras CORS para clientes móviles ────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// ─── Handler OPTIONS — preflight CORS ────────────────────────────────────────

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

// ─── Handler GET ──────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const tenants = await prisma.tenant.findMany({
      where: { estado: 'ACTIVO' },
      select: {
        id: true,
        slug: true,
        nombre: true,
        municipio: true,
        logoUrl: true,
      },
      orderBy: { nombre: 'asc' },
    })

    return NextResponse.json(tenants, { status: 200, headers: CORS_HEADERS })
  } catch (error) {
    console.error('[Tenants Públicos] Error al obtener tenants:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
