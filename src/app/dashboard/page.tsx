import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { UserCircle, CalendarPlus, CalendarCheck, Clock } from "lucide-react"
import { opcionesAuth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { formatearFechaCorta, formatearHora } from "@/lib/formato"
import BotonesRGPD from "@/components/BotonesRGPD"

export const metadata = { title: "Inicio" }

export default async function PaginaDashboard() {
  // Proteccion de ruta: si no hay sesion, redirige al login
  const sesion = await getServerSession(opcionesAuth)
  if (!sesion) {
    redirect("/login?callbackUrl=/dashboard")
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
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-4 sm:py-8 space-y-6">
        {/* Saludo de bienvenida */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              Bienvenido/a, {sesion.user.name ?? "usuario"}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Gestiona tus reservas de instalaciones deportivas
            </p>
          </div>
          <Link
            href="/perfil"
            className="flex items-center gap-1.5 shrink-0 mt-1 text-sm font-medium text-foreground bg-card border border-border px-3 py-1.5 rounded-full hover:bg-muted transition-colors"
          >
            <UserCircle className="h-4 w-4 text-muted-foreground" />
            Mi perfil
          </Link>
        </div>

        {/* Accesos rapidos */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            href="/pistas"
            className="flex flex-col items-start gap-1 bg-blue-600 text-white font-medium px-4 sm:px-5 py-3 sm:py-4 rounded-xl hover:bg-blue-700 transition-colors"
          >
            <div className="flex items-center gap-2">
              <CalendarPlus className="h-4 w-4" />
              <span className="text-sm sm:text-base font-semibold">Reservar instalación</span>
            </div>
            <span className="text-xs sm:text-sm text-blue-100">Ver disponibilidad y reservar</span>
          </Link>
          <Link
            href="/mis-reservas"
            className="flex flex-col items-start gap-1 bg-card border border-border text-foreground font-medium px-4 sm:px-5 py-3 sm:py-4 rounded-xl hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm sm:text-base font-semibold">Mis reservas</span>
            </div>
            <span className="text-xs sm:text-sm text-muted-foreground">
              {totalActivas === 0
                ? "No tienes reservas activas"
                : totalActivas === 1
                ? "1 reserva activa"
                : `${totalActivas} reservas activas`}
            </span>
          </Link>
        </div>

        {/* Seccion: reservas activas */}
        <section className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Reservas activas</h2>
            {totalActivas > 0 && (
              <span className="text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 px-2 py-0.5 rounded-full">
                {totalActivas}
              </span>
            )}
          </div>

          {reservasActivas.length === 0 ? (
            <div className="px-4 py-8 text-center space-y-2">
              <p className="text-sm text-muted-foreground">No tienes reservas activas</p>
              <Link
                href="/pistas"
                className="inline-block text-sm text-blue-600 hover:underline font-medium"
              >
                Reserva una instalación ahora
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {reservasActivas.map((reserva, indice) => (
                <li
                  key={reserva.id}
                  className={`px-4 py-3 flex items-center justify-between gap-2 ${
                    indice === 0 ? "border-l-4 border-blue-600 bg-blue-50 dark:bg-blue-950/20" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {indice === 0 && <span className="text-blue-600 font-bold" aria-hidden="true">⭐ </span>}
                      {reserva.instalacion.nombre}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 flex-wrap">
                      <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
                      <span>{formatearFechaCorta(reserva.horaInicio)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatearHora(reserva.horaInicio)} – {formatearHora(reserva.horaFin)}</span>
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 px-2 py-0.5 rounded-full">
                    Activa
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Sección: Mis datos (RGPD) */}
        <section aria-labelledby="titulo-mis-datos" className="border border-border rounded-lg p-5 sm:p-6 bg-card">
          <h2 id="titulo-mis-datos" className="text-base font-semibold text-foreground mb-1">Mis datos</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Conforme al RGPD, puedes exportar o eliminar tu cuenta desde tu perfil.
          </p>
          <BotonesRGPD />
        </section>
      </div>
    </main>
  )
}
