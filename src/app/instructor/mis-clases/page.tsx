'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react'

interface Reserva {
  id: string
  fecha: string
  horaInicio: string
  estado: string
}

interface GrupoRecurrencia {
  id: string
  instalacion: { nombre: string }
  horaInicio: string
  frecuencia: string
  fechaInicio: Date | string
  fechaFin: Date | string
  activo: boolean
  reservas?: Reserva[]
}

export default function MisClases() {
  const { data: sesion, status } = useSession()
  const router = useRouter()
  const [grupos, setGrupos] = useState<GrupoRecurrencia[]>([])
  const [cargando, setCargando] = useState(true)
  const [expandedGrupo, setExpandedGrupo] = useState<string | null>(null)
  const [grupoACancelar, setGrupoACancelar] = useState<GrupoRecurrencia | null>(null)
  const [cancelando, setCancelando] = useState(false)

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
      cargarGrupos()
    }
  }, [status, sesion, router])

  async function cargarGrupos() {
    try {
      setCargando(true)
      const response = await fetch('/api/instructor/reservas-recurrentes')

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`)
      }

      const data = await response.json()
      setGrupos(data.grupos || [])
    } catch (error) {
      console.error('Error cargando grupos:', error)
      setGrupos([])
    } finally {
      setCargando(false)
    }
  }

  async function cancelarGrupo() {
    if (!grupoACancelar) return

    try {
      setCancelando(true)
      const response = await fetch(
        `/api/instructor/reservas-recurrentes/${grupoACancelar.id}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`)
      }

      await cargarGrupos()
      setGrupoACancelar(null)
    } catch (error) {
      console.error('Error cancelando grupo:', error)
      alert('Error al cancelar el grupo. Intenta de nuevo.')
    } finally {
      setCancelando(false)
    }
  }

  function formatearFecha(fecha: Date | string) {
    if (!fecha) return ''
    const date = typeof fecha === 'string' ? new Date(fecha) : fecha
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
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

  const gruposActivos = grupos.filter(g => g.activo)

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="w-full px-4 md:px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Mis Clases</h1>
            <p className="text-gray-600">
              Gestiona tus {gruposActivos.length} grupo{gruposActivos.length !== 1 ? 's' : ''} activo
            </p>
          </div>

          {gruposActivos.length > 0 ? (
            <div className="space-y-4">
              {gruposActivos.map(grupo => (
                <Card key={grupo.id} className="overflow-hidden">
                  <button
                    onClick={() =>
                      setExpandedGrupo(expandedGrupo === grupo.id ? null : grupo.id)
                    }
                    className="w-full text-left"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg">
                              {grupo.instalacion.nombre}
                            </CardTitle>
                            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                              {grupo.frecuencia === 'SEMANAL' ? 'Semanal' : 'Quincenal'}
                            </span>
                          </div>
                          <CardDescription className="mt-2">
                            {grupo.horaInicio} • {formatearFecha(grupo.fechaInicio)} -{' '}
                            {formatearFecha(grupo.fechaFin)}
                          </CardDescription>
                        </div>
                        <div className="text-gray-500">
                          {expandedGrupo === grupo.id ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </button>

                  {expandedGrupo === grupo.id && (
                    <CardContent className="border-t border-gray-200 pt-4">
                      {grupo.reservas && grupo.reservas.length > 0 && (
                        <div className="mb-6">
                          <h3 className="font-medium text-gray-900 mb-4">
                            Sesiones ({grupo.reservas.length})
                          </h3>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {grupo.reservas.map(sesion => (
                              <div
                                key={sesion.id}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm"
                              >
                                <div>
                                  <span className="font-medium text-gray-900">
                                    {formatearFecha(sesion.fecha)}
                                  </span>
                                  <span className="text-gray-500 ml-2">{sesion.horaInicio}</span>
                                </div>
                                <span
                                  className={`px-2 py-1 rounded text-xs font-medium ${
                                    sesion.estado === 'ACTIVA'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-gray-200 text-gray-800'
                                  }`}
                                >
                                  {sesion.estado}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-4 border-t border-gray-200">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setGrupoACancelar(grupo)}
                          className="flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Cancelar grupo
                        </Button>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          ) : (
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
                <p className="text-gray-600">
                  Crea tu primera clase recurrente desde la página de pistas
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <AlertDialog
        open={grupoACancelar !== null}
        onOpenChange={open => {
          if (!open) setGrupoACancelar(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar grupo de clases</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de cancelar todas las sesiones futuras de{' '}
              <strong>{grupoACancelar?.instalacion.nombre}</strong> a las{' '}
              <strong>{grupoACancelar?.horaInicio}</strong>. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800 my-4">
            Se cancelarán todas las sesiones futuras. Las sesiones pasadas no se afectarán.
          </div>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={cancelarGrupo}
              disabled={cancelando}
              className="bg-red-600 hover:bg-red-700"
            >
              {cancelando ? 'Cancelando...' : 'Confirmar cancelación'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
