"use client"

import { useState, useEffect } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"

interface PreferenciaNotificacionData {
  recordatorioReserva?: boolean
  cancelacionPropia?: boolean
  cancelacionAdmin?: boolean
  notificacionesEmail?: boolean
  notificacionesPush?: boolean
  notificacionesAviso?: boolean
}

interface PreferenciasNotificacionProps {
  onGuardado?: () => void
}

/**
 * Componente para gestionar preferencias de notificación del usuario.
 * Permite activar/desactivar:
 * - Recordatorio 1h antes de la reserva
 * - Aviso cuando cancelo mi reserva
 * - Aviso cuando admin cancela mi reserva
 */
export default function PreferenciasNotificacion({ onGuardado }: PreferenciasNotificacionProps) {
  const { toast } = useToast()

  // Estado de las preferencias
  const [recordatorioReserva, setRecordatorioReserva] = useState(false)
  const [cancelacionPropia, setCancelacionPropia] = useState(false)
  const [cancelacionAdmin, setCancelacionAdmin] = useState(false)

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
      setRecordatorioReserva(datos.recordatorioReserva ?? false)
      setCancelacionPropia(datos.cancelacionPropia ?? false)
      setCancelacionAdmin(datos.cancelacionAdmin ?? false)
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
          recordatorioReserva,
          cancelacionPropia,
          cancelacionAdmin,
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
        <Skeleton className="h-10 w-32" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Checkbox 1: Recordatorio de reserva */}
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

      {/* Checkbox 2: Aviso de cancelación propia */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="cancelacionPropia"
          checked={cancelacionPropia}
          onCheckedChange={(checked) => setCancelacionPropia(checked === true)}
          disabled={guardando}
        />
        <Label
          htmlFor="cancelacionPropia"
          className="text-sm font-medium text-gray-700 cursor-pointer"
        >
          Aviso cuando cancelo mi reserva
        </Label>
      </div>

      {/* Checkbox 3: Aviso de cancelación admin */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="cancelacionAdmin"
          checked={cancelacionAdmin}
          onCheckedChange={(checked) => setCancelacionAdmin(checked === true)}
          disabled={guardando}
        />
        <Label
          htmlFor="cancelacionAdmin"
          className="text-sm font-medium text-gray-700 cursor-pointer"
        >
          Aviso cuando admin cancela mi reserva
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
