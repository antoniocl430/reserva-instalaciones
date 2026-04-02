import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { opcionesAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { formatearFechaCorta, formatearHora } from "@/lib/formato"
import BotonesRGPD from "@/components/BotonesRGPD"

export const metadata = { title: "Inicio" }

export default async function PaginaDashboard() {
  // Proteccion de ruta: si no hay sesion, redirige al login
  const sesion = await getServerSession(opcionesAuth)
  if (!sesion) {
    redirect("/login")
  }

  // Cargamos las reservas activas directamente desde Prisma en el servidor
  const ahora = new Date()
  const reservasActivas = await prisma.reserva.findMany({
    where: {
      usuarioId: sesion.user.id,
      estado: "ACTIVA",
      horaInicio: { gte: ahora },
    },
    include: { instalacion: { select: { id: true, nombre: true } } },
    orderBy: { horaInicio: "asc" },
  })

  const totalActivas = reservasActivas.length

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-4 sm:py-8 space-y-6">
        {/* Saludo de bienvenida */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Bienvenido/a, {sesion.user.name ?? "usuario"}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Gestiona tus reservas de instalaciones deportivas
            </p>
          </div>
          <Link
            href="/perfil"
            className="flex items-center gap-1.5 shrink-0 mt-1 text-sm font-medium text-gray-700 bg-white border border-gray-200 px-3 py-1.5 rounded-full hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
            Mi perfil
          </Link>
        </div>

        {/* Accesos rapidos */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            href="/pistas"
            className="flex flex-col items-start gap-1 bg-blue-600 text-white font-medium px-4 sm:px-5 py-3 sm:py-4 rounded-xl hover:bg-blue-700 transition-colors"
          >
            <span className="text-sm sm:text-base font-semibold">Reservar instalación</span>
            <span className="text-xs sm:text-sm text-blue-100">Ver disponibilidad y reservar</span>
          </Link>
          <Link
            href="/mis-reservas"
            className="flex flex-col items-start gap-1 bg-white border border-gray-200 text-gray-800 font-medium px-4 sm:px-5 py-3 sm:py-4 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm sm:text-base font-semibold">Mis reservas</span>
            <span className="text-xs sm:text-sm text-gray-500">
              {totalActivas === 0
                ? "No tienes reservas activas"
                : totalActivas === 1
                ? "1 reserva activa"
                : `${totalActivas} reservas activas`}
            </span>
          </Link>
        </div>

        {/* Seccion: reservas activas */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Reservas activas</h2>
            {totalActivas > 0 && (
              <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                {totalActivas}
              </span>
            )}
          </div>

          {reservasActivas.length === 0 ? (
            <div className="px-4 py-8 text-center space-y-2">
              <p className="text-sm text-gray-500">No tienes reservas activas</p>
              <Link
                href="/pistas"
                className="inline-block text-sm text-blue-600 hover:underline font-medium"
              >
                Reserva una instalación ahora
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {reservasActivas.map((reserva) => (
                <li key={reserva.id} className="px-4 py-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {reserva.instalacion.nombre}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatearFechaCorta(reserva.horaInicio)} · {formatearHora(reserva.horaInicio)} – {formatearHora(reserva.horaFin)}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    Activa
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Sección: Mis datos (RGPD) */}
        <section aria-labelledby="titulo-mis-datos" className="mt-8 border border-gray-200 rounded-lg p-6 bg-white">
          <h2 id="titulo-mis-datos" className="text-lg font-semibold text-gray-900 mb-1">Mis datos</h2>
          <p className="text-sm text-gray-600 mb-4">
            Conforme al RGPD, puedes exportar o eliminar tu cuenta desde tu perfil.
          </p>
          <BotonesRGPD />
        </section>
      </div>
    </main>
  )
}
