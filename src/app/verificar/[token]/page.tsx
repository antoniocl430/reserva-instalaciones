import { prisma } from "@/lib/prisma"
import { CheckCircle2, XCircle } from "lucide-react"

interface Props {
  params: { token: string }
}

// Formatea una fecha ISO a texto legible en español (zona horaria Madrid)
function formatearFechaHora(iso: string | Date): string {
  return new Date(iso).toLocaleString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  })
}

// Página pública para verificar una reserva mediante QR — sin layout de panel admin
export default async function PaginaVerificarQR({ params }: Props) {
  const { token } = params

  const reserva = await prisma.reserva.findUnique({
    where: { qrToken: token },
    include: {
      instalacion: { select: { nombre: true } },
      usuario: { select: { nombre: true } },
    },
  })

  const esValida = reserva?.estado === "ACTIVA"

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Cabecera de estado */}
        <div
          className={`p-8 flex flex-col items-center gap-3 ${
            !reserva
              ? "bg-gray-100"
              : esValida
              ? "bg-green-50"
              : "bg-red-50"
          }`}
        >
          {!reserva ? (
            <>
              <XCircle className="w-16 h-16 text-gray-400" />
              <h1 className="text-xl font-bold text-gray-600">Token no encontrado</h1>
              <p className="text-sm text-gray-500 text-center">
                Este código QR no corresponde a ninguna reserva.
              </p>
            </>
          ) : esValida ? (
            <>
              <CheckCircle2 className="w-16 h-16 text-green-500" />
              <h1 className="text-xl font-bold text-green-700">Reserva válida</h1>
            </>
          ) : (
            <>
              <XCircle className="w-16 h-16 text-red-400" />
              <h1 className="text-xl font-bold text-red-600">Reserva cancelada</h1>
            </>
          )}
        </div>

        {/* Detalles de la reserva */}
        {reserva && (
          <div className="p-6 space-y-4">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Ciudadano
              </p>
              <p className="text-base font-semibold text-gray-900 mt-0.5">
                {reserva.usuario.nombre}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Instalación
              </p>
              <p className="text-base font-semibold text-gray-900 mt-0.5">
                {reserva.instalacion.nombre}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Fecha y hora
              </p>
              <p className="text-base font-semibold text-gray-900 mt-0.5 capitalize">
                {formatearFechaHora(reserva.horaInicio)}
              </p>
              <p className="text-sm text-gray-500">
                hasta las{" "}
                {new Date(reserva.horaFin).toLocaleTimeString("es-ES", {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "Europe/Madrid",
                })}
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
