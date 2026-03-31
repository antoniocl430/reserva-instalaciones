/**
 * Módulo de notificaciones Web Push
 * Usa la librería web-push para enviar notificaciones a suscriptores registrados.
 * Las suscripciones se guardan en la tabla SuscripcionPush de la base de datos.
 */

import webpush from "web-push"
import { prisma } from "@/lib/prisma"

// Configurar las credenciales VAPID al cargar el módulo
if (process.env.VAPID_PRIVATE_KEY && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL ?? "admin@reservas.dev"}`,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

// Estructura del payload que se envía al navegador del usuario
interface PayloadPush {
  titulo: string
  cuerpo: string
  url?: string
}

/**
 * Envía una notificación push a todas las suscripciones activas de un usuario.
 * Si una suscripción responde con 410 (Gone) significa que el navegador ya no
 * está registrado para esa suscripción — se marca como inactiva en la BD.
 */
export async function enviarPushUsuario(
  usuarioId: string,
  payload: PayloadPush
): Promise<void> {
  // Buscar todas las suscripciones activas del usuario
  const suscripciones = await prisma.suscripcionPush.findMany({
    where: { usuarioId, activa: true },
  })

  if (suscripciones.length === 0) return

  const payloadStr = JSON.stringify(payload)

  // Enviar push a cada suscripción en paralelo
  await Promise.all(
    suscripciones.map(async (suscripcion) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: suscripcion.endpoint,
            keys: {
              p256dh: suscripcion.p256dh,
              auth: suscripcion.auth,
            },
          },
          payloadStr
        )
      } catch (err: unknown) {
        // Si el endpoint ya no existe (410 Gone), desactivar la suscripción
        const statusCode = (err as { statusCode?: number })?.statusCode
        if (statusCode === 410) {
          await prisma.suscripcionPush.updateMany({
            where: { usuarioId, endpoint: suscripcion.endpoint },
            data: { activa: false },
          })
        } else {
          // Otro error: loguearlo pero no interrumpir el resto de envíos
          console.error("[Push] Error al enviar notificación:", err)
        }
      }
    })
  )
}

/**
 * Envía una notificación push de recordatorio al usuario 1 hora antes de su reserva.
 * Se llama desde el cron job de recordatorios.
 */
export async function enviarRecordatorioReserva(datos: {
  usuarioId: string
  nombreInstalacion: string
  fecha: string
  horaInicio: string
}): Promise<void> {
  await enviarPushUsuario(datos.usuarioId, {
    titulo: "Recordatorio de reserva",
    cuerpo: `Tu reserva en ${datos.nombreInstalacion} es en 1 hora (${datos.horaInicio})`,
    url: "/mis-reservas",
  })
}

/**
 * Envía una notificación push al usuario cuando su reserva es cancelada.
 * Diferencia el mensaje según si cancela el admin o el propio ciudadano.
 */
export async function enviarPushCancelacion(datos: {
  usuarioId: string
  nombreInstalacion: string
  fecha: string
  horaInicio: string
  canceladoPorAdmin: boolean
}): Promise<void> {
  const titulo = datos.canceladoPorAdmin
    ? "Reserva cancelada por el ayuntamiento"
    : "Reserva cancelada"

  const cuerpo = datos.canceladoPorAdmin
    ? `El ayuntamiento ha cancelado tu reserva en ${datos.nombreInstalacion} (${datos.horaInicio})`
    : `Tu reserva en ${datos.nombreInstalacion} (${datos.horaInicio}) ha sido cancelada`

  await enviarPushUsuario(datos.usuarioId, {
    titulo,
    cuerpo,
    url: "/mis-reservas",
  })
}
