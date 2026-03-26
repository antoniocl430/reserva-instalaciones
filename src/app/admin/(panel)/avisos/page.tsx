"use client"

/**
 * Página de administración del tablón de avisos.
 *
 * Permite al administrador:
 *   - Ver todos los avisos (activos e inactivos)
 *   - Crear un nuevo aviso
 *   - Editar un aviso existente
 *   - Eliminar (soft delete) un aviso
 *
 * Ruta: /admin/avisos
 * Acceso: solo ADMIN (protegido por el layout /admin/(panel))
 */

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Bell, Plus, Pencil, Trash2, AlertCircle } from "lucide-react"
import FormularioAviso, {
  AvisoExistente,
  DatosFormularioAviso,
} from "@/components/admin/FormularioAviso"

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Aviso {
  id: string
  titulo: string
  descripcion: string
  tipo: "INFO" | "AVISO" | "CIERRE"
  fecha: string
  activo: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Colores de badge por tipo de aviso
const ESTILOS_TIPO: Record<string, { clase: string; etiqueta: string }> = {
  INFO: { clase: "bg-blue-100 text-blue-700", etiqueta: "Información" },
  AVISO: { clase: "bg-amber-100 text-amber-700", etiqueta: "Aviso" },
  CIERRE: { clase: "bg-red-100 text-red-700", etiqueta: "Cierre" },
}

// Formatea una fecha ISO a formato legible en español
function formatearFecha(fechaIso: string): string {
  try {
    return new Date(fechaIso).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  } catch {
    return fechaIso
  }
}

// Convierte la fecha ISO a string YYYY-MM-DD para el formulario
function fechaParaFormulario(fechaIso: string): string {
  try {
    return new Date(fechaIso).toISOString().split("T")[0]
  } catch {
    return ""
  }
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function PaginaAdminAvisos() {
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Estado del dialog de formulario
  const [dialogAbierto, setDialogAbierto] = useState(false)
  const [avisoEditando, setAvisoEditando] = useState<AvisoExistente | undefined>(undefined)

  // Estado de error al guardar
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null)

  // Estado del dialog de confirmación de eliminación
  const [dialogEliminar, setDialogEliminar] = useState(false)
  const [avisoEliminar, setAvisoEliminar] = useState<Aviso | null>(null)
  const [eliminando, setEliminando] = useState(false)

  // ── Carga de datos ─────────────────────────────────────────────────────────

  async function cargarAvisos() {
    setCargando(true)
    setError(null)
    try {
      // El admin necesita ver todos los avisos, activos e inactivos.
      // El parámetro ?todos=true activa el modo admin en el endpoint.
      const res = await fetch("/api/avisos?todos=true")
      if (!res.ok) throw new Error("Error al cargar los avisos")
      const datos: Aviso[] = await res.json()
      setAvisos(datos)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarAvisos()
  }, [])

  // ── Abrir formulario ───────────────────────────────────────────────────────

  function abrirCrear() {
    setAvisoEditando(undefined)
    setErrorGuardar(null)
    setDialogAbierto(true)
  }

  function abrirEditar(aviso: Aviso) {
    setAvisoEditando({
      id: aviso.id,
      titulo: aviso.titulo,
      descripcion: aviso.descripcion,
      tipo: aviso.tipo,
      fecha: fechaParaFormulario(aviso.fecha),
      activo: aviso.activo,
    })
    setErrorGuardar(null)
    setDialogAbierto(true)
  }

  function cerrarDialog() {
    setDialogAbierto(false)
    setAvisoEditando(undefined)
    setErrorGuardar(null)
  }

  // ── Guardar aviso (crear o editar) ─────────────────────────────────────────

  async function guardarAviso(datos: DatosFormularioAviso) {
    setErrorGuardar(null)
    try {
      let res: Response

      if (avisoEditando) {
        // Editar aviso existente
        res = await fetch(`/api/avisos/${avisoEditando.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(datos),
        })
      } else {
        // Crear nuevo aviso
        res = await fetch("/api/avisos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(datos),
        })
      }

      if (!res.ok) {
        const cuerpo = await res.json()
        throw new Error(cuerpo.error ?? "Error al guardar el aviso")
      }

      // Recargar lista y cerrar dialog
      await cargarAvisos()
      cerrarDialog()
    } catch (err) {
      setErrorGuardar(err instanceof Error ? err.message : "Error al guardar")
      throw err // Re-lanzar para que FormularioAviso desactive el loading
    }
  }

  // ── Eliminar aviso ─────────────────────────────────────────────────────────

  function confirmarEliminar(aviso: Aviso) {
    setAvisoEliminar(aviso)
    setDialogEliminar(true)
  }

  async function ejecutarEliminar() {
    if (!avisoEliminar) return
    setEliminando(true)
    try {
      const res = await fetch(`/api/avisos/${avisoEliminar.id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const cuerpo = await res.json()
        throw new Error(cuerpo.error ?? "Error al eliminar el aviso")
      }
      await cargarAvisos()
      setDialogEliminar(false)
      setAvisoEliminar(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar")
    } finally {
      setEliminando(false)
    }
  }

  // ── Render: cargando ───────────────────────────────────────────────────────

  if (cargando) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-12 w-full" />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    )
  }

  // ── Render principal ───────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Cabecera */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bell className="w-6 h-6 text-gray-700" aria-hidden="true" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Avisos</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Gestiona el tablón de anuncios público
              </p>
            </div>
          </div>
          <Button onClick={abrirCrear} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
            Nuevo aviso
          </Button>
        </div>

        {/* Error de carga */}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {/* Tabla de avisos */}
        {avisos.length === 0 && !error ? (
          <div className="text-center py-12 text-gray-500 text-sm">
            No hay avisos registrados. Crea el primero con el botón &quot;Nuevo aviso&quot;.
          </div>
        ) : (
          <div className="space-y-2">
            {avisos.map((aviso) => (
              <FilaAviso
                key={aviso.id}
                aviso={aviso}
                onEditar={() => abrirEditar(aviso)}
                onEliminar={() => confirmarEliminar(aviso)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dialog: formulario crear/editar */}
      <Dialog open={dialogAbierto} onOpenChange={(abierto) => !abierto && cerrarDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {avisoEditando ? "Editar aviso" : "Nuevo aviso"}
            </DialogTitle>
            <DialogDescription>
              {avisoEditando
                ? "Modifica los datos del aviso y guarda los cambios."
                : "Rellena los datos del nuevo aviso para el tablón público."}
            </DialogDescription>
          </DialogHeader>

          {/* Error al guardar */}
          {errorGuardar && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              <span>{errorGuardar}</span>
            </div>
          )}

          <FormularioAviso
            aviso={avisoEditando}
            onGuardar={guardarAviso}
            onCancelar={cerrarDialog}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog: confirmar eliminación */}
      <Dialog open={dialogEliminar} onOpenChange={(abierto) => !abierto && setDialogEliminar(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar aviso</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres eliminar el aviso{" "}
              <span className="font-semibold">&quot;{avisoEliminar?.titulo}&quot;</span>?
              Esta acción lo desactivará del tablón público.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-2">
            <Button
              variant="outline"
              onClick={() => setDialogEliminar(false)}
              disabled={eliminando}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={ejecutarEliminar}
              disabled={eliminando}
            >
              {eliminando ? "Eliminando..." : "Eliminar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Componente auxiliar: fila de aviso ───────────────────────────────────────

interface FilaAvisoProps {
  aviso: Aviso
  onEditar: () => void
  onEliminar: () => void
}

function FilaAviso({ aviso, onEditar, onEliminar }: FilaAvisoProps) {
  const estilo = ESTILOS_TIPO[aviso.tipo] ?? { clase: "bg-gray-100 text-gray-700", etiqueta: aviso.tipo }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-gray-300 transition-colors">
      {/* Info principal */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="font-medium text-sm text-gray-900 truncate">{aviso.titulo}</span>
          <Badge className={`${estilo.clase} text-xs font-medium`}>
            {estilo.etiqueta}
          </Badge>
          {!aviso.activo && (
            <Badge className="bg-gray-100 text-gray-500 text-xs font-medium">
              Inactivo
            </Badge>
          )}
        </div>
        <p className="text-xs text-gray-500 line-clamp-1">{aviso.descripcion}</p>
        <p className="text-xs text-gray-400 mt-0.5">{formatearFecha(aviso.fecha)}</p>
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={onEditar}
          aria-label={`Editar aviso: ${aviso.titulo}`}
        >
          <Pencil className="w-4 h-4" aria-hidden="true" />
          <span className="sr-only">Editar</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onEliminar}
          aria-label={`Eliminar aviso: ${aviso.titulo}`}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4" aria-hidden="true" />
          <span className="sr-only">Eliminar</span>
        </Button>
      </div>
    </div>
  )
}
