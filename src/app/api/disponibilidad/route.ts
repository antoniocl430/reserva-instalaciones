import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { extraerSlugDelHost, obtenerTenantIdPorSlug } from "@/lib/tenant"

// Resuelve el tenantId desde x-tenant-slug (inyectado por el middleware) o el host.
// NO se acepta x-tenant-id desde el cliente — podría usarse para acceder a datos de otro tenant.
async function resolverTenantId(request: NextRequest): Promise<string | null> {
  const slug =
    request.headers.get("x-tenant-slug") ??
    extraerSlugDelHost(request.headers.get("host") ?? "")
  return obtenerTenantIdPorSlug(slug)
}

// Slots disponibles: horarios fijos con duraciones variables
const SLOTS_DISPONIBLES = [
  { horaInicio: "08:00", horaFin: "09:15" },
  { horaInicio: "09:15", horaFin: "10:30" },
  { horaInicio: "10:30", horaFin: "11:45" },
  { horaInicio: "11:45", horaFin: "13:00" },
  { horaInicio: "16:45", horaFin: "18:00" },
  { horaInicio: "18:00", horaFin: "19:15" },
  { horaInicio: "19:15", horaFin: "20:30" },
]

// Expresión regular para validar formato de fecha YYYY-MM-DD
const REGEX_FECHA = /^\d{4}-\d{2}-\d{2}$/

/**
 * Crea un objeto Date cuyo instante UTC corresponde a la hora indicada (en formato HH:MM)
 * en la zona horaria Europe/Madrid (UTC+1 invierno / UTC+2 verano).
 *
 * Ejemplo (horario de invierno, UTC+1):
 *   crearHoraEnMadrid("2026-03-25", "10:30") → 2026-03-25T09:30:00.000Z
 *   Formateado con timeZone "Europe/Madrid" → "10:30" ✓
 */
function crearHoraEnMadrid(fechaStr: string, horaStr: string): Date {
  const [horas, minutos] = horaStr.split(":").map(Number)
  // Crear instante provisional asumiendo que la hora es UTC
  const base = new Date(`${fechaStr}T${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}:00.000Z`)
  // Averiguar qué hora muestra Madrid para ese instante UTC provisional
  const horaMadrid = parseInt(
    base.toLocaleString("en-US", {
      timeZone: "Europe/Madrid",
      hour: "numeric",
      hour12: false,
    })
  )
  // diff = cuántas horas está Madrid por delante de UTC en ese momento
  // Ej: UTC+1 → horaMadrid=11, hora=10, diff=1
  let diff = horaMadrid - horas
  if (diff > 12) diff -= 24
  if (diff < -12) diff += 24
  // Restamos el offset para que Madrid muestre exactamente 'horas'
  return new Date(base.getTime() - diff * 60 * 60 * 1000)
}

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

    // Si la instalación está desactivada, devolver todos los slots como bloqueados
    if (!instalacion.activa) {
      const slots = SLOTS_DISPONIBLES.map((slot) => ({
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

    // Construir los 7 slots fijos del día.
    // Las fechas se generan con UTC real para hora local española (Europe/Madrid).
    const slots = SLOTS_DISPONIBLES.map((slot) => {
      const horaInicio = crearHoraEnMadrid(fecha, slot.horaInicio)
      const horaFin = crearHoraEnMadrid(fecha, slot.horaFin)

      // Slot ya pasado
      if (horaInicio <= ahora) {
        return { horaInicio: slot.horaInicio, horaFin: slot.horaFin, estado: "pasado" as const }
      }

      // Slot bloqueado por admin
      const estaBloqueado = bloqueos.some(
        (b) => b.fechaInicio < horaFin && b.fechaFin > horaInicio
      )
      if (estaBloqueado) {
        return { horaInicio: slot.horaInicio, horaFin: slot.horaFin, estado: "bloqueado" as const }
      }

      // Slot con reserva activa (comparar por horaInicio exacta)
      const estaOcupado = reservasDelDia.some(
        (r) => r.horaInicio.getTime() === horaInicio.getTime()
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
