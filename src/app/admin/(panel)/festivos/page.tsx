"use client"

import { useEffect, useState } from "react"
import { CalendarX2, Trash2, Plus, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface Festivo {
  id: string
  fecha: string
  nombre: string
  repetirAnual: boolean
}

const AÑO_ACTUAL = new Date().getFullYear()

function formatearFechaCorta(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "long", timeZone: "UTC" })
}

export default function PaginaFestivos() {
  const [festivos, setFestivos] = useState<Festivo[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [año, setAño] = useState(AÑO_ACTUAL)

  const [dialogNuevo, setDialogNuevo] = useState(false)
  const [formNuevo, setFormNuevo] = useState({ fecha: "", nombre: "", repetirAnual: false })
  const [guardando, setGuardando] = useState(false)
  const [errForm, setErrForm] = useState<string | null>(null)

  const [importando, setImportando] = useState(false)

  async function cargarFestivos() {
    setCargando(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/festivos?año=${año}`)
      if (!res.ok) throw new Error("Error al cargar festivos")
      const data = await res.json()
      setFestivos(data.festivos)
    } catch {
      setError("No se pudieron cargar los festivos")
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarFestivos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [año])

  async function handleCrearFestivo() {
    setErrForm(null)
    if (!formNuevo.fecha) { setErrForm("La fecha es obligatoria"); return }
    if (!formNuevo.nombre.trim()) { setErrForm("El nombre es obligatorio"); return }

    setGuardando(true)
    try {
      const res = await fetch("/api/admin/festivos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formNuevo),
      })
      if (res.status === 409) { setErrForm("Ya existe un festivo en esa fecha"); return }
      if (!res.ok) { setErrForm("Error al crear el festivo"); return }
      setDialogNuevo(false)
      setFormNuevo({ fecha: "", nombre: "", repetirAnual: false })
      await cargarFestivos()
    } finally {
      setGuardando(false)
    }
  }

  async function handleEliminar(id: string) {
    if (!confirm("¿Eliminar este festivo?")) return
    await fetch(`/api/admin/festivos/${id}`, { method: "DELETE" })
    await cargarFestivos()
  }

  async function handleImportar() {
    if (!confirm(`¿Importar los festivos nacionales de España para ${año}? Los que ya existan no se duplicarán.`)) return
    setImportando(true)
    try {
      const res = await fetch("/api/admin/festivos/importar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ año }),
      })
      const data = await res.json()
      if (res.ok) {
        await cargarFestivos()
        alert(`Se importaron ${data.importados} festivos nacionales para ${año}.`)
      }
    } finally {
      setImportando(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Cabecera */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <CalendarX2 className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Festivos</h1>
              <p className="text-sm text-muted-foreground">
                Días festivos en los que todas las instalaciones quedan bloqueadas automáticamente
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="border rounded px-3 py-2 text-sm"
              value={año}
              onChange={(e) => setAño(Number(e.target.value))}
              aria-label="Filtrar por año"
            >
              {[AÑO_ACTUAL - 1, AÑO_ACTUAL, AÑO_ACTUAL + 1, AÑO_ACTUAL + 2].map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <Button variant="outline" size="sm" onClick={handleImportar} disabled={importando}>
              <Download className="h-4 w-4 mr-1" />
              Importar festivos nacionales
            </Button>
            <Button size="sm" onClick={() => { setErrForm(null); setDialogNuevo(true) }}>
              <Plus className="h-4 w-4 mr-1" />
              Añadir festivo
            </Button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">
            {error}
          </div>
        )}

        {/* Tabla */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cargando ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 4 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : festivos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No hay festivos configurados para {año}
                  </TableCell>
                </TableRow>
              ) : (
                festivos.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-mono text-sm">
                      {formatearFechaCorta(f.fecha)}
                    </TableCell>
                    <TableCell>{f.nombre}</TableCell>
                    <TableCell>
                      {f.repetirAnual && <Badge variant="secondary">Anual</Badge>}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Eliminar"
                        onClick={() => handleEliminar(f.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Eliminar</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Dialog nuevo festivo */}
        <Dialog open={dialogNuevo} onOpenChange={setDialogNuevo}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo festivo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label htmlFor="fecha-festivo">Fecha</Label>
                <Input
                  id="fecha-festivo"
                  type="date"
                  value={formNuevo.fecha}
                  onChange={(e) => setFormNuevo((f) => ({ ...f, fecha: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="nombre-festivo">Nombre</Label>
                <Input
                  id="nombre-festivo"
                  placeholder="Ej: Navidad"
                  value={formNuevo.nombre}
                  onChange={(e) => setFormNuevo((f) => ({ ...f, nombre: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="repetir-anual"
                  type="checkbox"
                  checked={formNuevo.repetirAnual}
                  onChange={(e) => setFormNuevo((f) => ({ ...f, repetirAnual: e.target.checked }))}
                  className="h-4 w-4"
                />
                <Label htmlFor="repetir-anual">Repetir cada año</Label>
              </div>
              {errForm && <p className="text-sm text-red-600">{errForm}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogNuevo(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCrearFestivo} disabled={guardando}>
                {guardando ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
