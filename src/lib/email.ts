import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

// Datos necesarios para construir los emails de reserva y cancelación
interface DatosReserva {
  emailUsuario: string
  nombreUsuario: string
  nombreInstalacion: string
  fecha: string       // "YYYY-MM-DD"
  horaInicio: string  // "10:00"
  horaFin: string     // "11:00"
}

/**
 * Envía email de confirmación al ciudadano tras crear una reserva.
 * Si RESEND_API_KEY no está configurada, omite el envío y lo registra en consola.
 * Diseñado para llamarse con .catch() y nunca bloquear la respuesta HTTP.
 */
export async function enviarEmailReserva(datos: DatosReserva): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY no configurada — email de confirmación omitido")
    return
  }

  await resend.emails.send({
    from: "Reservas Pádel <onboarding@resend.dev>",
    to: datos.emailUsuario,
    subject: `Reserva confirmada — ${datos.nombreInstalacion}`,
    html: plantillaReserva(datos),
  })
}

/**
 * Envía email de cancelación al ciudadano tras cancelar una reserva.
 * Si RESEND_API_KEY no está configurada, omite el envío y lo registra en consola.
 * Diseñado para llamarse con .catch() y nunca bloquear la respuesta HTTP.
 */
export async function enviarEmailCancelacion(datos: DatosReserva): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY no configurada — email de cancelación omitido")
    return
  }

  await resend.emails.send({
    from: "Reservas Pádel <onboarding@resend.dev>",
    to: datos.emailUsuario,
    subject: `Reserva cancelada — ${datos.nombreInstalacion}`,
    html: plantillaCancelacion(datos),
  })
}

// ---------------------------------------------------------------------------
// Plantillas HTML
// ---------------------------------------------------------------------------

function plantillaReserva(datos: DatosReserva): string {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
      <div style="background: #16a34a; color: white; padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">Reserva confirmada</h1>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        <p>Hola, <strong>${datos.nombreUsuario}</strong>:</p>
        <p>Tu reserva ha sido confirmada con los siguientes datos:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px; font-weight: bold; color: #6b7280;">Instalacion</td>
            <td style="padding: 10px;">${datos.nombreInstalacion}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px; font-weight: bold; color: #6b7280;">Fecha</td>
            <td style="padding: 10px;">${formatearFechaEmail(datos.fecha)}</td>
          </tr>
          <tr>
            <td style="padding: 10px; font-weight: bold; color: #6b7280;">Horario</td>
            <td style="padding: 10px;">${datos.horaInicio} - ${datos.horaFin}</td>
          </tr>
        </table>
        <p style="font-size: 14px; color: #6b7280;">Recuerda que puedes cancelar tu reserva hasta 2 horas antes del inicio desde <a href="${process.env.NEXTAUTH_URL}/mis-reservas">Mis Reservas</a>.</p>
      </div>
    </body>
    </html>
  `
}

function plantillaCancelacion(datos: DatosReserva): string {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
      <div style="background: #dc2626; color: white; padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">Reserva cancelada</h1>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        <p>Hola, <strong>${datos.nombreUsuario}</strong>:</p>
        <p>Tu reserva ha sido cancelada:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px; font-weight: bold; color: #6b7280;">Instalacion</td>
            <td style="padding: 10px;">${datos.nombreInstalacion}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px; font-weight: bold; color: #6b7280;">Fecha</td>
            <td style="padding: 10px;">${formatearFechaEmail(datos.fecha)}</td>
          </tr>
          <tr>
            <td style="padding: 10px; font-weight: bold; color: #6b7280;">Horario</td>
            <td style="padding: 10px;">${datos.horaInicio} - ${datos.horaFin}</td>
          </tr>
        </table>
        <p style="font-size: 14px; color: #6b7280;">Si tienes alguna duda, contacta con el ayuntamiento.</p>
      </div>
    </body>
    </html>
  `
}

/**
 * Formatea una fecha "YYYY-MM-DD" como texto largo en español.
 * Ej: "2026-03-25" → "miercoles, 25 de marzo de 2026"
 * Usa constructor con componentes para evitar desfase de zona horaria.
 */
function formatearFechaEmail(fechaStr: string): string {
  const [anio, mes, dia] = fechaStr.split("-").map(Number)
  return new Date(anio, mes - 1, dia).toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}
