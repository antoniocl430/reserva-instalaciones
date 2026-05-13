import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { opcionesAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { schemaCrearReservaAdmin } from "@/lib/validaciones"
import { crearHoraEnMadrid, generarMapaSlots, SLOTS_CONFIG_DEFAULT } from "@/lib/slots"
import { parsearConfiguracion } from "@/lib/tenant"

// Regex para validar formato YYYY-MM-DD
const REGEX_FECHA = /^\d{4}-\d{2}-\d{2}$/

// GET /api/admin/reservas — lista todas las reservas del tenant con filtros opcionales
export async function GET(request: NextRequest) {
  const sesion = await getServerSession(opcionesAuth)
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  if (sesion.user.rol !== "ADMIN") {
    return NextResponse.json(
      { error: "No tienes permiso para acceder a esta ruta" },
      { status: 403 }
    )
  }

  try {
    const { searchParams } = request.nextUrl

    // Parámetros opcionales de filtro
    const estado = searchParams.get("estado")
    const instalacionId = searchParams.get("instalacionId")
    const fecha = searchParams.get("fecha")

    // Validar formato de fecha si se proporciona
    if (fecha && !REGEX_FECHA.test(fecha)) {
      return NextResponse.json(
        { error: "El parámetro fecha debe tener formato YYYY-MM-DD" },
        { status: 400 }
      )
    }

    // Construir objeto where con tenantId siempre presente
    type WhereInput = {
      tenantId: string
      estado?: string
      instalacionId?: string
      fecha?: { gte: Date; lt: Date }
    }

    const where: WhereInput = { tenantId: sesion.user.tenantId! }

    if (estado && (estado === "ACTIVA" || estado === "CANCELADA")) {
      where.estado = estado
    }

    if (instalacionId) {
      where.instalacionId = instalacionId
    }

    if (fecha) {
      const fechaDate = new Date(`${fecha}T00:00:00.000Z`)
      const fechaProxima = new Date(fechaDate)
      fechaProxima.setUTCDate(fechaProxima.getUTCDate() + 1)
      where.fecha = { gte: fechaDate, lt: fechaProxima }
    }

    const reservas = await prisma.reserva.findMany({
      where,
      include: {
        usuario: { select: { nombre: true, email: true } },
        instalacion: { select: { nombre: true } },
      },
      orderBy: [{ fecha: "desc" }, { horaInicio: "desc" }],
    })

    return NextResponse.json({ reservas })
  } catch (err) {
    console.error("Error al obtener reservas:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// POST /api/admin/reservas — crea una reserva manualmente a nombre de un ciudadano del tenant
export async function POST(request: NextRequest) {
  const sesion = await getServerSession(opcionesAuth)
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  if (sesion.user.rol !== "ADMIN") {
    return NextResponse.json(
      { error: "No tienes permiso para acceder a esta ruta" },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()

    // Validar entrada con Zod
    const resultado = schemaCrearReservaAdmin.safeParse(body)
    if (!resultado.success) {
      const primerError = resultado.error.issues[0]
      return NextResponse.json(
        { error: primerError.message },
        { status: 400 }
      )
    }

    const { usuarioId, instalacionId, fecha, horaInicio } = resultado.data

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
      return NextResponse.json(
        { error: "La hora de inicio no corresponde a un slot válido" },
        { status: 400 }
      )
    }

    // Construir fechas UTC del slot usando hora local española (Europe/Madrid)
    const horaInicioDate = crearHoraEnMadrid(fecha, horaInicio)
    const horaFinDate = crearHoraEnMadrid(fecha, horaFin)

    // Verificar que el usuario existe, está activo y pertenece al tenant del admin
    const usuario = await prisma.usuario.findFirst({
      where: { id: usuarioId, tenantId: sesion.user.tenantId },
      select: { activo: true, email: true, nombre: true },
    })
    if (!usuario || !usuario.activo) {
      return NextResponse.json(
        { error: "El usuario no existe o no está activo" },
        { status: 404 }
      )
    }

    // Verificar que la instalación existe, está activa y pertenece al tenant del admin
    const instalacion = await prisma.instalacion.findFirst({
      where: { id: instalacionId, tenantId: sesion.user.tenantId },
    })
    if (!instalacion || !instalacion.activa) {
      return NextResponse.json({ error: "Instalación no disponible" }, { status: 404 })
    }

    // Verificar bloqueo activo que cubra este slot (del mismo tenant)
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

    // Crear reserva en transacción
    // Nota: NO verificamos el límite de 2 reservas para admins (saltean esta regla)
    let reserva
    try {
      reserva = await prisma.$transaction(async (tx) => {
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
            usuarioId,
            instalacionId,
            fecha: crearHoraEnMadrid(fecha, "00:00"),
            horaInicio: horaInicioDate,
            horaFin: horaFinDate,
            estado: "ACTIVA",
          },
          include: { instalacion: { select: { nombre: true } } },
        })
      })
    } catch (err) {
      if (err instanceof Error && err.message === "SLOT_OCUPADO") {
        return NextResponse.json(
          { error: "Este slot acaba de ser reservado por otro usuario. Elige otro horario" },
          { status: 409 }
        )
      }
      throw err
    }

    return NextResponse.json({ reserva }, { status: 201 })
  } catch (err) {
    console.error("Error al crear reserva admin:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
