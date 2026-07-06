import { z } from "zod"
import { SLOTS_CONFIG_DEFAULT, generarSlots } from "@/lib/slots"

// Slots válidos para validación Zod — generados a partir de la config por defecto.
// Los schemas Zod usan z.enum en tiempo de carga, por lo que se derivan de la
// configuración por defecto. Los endpoints que usen config de tenant diferente
// deberán validar el slot manualmente usando generarMapaSlots(config).
const SLOTS_VALIDOS = generarSlots(SLOTS_CONFIG_DEFAULT).map((s) => s.horaInicio)

// Regex para validar formato de fecha YYYY-MM-DD
const REGEX_FECHA = /^\d{4}-\d{2}-\d{2}$/

/**
 * Schema para registro de usuarios ciudadanos
 * Incluye aceptaPrivacidad: debe ser literal `true` para cumplir con RGPD.
 * El campo NO se guarda en BD — solo se valida antes de crear el usuario.
 */
export const schemaRegistro = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Email no válido"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .regex(/[A-Z]/, "La contraseña debe contener al menos una letra mayúscula")
    .regex(/[0-9]/, "La contraseña debe contener al menos un número"),
  aceptaPrivacidad: z.literal(true, {
    error: () => ({ message: "Debes aceptar la política de privacidad" }),
  }),
})

export type RegistroInput = z.infer<typeof schemaRegistro>

/**
 * Schema para crear una reserva
 */
export const schemaCrearReserva = z.object({
  instalacionId: z.string().min(1, "La instalación es obligatoria"),
  fecha: z.string().regex(REGEX_FECHA, "Formato de fecha inválido (YYYY-MM-DD)"),
  horaInicio: z.enum(SLOTS_VALIDOS as [string, ...string[]]).refine(
    (val) => SLOTS_VALIDOS.includes(val),
    { message: "La hora de inicio no corresponde a un slot válido" }
  ),
})

export type CrearReservaInput = z.infer<typeof schemaCrearReserva>

/**
 * Schema para crear una reserva recurrente (instructores)
 */
export const schemaCrearReservaRecurrente = z.object({
  instalacionId: z.string().min(1, "La instalación es obligatoria"),
  horaInicio: z.enum(SLOTS_VALIDOS as [string, ...string[]]).refine(
    (val) => SLOTS_VALIDOS.includes(val),
    { message: "La hora de inicio no corresponde a un slot válido" }
  ),
  fechaInicio: z.string().regex(REGEX_FECHA, "Formato de fecha inválido (YYYY-MM-DD)"),
  fechaFin: z.string().regex(REGEX_FECHA, "Formato de fecha inválido (YYYY-MM-DD)"),
  frecuencia: z.enum(["SEMANAL", "QUINCENAL"], { message: "Frecuencia inválida" }),
}).refine(
  (data) => data.fechaFin >= data.fechaInicio,
  { message: "La fecha fin debe ser posterior a la fecha inicio", path: ["fechaFin"] }
)

export type CrearReservaRecurrenteInput = z.infer<typeof schemaCrearReservaRecurrente>

/**
 * Schema para cancelar una reserva (validación de parámetros)
 */
export const schemaCancelarReserva = z.object({
  // El id viene en los params, solo necesitamos validar que es un string no vacío
  id: z.string().min(1, "El ID de la reserva es obligatorio"),
})

export type CancelarReservaInput = z.infer<typeof schemaCancelarReserva>

/**
 * Schema para crear una pista/instalación (solo administradores)
 */
export const schemaCrearPistaAdmin = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  tipo: z.literal("PADEL").refine((val) => val === "PADEL", {
    message: "El tipo debe ser PADEL",
  }),
  descripcion: z.string().nullable().optional(),
  horario: z.string().optional(),
})

export type CrearPistaAdminInput = z.infer<typeof schemaCrearPistaAdmin>

/**
 * Schema para actualizar una pista/instalación
 */
export const schemaActualizarPistaAdmin = z.object({
  nombre: z.string().min(1, "El nombre no puede estar vacío").optional(),
  descripcion: z.string().nullable().optional(),
  horario: z.string().optional(),
  activa: z.boolean().optional(),
})

export type ActualizarPistaAdminInput = z.infer<typeof schemaActualizarPistaAdmin>

/**
 * Schema para crear un bloqueo de instalación
 */
export const schemaCrearBloqueo = z
  .object({
    instalacionId: z.string().min(1, "La instalación es obligatoria"),
    fechaInicio: z.string().regex(REGEX_FECHA, "Formato de fecha inválido (YYYY-MM-DD)"),
    fechaFin: z.string().regex(REGEX_FECHA, "Formato de fecha inválido (YYYY-MM-DD)"),
    motivo: z.string().optional(),
  })
  .refine((data) => data.fechaInicio <= data.fechaFin, {
    message: "La fecha de inicio no puede ser posterior a la fecha de fin",
    path: ["fechaFin"],
  })

export type CrearBloqueoInput = z.infer<typeof schemaCrearBloqueo>

/**
 * Schema para crear un usuario admin
 */
export const schemaCrearUsuarioAdmin = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Email no válido"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .regex(/[A-Z]/, "La contraseña debe contener al menos una letra mayúscula")
    .regex(/[0-9]/, "La contraseña debe contener al menos un número"),
  rol: z.enum(["ADMIN", "INSTRUCTOR"]).optional().default("ADMIN"),
})

export type CrearUsuarioAdminInput = z.infer<typeof schemaCrearUsuarioAdmin>

/**
 * Schema para crear una reserva manualmente (admin)
 */
export const schemaCrearReservaAdmin = z.object({
  usuarioId: z.string().min(1, "El usuario es obligatorio"),
  instalacionId: z.string().min(1, "La instalación es obligatoria"),
  fecha: z.string().regex(REGEX_FECHA, "Formato de fecha inválido (YYYY-MM-DD)"),
  horaInicio: z.enum(SLOTS_VALIDOS as [string, ...string[]]).refine(
    (val) => SLOTS_VALIDOS.includes(val),
    { message: "La hora de inicio no corresponde a un slot válido" }
  ),
})

export type CrearReservaAdminInput = z.infer<typeof schemaCrearReservaAdmin>

/**
 * Schema para solicitar recuperación de contraseña
 */
export const schemaSolicitarRecuperacion = z.object({
  email: z.string().email("Email no válido"),
})

export type SolicitarRecuperacionInput = z.infer<typeof schemaSolicitarRecuperacion>

/**
 * Schema para resetear contraseña con token
 */
export const schemaResetearPassword = z.object({
  token: z.string().min(1, "El token es obligatorio"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .regex(/[A-Z]/, "La contraseña debe contener al menos una letra mayúscula")
    .regex(/[0-9]/, "La contraseña debe contener al menos un número"),
})

export type ResetearPasswordInput = z.infer<typeof schemaResetearPassword>

// Tipos válidos para los avisos del tablón
const TIPOS_AVISO_VALIDOS = ["INFO", "AVISO", "CIERRE"] as const

// Valida que una cadena sea una fecha ISO 8601 parseable
// Acepta formatos como "2026-12-31T23:59:59.000Z" o "2026-12-31"
function esFechaIsoValida(valor: string): boolean {
  const fecha = new Date(valor)
  return !isNaN(fecha.getTime())
}

/**
 * Schema para crear un aviso del tablón de anuncios
 */
export const schemaCrearAviso = z.object({
  titulo: z
    .string()
    .min(1, "El título es obligatorio")
    .max(100, "El título no puede superar 100 caracteres"),
  descripcion: z
    .string()
    .min(1, "La descripción es obligatoria")
    .max(500, "La descripción no puede superar 500 caracteres"),
  tipo: z.enum(TIPOS_AVISO_VALIDOS, {
    error: () => ({ message: "El tipo debe ser INFO, AVISO o CIERRE" }),
  }),
  fecha: z.string().regex(REGEX_FECHA, "Formato de fecha inválido (YYYY-MM-DD)"),
  // Fecha opcional de caducidad: si se proporciona, debe ser una fecha ISO válida.
  // Acepta null (caducidad sin valor) igual que el schema de actualización.
  caducaEn: z
    .string()
    .refine(esFechaIsoValida, "La fecha de caducidad no es una fecha válida")
    .nullable()
    .optional(),
})

export type CrearAvisoInput = z.infer<typeof schemaCrearAviso>

/**
 * Schema para actualizar un aviso (todos los campos son opcionales)
 */
export const schemaActualizarAviso = z
  .object({
    titulo: z
      .string()
      .min(1, "El título no puede estar vacío")
      .max(100, "El título no puede superar 100 caracteres")
      .optional(),
    descripcion: z
      .string()
      .min(1, "La descripción no puede estar vacía")
      .max(500, "La descripción no puede superar 500 caracteres")
      .optional(),
    tipo: z
      .enum(TIPOS_AVISO_VALIDOS, {
        error: () => ({ message: "El tipo debe ser INFO, AVISO o CIERRE" }),
      })
      .optional(),
    fecha: z.string().regex(REGEX_FECHA, "Formato de fecha inválido (YYYY-MM-DD)").optional(),
    activo: z.boolean().optional(),
    // Permite establecer o limpiar la fecha de caducidad (null elimina la caducidad)
    caducaEn: z
      .string()
      .refine(esFechaIsoValida, "La fecha de caducidad no es una fecha válida")
      .nullable()
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Se debe proporcionar al menos un campo para actualizar",
  })

export type ActualizarAvisoInput = z.infer<typeof schemaActualizarAviso>

/**
 * Schema para validar colores corporativos en formato hex (#rrggbb)
 */
export const schemaColores = z.object({
  primario: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color hex inválido")
    .optional(),
  secundario: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color hex inválido")
    .optional(),
})

export type ColoresInput = z.infer<typeof schemaColores>

/**
 * Schema para crear un festivo
 */
export const schemaCrearFestivo = z.object({
  fecha: z.string().regex(REGEX_FECHA, "Formato de fecha inválido (YYYY-MM-DD)"),
  nombre: z.string().min(1, "El nombre es obligatorio").max(100, "El nombre no puede superar 100 caracteres"),
  repetirAnual: z.boolean().optional().default(false),
})

export type CrearFestivoInput = z.infer<typeof schemaCrearFestivo>

/**
 * Schema para apuntarse a la lista de espera de un slot
 */
export const schemaUnirseListaEspera = z.object({
  instalacionId: z.string().min(1, "La instalación es obligatoria"),
  fecha: z.string().regex(REGEX_FECHA, "Formato de fecha inválido (YYYY-MM-DD)"),
  horaInicio: z.string().regex(/^\d{2}:\d{2}$/, "Formato de hora inválido (HH:MM)"),
})

export type UnirseListaEsperaInput = z.infer<typeof schemaUnirseListaEspera>

/**
 * Schema para validar una franja horaria en formato HH:MM
 */
const REGEX_HORA = /^\d{2}:\d{2}$/

const schemaFranja = z.object({
  inicio: z.string().regex(REGEX_HORA, "Formato de hora inválido (HH:MM)"),
  fin: z.string().regex(REGEX_HORA, "Formato de hora inválido (HH:MM)"),
})

/**
 * Schema para la configuración de slots del tenant
 */
const schemaSlotsConfig = z.object({
  duracionMinutos: z
    .number({ message: "duracionMinutos debe ser un número" })
    .int("duracionMinutos debe ser un entero")
    .positive("duracionMinutos debe ser positivo"),
  franjas: z
    .array(schemaFranja)
    .min(1, "Debe haber al menos una franja horaria"),
})

/**
 * Schema para la configuración personalizable de un tenant
 */
export const schemaConfiguracionTenant = z.object({
  nombreServicio: z.string().min(1).max(100).optional(),
  colores: schemaColores.optional(),
  metadata: z
    .object({
      title: z.string().max(100).optional(),
      description: z.string().max(300).optional(),
    })
    .optional(),
  /** Configuración de slots de reserva (opcional — usa defaults si no se especifica) */
  slots: schemaSlotsConfig.optional(),
})

export type ConfiguracionTenantInput = z.infer<typeof schemaConfiguracionTenant>

/**
 * Schema para actualizar datos del tenant (usado en PATCH /api/admin/configuracion)
 * Todos los campos son opcionales — se hace merge profundo en la lógica del endpoint
 */
export const schemaActualizarTenant = z.object({
  nombre: z.string().min(1).max(200).optional(),
  municipio: z.string().min(1).max(200).optional(),
  logoUrl: z.union([
    z.string().url("URL inválida"),
    z.string().regex(
      /^data:image\/(png|jpeg|jpg|gif|svg\+xml|webp);base64,/,
      "Formato de imagen inválido"
    ),
  ]).optional().nullable(),
  configuracion: schemaConfiguracionTenant.optional(),
})

export type ActualizarTenantInput = z.infer<typeof schemaActualizarTenant>

// ─── Superadmin: crear tenant ─────────────────────────────────────────────────

/**
 * Schema para crear un nuevo tenant (solo SUPERADMIN)
 * El slug solo permite letras minusculas, numeros y guiones
 */
export const schemaCrearTenant = z.object({
  slug: z
    .string()
    .min(2, "El slug debe tener al menos 2 caracteres")
    .max(50, "El slug no puede superar 50 caracteres")
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      "El slug solo puede contener letras minusculas, numeros y guiones (sin espacios ni mayusculas)"
    ),
  nombre: z.string().min(1, "El nombre es obligatorio").max(200),
  municipio: z.string().min(1, "El municipio es obligatorio").max(200),
  emailAdmin: z.string().email("Email del admin no valido"),
  passwordAdmin: z
    .string()
    .min(8, "La contrasena debe tener al menos 8 caracteres")
    .regex(/[A-Z]/, "La contrasena debe contener al menos una letra mayuscula")
    .regex(/[0-9]/, "La contrasena debe contener al menos un numero"),
  nombreAdmin: z.string().min(2).max(200).optional(),
})

export type CrearTenantInput = z.infer<typeof schemaCrearTenant>

/**
 * Schema para actualizar un tenant existente (solo SUPERADMIN)
 * El slug NO se puede cambiar (inmutable)
 */
export const schemaActualizarTenantSuperadmin = z.object({
  nombre: z.string().min(1).max(200).optional(),
  municipio: z.string().min(1).max(200).optional(),
  estado: z.enum(["ACTIVO", "SUSPENDIDO"] as [string, ...string[]], {
    error: () => ({ message: "El estado debe ser ACTIVO o SUSPENDIDO" }),
  }).optional(),
})

/**
 * Schema para actualizar el perfil del usuario autenticado
 * Todos los campos son opcionales — se permite actualizar solo lo que se envía
 */
export const schemaActualizarPerfil = z.object({
  nombre: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no puede superar 100 caracteres")
    .optional(),
})

export type ActualizarPerfilInput = z.infer<typeof schemaActualizarPerfil>

/**
 * Schema para actualizar preferencias de notificación del usuario autenticado
 * Todos los campos son booleanos y opcionales (partial update)
 */
export const schemaPreferenciasNotificacion = z.object({
  notificacionesEmail: z.boolean().optional(),
  notificacionesPush: z.boolean().optional(),
  recordatorioReserva: z.boolean().optional(),
  recordatorioCancel: z.boolean().optional(),
  notificacionesAviso: z.boolean().optional(),
})

export type PreferenciasNotificacionInput = z.infer<typeof schemaPreferenciasNotificacion>

/**
 * Schema para crear una valoración de una instalación
 * Solo ciudadanos pueden valorar, una vez por reserva completada
 */
export const schemaCrearValoracion = z.object({
  reservaId: z.string().min(1, "El ID de la reserva es obligatorio"),
  puntuacion: z.number().int("La puntuación debe ser un entero").min(1, "La puntuación mínima es 1").max(5, "La puntuación máxima es 5"),
  comentario: z.string().max(500, "El comentario no puede superar 500 caracteres").optional(),
})

export type CrearValoracionInput = z.infer<typeof schemaCrearValoracion>
