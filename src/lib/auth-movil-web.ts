/**
 * Autenticación unificada web + móvil.
 *
 * Devuelve la sesión del usuario aceptando DOS mecanismos:
 *   1. Token JWT en la cabecera `Authorization: Bearer <token>` (app Flutter)
 *   2. Cookie de sesión de NextAuth (navegador web)
 *
 * El objeto devuelto tiene la MISMA forma que la sesión de NextAuth
 * (`{ user: { id, tenantId, rol, email, name } }`) para que las rutas API
 * existentes funcionen sin cambios: basta sustituir la llamada a
 * `getServerSession(opcionesAuth)` por `obtenerSesion(request)`.
 */

import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { opcionesAuth } from "./auth"
import { obtenerUsuarioMovil } from "./mobile-auth"

export interface SesionUnificada {
  user: {
    id: string
    tenantId: string
    rol: string
    email: string
    name: string
  }
}

export async function obtenerSesion(
  request: NextRequest
): Promise<SesionUnificada | null> {
  // 1. Token móvil (Bearer) — clientes Flutter
  const movil = await obtenerUsuarioMovil(request)
  if (movil) {
    return {
      user: {
        id: movil.sub,
        tenantId: movil.tenantId,
        rol: movil.rol,
        email: movil.email,
        name: movil.nombre,
      },
    }
  }

  // 2. Cookie NextAuth — clientes web
  const sesion = await getServerSession(opcionesAuth)
  if (sesion?.user) {
    return {
      user: {
        id: sesion.user.id,
        tenantId: (sesion.user.tenantId ?? "") as string,
        rol: sesion.user.rol as string,
        email: sesion.user.email ?? "",
        name: sesion.user.name ?? "",
      },
    }
  }

  return null
}
