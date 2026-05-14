import { prisma } from "@/lib/prisma"
import { enviarEmailSlotDisponible } from "@/lib/email"
import { enviarPushSlotDisponible } from "@/lib/push"

/**
 * Busca la siguiente entrada ESPERANDO para el slot dado y la pasa a NOTIFICADO.
 * Envía push + email de aviso (fire-and-forget).
 * Llamar fuera de transacciones (side-effect puro de notificación).
 */
export async function notificarSiguienteEnEspera(
  instalacionId: string,
  fecha: Date,
  horaInicio: string,
  tenantId: string
): Promise<void> {
  const siguiente = await prisma.listaEspera.findFirst({
    where: { instalacionId, fecha, horaInicio, tenantId, estado: "ESPERANDO" },
    orderBy: { creadoEn: "asc" },
    include: {
      usuario: { select: { nombre: true, email: true } },
      instalacion: { select: { nombre: true } },
    },
  })

  if (!siguiente) return

  const expiraEn = new Date(Date.now() + 30 * 60 * 1000)
  await prisma.listaEspera.update({
    where: { id: siguiente.id },
    data: { estado: "NOTIFICADO", expiraEn },
  })

  const fechaStr = fecha.toISOString().split("T")[0]
  const horaFin = "" // La horaFin se puede calcular en el futuro si se necesita en el email

  enviarEmailSlotDisponible({
    emailUsuario: siguiente.usuario.email,
    nombreUsuario: siguiente.usuario.nombre,
    nombreInstalacion: siguiente.instalacion.nombre,
    fecha: fechaStr,
    horaInicio,
    horaFin,
  }).catch(() => {})

  enviarPushSlotDisponible(siguiente.usuarioId, {
    instalacion: siguiente.instalacion.nombre,
    fecha: fechaStr,
    horaInicio,
  }).catch(() => {})
}
