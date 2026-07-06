/**
 * Utilidades JWT para autenticación móvil (Flutter)
 * Usa la librería `jose` incluida como dependencia transitiva de next-auth.
 * Genera tokens HS256 con expiración de 30 días.
 */

import { SignJWT, jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!)
const EXPIRACION = '30d'

export interface PayloadMovil {
  sub: string        // userId
  tenantId: string
  tenantSlug: string
  rol: string
  email: string
  nombre: string
}

/**
 * Genera un token JWT firmado con HS256 para un usuario móvil.
 * El token incluye los datos del usuario y expira en 30 días.
 */
export async function crearTokenMovil(payload: PayloadMovil): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(EXPIRACION)
    .sign(secret)
}

/**
 * Verifica un token JWT móvil y devuelve su payload tipado.
 * Lanza un error si el token es inválido o ha expirado.
 */
export async function verificarTokenMovil(token: string): Promise<PayloadMovil> {
  const { payload } = await jwtVerify(token, secret)
  return payload as unknown as PayloadMovil
}
