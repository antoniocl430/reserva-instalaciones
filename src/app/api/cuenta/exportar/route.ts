/**
 * GET /api/cuenta/exportar
 *
 * Permite a un usuario descargarse todos sus datos personales en JSON (RGPD).
 * Disponible para cualquier usuario autenticado (CIUDADANO o ADMIN).
 *
 * Lógica:
 *   1. Verificar sesión activa (getServerSession). Sin sesión → 401.
 *   2. Obtener datos del usuario: nombre, email, creadoEn (sin passwordHash).
 *   3. Obtener todas sus reservas (activas e historial) con nombre de instalación.
 *   4. Construir y devolver JSON con:
 *      - exportadoEn
 *      - usuario (nombre, email, creadoEn)
 *      - reservas (instalacionNombre, fecha, horaInicio, horaFin, estado, creadoEn)
 *   5. Cabecera Content-Disposition: attachment; filename="mis-datos.json"
 */

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { opcionesAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  // 1. Verificar sesión activa
  const sesion = await getServerSession(opcionesAuth)
  if (!sesion?.user) {
    return NextResponse.json(
      { error: "No autenticado" },
      { status: 401 }
    )
  }

  const usuarioId = sesion.user.id
  const tenantId = sesion.user.tenantId

  try {
    // 2. Obtener datos del usuario (sin passwordHash)
    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: {
        nombre: true,
        email: true,
        creadoEn: true,
      },
    })

    if (!usuario) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      )
    }

    // 3. Obtener todas las reservas del usuario con nombre de instalación
    const reservas = await prisma.reserva.findMany({
      where: {
        usuarioId,
        tenantId,
      },
      select: {
        fecha: true,
        horaInicio: true,
        horaFin: true,
        estado: true,
        creadoEn: true,
        instalacion: {
          select: {
            nombre: true,
          },
        },
      },
      orderBy: { fecha: "desc" },
    })

    // 4. Construir el objeto de exportación
    const exportacion = {
      exportadoEn: new Date().toISOString(),
      usuario: {
        nombre: usuario.nombre,
        email: usuario.email,
        creadoEn: usuario.creadoEn,
      },
      reservas: reservas.map((reserva) => ({
        instalacionNombre: reserva.instalacion.nombre,
        fecha: reserva.fecha,
        horaInicio: reserva.horaInicio,
        horaFin: reserva.horaFin,
        estado: reserva.estado,
        creadoEn: reserva.creadoEn,
      })),
    }

    // 5. Responder con cabecera de descarga
    return new NextResponse(JSON.stringify(exportacion), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="mis-datos.json"',
      },
    })
  } catch (error) {
    console.error("Error al exportar datos del usuario:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
