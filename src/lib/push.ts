/**
 * Módulo de notificaciones Web Push
 * Usa la librería web-push para enviar notificaciones a suscriptores registrados.
 * Las suscripciones se guardan en la tabla SuscripcionPush de la base de datos.
 * Antes de enviar, se comprueban las preferencias del usuario en PreferenciaNotificacion.
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

// Tipos de push reconocidos para filtrar por preferencia específica
type TipoPush = "recordatorio" | "cancelacion"

/**
 * Comprueba si debe enviarse el push según las preferencias del usuario.
 * Devuelve true si hay que enviar, false si hay que silenciar.
 */
async function deberiasEnviarPush(usuarioId: string, tipo?: TipoPush): Promise<boolean> {
  const preferencias = await prisma.preferenciaNotificacion.findFirst({
    where: { usuarioId },
    select: {
      notificacionesPush: true,
      recordatorioReserva: true,
      recordatorioCancel: true,
    },
  })

  // Sin registro → asumir todos los valores por defecto (true) → enviar
  if (!preferencias) return true

  // Push globalmente desactivado → no enviar
  if (!preferencias.notificacionesPush) return false

  // Filtro por tipo específico
  if (tipo === "recordatorio" && !preferencias.recordatorioReserva) return false
  if (tipo === "cancelacion" && !preferencias.recordatorioCancel) return false

  return true
}

/**
 * Envía una notificación push a todas las suscripciones activas de un usuario.
 * Antes de enviar, comprueba las preferencias del usuario en PreferenciaNotificacion:
 * - Si no existe el registro → asumir defaults (true) y enviar
 * - Si notificacionesPush === false → no enviar
 * - Si el tipo específico está en false → no enviar
 *
 * Si una suscripción responde con 410 (Gone) significa que el navegador ya no
 * está registrado para esa suscripción — se marca como inactiva en la BD.
 */
export async function enviarPushUsuario(
  usuarioId: string,
  payload: PayloadPush,
  tipoPush?: TipoPush
): Promise<void> {
  // Comprobar preferencias antes de buscar suscripciones
  const debeEnviar = await deberiasEnviarPush(usuarioId, tipoPush)
  if (!debeEnviar) return

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
 * Respeta la preferencia recordatorioReserva del usuario.
 */
export async function enviarRecordatorioReserva(datos: {
  usuarioId: string
  nombreInstalacion: string
  fecha: string
  horaInicio: string
}): Promise<void> {
  await enviarPushUsuario(
    datos.usuarioId,
    {
      titulo: "Recordatorio de reserva",
      cuerpo: `Tu reserva en ${datos.nombreInstalacion} es en 1 hora (${datos.horaInicio})`,
      url: "/mis-reservas",
    },
    "recordatorio"
  )
}

/**
 * Envía una notificación push al usuario cuando su reserva es cancelada.
 * Diferencia el mensaje según si cancela el admin o el propio ciudadano.
 * Respeta la preferencia recordatorioCancel del usuario.
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

  await enviarPushUsuario(
    datos.usuarioId,
    {
      titulo,
      cuerpo,
      url: "/mis-reservas",
    },
    "cancelacion"
  )
}

/**
 * Envía una notificación push al usuario cuando confirma una reserva.
 * Reutiliza la preferencia recordatorioReserva porque ambas son sobre reservas.
 */
export async function enviarPushReservaConfirmada(
  usuarioId: string,
  datos: {
    instalacion: string
    fecha: string
    horaInicio: string
    horaFin: string
  }
): Promise<void> {
  await enviarPushUsuario(
    usuarioId,
    {
      titulo: "Reserva confirmada",
      cuerpo: `Tu reserva en ${datos.instalacion} el ${datos.fecha} a las ${datos.horaInicio} está confirmada`,
      url: "/mis-reservas",
    },
    "recordatorio"
  )
}

/**
 * Notifica al ciudadano que hay un hueco disponible en la lista de espera.
 * Urgente — usa preferencia "recordatorio" (es una oportunidad de reserva).
 */
export async function enviarPushSlotDisponible(
  usuarioId: string,
  datos: { instalacion: string; fecha: string; horaInicio: string }
): Promise<void> {
  await enviarPushUsuario(
    usuarioId,
    {
      titulo: "¡Hueco disponible!",
      cuerpo: `Se liberó un slot en ${datos.instalacion} el ${datos.fecha} a las ${datos.horaInicio}. Tienes 30 min para confirmar.`,
      url: "/mis-reservas",
    },
    "recordatorio"
  )
}

/**
 * Envía una notificación push masiva a todos los ciudadanos suscritos del tenant.
 * Respeta la preferencia notificacionesAviso de cada usuario.
 * Devuelve el número de suscripciones a las que se envió.
 */
export async function enviarPushComunicadoMasivo(datos: {
  tenantId: string
  titulo: string
  cuerpo: string
}): Promise<number> {
  // Obtener todas las suscripciones activas del tenant con las preferencias del usuario
  const suscripciones = await prisma.suscripcionPush.findMany({
    where: { tenantId: datos.tenantId, activa: true, usuario: { rol: "CIUDADANO", activo: true } },
    include: {
      usuario: {
        include: {
          preferenciaNotificaciones: { select: { notificacionesPush: true, notificacionesAviso: true } },
        },
      },
    },
  })

  const payload = JSON.stringify({ titulo: datos.titulo, cuerpo: datos.cuerpo, url: "/" })
  let enviados = 0

  await Promise.all(
    suscripciones.map(async (suscripcion) => {
      const pref = suscripcion.usuario.preferenciaNotificaciones[0]
      // Sin registro de preferencias → enviar por defecto
      if (pref && (!pref.notificacionesPush || pref.notificacionesAviso === false)) return

      try {
        await webpush.sendNotification(
          { endpoint: suscripcion.endpoint, keys: { p256dh: suscripcion.p256dh, auth: suscripcion.auth } },
          payload
        )
        enviados++
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode
        if (statusCode === 410) {
          await prisma.suscripcionPush.update({ where: { id: suscripcion.id }, data: { activa: false } })
        } else {
          console.error("[Push] Error en comunicado masivo:", err)
        }
      }
    })
  )
  return enviados
}
