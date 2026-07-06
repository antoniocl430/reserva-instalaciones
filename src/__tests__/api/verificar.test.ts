/**
 * Tests para GET /api/verificar/[token]
 * TDD: tests escritos ANTES de implementar el endpoint
 *
 * Endpoint cubierto:
 *   GET /api/verificar/[token] — ruta pública, devuelve datos de la reserva por token QR
 */

// eslint-disable-next-line no-var
var prismaMock: any

jest.mock("@/lib/prisma", () => {
  const { mockDeep } = require("jest-mock-extended")
  prismaMock = mockDeep()
  return { prisma: prismaMock }
})

// La ruta de verificación NO usa next-auth (es pública), pero el mock se
// añade por si acaso las dependencias transitivas lo necesitan.
jest.mock("next-auth", () => ({
  default: jest.fn(),
  getServerSession: jest.fn(),
}))

import { NextRequest } from "next/server"
import { GET } from "@/app/api/verificar/[token]/route"

// Token y datos de prueba reutilizables
const TOKEN_VALIDO = "token-valido-uuid"
const TOKEN_INEXISTENTE = "token-que-no-existe"

// Reserva futura en 2099 para que siempre sea "futura" al ejecutar el test
const reservaMock = {
  id: "res-1",
  qrToken: TOKEN_VALIDO,
  fecha: new Date("2099-06-15T00:00:00.000Z"),
  horaInicio: new Date("2099-06-15T10:00:00.000Z"),
  horaFin: new Date("2099-06-15T11:00:00.000Z"),
  estado: "ACTIVA",
  instalacion: { id: "inst-1", nombre: "Pista 1" },
  usuario: { nombre: "Ana García", email: "ana@test.com" },
}

// Helper para construir el objeto params que Next.js inyecta en los handlers
function crearParams(token: string) {
  return { params: { token } }
}

// Helper para construir un NextRequest mínimo (la ruta no usa el request directamente)
function crearRequest() {
  return new NextRequest("http://localhost/api/verificar/" + TOKEN_VALIDO)
}

describe("GET /api/verificar/[token]", () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it("devuelve 404 si el token no existe", async () => {
    prismaMock.reserva.findUnique.mockResolvedValueOnce(null)

    const res = await GET(crearRequest(), crearParams(TOKEN_INEXISTENTE))
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.valida).toBe(false)
    expect(body.error).toBe("Token no encontrado")
  })

  it("devuelve valida=true para una reserva ACTIVA con el token correcto", async () => {
    prismaMock.reserva.findUnique.mockResolvedValueOnce(reservaMock)

    const res = await GET(crearRequest(), crearParams(TOKEN_VALIDO))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.valida).toBe(true)
    expect(body.estado).toBe("ACTIVA")
  })

  it("devuelve valida=false para una reserva CANCELADA", async () => {
    const reservaCancelada = { ...reservaMock, estado: "CANCELADA" }
    prismaMock.reserva.findUnique.mockResolvedValueOnce(reservaCancelada)

    const res = await GET(crearRequest(), crearParams(TOKEN_VALIDO))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.valida).toBe(false)
    expect(body.estado).toBe("CANCELADA")
  })

  it("incluye nombre del ciudadano e instalación en la respuesta", async () => {
    prismaMock.reserva.findUnique.mockResolvedValueOnce(reservaMock)

    const res = await GET(crearRequest(), crearParams(TOKEN_VALIDO))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.reserva.ciudadano).toBe("Ana García")
    expect(body.reserva.instalacion.nombre).toBe("Pista 1")
    expect(body.reserva.instalacion.id).toBe("inst-1")
  })

  it("no requiere autenticación (accesible sin sesión)", async () => {
    // El endpoint es público: no llama a getServerSession.
    // Verificamos que la ruta responde correctamente SIN ningún mock de sesión.
    prismaMock.reserva.findUnique.mockResolvedValueOnce(reservaMock)

    // getServerSession NO está configurado — si la ruta lo llamara, devolvería undefined
    // y probablemente devolvería 401. El hecho de que devuelva 200 prueba que no lo usa.
    const res = await GET(crearRequest(), crearParams(TOKEN_VALIDO))

    expect(res.status).toBe(200)
  })

  it("devuelve la fecha, horaInicio y horaFin como strings ISO en el objeto reserva", async () => {
    prismaMock.reserva.findUnique.mockResolvedValueOnce(reservaMock)

    const res = await GET(crearRequest(), crearParams(TOKEN_VALIDO))
    const body = await res.json()

    expect(typeof body.reserva.fecha).toBe("string")
    expect(typeof body.reserva.horaInicio).toBe("string")
    expect(typeof body.reserva.horaFin).toBe("string")
    // Las fechas deben ser parseable como Date válido
    expect(isNaN(Date.parse(body.reserva.fecha))).toBe(false)
    expect(isNaN(Date.parse(body.reserva.horaInicio))).toBe(false)
    expect(isNaN(Date.parse(body.reserva.horaFin))).toBe(false)
  })

  it("consulta prisma.reserva.findUnique con el campo qrToken correcto", async () => {
    prismaMock.reserva.findUnique.mockResolvedValueOnce(reservaMock)

    await GET(crearRequest(), crearParams(TOKEN_VALIDO))

    expect(prismaMock.reserva.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { qrToken: TOKEN_VALIDO },
      })
    )
  })
})
