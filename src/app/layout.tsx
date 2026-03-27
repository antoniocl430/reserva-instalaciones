import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { headers } from "next/headers"
import "./globals.css"
import { Proveedores } from "@/components/proveedores"
import { Header } from "@/components/header"
import { extraerSlugDelHost, obtenerTenantPorSlug } from "@/lib/tenant"

const inter = Inter({ subsets: ["latin"] })

// Interfaz de la configuración almacenada en el campo JSON del tenant
interface ConfiguracionTenant {
  nombreServicio?: string
  colores?: {
    primario?: string
    secundario?: string
  }
  metadata?: {
    title?: string
    description?: string
  }
}

// Metadata dinámica según el tenant que sirve la petición
export async function generateMetadata(): Promise<Metadata> {
  try {
    const headersList = await headers()
    const host = headersList.get("host") ?? ""
    const slug = extraerSlugDelHost(host)
    const tenant = await obtenerTenantPorSlug(slug)

    if (!tenant) {
      return {
        title: "Reservas Deportivas",
        description: "Sistema de reservas de instalaciones deportivas municipales",
      }
    }

    // El campo configuracion es JSON serializado — puede ser null
    let configuracion: ConfiguracionTenant | null = null
    if (tenant.configuracion) {
      try {
        configuracion =
          typeof tenant.configuracion === "string"
            ? JSON.parse(tenant.configuracion)
            : (tenant.configuracion as ConfiguracionTenant)
      } catch {
        // JSON malformado — ignorar y usar valores por defecto
      }
    }

    const titulo =
      configuracion?.metadata?.title ??
      `Reservas Deportivas — ${tenant.municipio}`

    const descripcion =
      configuracion?.metadata?.description ??
      "Sistema de reservas de instalaciones deportivas municipales"

    return { title: titulo, description: descripcion }
  } catch {
    // Cualquier fallo (BD no disponible, etc.) → metadata por defecto sin bloquear el render
    return {
      title: "Reservas Deportivas",
      description: "Sistema de reservas de instalaciones deportivas municipales",
    }
  }
}

// Interfaz de los colores del tenant con sus valores por defecto
interface ColoresTenant {
  primario: string
  secundario: string
}

// Obtiene los colores personalizados del tenant actual
async function obtenerColoresTenant(): Promise<ColoresTenant> {
  try {
    const headersList = await headers()
    const host = headersList.get("host") ?? ""
    const slug = extraerSlugDelHost(host)
    const tenant = await obtenerTenantPorSlug(slug)

    if (!tenant) return { primario: "#2563eb", secundario: "#16a34a" }

    let configuracion: ConfiguracionTenant | null = null
    if (tenant.configuracion) {
      try {
        configuracion =
          typeof tenant.configuracion === "string"
            ? JSON.parse(tenant.configuracion)
            : (tenant.configuracion as ConfiguracionTenant)
      } catch {
        // JSON malformado — ignorar
      }
    }

    return {
      primario: configuracion?.colores?.primario ?? "#2563eb",
      secundario: configuracion?.colores?.secundario ?? "#16a34a",
    }
  } catch {
    return { primario: "#2563eb", secundario: "#16a34a" }
  }
}

// Obtiene el nombre del servicio para el Header a partir del tenant actual
async function obtenerNombreServicio(): Promise<string> {
  try {
    const headersList = await headers()
    const host = headersList.get("host") ?? ""
    const slug = extraerSlugDelHost(host)
    const tenant = await obtenerTenantPorSlug(slug)

    if (!tenant) return "Reservas Deportivas"

    let configuracion: ConfiguracionTenant | null = null
    if (tenant.configuracion) {
      try {
        configuracion =
          typeof tenant.configuracion === "string"
            ? JSON.parse(tenant.configuracion)
            : (tenant.configuracion as ConfiguracionTenant)
      } catch {
        // JSON malformado — ignorar
      }
    }

    return configuracion?.nombreServicio ?? tenant.nombre ?? "Reservas Deportivas"
  } catch {
    return "Reservas Deportivas"
  }
}

export default async function LayoutRaiz({
  children,
}: {
  children: React.ReactNode
}) {
  const nombreServicio = await obtenerNombreServicio()
  const colores = await obtenerColoresTenant()

  return (
    <html
      lang="es"
      style={
        {
          "--color-primario": colores.primario,
          "--color-secundario": colores.secundario,
        } as React.CSSProperties
      }
    >
      <body className={inter.className}>
        <Proveedores>
          <Header nombreServicio={nombreServicio} />
          {children}
        </Proveedores>
      </body>
    </html>
  )
}
