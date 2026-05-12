import { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import { extraerSlugDelHost, obtenerTenantPorSlug } from '@/lib/tenant'

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

// Manifest dinámico por tenant — Next.js lo sirve en /manifest.webmanifest
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  // Valores por defecto si no hay tenant configurado
  let nombre = 'Reservas Deportivas'
  let nombreCorto = 'Reservas'
  let colorTema = '#2563eb'
  let descripcion = 'Sistema de reservas de instalaciones deportivas municipales'

  try {
    const headersList = await headers()
    const host = headersList.get('host') ?? ''
    const slug = extraerSlugDelHost(host)
    const tenant = await obtenerTenantPorSlug(slug)

    if (tenant) {
      // Parsear configuración JSON del tenant
      let configuracion: ConfiguracionTenant | null = null
      if (tenant.configuracion) {
        try {
          configuracion =
            typeof tenant.configuracion === 'string'
              ? JSON.parse(tenant.configuracion)
              : (tenant.configuracion as ConfiguracionTenant)
        } catch {
          // JSON malformado — usar valores por defecto
        }
      }

      // Nombre completo del servicio (para la pantalla de instalación)
      nombre =
        configuracion?.nombreServicio ??
        configuracion?.metadata?.title ??
        `Reservas Deportivas — ${tenant.municipio}`

      // Nombre corto para la pantalla de inicio del dispositivo
      nombreCorto = tenant.municipio ?? 'Reservas'

      // Color del tema desde la configuración del tenant
      colorTema = configuracion?.colores?.primario ?? '#2563eb'

      // Descripción del servicio
      descripcion =
        configuracion?.metadata?.description ??
        `Sistema de reservas de instalaciones deportivas de ${tenant.municipio}`
    }
  } catch {
    // Cualquier fallo en BD o headers → usar valores por defecto sin bloquear
  }

  return {
    name: nombre,
    short_name: nombreCorto,
    description: descripcion,
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: colorTema,
    lang: 'es',
    dir: 'ltr',
    categories: ['sports', 'utilities'],
    icons: [
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/icons/icon.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
      },
      {
        src: '/icons/icon.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  }
}
