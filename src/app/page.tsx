import { headers } from "next/headers"
import { getServerSession } from "next-auth"
import { opcionesAuth } from "@/lib/auth"
import Tablon, { Aviso } from "@/components/Tablon"
import { extraerSlugDelHost, obtenerTenantPorSlug } from "@/lib/tenant"

// Tipo de instalación devuelto por la API
interface Instalacion {
  id: string
  nombre: string
  tipo: string
  descripcion: string | null
  horario: string
  activa: boolean
}

// Pistas ficticias usadas como fallback si la API no responde
const PISTAS_FALLBACK: Instalacion[] = [
  {
    id: "fallback-1",
    nombre: "Pista de Pádel 1",
    tipo: "PADEL",
    descripcion: "Pista de pádel cubierta con iluminación LED",
    horario: "Lunes a Domingo: 08:00 - 22:00",
    activa: true,
  },
  {
    id: "fallback-2",
    nombre: "Pista de Pádel 2",
    tipo: "PADEL",
    descripcion: "Pista exterior con superficie de césped artificial",
    horario: "Lunes a Domingo: 08:00 - 22:00",
    activa: true,
  },
  {
    id: "fallback-3",
    nombre: "Pista de Pádel 3",
    tipo: "PADEL",
    descripcion: null,
    horario: "Lunes a Domingo: 08:00 - 22:00",
    activa: true,
  },
]

// Obtiene las pistas activas desde la API. Si falla, devuelve el fallback.
async function obtenerPistas(): Promise<Instalacion[]> {
  try {
    // URL absoluta necesaria en Server Components
    const baseUrl =
      process.env.APP_URL ??
      (process.env.CF_PAGES_URL ?? "http://localhost:3000")

    const respuesta = await fetch(`${baseUrl}/api/instalaciones`, {
      cache: "no-store",
    })

    if (!respuesta.ok) {
      return PISTAS_FALLBACK
    }

    const datos = await respuesta.json()
    const pistas: Instalacion[] = datos.instalaciones ?? []

    // Devolver todas las pistas (activas e inactivas); usar fallback solo si no hay ninguna
    return pistas.length > 0 ? pistas : PISTAS_FALLBACK
  } catch {
    // Error de red u otro fallo: usar pistas ficticias
    return PISTAS_FALLBACK
  }
}

// Obtiene los avisos activos desde la API. Si falla, devuelve array vacío.
async function obtenerAvisos(): Promise<Aviso[]> {
  try {
    const baseUrl =
      process.env.APP_URL ??
      (process.env.CF_PAGES_URL ?? "http://localhost:3000")

    const respuesta = await fetch(`${baseUrl}/api/avisos`, {
      cache: "no-store",
    })

    if (!respuesta.ok) return []

    const datos: Aviso[] = await respuesta.json()
    return Array.isArray(datos) ? datos : []
  } catch {
    // Error de red u otro fallo: no mostrar avisos
    return []
  }
}

// Obtiene el municipio del tenant actual para personalizar el título del tablón.
// Si falla o no existe el tenant, devuelve undefined (Tablon usará el título por defecto).
async function obtenerMunicipioTenant(): Promise<string | undefined> {
  try {
    const headersList = await headers()
    const host = headersList.get("host") ?? ""
    const slug = extraerSlugDelHost(host)
    const tenant = await obtenerTenantPorSlug(slug)
    return tenant?.municipio ?? undefined
  } catch {
    return undefined
  }
}

// Server Component — no lleva "use client"
export default async function Inicio() {
  const [pistas, avisos, municipio, sesion] = await Promise.all([
    obtenerPistas(),
    obtenerAvisos(),
    obtenerMunicipioTenant(),
    getServerSession(opcionesAuth),
  ])

  return (
    <main id="contenido-principal">
      <Tablon pistas={pistas} avisos={avisos} municipio={municipio} sesionActiva={!!sesion} />
    </main>
  )
}
