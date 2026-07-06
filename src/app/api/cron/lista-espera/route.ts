import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { notificarSiguienteEnEspera } from "@/lib/lista-espera"

/**
 * GET /api/cron/lista-espera
 * Avanza las entradas NOTIFICADO cuya ventana de 30 min ha expirado:
 *  - Las marca como EXPIRADO
 *  - Notifica al siguiente ESPERANDO del mismo slot
 *
 * Protegido con Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("Authorization")
  const cronSecret = process.env.CRON_SECRET

  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado — token de cron inválido" }, { status: 401 })
  }

  const expiradas = await prisma.listaEspera.findMany({
    where: {
      estado: "NOTIFICADO",
      expiraEn: { lt: new Date() },
    },
  })

  let procesadas = 0

  await Promise.all(
    expiradas.map(async (entrada) => {
      try {
        await prisma.listaEspera.update({
          where: { id: entrada.id },
          data: { estado: "EXPIRADO" },
        })

        await notificarSiguienteEnEspera(
          entrada.instalacionId,
          entrada.fecha,
          entrada.horaInicio,
          entrada.tenantId
        )

        procesadas++
      } catch (err) {
        console.error(`[Cron] Error al procesar entrada expirada ${entrada.id}:`, err)
      }
    })
  )

  return NextResponse.json({ procesadas })
}
