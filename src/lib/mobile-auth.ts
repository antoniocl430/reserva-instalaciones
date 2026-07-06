/**
 * Utilidad para autenticar peticiones móviles mediante Bearer token.
 * Permite que las rutas API existentes soporten tanto NextAuth (cookies)
 * como JWT Bearer token (para clientes Flutter/móvil).
 *
 * Uso:
 *   const usuario = await obtenerUsuarioMovil(request)
 *   if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
 */

import { NextRequest } from 'next/server'
import { verificarTokenMovil, PayloadMovil } from './jwt-mobile'

/**
 * Extrae y verifica el token Bearer de la cabecera Authorization.
 * Devuelve el payload del usuario si el token es válido, null en caso contrario.
 * No lanza excepciones — cualquier error de verificación devuelve null.
 */
export async function obtenerUsuarioMovil(request: NextRequest): Promise<PayloadMovil | null> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.slice(7)
  try {
    return await verificarTokenMovil(token)
  } catch {
    return null
  }
}
