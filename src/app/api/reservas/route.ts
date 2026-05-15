import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { randomUUID } from "crypto"
import { opcionesAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { enviarEmailReserva } from "@/lib/email"
import { enviarPushReservaConfirmada } from "@/lib/push"
import { schemaCrearReserva } from "@/lib/validaciones"
import { crearHoraEnMadrid, generarMapaSlots, SLOTS_CONFIG_DEFAULT } from "@/lib/slots"
import { parsearConfiguracion } from "@/lib/tenant"

// POST /api/reservas — crea una reserva con todas las validaciones de negocio
export async function POST(request: NextRequest) {
  const sesion = await getServerSession(opcionesAuth)
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  const body = await request.json()

  // Validar entrada con Zod
  const resultado = schemaCrearReserva.safeParse(body)
  if (!resultado.success) {
    const primerError = resultado.error.issues[0]
    return NextResponse.json(
      { error: primerError.message },
      { status: 400 }
    )
  }

  const { instalacionId, fecha, horaInicio } = resultado.data

  // Cargar la configuración de slots del tenant desde BD
  const tenantData = await prisma.tenant.findUnique({
    where: { id: sesion.user.tenantId },
    select: { configuracion: true },
  })
  const configTenant = parsearConfiguracion(tenantData?.configuracion ?? null)
  const slotsValidos = generarMapaSlots(configTenant.slots ?? SLOTS_CONFIG_DEFAULT)

  // Obtener la hora fin desde el mapa de slots del tenant
  const horaFin = slotsValidos[horaInicio]
  if (!horaFin) {
    // Esto no debería ocurrir si Zod validó correctamente, pero para seguridad
    return NextResponse.json(
      { error: "La hora de inicio no corresponde a un slot válido" },
      { status: 400 }
    )
  }

  // Construir fechas UTC del slot usando hora local española (Europe/Madrid)
  const horaInicioDate = crearHoraEnMadrid(fecha, horaInicio)
  const horaFinDate = crearHoraEnMadrid(fecha, horaFin)

  // Validar que el slot es futuro (mínimo 1 minuto de margen)
  if (horaInicioDate.getTime() <= Date.now() + 60_000) {
    return NextResponse.json(
      { error: "No puedes reservar un slot que ya ha comenzado o está a punto de comenzar" },
      { status: 400 }
    )
  }

  // Verificar que la instalación existe, está activa Y pertenece al tenant del usuario
  const instalacion = await prisma.instalacion.findFirst({
    where: { id: instalacionId, tenantId: sesion.user.tenantId },
  })
  if (!instalacion || !instalacion.activa) {
    return NextResponse.json({ error: "Instalación no disponible" }, { status: 404 })
  }

  // Verificar si el ciudadano tiene una suspensión vigente
  if (sesion.user.rol === "CIUDADANO") {
    const usuario = await prisma.usuario.findUnique({
      where: { id: sesion.user.id },
      select: { suspendidoHasta: true, motivoSuspension: true },
    })
    if (usuario?.suspendidoHasta && usuario.suspendidoHasta > new Date()) {
      return NextResponse.json(
        {
          error: `Tu cuenta está suspendida hasta el ${usuario.suspendidoHasta.toLocaleDateString("es-ES")}. Motivo: ${usuario.motivoSuspension ?? ""}`,
        },
        { status: 403 }
      )
    }
  }

  // Verificar bloqueo activo del tenant que cubra este slot (fuera de transacción: solo lectura)
  const bloqueo = await prisma.bloqueo.findFirst({
    where: {
      tenantId: sesion.user.tenantId,
      instalacionId,
      activo: true,
      fechaInicio: { lte: horaFinDate },
      fechaFin: { gte: horaInicioDate },
    },
  })
  if (bloqueo) {
    return NextResponse.json(
      { error: `Esta instalación está bloqueada: ${bloqueo.motivo}` },
      { status: 409 }
    )
  }

  // Leer el límite de reservas activas del tenant (configurable).
  // Por defecto es 2 si no está configurado en el JSON del tenant.
  const limiteReservasActivas = configTenant.limiteReservasActivas ?? 2

  // Crear reserva en transacción.
  // El conteo de reservas activas del ciudadano se realiza DENTRO de la transacción
  // para evitar que dos peticiones simultáneas superen el límite configurado (BUG-03).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let reserva: any
  try {
    reserva = await prisma.$transaction(async (tx) => {
      // Verificar límite de reservas activas simultáneas (solo ciudadanos).
      // El límite es configurable por tenant mediante `limiteReservasActivas` en la config JSON.
      if (sesion.user.rol === "CIUDADANO") {
        const reservasActivas = await tx.reserva.count({
          where: {
            usuarioId: sesion.user.id,
            estado: "ACTIVA",
            horaInicio: { gte: new Date() },
          },
        })
        if (reservasActivas >= limiteReservasActivas) {
          throw new Error("LIMITE_RESERVAS")
        }
      }

      // Re-verificar disponibilidad dentro de la transacción (evita race conditions)
      const reservaExistente = await tx.reserva.findFirst({
        where: {
          tenantId: sesion.user.tenantId,
          instalacionId,
          estado: "ACTIVA",
          horaInicio: horaInicioDate,
        },
      })
      if (reservaExistente) {
        throw new Error("SLOT_OCUPADO")
      }

      return tx.reserva.create({
        data: {
          tenantId: sesion.user.tenantId!,
          usuarioId: sesion.user.id,
          instalacionId,
          fecha: new Date(fecha + "T00:00:00.000Z"),
          horaInicio: horaInicioDate,
          horaFin: horaFinDate,
          estado: "ACTIVA",
          qrToken: randomUUID(),
        },
        include: { instalacion: { select: { nombre: true } } },
      })
    })
  } catch (err) {
    if (err instanceof Error && err.message === "LIMITE_RESERVAS") {
      return NextResponse.json(
        { error: `No puedes tener más de ${limiteReservasActivas} reservas activas simultáneas` },
        { status: 409 }
      )
    }
    if (err instanceof Error && err.message === "SLOT_OCUPADO") {
      return NextResponse.json(
        { error: "Este slot acaba de ser reservado por otro usuario. Elige otro horario" },
        { status: 409 }
      )
    }
    throw err
  }

  // Enviar email de confirmación de forma asíncrona (el fallo no bloquea la respuesta)
  const horaInicioStr = horaInicio
  const horaFinStr = horaFin
  const datosEmail = {
    emailUsuario: sesion.user.email!,
    nombreUsuario: sesion.user.name ?? sesion.user.email!,
    nombreInstalacion: reserva.instalacion.nombre,
    fecha,
    horaInicio: horaInicioStr,
    horaFin: horaFinStr,
  }
  enviarEmailReserva(datosEmail).catch((err) =>
    console.error("[Email] Error al enviar confirmación de reserva:", err)
  )

  // Enviar push de confirmación de forma asíncrona (el fallo no bloquea la respuesta)
  // La fecha se formatea como DD/MM/YYYY para el mensaje al usuario
  const [anio, mes, dia] = fecha.split("-")
  const fechaFormateada = `${dia}/${mes}/${anio}`
  enviarPushReservaConfirmada(reserva.usuarioId, {
    instalacion: reserva.instalacion.nombre,
    fecha: fechaFormateada,
    horaInicio: horaInicioStr,
    horaFin: horaFinStr,
  }).catch(() => {}) // ignorar errores de push para no romper el flujo

  return NextResponse.json({ reserva }, { status: 201 })
}
