/**
 * Dashboard del Instructor
 *
 * Muestra:
 * - Resumen: grupos activos, próximas sesiones
 * - Botón "Crear nueva clase"
 * - Enlace a "Mis Clases"
 */

'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface GrupoRecurrencia {
  id: string
  instalacion: { nombre: string }
  horaInicio: string
  frecuencia: string
  fechaInicio: Date
  fechaFin: Date
  activo: boolean
}

interface Reserva {
  id: string
  fecha: string
  estado: string
}

export default function DashboardInstructor() {
  const { data: sesion, status } = useSession()
  const router = useRouter()
  const [grupos, setGrupos] = useState<GrupoRecurrencia[]>([])
  const [proximasSesiones, setProximasSesiones] = useState<Reserva[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (status === 'authenticated' && sesion?.user?.rol !== 'INSTRUCTOR') {
      router.push('/')
      return
    }

    if (status === 'authenticated') {
      cargarDatos()
    }
  }, [status, sesion, router])

  async function cargarDatos() {
    try {
      setCargando(true)
      const response = await fetch('/api/instructor/reservas-recurrentes')

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`)
      }

      const data = await response.json()
      setGrupos(data.grupos || [])
      setProximasSesiones(data.proximasSesiones || [])
    } catch (error) {
      console.error('Error cargando grupos:', error)
      setGrupos([])
      setProximasSesiones([])
    } finally {
      setCargando(false)
    }
  }

  if (status === 'loading' || cargando) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Cargando clases...</p>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated' || sesion?.user?.rol !== 'INSTRUCTOR') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="text-center">
            <p className="text-gray-600">No tienes acceso a esta sección</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="w-full px-4 md:px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Mis Clases</h1>
            <p className="text-gray-600">Gestiona tus clases recurrentes y sesiones</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Grupos Activos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {grupos.filter(g => g.activo).length}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  clases recurrentes activas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Próximas Sesiones
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {proximasSesiones.length}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  sesiones en los próximos 30 días
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <Button asChild className="h-12">
              <Link href="/pistas">Crear nueva clase</Link>
            </Button>
            <Button asChild variant="outline" className="h-12">
              <Link href="/instructor/mis-clases">Gestionar mis clases</Link>
            </Button>
          </div>

          {grupos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Clases Recientes</CardTitle>
                <CardDescription>
                  Últimas clases creadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {grupos.slice(0, 3).map(grupo => (
                    <div
                      key={grupo.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {grupo.instalacion.nombre}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {grupo.horaInicio} — {grupo.frecuencia}
                        </p>
                      </div>
                      <Button asChild variant="ghost" size="sm">
                        <Link href="/instructor/mis-clases">Ver detalles</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {grupos.length === 0 && !cargando && (
            <Card>
              <CardContent className="text-center py-12">
                <div className="mb-4 text-gray-400">
                  <svg
                    className="w-16 h-16 mx-auto"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No hay clases creadas
                </h3>
                <p className="text-gray-600 mb-6">
                  Crea tu primera clase recurrente para empezar
                </p>
                <Button asChild>
                  <Link href="/pistas">Crear nueva clase</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
