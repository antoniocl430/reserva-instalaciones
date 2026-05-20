/**
 * API Routes: GET /api/avisos — POST /api/avisos
 *
 * GET  — ruta pública: devuelve todos los avisos activos del tenant ordenados por fecha desc
 * POST — solo ADMIN: crea un nuevo aviso en el tablón de anuncios del tenant
 */

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { opcionesAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { schemaCrearAviso } from "@/lib/validaciones"
import { extraerSlugDelHost, obtenerTenantIdPorSlug } from "@/lib/tenant"

// Resuelve el tenantId desde x-tenant-slug (inyectado por el middleware) o el host.
// NO se acepta x-tenant-id desde el cliente — podría usarse para acceder a datos de otro tenant.
async function resolverTenantId(request: NextRequest): Promise<string | null> {
  const slug =
    request.headers.get("x-tenant-slug") ??
    extraerSlugDelHost(request.headers.get("host") ?? "")
  return obtenerTenantIdPorSlug(slug)
}

// ─── GET /api/avisos ─────────────────────────────────────────────────────────
// Ruta pública — no requiere autenticación.
// El tenantId se obtiene del header x-tenant-id inyectado por el middleware.
// Parámetro opcional: ?todos=true — solo accesible por ADMIN, devuelve todos (activos e inactivos).

export async function GET(request: NextRequest): Promise<NextResponse> {
  const tenantId = await resolverTenantId(request)

  if (!tenantId) {
    return NextResponse.json({ error: "Tenant no identificado" }, { status: 400 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const pedidosTodos = searchParams.get("todos") === "true"

    // Si el cliente pide todos los avisos, verificar que es ADMIN
    // El admin ve todos los avisos (activos e inactivos, incluidos los caducados)
    if (pedidosTodos) {
      const sesion = await getServerSession(opcionesAuth)
      if (sesion?.user.rol === "ADMIN") {
        const avisos = await prisma.aviso.findMany({
          where: { tenantId },
          orderBy: { fecha: "desc" },
        })
        return NextResponse.json(avisos, { status: 200 })
      }
      // Si no es admin, ignoramos el parámetro y aplicamos los filtros normales
    }

    // Ruta pública: solo avisos activos y no caducados.
    // Un aviso es visible si:
    //   - activo === true
    //   - Y (caducaEn es null          →  sin fecha de expiración, siempre visible)
    //     O (caducaEn >= hoy 00:00 UTC →  caduca hoy o más adelante, aún visible)
    // Comparamos contra el inicio del día UTC para que caducaEn = "3 abril" sea
    // visible todo el día 3 y desaparezca a partir del 4.
    const inicioDia = new Date()
    inicioDia.setUTCHours(0, 0, 0, 0)
    const avisos = await prisma.aviso.findMany({
      where: {
        tenantId,
        activo: true,
        OR: [
          { caducaEn: null },
          { caducaEn: { gte: inicioDia } },
        ],
      },
      orderBy: { fecha: "desc" },
    })

    return NextResponse.json(avisos, { status: 200 })
  } catch (error) {
    console.error("[GET /api/avisos] Error:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// ─── POST /api/avisos ────────────────────────────────────────────────────────
// Solo ADMIN — el tenantId viene de la sesión (ya validado por NextAuth)

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Verificar sesión
  const sesion = await getServerSession(opcionesAuth)
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  // 2. Verificar rol ADMIN
  if (sesion.user.rol !== "ADMIN") {
    return NextResponse.json(
      { error: "No tienes permiso para realizar esta acción" },
      { status: 403 }
    )
  }

  try {
    // 3. Parsear y validar el cuerpo
    const cuerpo = await request.json()
    const resultado = schemaCrearAviso.safeParse(cuerpo)

    if (!resultado.success) {
      return NextResponse.json(
        { error: resultado.error.issues[0].message },
        { status: 400 }
      )
    }

    const { titulo, descripcion, tipo, fecha, caducaEn } = resultado.data

    // 4. Crear el aviso en el tenant del admin autenticado
    const aviso = await prisma.aviso.create({
      data: {
        tenantId: sesion.user.tenantId!,
        titulo,
        descripcion,
        tipo,
        fecha: new Date(fecha),
        // caducaEn: null/undefined → no se establece (Prisma almacena null)
        ...(caducaEn != null ? { caducaEn: new Date(caducaEn) } : {}),
      },
    })

    return NextResponse.json(aviso, { status: 201 })
  } catch (error) {
    console.error("[POST /api/avisos] Error:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
