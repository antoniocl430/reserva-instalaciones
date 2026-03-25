/**
 * Rate limiter en memoria para login.
 * Máximo 5 intentos fallidos por IP en 15 minutos.
 */

const intentos = new Map<string, { count: number; resetAt: number }>()

/**
 * Verifica si una IP ha superado el límite de intentos.
 * Devuelve { bloqueado: boolean; restantes: number }
 */
export function verificarRateLimit(
  ip: string,
  maxIntentos = 5,
  ventanaMs = 15 * 60 * 1000
): { bloqueado: boolean; restantes: number } {
  const ahora = Date.now()
  const entrada = intentos.get(ip)

  // Si no hay entrada o la ventana ha expirado, crear una nueva
  if (!entrada || ahora > entrada.resetAt) {
    intentos.set(ip, { count: 1, resetAt: ahora + ventanaMs })
    return { bloqueado: false, restantes: maxIntentos - 1 }
  }

  // Si ya ha superado el límite, devolver bloqueado
  if (entrada.count >= maxIntentos) {
    return { bloqueado: true, restantes: 0 }
  }

  // Incrementar contador
  entrada.count++
  return { bloqueado: false, restantes: maxIntentos - entrada.count }
}

/**
 * Resetea el contador de intentos fallidos de una IP (después de login exitoso).
 */
export function resetearRateLimit(ip: string) {
  intentos.delete(ip)
}
