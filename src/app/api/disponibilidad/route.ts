import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { extraerSlugDelHost, obtenerTenantIdPorSlug, parsearConfiguracion } from "@/lib/tenant"
import { generarSlots, crearHoraEnMadrid, SLOTS_CONFIG_DEFAULT } from "@/lib/slots"

// Resuelve el tenantId desde x-tenant-slug (inyectado por el middleware) o el host.
// NO se acepta x-tenant-id desde el cliente — podría usarse para acceder a datos de otro tenant.
async function resolverTenantId(request: NextRequest): Promise<string | null> {
  const slug =
    request.headers.get("x-tenant-slug") ??
    extraerSlugDelHost(request.headers.get("host") ?? "")
  return obtenerTenantIdPorSlug(slug)
}

// Expresión regular para validar formato de fecha YYYY-MM-DD
const REGEX_FECHA = /^\d{4}-\d{2}-\d{2}$/

// GET /api/disponibilidad?instalacionId=xxx&fecha=2026-03-24
// Ruta pública: no requiere autenticación (UI-FLOWS.md — disponibilidad es pública)
// El tenantId se obtiene del header x-tenant-id inyectado por el middleware.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const instalacionId = searchParams.get("instalacionId")
  const fecha = searchParams.get("fecha") // formato esperado: "YYYY-MM-DD"

  const tenantId = await resolverTenantId(request)

  if (!tenantId) {
    return NextResponse.json({ error: "Tenant no identificado" }, { status: 400 })
  }

  if (!instalacionId || !fecha) {
    return NextResponse.json(
      { error: "Los parámetros instalacionId y fecha son obligatorios" },
      { status: 400 }
    )
  }

  // Validar formato de fecha YYYY-MM-DD (SEG-02)
  if (!REGEX_FECHA.test(fecha)) {
    return NextResponse.json(
      { error: "El parámetro fecha debe tener formato YYYY-MM-DD" },
      { status: 400 }
    )
  }

  try {
    // Verificar que la instalación existe y pertenece al tenant del request
    const instalacion = await prisma.instalacion.findFirst({
      where: { id: instalacionId, tenantId },
    })
    if (!instalacion) {
      return NextResponse.json({ error: "Instalación no encontrada" }, { status: 404 })
    }

    // Cargar la configuración de slots del tenant desde BD
    const tenantData = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { configuracion: true },
    })
    const configTenant = parsearConfiguracion(tenantData?.configuracion ?? null)
    const slotsConfig = configTenant.slots ?? SLOTS_CONFIG_DEFAULT
    const slotsDisponibles = generarSlots(slotsConfig)

    // Si la instalación está desactivada, devolver todos los slots como bloqueados
    if (!instalacion.activa) {
      const slots = slotsDisponibles.map((slot) => ({
        horaInicio: slot.horaInicio,
        horaFin: slot.horaFin,
        estado: "bloqueado" as const,
      }))
      return NextResponse.json({ slots })
    }

    // Obtener reservas activas de esa instalación en esa fecha.
    // Los límites del día se calculan en hora Madrid para que la consulta
    // capture correctamente los registros almacenados con UTC real español.
    const inicioDia = crearHoraEnMadrid(fecha, "00:00")
    const finDia = new Date(crearHoraEnMadrid(fecha, "00:00").getTime() + 24 * 60 * 60 * 1000 - 1)

    // Comprobar si el día es festivo para este tenant (puntual o anual por mes/día)
    const festivoPuntual = await prisma.festivo.findFirst({
      where: { tenantId, repetirAnual: false, fecha: { gte: inicioDia, lte: finDia } },
      select: { nombre: true },
    })

    // Para festivos anuales comparamos mes/día en memoria (número de festivos es pequeño)
    const [, , mesStr, diaStr] = fecha.match(/^(\d{4})-(\d{2})-(\d{2})$/)!
    const mes = parseInt(mesStr)
    const dia = parseInt(diaStr)
    const todosLosAnuales = await prisma.festivo.findMany({
      where: { tenantId, repetirAnual: true },
      select: { nombre: true, fecha: true },
    })
    const festivoAnual = todosLosAnuales.find(
      (f) => f.fecha.getUTCMonth() + 1 === mes && f.fecha.getUTCDate() === dia
    ) ?? null

    const festivoDelDia = festivoPuntual ?? festivoAnual

    // Si el día es festivo, devolver todos los slots como bloqueados
    if (festivoDelDia) {
      const slots = slotsDisponibles.map((slot) => ({
        horaInicio: slot.horaInicio,
        horaFin: slot.horaFin,
        estado: "bloqueado" as const,
      }))
      return NextResponse.json({ slots, festivoDelDia })
    }

    const reservasDelDia = await prisma.reserva.findMany({
      where: {
        tenantId,
        instalacionId,
        estado: "ACTIVA",
        horaInicio: { gte: inicioDia, lte: finDia },
      },
      select: { horaInicio: true, horaFin: true },
    })

    // Obtener bloqueos activos del tenant que cubran algún momento del día
    const bloqueos = await prisma.bloqueo.findMany({
      where: {
        tenantId,
        instalacionId,
        activo: true,
        fechaInicio: { lte: finDia },
        fechaFin: { gte: inicioDia },
      },
      select: { fechaInicio: true, fechaFin: true },
    })

    const ahora = new Date()

    // Construir los slots del día según la configuración del tenant.
    // Las fechas se generan con UTC real para hora local española (Europe/Madrid).
    const slots = slotsDisponibles.map((slot) => {
      const horaInicioDate = crearHoraEnMadrid(fecha, slot.horaInicio)
      const horaFinDate = crearHoraEnMadrid(fecha, slot.horaFin)

      // Slot ya pasado
      if (horaInicioDate <= ahora) {
        return { horaInicio: slot.horaInicio, horaFin: slot.horaFin, estado: "pasado" as const }
      }

      // Slot bloqueado por admin
      const estaBloqueado = bloqueos.some(
        (b) => b.fechaInicio < horaFinDate && b.fechaFin > horaInicioDate
      )
      if (estaBloqueado) {
        return { horaInicio: slot.horaInicio, horaFin: slot.horaFin, estado: "bloqueado" as const }
      }

      // Slot con reserva activa (comparar por horaInicio exacta)
      const estaOcupado = reservasDelDia.some(
        (r) => r.horaInicio.getTime() === horaInicioDate.getTime()
      )
      if (estaOcupado) {
        return { horaInicio: slot.horaInicio, horaFin: slot.horaFin, estado: "ocupado" as const }
      }

      return { horaInicio: slot.horaInicio, horaFin: slot.horaFin, estado: "libre" as const }
    })

    return NextResponse.json({ slots })
  } catch (err) {
    console.error("Error al obtener disponibilidad:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
