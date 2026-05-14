import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { opcionesAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notificarSiguienteEnEspera } from "@/lib/lista-espera"

// DELETE /api/lista-espera/[id] — el ciudadano abandona la lista de espera
export async function DELETE(
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
  })
  if (!entrada) {
    return NextResponse.json({ error: "Entrada no encontrada" }, { status: 404 })
  }

  await prisma.listaEspera.update({
    where: { id: params.id },
    data: { estado: "CANCELADO" },
  })

  // Si el usuario abandona estando NOTIFICADO, pasar la oportunidad al siguiente
  if (entrada.estado === "NOTIFICADO") {
    notificarSiguienteEnEspera(
      entrada.instalacionId,
      entrada.fecha,
      entrada.horaInicio,
      tenantId!
    ).catch(() => {})
  }

  return NextResponse.json({ ok: true })
}
