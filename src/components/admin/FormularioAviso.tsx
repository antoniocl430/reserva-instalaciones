"use client"

/**
 * FormularioAviso — Formulario para crear o editar un aviso del tablón.
 *
 * Props:
 *   aviso      — aviso a editar (undefined = modo creación)
 *   onGuardar  — callback async llamado con los datos del formulario al guardar
 *   onCancelar — callback llamado al pulsar cancelar
 *
 * Validaciones en cliente:
 *   - Título obligatorio
 *   - Descripción obligatoria
 *   - Fecha obligatoria
 *   - Tipo obligatorio (valor por defecto: INFO)
 */

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Tipos posibles del aviso
export type TipoAviso = "INFO" | "AVISO" | "CIERRE"

export interface DatosFormularioAviso {
  titulo: string
  descripcion: string
  tipo: TipoAviso
  fecha: string
}

export interface AvisoExistente extends DatosFormularioAviso {
  id: string
  activo: boolean
}

interface FormularioAvisoProps {
  /** Aviso a editar. Si no se pasa, el formulario funciona en modo creación. */
  aviso?: AvisoExistente
  /** Callback async que recibe los datos del formulario al confirmar. */
  onGuardar: (datos: DatosFormularioAviso) => Promise<void>
  /** Callback al pulsar el botón cancelar. */
  onCancelar: () => void
}

// Etiquetas para los tipos de aviso
const ETIQUETAS_TIPO: Record<TipoAviso, string> = {
  INFO: "Información",
  AVISO: "Aviso",
  CIERRE: "Cierre",
}

export default function FormularioAviso({ aviso, onGuardar, onCancelar }: FormularioAvisoProps) {
  // Estado del formulario — inicializa con los valores del aviso si se edita
  const [titulo, setTitulo] = useState(aviso?.titulo ?? "")
  const [descripcion, setDescripcion] = useState(aviso?.descripcion ?? "")
  const [tipo, setTipo] = useState<TipoAviso>(aviso?.tipo ?? "INFO")
  const [fecha, setFecha] = useState(aviso?.fecha ?? "")

  // Estado de errores de validación por campo
  const [errores, setErrores] = useState<Partial<Record<"titulo" | "descripcion" | "fecha", string>>>({})

  // Estado de carga mientras se envía
  const [enviando, setEnviando] = useState(false)

  // ── Validación de cliente ──────────────────────────────────────────────────

  function validar(): boolean {
    const nuevosErrores: typeof errores = {}

    if (!titulo.trim()) {
      nuevosErrores.titulo = "El título es obligatorio"
    }
    if (!descripcion.trim()) {
      nuevosErrores.descripcion = "La descripción es obligatoria"
    }
    if (!fecha) {
      nuevosErrores.fecha = "La fecha es obligatoria"
    }

    setErrores(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  // ── Envío del formulario ───────────────────────────────────────────────────

  async function manejarEnvio(e: React.FormEvent) {
    e.preventDefault()

    if (!validar()) return

    setEnviando(true)
    try {
      await onGuardar({ titulo: titulo.trim(), descripcion: descripcion.trim(), tipo, fecha })
    } finally {
      setEnviando(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={manejarEnvio} className="space-y-4" noValidate>

      {/* Campo: Título */}
      <div className="space-y-1.5">
        <Label htmlFor="aviso-titulo">Título</Label>
        <Input
          id="aviso-titulo"
          type="text"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ej: Cierre por festividad"
          maxLength={100}
          aria-describedby={errores.titulo ? "error-titulo" : undefined}
        />
        {errores.titulo && (
          <p id="error-titulo" className="text-xs text-red-600" role="alert">
            {errores.titulo}
          </p>
        )}
      </div>

      {/* Campo: Descripción */}
      <div className="space-y-1.5">
        <Label htmlFor="aviso-descripcion">Descripción</Label>
        <Textarea
          id="aviso-descripcion"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Detalla el aviso para los ciudadanos..."
          rows={3}
          maxLength={500}
          aria-describedby={errores.descripcion ? "error-descripcion" : undefined}
        />
        {errores.descripcion && (
          <p id="error-descripcion" className="text-xs text-red-600" role="alert">
            {errores.descripcion}
          </p>
        )}
      </div>

      {/* Fila: Tipo + Fecha */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Campo: Tipo */}
        <div className="space-y-1.5">
          <Label htmlFor="aviso-tipo">Tipo</Label>
          <Select value={tipo} onValueChange={(v) => setTipo(v as TipoAviso)}>
            <SelectTrigger id="aviso-tipo" className="w-full">
              <SelectValue placeholder="Selecciona el tipo" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(ETIQUETAS_TIPO) as TipoAviso[]).map((t) => (
                <SelectItem key={t} value={t}>
                  {ETIQUETAS_TIPO[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Campo: Fecha */}
        <div className="space-y-1.5">
          <Label htmlFor="aviso-fecha">Fecha</Label>
          <Input
            id="aviso-fecha"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            aria-describedby={errores.fecha ? "error-fecha" : undefined}
          />
          {errores.fecha && (
            <p id="error-fecha" className="text-xs text-red-600" role="alert">
              {errores.fecha}
            </p>
          )}
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancelar}
          disabled={enviando}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={enviando}>
          {enviando ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </form>
  )
}
