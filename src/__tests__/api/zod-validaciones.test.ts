/**
 * Tests para validación con Zod
 * Verifica que todos los schemas validan correctamente los inputs
 */

import {
  schemaRegistro,
  schemaCrearReserva,
  schemaCrearBloqueo,
  schemaCrearUsuarioAdmin,
} from '@/lib/validaciones'

describe('Validación con Zod', () => {
  // ==========================================================================
  // schemaRegistro
  // ==========================================================================

  describe('schemaRegistro', () => {
    it('debería validar un registro válido', () => {
      const data = {
        nombre: 'Juan García',
        email: 'juan@test.com',
        password: 'Password123',
        aceptaPrivacidad: true,
      }
      const resultado = schemaRegistro.safeParse(data)
      expect(resultado.success).toBe(true)
    })

    it('debería rechazar email inválido', () => {
      const data = {
        nombre: 'Juan García',
        email: 'no-es-email',
        password: 'Password123',
        aceptaPrivacidad: true,
      }
      const resultado = schemaRegistro.safeParse(data)
      expect(resultado.success).toBe(false)
      if (!resultado.success) {
        expect(resultado.error.issues[0].message).toContain('Email no válido')
      }
    })

    it('debería rechazar password corta (menos de 8 caracteres)', () => {
      const data = {
        nombre: 'Juan García',
        email: 'juan@test.com',
        password: 'Pass1',
        aceptaPrivacidad: true,
      }
      const resultado = schemaRegistro.safeParse(data)
      expect(resultado.success).toBe(false)
      if (!resultado.success) {
        expect(resultado.error.issues[0].message).toContain('contraseña')
      }
    })

    it('debería rechazar nombre vacío', () => {
      const data = {
        nombre: '',
        email: 'juan@test.com',
        password: 'Password123',
        aceptaPrivacidad: true,
      }
      const resultado = schemaRegistro.safeParse(data)
      expect(resultado.success).toBe(false)
      if (!resultado.success) {
        expect(resultado.error.issues[0].message).toContain('nombre')
      }
    })

    it('debería rechazar si falta aceptaPrivacidad', () => {
      const data = {
        nombre: 'Juan García',
        email: 'juan@test.com',
        password: 'Password123',
      }
      const resultado = schemaRegistro.safeParse(data)
      expect(resultado.success).toBe(false)
    })

    it('debería rechazar si aceptaPrivacidad es false', () => {
      const data = {
        nombre: 'Juan García',
        email: 'juan@test.com',
        password: 'Password123',
        aceptaPrivacidad: false,
      }
      const resultado = schemaRegistro.safeParse(data)
      expect(resultado.success).toBe(false)
      if (!resultado.success) {
        expect(resultado.error.issues[0].message).toContain('privacidad')
      }
    })
  })

  // ==========================================================================
  // schemaCrearReserva
  // ==========================================================================

  describe('schemaCrearReserva', () => {
    it('debería validar una reserva con slot válido', () => {
      const data = {
        instalacionId: 'inst-1',
        fecha: '2099-12-30',
        horaInicio: '10:30',
      }
      const resultado = schemaCrearReserva.safeParse(data)
      expect(resultado.success).toBe(true)
    })

    it('debería rechazar horaInicio "10:00" (no es slot)', () => {
      const data = {
        instalacionId: 'inst-1',
        fecha: '2099-12-30',
        horaInicio: '10:00',
      }
      const resultado = schemaCrearReserva.safeParse(data)
      expect(resultado.success).toBe(false)
      if (!resultado.success) {
        expect(resultado.error.issues[0].message).toContain('Invalid option')
      }
    })

    it('debería rechazar horaInicio "14:00" (pausa del mediodía)', () => {
      const data = {
        instalacionId: 'inst-1',
        fecha: '2099-12-30',
        horaInicio: '14:00',
      }
      const resultado = schemaCrearReserva.safeParse(data)
      expect(resultado.success).toBe(false)
    })

    it('debería rechazar fecha con formato incorrecto', () => {
      const data = {
        instalacionId: 'inst-1',
        fecha: '25-03-2026',
        horaInicio: '10:30',
      }
      const resultado = schemaCrearReserva.safeParse(data)
      expect(resultado.success).toBe(false)
      if (!resultado.success) {
        expect(resultado.error.issues[0].message).toContain('YYYY-MM-DD')
      }
    })

    it('debería rechazar horaInicio con formato incorrecto', () => {
      const data = {
        instalacionId: 'inst-1',
        fecha: '2099-12-30',
        horaInicio: '25:60',
      }
      const resultado = schemaCrearReserva.safeParse(data)
      expect(resultado.success).toBe(false)
    })

    it('debería rechazar si falta instalacionId', () => {
      const data = {
        fecha: '2099-12-30',
        horaInicio: '10:30',
      }
      const resultado = schemaCrearReserva.safeParse(data)
      expect(resultado.success).toBe(false)
    })

    it('debería aceptar todos los slots válidos', () => {
      const slotsValidos = ['08:00', '09:15', '10:30', '11:45', '16:45', '18:00', '19:15']

      slotsValidos.forEach(slot => {
        const data = {
          instalacionId: 'inst-1',
          fecha: '2099-12-30',
          horaInicio: slot,
        }
        const resultado = schemaCrearReserva.safeParse(data)
        expect(resultado.success).toBe(true)
      })
    })
  })

  // ==========================================================================
  // schemaCrearBloqueo
  // ==========================================================================

  describe('schemaCrearBloqueo', () => {
    it('debería validar un bloqueo válido', () => {
      const data = {
        instalacionId: 'inst-1',
        fechaInicio: '2026-03-25',
        fechaFin: '2026-03-30',
        motivo: 'Mantenimiento',
      }
      const resultado = schemaCrearBloqueo.safeParse(data)
      expect(resultado.success).toBe(true)
    })

    it('debería rechazar fechaInicio posterior a fechaFin', () => {
      const data = {
        instalacionId: 'inst-1',
        fechaInicio: '2026-03-30',
        fechaFin: '2026-03-25',
        motivo: 'Mantenimiento',
      }
      const resultado = schemaCrearBloqueo.safeParse(data)
      expect(resultado.success).toBe(false)
      if (!resultado.success) {
        expect(resultado.error.issues[0].message).toContain('posterior')
      }
    })

    it('debería rechazar fechaInicio con formato incorrecto', () => {
      const data = {
        instalacionId: 'inst-1',
        fechaInicio: '25/03/2026',
        fechaFin: '2026-03-30',
        motivo: 'Mantenimiento',
      }
      const resultado = schemaCrearBloqueo.safeParse(data)
      expect(resultado.success).toBe(false)
      if (!resultado.success) {
        expect(resultado.error.issues[0].message).toContain('YYYY-MM-DD')
      }
    })

    it('debería rechazar motivo no string', () => {
      const data = {
        instalacionId: 'inst-1',
        fechaInicio: '2026-03-25',
        fechaFin: '2026-03-30',
        motivo: 123,
      }
      const resultado = schemaCrearBloqueo.safeParse(data)
      expect(resultado.success).toBe(false)
    })

    it('debería aceptar motivo vacío o no especificado', () => {
      const data = {
        instalacionId: 'inst-1',
        fechaInicio: '2026-03-25',
        fechaFin: '2026-03-30',
      }
      const resultado = schemaCrearBloqueo.safeParse(data)
      expect(resultado.success).toBe(true)
    })

    it('debería aceptar fechaInicio igual a fechaFin', () => {
      const data = {
        instalacionId: 'inst-1',
        fechaInicio: '2026-03-25',
        fechaFin: '2026-03-25',
        motivo: 'Mantenimiento',
      }
      const resultado = schemaCrearBloqueo.safeParse(data)
      expect(resultado.success).toBe(true)
    })
  })

  // ==========================================================================
  // schemaCrearUsuarioAdmin
  // ==========================================================================

  describe('schemaCrearUsuarioAdmin', () => {
    it('debería validar un usuario admin válido', () => {
      const data = {
        nombre: 'Admin García',
        email: 'admin@ayuntamiento.es',
        password: 'Admin123',
      }
      const resultado = schemaCrearUsuarioAdmin.safeParse(data)
      expect(resultado.success).toBe(true)
    })

    it('debería rechazar email inválido', () => {
      const data = {
        nombre: 'Admin García',
        email: 'no-es-email',
        password: 'Admin123',
      }
      const resultado = schemaCrearUsuarioAdmin.safeParse(data)
      expect(resultado.success).toBe(false)
      if (!resultado.success) {
        expect(resultado.error.issues[0].message).toContain('Email no válido')
      }
    })

    it('debería rechazar password corta (menos de 8 caracteres)', () => {
      const data = {
        nombre: 'Admin García',
        email: 'admin@ayuntamiento.es',
        password: 'Adm1',
      }
      const resultado = schemaCrearUsuarioAdmin.safeParse(data)
      expect(resultado.success).toBe(false)
      if (!resultado.success) {
        expect(resultado.error.issues[0].message).toContain('contraseña')
      }
    })

    it('debería rechazar nombre muy corto (menos de 2 caracteres)', () => {
      const data = {
        nombre: 'A',
        email: 'admin@ayuntamiento.es',
        password: 'Admin123',
      }
      const resultado = schemaCrearUsuarioAdmin.safeParse(data)
      expect(resultado.success).toBe(false)
      if (!resultado.success) {
        expect(resultado.error.issues[0].message).toContain('nombre')
      }
    })

    it('debería rechazar nombre vacío', () => {
      const data = {
        nombre: '',
        email: 'admin@ayuntamiento.es',
        password: 'Admin123',
      }
      const resultado = schemaCrearUsuarioAdmin.safeParse(data)
      expect(resultado.success).toBe(false)
    })
  })
})
