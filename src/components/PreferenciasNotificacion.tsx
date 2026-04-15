"use client"

import { useState, useEffect } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"

interface PreferenciaNotificacionData {
  notificacionesEmail?: boolean
  notificacionesPush?: boolean
  recordatorioReserva?: boolean
  recordatorioCancel?: boolean
  notificacionesAviso?: boolean
}

interface PreferenciasNotificacionProps {
  onGuardado?: () => void
}

/**
 * Componente para gestionar preferencias de notificación del usuario.
 * Permite activar/desactivar:
 * - Notificaciones por email
 * - Notificaciones push
 * - Recordatorio 1h antes de la reserva
 * - Aviso de cancelación (propia o por admin)
 * - Avisos generales
 */
export default function PreferenciasNotificacion({ onGuardado }: PreferenciasNotificacionProps) {
  const { toast } = useToast()

  // Estado de las preferencias
  const [notificacionesEmail, setNotificacionesEmail] = useState(true)
  const [notificacionesPush, setNotificacionesPush] = useState(true)
  const [recordatorioReserva, setRecordatorioReserva] = useState(true)
  const [recordatorioCancel, setRecordatorioCancel] = useState(true)
  const [notificacionesAviso, setNotificacionesAviso] = useState(true)

  // Estado de carga
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)

  // Cargar preferencias al montar el componente
  useEffect(() => {
    cargarPreferencias()
  }, [])

  async function cargarPreferencias() {
    try {
      const respuesta = await fetch("/api/cuenta/preferencias-notificacion")
      if (!respuesta.ok) {
        throw new Error("Error al cargar preferencias")
      }
      const datos: PreferenciaNotificacionData = await respuesta.json()
      setNotificacionesEmail(datos.notificacionesEmail ?? true)
      setNotificacionesPush(datos.notificacionesPush ?? true)
      setRecordatorioReserva(datos.recordatorioReserva ?? true)
      setRecordatorioCancel(datos.recordatorioCancel ?? true)
      setNotificacionesAviso(datos.notificacionesAviso ?? true)
    } catch (error) {
      console.error("Error al cargar preferencias:", error)
      toast({
        title: "Error al cargar",
        description: "No se pudieron cargar tus preferencias. Por favor, recarga la página.",
        variant: "destructive",
      })
    } finally {
      setCargando(false)
    }
  }

  async function alGuardar() {
    setGuardando(true)

    try {
      const respuesta = await fetch("/api/cuenta/preferencias-notificacion", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notificacionesEmail,
          notificacionesPush,
          recordatorioReserva,
          recordatorioCancel,
          notificacionesAviso,
        }),
      })

      if (!respuesta.ok) {
        throw new Error("Error al guardar preferencias")
      }

      toast({
        title: "Preferencias guardadas",
        description: "Tus preferencias de notificación han sido actualizadas.",
      })

      // Llamar callback si está definido
      if (onGuardado) {
        onGuardado()
      }
    } catch (error) {
      console.error("Error al guardar:", error)
      toast({
        title: "Error al guardar",
        description: "No se pudieron guardar tus preferencias. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setGuardando(false)
    }
  }

  // Mostrar skeleton mientras se cargan las preferencias
  if (cargando) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-10 w-32" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Checkbox 1: Notificaciones por email */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="notificacionesEmail"
          checked={notificacionesEmail}
          onCheckedChange={(checked) => setNotificacionesEmail(checked === true)}
          disabled={guardando}
        />
        <Label
          htmlFor="notificacionesEmail"
          className="text-sm font-medium text-gray-700 cursor-pointer"
        >
          Recibir notificaciones por email
        </Label>
      </div>

      {/* Checkbox 2: Notificaciones push */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="notificacionesPush"
          checked={notificacionesPush}
          onCheckedChange={(checked) => setNotificacionesPush(checked === true)}
          disabled={guardando}
        />
        <Label
          htmlFor="notificacionesPush"
          className="text-sm font-medium text-gray-700 cursor-pointer"
        >
          Recibir notificaciones push
        </Label>
      </div>

      {/* Checkbox 3: Recordatorio de reserva */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="recordatorioReserva"
          checked={recordatorioReserva}
          onCheckedChange={(checked) => setRecordatorioReserva(checked === true)}
          disabled={guardando}
        />
        <Label
          htmlFor="recordatorioReserva"
          className="text-sm font-medium text-gray-700 cursor-pointer"
        >
          Recordatorio 1h antes de la reserva
        </Label>
      </div>

      {/* Checkbox 4: Aviso de cancelación */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="recordatorioCancel"
          checked={recordatorioCancel}
          onCheckedChange={(checked) => setRecordatorioCancel(checked === true)}
          disabled={guardando}
        />
        <Label
          htmlFor="recordatorioCancel"
          className="text-sm font-medium text-gray-700 cursor-pointer"
        >
          Aviso cuando se cancela mi reserva
        </Label>
      </div>

      {/* Checkbox 5: Avisos generales */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="notificacionesAviso"
          checked={notificacionesAviso}
          onCheckedChange={(checked) => setNotificacionesAviso(checked === true)}
          disabled={guardando}
        />
        <Label
          htmlFor="notificacionesAviso"
          className="text-sm font-medium text-gray-700 cursor-pointer"
        >
          Avisos y comunicados importantes
        </Label>
      </div>

      {/* Botón guardar */}
      <div className="mt-6">
        <Button
          onClick={alGuardar}
          disabled={guardando}
          className="w-full sm:w-auto flex items-center gap-2"
        >
          {guardando ? (
            <>
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Guardando...
            </>
          ) : "Guardar preferencias"}
        </Button>
      </div>
    </div>
  )
}
