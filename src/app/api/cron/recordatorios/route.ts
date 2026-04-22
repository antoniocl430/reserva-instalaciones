import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { enviarRecordatorioReserva } from "@/lib/push"

/**
 * GET /api/cron/recordatorios
 * Cron job que envía recordatorios Web Push a usuarios con reservas próximas.
 *
 * Protegido mediante el header Authorization: Bearer <CRON_SECRET>.
 * Se ejecuta periódicamente (cada 15 minutos via Cloudflare Cron Trigger).
 *
 * Lógica:
 * - Calcula la ventana: [ahora + 55 min, ahora + 75 min]
 * - Busca reservas ACTIVAS con horaInicio en esa ventana y recordatorioEnviado = false
 * - Para cada reserva: envía push y marca recordatorioEnviado = true
 * - Devuelve { enviados: N }
 */
export async function GET(request: NextRequest) {
  // Validar el token de autorización del cron
  const authHeader = request.headers.get("Authorization")
  const cronSecret = process.env.CRON_SECRET

  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "No autorizado — token de cron inválido" },
      { status: 401 }
    )
  }

  const ahora = new Date()
  // Ventana de búsqueda: reservas que empiezan entre 55 y 75 minutos desde ahora
  const desde = new Date(ahora.getTime() + 55 * 60 * 1000)
  const hasta = new Date(ahora.getTime() + 75 * 60 * 1000)

  // Buscar reservas activas en la ventana cuyo recordatorio no se ha enviado aún
  const reservas = await prisma.reserva.findMany({
    where: {
      estado: "ACTIVA",
      recordatorioEnviado: false,
      horaInicio: {
        gte: desde,
        lte: hasta,
      },
    },
    include: {
      instalacion: { select: { nombre: true } },
    },
  })

  if (reservas.length === 0) {
    return NextResponse.json({ enviados: 0 })
  }

  let enviados = 0

  // Procesar cada reserva: enviar push y marcar como enviado
  await Promise.all(
    reservas.map(async (reserva) => {
      try {
        // Formatear fecha y hora para el mensaje push
        const fechaStr = reserva.fecha.toISOString().split("T")[0]
        const horaInicioStr = reserva.horaInicio.toLocaleString("en-US", {
          timeZone: "Europe/Madrid",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })

        await enviarRecordatorioReserva({
          usuarioId: reserva.usuarioId,
          nombreInstalacion: reserva.instalacion.nombre,
          fecha: fechaStr,
          horaInicio: horaInicioStr,
        })

        // Marcar el recordatorio como enviado para no repetirlo
        await prisma.reserva.update({
          where: { id: reserva.id },
          data: { recordatorioEnviado: true },
        })

        enviados++
      } catch (err) {
        // Logueamos el error pero no detenemos el procesamiento del resto
        console.error(`[Cron] Error al enviar recordatorio para reserva ${reserva.id}:`, err)
      }
    })
  )

  return NextResponse.json({ enviados })
}
