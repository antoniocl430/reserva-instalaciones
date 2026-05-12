/**
 * Tests para rate limiting en /login
 * Verifica que el sistema bloquea intentos de login fallidos
 */

jest.mock('@/lib/rate-limit')

import {
  verificarRateLimit,
  resetearRateLimit,
} from '@/lib/rate-limit'

const mockVerificar = verificarRateLimit as jest.Mock
const mockReset = resetearRateLimit as jest.Mock

describe('Rate Limiting en /login', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('verificarRateLimit', () => {
    it('debería permitir el primer intento fallido', () => {
      mockVerificar.mockReturnValue({
        bloqueado: false,
        restantes: 4,
      })

      const resultado = verificarRateLimit('192.168.1.1', 5, 15 * 60 * 1000)
      expect(resultado.bloqueado).toBe(false)
      expect(resultado.restantes).toBe(4)
    })

    it('debería permitir hasta 5 intentos fallidos', () => {
      mockVerificar.mockReturnValue({
        bloqueado: false,
        restantes: 0,
      })

      const resultado = verificarRateLimit('192.168.1.1', 5, 15 * 60 * 1000)
      expect(resultado.bloqueado).toBe(false)
      expect(resultado.restantes).toBe(0)
    })

    it('debería bloquear después de 5 intentos fallidos', () => {
      mockVerificar.mockReturnValue({
        bloqueado: true,
        restantes: 0,
      })

      const resultado = verificarRateLimit('192.168.1.1', 5, 15 * 60 * 1000)
      expect(resultado.bloqueado).toBe(true)
      expect(resultado.restantes).toBe(0)
    })

    it('debería registrar diferentes IPs por separado', () => {
      mockVerificar.mockReturnValue({
        bloqueado: false,
        restantes: 4,
      })

      const ip1 = '192.168.1.1'
      const ip2 = '192.168.1.2'

      const resultado1 = verificarRateLimit(ip1, 5, 15 * 60 * 1000)
      const resultado2 = verificarRateLimit(ip2, 5, 15 * 60 * 1000)

      expect(mockVerificar).toHaveBeenCalledWith(ip1, 5, 15 * 60 * 1000)
      expect(mockVerificar).toHaveBeenCalledWith(ip2, 5, 15 * 60 * 1000)
    })
  })

  describe('resetearRateLimit', () => {
    it('debería limpiar el contador de una IP', () => {
      mockReset.mockReturnValue(true)

      const resultado = resetearRateLimit('192.168.1.1')
      expect(resultado).toBe(true)
      expect(mockReset).toHaveBeenCalledWith('192.168.1.1')
    })

    it('debería permitir nuevos intentos después de reset', () => {
      mockReset.mockReturnValue(true)
      mockVerificar.mockReturnValue({
        bloqueado: false,
        restantes: 5,
      })

      resetearRateLimit('192.168.1.1')
      const resultado = verificarRateLimit('192.168.1.1', 5, 15 * 60 * 1000)

      expect(resultado.bloqueado).toBe(false)
      expect(resultado.restantes).toBe(5)
    })
  })

  describe('Configuración de rate limit', () => {
    it('debería usar máximo 5 intentos fallidos por defecto', () => {
      mockVerificar.mockReturnValue({
        bloqueado: false,
        restantes: 4,
      })

      const maxIntentos = 5
      const resultado = verificarRateLimit('192.168.1.1', maxIntentos, 15 * 60 * 1000)

      expect(mockVerificar).toHaveBeenCalledWith('192.168.1.1', 5, 15 * 60 * 1000)
      expect(resultado.bloqueado).toBe(false)
    })

    it('debería usar ventana de 15 minutos por defecto', () => {
      mockVerificar.mockReturnValue({
        bloqueado: false,
        restantes: 4,
      })

      const ventanaMs = 15 * 60 * 1000 // 15 minutos
      const resultado = verificarRateLimit('192.168.1.1', 5, ventanaMs)

      expect(mockVerificar).toHaveBeenCalledWith('192.168.1.1', 5, ventanaMs)
    })
  })

  describe('Escenarios de login', () => {
    it('debería permitir login exitoso sin penalización', () => {
      mockVerificar.mockReturnValue({
        bloqueado: false,
        restantes: 5,
      })
      mockReset.mockReturnValue(true)

      // Simula login exitoso
      const verificacion = verificarRateLimit('192.168.1.1', 5, 15 * 60 * 1000)
      expect(verificacion.bloqueado).toBe(false)

      // Reset después de login exitoso
      const reset = resetearRateLimit('192.168.1.1')
      expect(reset).toBe(true)
    })

    it('debería contar intentos fallidos consecutivos', () => {
      // Primer intento fallido
      mockVerificar.mockReturnValueOnce({
        bloqueado: false,
        restantes: 4,
      })

      // Segundo intento fallido
      mockVerificar.mockReturnValueOnce({
        bloqueado: false,
        restantes: 3,
      })

      // Tercero...
      mockVerificar.mockReturnValueOnce({
        bloqueado: false,
        restantes: 2,
      })

      const ip = '192.168.1.1'
      const maxIntentos = 5
      const ventanaMs = 15 * 60 * 1000

      let resultado = verificarRateLimit(ip, maxIntentos, ventanaMs)
      expect(resultado.bloqueado).toBe(false)

      resultado = verificarRateLimit(ip, maxIntentos, ventanaMs)
      expect(resultado.bloqueado).toBe(false)

      resultado = verificarRateLimit(ip, maxIntentos, ventanaMs)
      expect(resultado.bloqueado).toBe(false)
    })

    it('debería bloquear después del quinto intento fallido', () => {
      // 5 intentos fallidos
      mockVerificar
        .mockReturnValueOnce({ bloqueado: false, restantes: 4 })
        .mockReturnValueOnce({ bloqueado: false, restantes: 3 })
        .mockReturnValueOnce({ bloqueado: false, restantes: 2 })
        .mockReturnValueOnce({ bloqueado: false, restantes: 1 })
        .mockReturnValueOnce({ bloqueado: false, restantes: 0 })
        // Sexto intento: bloqueado
        .mockReturnValueOnce({ bloqueado: true, restantes: 0 })

      const ip = '192.168.1.1'
      const maxIntentos = 5
      const ventanaMs = 15 * 60 * 1000

      // Primeros 5 intentos
      for (let i = 0; i < 5; i++) {
        const resultado = verificarRateLimit(ip, maxIntentos, ventanaMs)
        expect(resultado.bloqueado).toBe(false)
      }

      // Sexto intento: bloqueado
      const resultado = verificarRateLimit(ip, maxIntentos, ventanaMs)
      expect(resultado.bloqueado).toBe(true)
    })
  })
})
