import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { opcionesAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { crearHoraEnMadrid, generarMapaSlots, SLOTS_CONFIG_DEFAULT } from "@/lib/slots"
import { parsearConfiguracion } from "@/lib/tenant"
import { enviarEmailReserva } from "@/lib/email"
import { enviarPushReservaConfirmada } from "@/lib/push"

// POST /api/lista-espera/[id]/confirmar — confirmar la reserva cuando el estado es NOTIFICADO
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sesion = await getServerSession(opcionesAuth)
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  const tenantId = sesion.user.tenantId
  const usuarioId = sesion.user.id

  const entrada = await prisma.listaEspera.findFirst({
    where: { id: params.id, usuarioId, tenantId },
    include: { instalacion: { select: { id: true, nombre: true } } },
  })
  if (!entrada) {
    return NextResponse.json({ error: "Entrada no encontrada" }, { status: 404 })
  }

  if (entrada.estado !== "NOTIFICADO") {
    return NextResponse.json(
      { error: "Esta entrada no está en estado NOTIFICADO" },
      { status: 409 }
    )
  }

  if (!entrada.expiraEn || entrada.expiraEn < new Date()) {
    return NextResponse.json({ error: "La notificación ha expirado" }, { status: 410 })
  }

  const fechaStr = entrada.fecha.toISOString().split("T")[0]

  let reserva: { id: string; instalacion: { nombre: string } } | null = null

  try {
    reserva = await prisma.$transaction(async (tx) => {
      const tenantData = await tx.tenant.findUnique({
        where: { id: tenantId },
        select: { configuracion: true },
      })
      const configTenant = parsearConfiguracion(tenantData?.configuracion ?? null)
      const slotsValidos = generarMapaSlots(configTenant.slots ?? SLOTS_CONFIG_DEFAULT)
      const horaFin = slotsValidos[entrada.horaInicio]

      const horaInicioDate = crearHoraEnMadrid(fechaStr, entrada.horaInicio)
      const horaFinDate = horaFin ? crearHoraEnMadrid(fechaStr, horaFin) : horaInicioDate

      // Verificar límite de reservas activas del ciudadano
      const reservasActivas = await tx.reserva.count({
        where: { usuarioId, estado: "ACTIVA", horaInicio: { gte: new Date() } },
      })
      const limiteReservasActivas = configTenant.limiteReservasActivas ?? 2
      if (reservasActivas >= limiteReservasActivas) {
        throw new Error("LIMITE_RESERVAS")
      }

      // Re-verificar que el slot sigue libre (podría haberse ocupado mientras esperaba)
      const slotOcupado = await tx.reserva.findFirst({
        where: {
          tenantId,
          instalacionId: entrada.instalacionId,
          estado: "ACTIVA",
          horaInicio: horaInicioDate,
        },
      })
      if (slotOcupado) {
        throw new Error("SLOT_OCUPADO")
      }

      const nuevaReserva = await tx.reserva.create({
        data: {
          tenantId: tenantId!,
          usuarioId,
          instalacionId: entrada.instalacionId,
          fecha: entrada.fecha,
          horaInicio: horaInicioDate,
          horaFin: horaFinDate,
          estado: "ACTIVA",
        },
        include: { instalacion: { select: { nombre: true } } },
      })

      await tx.listaEspera.update({
        where: { id: params.id },
        data: { estado: "CONFIRMADO" },
      })

      return nuevaReserva
    })
  } catch (err) {
    if (err instanceof Error && err.message === "SLOT_OCUPADO") {
      return NextResponse.json(
        { error: "El slot acaba de ser ocupado por otro usuario" },
        { status: 409 }
      )
    }
    if (err instanceof Error && err.message === "LIMITE_RESERVAS") {
      return NextResponse.json(
        { error: "Has alcanzado el límite de reservas activas" },
        { status: 409 }
      )
    }
    throw err
  }

  if (reserva) {
    enviarEmailReserva({
      emailUsuario: sesion.user.email!,
      nombreUsuario: sesion.user.name ?? sesion.user.email!,
      nombreInstalacion: reserva.instalacion.nombre,
      fecha: fechaStr,
      horaInicio: entrada.horaInicio,
      horaFin: "",
    }).catch(() => {})

    enviarPushReservaConfirmada(usuarioId, {
      instalacion: reserva.instalacion.nombre,
      fecha: fechaStr,
      horaInicio: entrada.horaInicio,
      horaFin: "",
    }).catch(() => {})
  }

  return NextResponse.json({ reserva }, { status: 201 })
}
