/**
 * Hook useToast — gestión global de notificaciones toast
 *
 * Basado en el patrón estándar de shadcn/ui.
 * Estado global mediante reducer para coordinar múltiples componentes.
 */

import * as React from 'react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type VarianteToast = 'default' | 'destructive'

export interface PropiedadesToast {
  id?: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactElement
  variant?: VarianteToast
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

// ─── Constantes ───────────────────────────────────────────────────────────────

/** Máximo de toasts visibles simultáneamente */
const LIMITE_TOASTS = 1

/** Tiempo en ms hasta el auto-dismiss */
const DURACION_MS = 5000

// ─── Tipos del reducer ────────────────────────────────────────────────────────

type AccionReducer =
  | { type: 'TOAST_AGREGAR'; toast: PropiedadesToastInterno }
  | { type: 'TOAST_ACTUALIZAR'; toast: Partial<PropiedadesToastInterno> & { id: string } }
  | { type: 'TOAST_DESCARTAR'; toastId?: string }
  | { type: 'TOAST_ELIMINAR'; toastId?: string }

interface PropiedadesToastInterno extends PropiedadesToast {
  id: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface EstadoToasts {
  toasts: PropiedadesToastInterno[]
}

// ─── Estado global compartido ─────────────────────────────────────────────────

let contadorId = 0

/** Genera un ID único para cada toast */
function generarId(): string {
  contadorId = (contadorId + 1) % Number.MAX_SAFE_INTEGER
  return String(contadorId)
}

/** Mapa de temporizadores para auto-dismiss */
const mapaToastTimeout = new Map<string, ReturnType<typeof setTimeout>>()

/** Listeners suscritos al estado global */
const listeners: Array<(estado: EstadoToasts) => void> = []

/** Estado global mutable */
let estadoMemoria: EstadoToasts = { toasts: [] }

function despacharAccion(accion: AccionReducer) {
  estadoMemoria = reducer(estadoMemoria, accion)
  listeners.forEach((listener) => listener(estadoMemoria))
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

function reducer(estado: EstadoToasts, accion: AccionReducer): EstadoToasts {
  switch (accion.type) {
    case 'TOAST_AGREGAR':
      return {
        ...estado,
        toasts: [accion.toast, ...estado.toasts].slice(0, LIMITE_TOASTS),
      }

    case 'TOAST_ACTUALIZAR':
      return {
        ...estado,
        toasts: estado.toasts.map((t) =>
          t.id === accion.toast.id ? { ...t, ...accion.toast } : t
        ),
      }

    case 'TOAST_DESCARTAR': {
      // Programar eliminación diferida para permitir animación de salida
      if (accion.toastId) {
        programarEliminacion(accion.toastId)
      } else {
        estado.toasts.forEach((t) => programarEliminacion(t.id))
      }

      return {
        ...estado,
        toasts: estado.toasts.map((t) =>
          t.id === accion.toastId || accion.toastId === undefined
            ? { ...t, open: false }
            : t
        ),
      }
    }

    case 'TOAST_ELIMINAR':
      if (accion.toastId === undefined) {
        return { ...estado, toasts: [] }
      }
      return {
        ...estado,
        toasts: estado.toasts.filter((t) => t.id !== accion.toastId),
      }

    default:
      return estado
  }
}

// ─── Utilidades ───────────────────────────────────────────────────────────────

/** Programa la eliminación del toast del DOM tras la animación de salida */
function programarEliminacion(toastId: string) {
  if (mapaToastTimeout.has(toastId)) return

  const timeout = setTimeout(() => {
    mapaToastTimeout.delete(toastId)
    despacharAccion({ type: 'TOAST_ELIMINAR', toastId })
  }, 1000) // 1s para que la animación de salida termine

  mapaToastTimeout.set(toastId, timeout)
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Muestra un nuevo toast.
 * Devuelve funciones para descartarlo o actualizarlo manualmente.
 */
function toast(props: PropiedadesToast) {
  const id = generarId()

  function actualizar(propiedades: PropiedadesToast) {
    despacharAccion({
      type: 'TOAST_ACTUALIZAR',
      toast: { ...propiedades, id },
    })
  }

  function descartar() {
    despacharAccion({ type: 'TOAST_DESCARTAR', toastId: id })
  }

  despacharAccion({
    type: 'TOAST_AGREGAR',
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) descartar()
      },
    },
  })

  // Auto-dismiss tras DURACION_MS
  setTimeout(() => descartar(), DURACION_MS)

  return { id, descartar, actualizar }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Hook para acceder al estado global de toasts y la función toast().
 * Se puede usar en cualquier componente React.
 */
function useToast() {
  const [estado, setEstado] = React.useState<EstadoToasts>(estadoMemoria)

  React.useEffect(() => {
    listeners.push(setEstado)
    return () => {
      const indice = listeners.indexOf(setEstado)
      if (indice > -1) listeners.splice(indice, 1)
    }
  }, [estado])

  return {
    ...estado,
    toast,
    descartar: (toastId?: string) =>
      despacharAccion({ type: 'TOAST_DESCARTAR', toastId }),
  }
}

export { useToast, toast }
