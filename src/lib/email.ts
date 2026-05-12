import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * Devuelve el destinatario real del email.
 * Si EMAIL_REDIRECCION_DEV está configurada, todos los emails se redirigen a esa dirección.
 * Útil para pruebas con el plan gratuito de Resend (solo permite enviar al email del propietario).
 */
function resolverDestinatario(emailReal: string): string {
  return process.env.EMAIL_REDIRECCION_DEV ?? emailReal
}

// Datos necesarios para construir los emails de reserva y cancelación
interface DatosReserva {
  emailUsuario: string
  nombreUsuario: string
  nombreInstalacion: string
  fecha: string       // "YYYY-MM-DD"
  horaInicio: string  // "10:00"
  horaFin: string     // "11:00"
}

// Datos para notificaciones a admins — incluye quién realizó la acción
interface DatosReservaAdmin extends DatosReserva {
  nombreCiudadano: string
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

  const resultado = await resend.emails.send({
    from: "Reservas Pádel <onboarding@resend.dev>",
    to: resolverDestinatario(datos.emailUsuario),
    subject: `Reserva confirmada — ${datos.nombreInstalacion}`,
    html: plantillaReserva(datos),
  })
  console.log("[Email] Confirmación reserva →", JSON.stringify(resultado))
}

/**
 * Envía email de cancelación al ciudadano tras cancelar una reserva.
 * Si canceladoPorAdmin es true, usa un subject y plantilla diferenciados con disculpa.
 * Si RESEND_API_KEY no está configurada, omite el envío y lo registra en consola.
 * Diseñado para llamarse con .catch() y nunca bloquear la respuesta HTTP.
 */
export async function enviarEmailCancelacion(
  datos: DatosReserva & { canceladoPorAdmin?: boolean }
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY no configurada — email de cancelación omitido")
    return
  }

  const subject = datos.canceladoPorAdmin
    ? `Tu reserva ha sido cancelada por el ayuntamiento — ${datos.nombreInstalacion}`
    : `Reserva cancelada — ${datos.nombreInstalacion}`

  await resend.emails.send({
    from: "Reservas Pádel <onboarding@resend.dev>",
    to: resolverDestinatario(datos.emailUsuario),
    subject,
    html: plantillaCancelacion(datos, datos.canceladoPorAdmin ?? false),
  })
}

/**
 * Envía email a cada admin activo del tenant cuando un ciudadano crea una reserva.
 * Si la lista está vacía o RESEND_API_KEY no está configurada, omite y loguea.
 * Diseñado para llamarse con .catch() y nunca bloquear la respuesta HTTP.
 */
export async function enviarEmailNotificacionAdmins(
  datos: DatosReservaAdmin,
  emailsAdmins: string[]
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY no configurada — notificación a admins omitida")
    return
  }
  if (emailsAdmins.length === 0) {
    console.warn("[Email] Sin admins activos — notificación de nueva reserva omitida")
    return
  }

  await Promise.all(
    emailsAdmins.map((emailAdmin) =>
      resend.emails.send({
        from: "Reservas Pádel <onboarding@resend.dev>",
        to: resolverDestinatario(emailAdmin),
        subject: `Nueva reserva — ${datos.nombreInstalacion}`,
        html: plantillaNotificacionAdminNuevaReserva(datos),
      })
    )
  )
}

/**
 * Envía email a cada admin activo del tenant cuando un ciudadano cancela una reserva.
 * Si la lista está vacía o RESEND_API_KEY no está configurada, omite y loguea.
 * Diseñado para llamarse con .catch() y nunca bloquear la respuesta HTTP.
 */
export async function enviarEmailCancelacionAdmins(
  datos: DatosReservaAdmin,
  emailsAdmins: string[]
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY no configurada — notificación de cancelación a admins omitida")
    return
  }
  if (emailsAdmins.length === 0) {
    console.warn("[Email] Sin admins activos — notificación de cancelación omitida")
    return
  }

  await Promise.all(
    emailsAdmins.map((emailAdmin) =>
      resend.emails.send({
        from: "Reservas Pádel <onboarding@resend.dev>",
        to: resolverDestinatario(emailAdmin),
        subject: `Reserva cancelada — ${datos.nombreInstalacion}`,
        html: plantillaNotificacionAdminCancelacion(datos),
      })
    )
  )
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
        <p style="font-size: 14px; color: #6b7280;">Puedes cancelar tu reserva en cualquier momento desde <a href="${process.env.NEXTAUTH_URL}/mis-reservas">Mis Reservas</a>.</p>
      </div>
    </body>
    </html>
  `
}

function plantillaCancelacion(datos: DatosReserva, canceladoPorAdmin: boolean): string {
  const mensajePrincipal = canceladoPorAdmin
    ? "El ayuntamiento ha tenido que cancelar tu reserva. Lamentamos los inconvenientes."
    : "Tu reserva ha sido cancelada:"

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
        <p>${mensajePrincipal}</p>
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

function plantillaNotificacionAdminNuevaReserva(datos: DatosReservaAdmin): string {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
      <div style="background: #2563eb; color: white; padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">Nueva reserva realizada</h1>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        <p>Se ha realizado una nueva reserva en el sistema:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px; font-weight: bold; color: #6b7280;">Ciudadano</td>
            <td style="padding: 10px;">${datos.nombreCiudadano} (${datos.emailUsuario})</td>
          </tr>
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
      </div>
    </body>
    </html>
  `
}

function plantillaNotificacionAdminCancelacion(datos: DatosReservaAdmin): string {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
      <div style="background: #dc2626; color: white; padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">Reserva cancelada por un ciudadano</h1>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        <p>El ciudadano <strong>${datos.nombreCiudadano}</strong> ha cancelado su reserva:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px; font-weight: bold; color: #6b7280;">Ciudadano</td>
            <td style="padding: 10px;">${datos.nombreCiudadano} (${datos.emailUsuario})</td>
          </tr>
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

/**
 * Envía email de recuperación de contraseña al usuario.
 * Si RESEND_API_KEY no está configurada, omite el envío y lo registra en consola.
 * Diseñado para llamarse con .catch() y nunca bloquear la respuesta HTTP.
 */
export async function enviarEmailRecuperacion(
  emailUsuario: string,
  nombreUsuario: string,
  urlReset: string
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY no configurada — email de recuperación omitido")
    return
  }

  const resultado = await resend.emails.send({
    from: "Reservas Pádel <onboarding@resend.dev>",
    to: resolverDestinatario(emailUsuario),
    subject: "Recupera tu contraseña — Reservas Pádel",
    html: plantillaRecuperacion(nombreUsuario, urlReset),
  })
  console.log("[Email] Recuperación contraseña →", JSON.stringify(resultado))
}

function plantillaRecuperacion(nombreUsuario: string, urlReset: string): string {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
      <div style="background: #3b82f6; color: white; padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">Recupera tu contraseña</h1>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        <p>Hola, <strong>${nombreUsuario}</strong>:</p>
        <p>Hemos recibido una solicitud para recuperar tu contraseña. Haz clic en el botón de abajo para establecer una nueva contraseña:</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${urlReset}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: bold;">Establecer nueva contraseña</a>
        </div>
        <p style="font-size: 14px; color: #6b7280;">O copia y pega este enlace en tu navegador:</p>
        <p style="font-size: 12px; color: #6b7280; word-break: break-all;">${urlReset}</p>
        <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">Este enlace expira en 1 hora. Si no solicitaste recuperar tu contraseña, ignora este email.</p>
      </div>
    </body>
    </html>
  `
}

// ---------------------------------------------------------------------------
// Funciones para grupos recurrentes
// ---------------------------------------------------------------------------

interface DatosGrupoConfirmacion {
  instalacion: { nombre: string }
  horaInicio: string
  frecuencia: string
  fechaInicio: Date
  fechaFin: Date
  reservas: Array<{ horaInicio: string; horaFin: string; fecha: Date }>
}

interface DatosGrupoCancelacion {
  instalacion: { nombre: string }
  horaInicio: string
  frecuencia: string
  reservasCanceladas: number
}

interface DatosGrupoRecordatorio {
  instalacion: { nombre: string }
  horaInicio: string
  fechaProxima: Date
}

/**
 * Envía email de confirmación al instructor tras crear un grupo recurrente.
 * Si RESEND_API_KEY no está configurada, omite el envío y lo registra en consola.
 * Diseñado para llamarse con .catch() y nunca bloquear la respuesta HTTP.
 */
export async function enviarEmailConfirmacionGrupo(
  emailInstructor: string,
  nombreInstructor: string,
  grupo: DatosGrupoConfirmacion
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY no configurada — email de confirmación de grupo omitido")
    return
  }

  const resultado = await resend.emails.send({
    from: "Reservas Pádel <onboarding@resend.dev>",
    to: resolverDestinatario(emailInstructor),
    subject: `Clase Recurrente Creada: ${grupo.instalacion.nombre}`,
    html: plantillaConfirmacionGrupo(nombreInstructor, grupo),
  })
  console.log("[Email] Confirmación grupo recurrente →", JSON.stringify(resultado))
}

/**
 * Envía email de cancelación al instructor tras cancelar un grupo recurrente.
 * Si RESEND_API_KEY no está configurada, omite el envío y lo registra en consola.
 * Diseñado para llamarse con .catch() y nunca bloquear la respuesta HTTP.
 */
export async function enviarEmailCancelacionGrupo(
  emailInstructor: string,
  nombreInstructor: string,
  grupo: DatosGrupoCancelacion
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY no configurada — email de cancelación de grupo omitido")
    return
  }

  await resend.emails.send({
    from: "Reservas Pádel <onboarding@resend.dev>",
    to: resolverDestinatario(emailInstructor),
    subject: `Clase Recurrente Cancelada: ${grupo.instalacion.nombre}`,
    html: plantillaCancelacionGrupo(nombreInstructor, grupo),
  })
}

/**
 * Envía email de recordatorio al instructor para la próxima sesión de su clase recurrente.
 * Si RESEND_API_KEY no está configurada, omite el envío y lo registra en consola.
 * Diseñado para llamarse con .catch() y nunca bloquear la respuesta HTTP.
 */
export async function enviarEmailRecordatorioGrupo(
  emailInstructor: string,
  nombreInstructor: string,
  grupo: DatosGrupoRecordatorio
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY no configurada — email de recordatorio de grupo omitido")
    return
  }

  await resend.emails.send({
    from: "Reservas Pádel <onboarding@resend.dev>",
    to: resolverDestinatario(emailInstructor),
    subject: `Recordatorio: Clase mañana en ${grupo.instalacion.nombre}`,
    html: plantillaRecordatorioGrupo(nombreInstructor, grupo),
  })
}

// ---------------------------------------------------------------------------
// Plantillas HTML para grupos recurrentes
// ---------------------------------------------------------------------------

function plantillaConfirmacionGrupo(
  nombreInstructor: string,
  grupo: DatosGrupoConfirmacion
): string {
  const fechaInicioStr = grupo.fechaInicio.toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  const fechaFinStr = grupo.fechaFin.toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const sesionesHtml = grupo.reservas
    .slice(0, 5)
    .map(
      (s) =>
        `<li>${s.fecha.toLocaleDateString("es-ES")} de ${s.horaInicio} a ${s.horaFin}</li>`
    )
    .join("")

  const frecuenciaTexto = grupo.frecuencia === "SEMANAL" ? "Semanal" : "Quincenal"

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
      <div style="background: #16a34a; color: white; padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">Clase Recurrente Creada</h1>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        <p>Hola, <strong>${nombreInstructor}</strong>:</p>
        <p>Tu clase recurrente ha sido creada exitosamente:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px; font-weight: bold; color: #6b7280;">Instalación</td>
            <td style="padding: 10px;">${grupo.instalacion.nombre}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px; font-weight: bold; color: #6b7280;">Horario</td>
            <td style="padding: 10px;">${grupo.horaInicio}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px; font-weight: bold; color: #6b7280;">Frecuencia</td>
            <td style="padding: 10px;">${frecuenciaTexto}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px; font-weight: bold; color: #6b7280;">Período</td>
            <td style="padding: 10px;">${fechaInicioStr} a ${fechaFinStr}</td>
          </tr>
          <tr>
            <td style="padding: 10px; font-weight: bold; color: #6b7280;">Total sesiones</td>
            <td style="padding: 10px;">${grupo.reservas.length}</td>
          </tr>
        </table>
        <h3 style="margin-top: 24px; margin-bottom: 12px; color: #1a1a1a;">Próximas sesiones:</h3>
        <ul style="padding-left: 20px; color: #4b5563;">
          ${sesionesHtml}
        </ul>
        <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">Puedes gestionar tu clase en: <a href="${process.env.NEXTAUTH_URL}/instructor/mis-clases" style="color: #2563eb; text-decoration: none;">Mis Clases</a></p>
      </div>
    </body>
    </html>
  `
}

function plantillaCancelacionGrupo(
  nombreInstructor: string,
  grupo: DatosGrupoCancelacion
): string {
  const frecuenciaTexto = grupo.frecuencia === "SEMANAL" ? "Semanal" : "Quincenal"

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
      <div style="background: #dc2626; color: white; padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">Clase Recurrente Cancelada</h1>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        <p>Hola, <strong>${nombreInstructor}</strong>:</p>
        <p>Tu clase recurrente ha sido cancelada:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px; font-weight: bold; color: #6b7280;">Instalación</td>
            <td style="padding: 10px;">${grupo.instalacion.nombre}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px; font-weight: bold; color: #6b7280;">Horario</td>
            <td style="padding: 10px;">${grupo.horaInicio}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px; font-weight: bold; color: #6b7280;">Frecuencia</td>
            <td style="padding: 10px;">${frecuenciaTexto}</td>
          </tr>
          <tr>
            <td style="padding: 10px; font-weight: bold; color: #6b7280;">Sesiones canceladas</td>
            <td style="padding: 10px;">${grupo.reservasCanceladas}</td>
          </tr>
        </table>
        <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">Las sesiones pasadas no se han visto afectadas. Solo se han cancelado las futuras.</p>
      </div>
    </body>
    </html>
  `
}

function plantillaRecordatorioGrupo(
  nombreInstructor: string,
  grupo: DatosGrupoRecordatorio
): string {
  const fechaStr = grupo.fechaProxima.toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
      <div style="background: #f59e0b; color: white; padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">Recordatorio: Clase Mañana</h1>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        <p>Hola, <strong>${nombreInstructor}</strong>:</p>
        <p>Recordatorio de tu clase:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px; font-weight: bold; color: #6b7280;">Instalación</td>
            <td style="padding: 10px;">${grupo.instalacion.nombre}</td>
          </tr>
          <tr>
            <td style="padding: 10px; font-weight: bold; color: #6b7280;">Fecha y hora</td>
            <td style="padding: 10px;">${fechaStr} a las ${grupo.horaInicio}</td>
          </tr>
        </table>
        <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">¡No olvides preparar el material necesario!</p>
      </div>
    </body>
    </html>
  `
}
