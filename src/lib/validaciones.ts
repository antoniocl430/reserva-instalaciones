import { z } from "zod"

// Slots válidos disponibles para reservar
const SLOTS_VALIDOS = ["08:00", "09:15", "10:30", "11:45", "16:45", "18:00", "19:15"]

// Regex para validar formato de fecha YYYY-MM-DD
const REGEX_FECHA = /^\d{4}-\d{2}-\d{2}$/

/**
 * Schema para registro de usuarios ciudadanos
 */
export const schemaRegistro = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Email no válido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
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
  descripcion: z.string().optional(),
  horario: z.string().optional(),
})

export type CrearPistaAdminInput = z.infer<typeof schemaCrearPistaAdmin>

/**
 * Schema para actualizar una pista/instalación
 */
export const schemaActualizarPistaAdmin = z.object({
  nombre: z.string().min(1, "El nombre no puede estar vacío").optional(),
  descripcion: z.string().optional(),
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
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
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
