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

  // Título de la pestaña del navegador
  useEffect(() => { document.title = "Panel de administración" }, [])

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
      <div className="p-4 sm:p-6 md:p-6">
        <div className="max-w-6xl space-y-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Resumen de actividad</h2>
            <p className="text-sm sm:text-base text-gray-500 mt-1">Métricas generales del sistema</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
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
            {error || "Error al cargar las métricas"}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 md:p-6">
      <div className="max-w-6xl space-y-6 sm:space-y-8">
        {/* Cabecera */}
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Resumen de actividad</h2>
          <p className="text-sm sm:text-base text-gray-500 mt-1">Métricas generales del sistema</p>
        </div>

        {/* Grid de métricas */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white border border-gray-200 rounded-lg p-5 sm:p-6">
            <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Reservas hoy
            </h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{metricas.reservasHoy}</p>
            <p className="text-xs text-gray-500 mt-2">nuevas reservas</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-5 sm:p-6">
            <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Reservas activas
            </h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{metricas.reservasActivas}</p>
            <p className="text-xs text-gray-500 mt-2">en todo el sistema</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-5 sm:p-6">
            <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Instalaciones activas
            </h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{metricas.pistasActivas}</p>
            <p className="text-xs text-gray-500 mt-2">disponibles</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-5 sm:p-6">
            <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Cancelaciones hoy
            </h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{metricas.cancelacionesHoy}</p>
            <p className="text-xs text-gray-500 mt-2">canceladas</p>
          </div>
        </div>

        {/* Accesos rápidos */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/admin/reservas"
            className="block p-5 sm:p-6 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
          >
            <h3 className="font-semibold text-sm sm:text-base text-gray-900">Gestionar reservas</h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-2">Ver, filtrar y cancelar reservas</p>
          </Link>

          <Link
            href="/admin/bloqueos"
            className="block p-5 sm:p-6 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
          >
            <h3 className="font-semibold text-sm sm:text-base text-gray-900">Crear bloqueos</h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-2">Bloquear fechas y franjas horarias</p>
          </Link>

          <Link
            href="/admin/pistas"
            className="block p-5 sm:p-6 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
          >
            <h3 className="font-semibold text-sm sm:text-base text-gray-900">Gestionar instalaciones</h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-2">Crear, editar y desactivar instalaciones</p>
          </Link>

          <Link
            href="/admin/usuarios"
            className="block p-5 sm:p-6 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
          >
            <h3 className="font-semibold text-sm sm:text-base text-gray-900">Gestionar administradores</h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-2">Crear y eliminar cuentas administrativas</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
