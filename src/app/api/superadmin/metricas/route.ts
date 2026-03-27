import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { opcionesAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/superadmin/metricas — metricas globales de todos los tenants
export async function GET(_request: NextRequest) {
  const sesion = await getServerSession(opcionesAuth)
  if (!sesion || sesion.user.rol !== "SUPERADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    // Inicio del dia actual en UTC
    const hoy = new Date()
    hoy.setUTCHours(0, 0, 0, 0)
    const manana = new Date(hoy)
    manana.setUTCDate(manana.getUTCDate() + 1)

    const [totalTenants, tenantsActivos, totalUsuarios, totalInstalaciones, totalReservasHoy] =
      await Promise.all([
        prisma.tenant.count(),
        prisma.tenant.count({ where: { estado: "ACTIVO" } }),
        prisma.usuario.count(),
        prisma.instalacion.count(),
        prisma.reserva.count({
          where: {
            estado: "ACTIVA",
            horaInicio: { gte: hoy },
          },
        }),
      ])

    return NextResponse.json({
      totalTenants,
      tenantsActivos,
      totalUsuarios,
      totalInstalaciones,
      totalReservasHoy,
    })
  } catch (err) {
    console.error("Error al obtener metricas superadmin:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
