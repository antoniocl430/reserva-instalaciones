/**
 * @jest-environment node
 */
import { schemaSolicitarRecuperacion, schemaResetearPassword } from "@/lib/validaciones"

describe("Schemas de recuperación de contraseña", () => {
  describe("schemaSolicitarRecuperacion", () => {
    it("debe validar un email válido", () => {
      const resultado = schemaSolicitarRecuperacion.safeParse({
        email: "usuario@example.com",
      })
      expect(resultado.success).toBe(true)
    })

    it("debe rechazar email inválido", () => {
      const resultado = schemaSolicitarRecuperacion.safeParse({
        email: "no-es-email",
      })
      expect(resultado.success).toBe(false)
      if (!resultado.success) {
        expect(resultado.error.issues[0].message).toContain("Email no válido")
      }
    })

    it("debe rechazar email vacío", () => {
      const resultado = schemaSolicitarRecuperacion.safeParse({
        email: "",
      })
      expect(resultado.success).toBe(false)
    })
  })

  describe("schemaResetearPassword", () => {
    it("debe validar token y password válidos", () => {
      const resultado = schemaResetearPassword.safeParse({
        token: "550e8400-e29b-41d4-a716-446655440000",
        password: "nuevacontraseña123",
      })
      expect(resultado.success).toBe(true)
    })

    it("debe rechazar token vacío", () => {
      const resultado = schemaResetearPassword.safeParse({
        token: "",
        password: "validPassword123",
      })
      expect(resultado.success).toBe(false)
      if (!resultado.success) {
        expect(resultado.error.issues[0].message).toContain("obligatorio")
      }
    })

    it("debe rechazar password muy corta", () => {
      const resultado = schemaResetearPassword.safeParse({
        token: "550e8400-e29b-41d4-a716-446655440000",
        password: "abc",
      })
      expect(resultado.success).toBe(false)
      if (!resultado.success) {
        expect(resultado.error.issues[0].message).toContain("al menos 6")
      }
    })

    it("debe rechazar password vacía", () => {
      const resultado = schemaResetearPassword.safeParse({
        token: "550e8400-e29b-41d4-a716-446655440000",
        password: "",
      })
      expect(resultado.success).toBe(false)
    })
  })
})
