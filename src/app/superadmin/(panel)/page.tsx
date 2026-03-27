"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import { Building2, Users, CalendarDays, Activity } from "lucide-react"

interface MetricasSuperadmin {
  totalTenants: number
  tenantsActivos: number
  totalUsuarios: number
  totalInstalaciones: number
  totalReservasHoy: number
}

export default function SuperadminDashboard() {
  const [metricas, setMetricas] = useState<MetricasSuperadmin | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function cargarMetricas() {
      try {
        const res = await fetch("/api/superadmin/metricas")
        if (!res.ok) {
          throw new Error("Error al cargar metricas")
        }
        const data = await res.json()
        setMetricas(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido")
      } finally {
        setCargando(false)
      }
    }

    cargarMetricas()
  }, [])

  if (cargando) {
    return (
      <div className="p-4 sm:p-6 md:p-6">
        <div className="max-w-6xl space-y-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Resumen global</h2>
            <p className="text-sm sm:text-base text-gray-500 mt-1">Metricas de todos los tenants</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !metricas) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-sm text-red-700">
            {error || "Error al cargar las metricas"}
          </div>
        </div>
      </div>
    )
  }

  const tarjetas = [
    {
      titulo: "Total tenants",
      valor: metricas.totalTenants,
      subtitulo: "ayuntamientos registrados",
      icono: Building2,
    },
    {
      titulo: "Tenants activos",
      valor: metricas.tenantsActivos,
      subtitulo: "actualmente operativos",
      icono: Activity,
    },
    {
      titulo: "Total usuarios",
      valor: metricas.totalUsuarios,
      subtitulo: "en todos los tenants",
      icono: Users,
    },
    {
      titulo: "Total instalaciones",
      valor: metricas.totalInstalaciones,
      subtitulo: "pistas registradas",
      icono: Building2,
    },
    {
      titulo: "Reservas hoy",
      valor: metricas.totalReservasHoy,
      subtitulo: "reservas del dia",
      icono: CalendarDays,
    },
  ]

  return (
    <div className="p-4 sm:p-6 md:p-6">
      <div className="max-w-6xl space-y-6 sm:space-y-8">
        {/* Cabecera */}
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Resumen global</h2>
          <p className="text-sm sm:text-base text-gray-500 mt-1">Metricas de todos los tenants</p>
        </div>

        {/* Grid de metricas */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {tarjetas.map((tarjeta) => {
            const Icono = tarjeta.icono
            return (
              <div
                key={tarjeta.titulo}
                className="bg-white border border-gray-200 rounded-lg p-5 sm:p-6"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    {tarjeta.titulo}
                  </h3>
                  <Icono size={18} className="text-gray-400" />
                </div>
                <p className="text-3xl font-bold text-gray-900 mt-2">{tarjeta.valor}</p>
                <p className="text-xs text-gray-500 mt-2">{tarjeta.subtitulo}</p>
              </div>
            )
          })}
        </div>

        {/* Acceso rapido */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/superadmin/tenants"
            className="block p-5 sm:p-6 bg-white border border-gray-200 rounded-lg hover:border-purple-300 hover:shadow-md transition-all"
          >
            <h3 className="font-semibold text-sm sm:text-base text-gray-900">Gestionar tenants</h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-2">Crear, editar y suspender ayuntamientos</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
