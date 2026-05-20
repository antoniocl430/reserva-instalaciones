import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { headers } from "next/headers"
import "./globals.css"
import { Proveedores } from "@/components/proveedores"
import { Header } from "@/components/header"
import { TransicionPagina } from "@/components/TransicionPagina"
import Footer from "@/components/Footer"
import BannerCookies from "@/components/BannerCookies"
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
        title: { template: "%s | Reservas Deportivas", default: "Reservas Deportivas" },
        description: "Sistema de reservas de instalaciones deportivas municipales",
        appleWebApp: {
          capable: true,
          title: "Reservas Deportivas",
          statusBarStyle: "default",
        },
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

    const nombreBase =
      configuracion?.metadata?.title ??
      `Reservas Deportivas — ${tenant.municipio}`

    const nombreServicioMeta =
      configuracion?.nombreServicio ?? nombreBase

    const descripcion =
      configuracion?.metadata?.description ??
      "Sistema de reservas de instalaciones deportivas municipales"

    const colorTema = configuracion?.colores?.primario ?? "#2563eb"

    // Logo del tenant como favicon dinámico
    const logoUrl = (tenant as any).logoUrl ?? null

    return {
      title: { template: `%s | ${nombreBase}`, default: nombreBase },
      description: descripcion,
      // Favicon dinámico usando el logo del tenant
      ...(logoUrl && {
        icons: {
          icon: logoUrl,
          apple: logoUrl,
        },
      }),
      // Meta tags PWA para iOS (Safari no usa Web App Manifest para instalación)
      appleWebApp: {
        capable: true,
        title: nombreServicioMeta,
        statusBarStyle: "default",
      },
      // Color de la barra del navegador en Android/Chrome
      themeColor: colorTema,
    }
  } catch {
    // Cualquier fallo (BD no disponible, etc.) → metadata por defecto sin bloquear el render
    return {
      title: { template: "%s | Reservas Deportivas", default: "Reservas Deportivas" },
      description: "Sistema de reservas de instalaciones deportivas municipales",
      appleWebApp: {
        capable: true,
        title: "Reservas Deportivas",
        statusBarStyle: "default",
      },
    }
  }
}

// Configuración del viewport — soporte para iPhones con notch (safe-area)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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

// Obtiene el nombre del servicio y el logo para el Header a partir del tenant actual
async function obtenerDatosTenant(): Promise<{ nombreServicio: string; logoUrl: string | null }> {
  try {
    const headersList = await headers()
    const host = headersList.get("host") ?? ""
    const slug = extraerSlugDelHost(host)
    const tenant = await obtenerTenantPorSlug(slug)

    if (!tenant) return { nombreServicio: "Reservas Deportivas", logoUrl: null }

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
      nombreServicio: configuracion?.nombreServicio ?? (tenant as any).nombre ?? "Reservas Deportivas",
      logoUrl: (tenant as any).logoUrl ?? null,
    }
  } catch {
    return { nombreServicio: "Reservas Deportivas", logoUrl: null }
  }
}

export default async function LayoutRaiz({
  children,
}: {
  children: React.ReactNode
}) {
  const { nombreServicio, logoUrl } = await obtenerDatosTenant()
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
      <head>
        {/* Icono para iOS (Safari no usa el Web App Manifest para esto) */}
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.svg" />
        {/* Habilita "Añadir a pantalla de inicio" en Chrome para Android */}
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${inter.className} flex flex-col min-h-screen`}>
        {/* Enlace de salto al contenido principal — accesibilidad WCAG 2.1 */}
        <a
          href="#contenido-principal"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-blue-700 focus:border focus:border-blue-700 focus:rounded focus:font-medium"
        >
          Saltar al contenido principal
        </a>
        <Proveedores>
          <Header nombreServicio={nombreServicio} logoUrl={logoUrl} />
          <TransicionPagina>{children}</TransicionPagina>
          <Footer />
          <BannerCookies />
        </Proveedores>
      </body>
    </html>
  )
}
