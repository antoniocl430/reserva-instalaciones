import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import bcrypt from "bcryptjs"
import { opcionesAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { schemaCrearTenant } from "@/lib/validaciones"

// GET /api/superadmin/tenants — lista todos los tenants con contadores
export async function GET(_request: NextRequest) {
  const sesion = await getServerSession(opcionesAuth)
  if (!sesion || sesion.user.rol !== "SUPERADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        slug: true,
        nombre: true,
        municipio: true,
        estado: true,
        creadoEn: true,
        _count: {
          select: {
            usuarios: true,
            instalaciones: true,
            reservas: true,
          },
        },
      },
      orderBy: { creadoEn: "desc" },
    })

    return NextResponse.json({ tenants })
  } catch (err) {
    console.error("Error al listar tenants:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// POST /api/superadmin/tenants — crea un tenant con seed automatico
export async function POST(request: NextRequest) {
  const sesion = await getServerSession(opcionesAuth)
  if (!sesion || sesion.user.rol !== "SUPERADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const validacion = schemaCrearTenant.safeParse(body)

    if (!validacion.success) {
      return NextResponse.json(
        { error: "Datos invalidos", detalles: validacion.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { slug, nombre, municipio, emailAdmin, passwordAdmin, nombreAdmin } = validacion.data

    // Verificar que el slug no existe
    const slugExistente = await prisma.tenant.findUnique({ where: { slug } })
    if (slugExistente) {
      return NextResponse.json(
        { error: "Ya existe un tenant con ese slug" },
        { status: 409 }
      )
    }

    // Hashear password del admin con coste 12 (recomendado para producción)
    const passwordHash = await bcrypt.hash(passwordAdmin, 12)

    // Crear todo en una transaccion: tenant + instalacion seed + admin
    const resultado = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          slug,
          nombre,
          municipio,
          estado: "ACTIVO",
        },
      })

      const instalacion = await tx.instalacion.create({
        data: {
          nombre: "Instalacion 1",
          tipo: "PADEL",
          horario: "Lun-Dom: 8:00-22:00",
          tenantId: tenant.id,
        },
      })

      const admin = await tx.usuario.create({
        data: {
          email: emailAdmin,
          nombre: nombreAdmin ?? "Administrador",
          passwordHash,
          rol: "ADMIN",
          tenantId: tenant.id,
        },
      })

      return { tenant, instalacion, admin }
    })

    // Devolver sin exponer passwordHash
    const { passwordHash: _hash, ...adminSinPassword } = resultado.admin

    return NextResponse.json(
      {
        tenant: resultado.tenant,
        instalacion: resultado.instalacion,
        admin: adminSinPassword,
      },
      { status: 201 }
    )
  } catch (err) {
    console.error("Error al crear tenant:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
