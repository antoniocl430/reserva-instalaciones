"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface Metricas {
  reservasHoy: number
  reservasActivas: number
  pistasActivas: number
  cancelacionesHoy: number
}

export default function AdminDashboard() {
  const [metricas, setMetricas] = useState<Metricas | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function cargarMetricas() {
      try {
        const res = await fetch("/api/admin/metricas")
        if (!res.ok) {
          throw new Error("Error al cargar métricas")
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
      <div className="p-4 sm:p-6 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm sm:text-base text-gray-500 mt-1">Resumen de actividad</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
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
            {error || "Error al cargar las métricas"}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
        {/* Cabecera */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">Resumen de actividad</p>
        </div>

        {/* Grid de métricas */}
        <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Reservas hoy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">{metricas.reservasHoy}</p>
              <p className="text-xs text-gray-500 mt-1">nuevas reservas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Reservas activas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{metricas.reservasActivas}</p>
              <p className="text-xs text-gray-500 mt-1">en todo el sistema</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Pistas activas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-600">{metricas.pistasActivas}</p>
              <p className="text-xs text-gray-500 mt-1">disponibles</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Cancelaciones hoy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-orange-600">{metricas.cancelacionesHoy}</p>
              <p className="text-xs text-gray-500 mt-1">canceladas</p>
            </CardContent>
          </Card>
        </div>

        {/* Accesos rápidos */}
        <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2">
          <Link
            href="/admin/reservas"
            className="block p-4 sm:p-6 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
          >
            <h3 className="font-semibold text-sm sm:text-base text-gray-900">Gestionar reservas</h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Ver, filtrar y cancelar reservas</p>
          </Link>

          <Link
            href="/admin/bloqueos"
            className="block p-4 sm:p-6 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
          >
            <h3 className="font-semibold text-sm sm:text-base text-gray-900">Crear bloqueos</h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Bloquear fechas y franjas horarias</p>
          </Link>

          <Link
            href="/admin/pistas"
            className="block p-4 sm:p-6 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
          >
            <h3 className="font-semibold text-sm sm:text-base text-gray-900">Gestionar pistas</h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Crear, editar y desactivar pistas</p>
          </Link>

          <Link
            href="/admin/usuarios"
            className="block p-4 sm:p-6 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
          >
            <h3 className="font-semibold text-sm sm:text-base text-gray-900">Gestionar admins</h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Crear y eliminar cuentas administrativas</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
