import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { opcionesAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { schemaUnirseListaEspera } from "@/lib/validaciones"
import { crearHoraEnMadrid } from "@/lib/slots"

// GET /api/lista-espera — lista las entradas activas del ciudadano autenticado con posición en cola
export async function GET(request: NextRequest) {
  const sesion = await getServerSession(opcionesAuth)
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  const tenantId = sesion.user.tenantId
  const usuarioId = sesion.user.id

  const entradas = await prisma.listaEspera.findMany({
    where: {
      usuarioId,
      tenantId,
      estado: { in: ["ESPERANDO", "NOTIFICADO"] },
    },
    include: { instalacion: { select: { id: true, nombre: true } } },
    orderBy: { creadoEn: "asc" },
  })

  // Calcular posición de cada entrada: número de ESPERANDO con creadoEn anterior + 1
  const entradasConPosicion = await Promise.all(
    entradas.map(async (entrada) => {
      const posicion =
        (await prisma.listaEspera.count({
          where: {
            instalacionId: entrada.instalacionId,
            fecha: entrada.fecha,
            horaInicio: entrada.horaInicio,
            tenantId,
            estado: "ESPERANDO",
            creadoEn: { lt: entrada.creadoEn },
          },
        })) + 1

      return { ...entrada, posicion }
    })
  )

  return NextResponse.json({ entradas: entradasConPosicion })
}

// POST /api/lista-espera — el ciudadano se apunta a la lista de espera de un slot ocupado
export async function POST(request: NextRequest) {
  const sesion = await getServerSession(opcionesAuth)
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  if (sesion.user.rol !== "CIUDADANO") {
    return NextResponse.json(
      { error: "Solo los ciudadanos pueden apuntarse a la lista de espera" },
      { status: 403 }
    )
  }

  const body = await request.json()
  const resultado = schemaUnirseListaEspera.safeParse(body)
  if (!resultado.success) {
    const primerError = resultado.error.issues[0]
    return NextResponse.json({ error: primerError.message }, { status: 400 })
  }

  const { instalacionId, fecha, horaInicio } = resultado.data
  const tenantId = sesion.user.tenantId!

  // Verificar que la fecha no es pasada
  const fechaDate = new Date(fecha + "T00:00:00.000Z")
  const hoy = new Date()
  hoy.setUTCHours(0, 0, 0, 0)
  if (fechaDate < hoy) {
    return NextResponse.json(
      { error: "No puedes apuntarte a la lista de espera de una fecha pasada" },
      { status: 400 }
    )
  }

  // Verificar que la instalación existe y está activa en el tenant
  const instalacion = await prisma.instalacion.findFirst({
    where: { id: instalacionId, tenantId, activa: true },
  })
  if (!instalacion) {
    return NextResponse.json({ error: "Instalación no encontrada" }, { status: 404 })
  }

  // Verificar que el slot está realmente ocupado (no tiene sentido apuntarse si hay hueco)
  const horaInicioDate = crearHoraEnMadrid(fecha, horaInicio)
  const reservaExistente = await prisma.reserva.findFirst({
    where: {
      tenantId,
      instalacionId,
      estado: "ACTIVA",
      horaInicio: horaInicioDate,
    },
  })
  if (!reservaExistente) {
    return NextResponse.json(
      { error: "Este slot está disponible. Puedes reservarlo directamente" },
      { status: 400 }
    )
  }

  // Verificar que el ciudadano no tiene ya una reserva activa en ese slot
  const reservaPropia = await prisma.reserva.findFirst({
    where: {
      tenantId,
      instalacionId,
      usuarioId: sesion.user.id,
      estado: "ACTIVA",
      horaInicio: horaInicioDate,
    },
  })
  if (reservaPropia) {
    return NextResponse.json(
      { error: "Ya tienes una reserva activa para este slot" },
      { status: 409 }
    )
  }

  // Verificar que el ciudadano no está suspendido
  const usuario = await prisma.usuario.findUnique({
    where: { id: sesion.user.id },
    select: { suspendidoHasta: true },
  })
  if (usuario?.suspendidoHasta && usuario.suspendidoHasta > new Date()) {
    return NextResponse.json({ error: "Tu cuenta está suspendida" }, { status: 403 })
  }

  try {
    const entrada = await prisma.listaEspera.create({
      data: {
        tenantId,
        usuarioId: sesion.user.id,
        instalacionId,
        fecha: new Date(fecha + "T00:00:00.000Z"),
        horaInicio,
        estado: "ESPERANDO",
      },
    })
    return NextResponse.json({ entrada }, { status: 201 })
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === "P2002") {
      return NextResponse.json(
        { error: "Ya estás en la lista de espera para este slot" },
        { status: 409 }
      )
    }
    throw err
  }
}
