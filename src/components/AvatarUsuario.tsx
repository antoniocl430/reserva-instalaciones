import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

// Paleta de colores para el fallback — determinista según la inicial del nombre
const COLORES_FONDO = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-teal-500",
  "bg-indigo-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-cyan-500",
]

function colorDesdNombre(nombre: string): string {
  const indice = (nombre.charCodeAt(0) || 0) % COLORES_FONDO.length
  return COLORES_FONDO[indice]
}

function inicialesDesdeNombre(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean)
  if (partes.length >= 2) {
    return (partes[0][0] + partes[1][0]).toUpperCase()
  }
  return nombre.substring(0, 2).toUpperCase() || "?"
}

interface AvatarUsuarioProps {
  nombre: string
  avatarUrl?: string | null
  /** Tamaño en clases Tailwind — por defecto "w-10 h-10" */
  className?: string
}

/**
 * Muestra el avatar del usuario.
 * Si tiene foto de perfil, la muestra. Si no, muestra sus iniciales
 * sobre un fondo de color determinista basado en su nombre.
 * Nunca queda en blanco.
 */
export function AvatarUsuario({ nombre, avatarUrl, className }: AvatarUsuarioProps) {
  const iniciales = inicialesDesdeNombre(nombre || "?")
  const colorFondo = colorDesdNombre(nombre || "?")

  return (
    <Avatar className={cn("shrink-0", className)}>
      {avatarUrl && (
        <AvatarImage
          src={avatarUrl}
          alt={`Foto de perfil de ${nombre}`}
          className="object-cover"
        />
      )}
      <AvatarFallback
        className={cn("text-white font-semibold select-none", colorFondo)}
      >
        {iniciales}
      </AvatarFallback>
    </Avatar>
  )
}
