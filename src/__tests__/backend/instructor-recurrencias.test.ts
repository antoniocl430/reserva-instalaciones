// eslint-disable-next-line no-var
var prismaMock: any

jest.mock('@/lib/prisma', () => {
  const { mockDeep } = require('jest-mock-extended')
  prismaMock = mockDeep()
  return { prisma: prismaMock }
})

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('@/lib/email', () => ({
  enviarEmailConfirmacionGrupo: jest.fn().mockResolvedValue(undefined),
  enviarEmailCancelacionGrupo: jest.fn().mockResolvedValue(undefined),
}))

import { getServerSession } from 'next-auth'
import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/instructor/reservas-recurrentes/route'
import { DELETE } from '@/app/api/instructor/reservas-recurrentes/[grupoId]/route'

describe("POST /api/instructor/reservas-recurrentes", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("rechaza sin auth (401)", async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce(null)

    const request = new NextRequest("http://localhost:3000/api/instructor/reservas-recurrentes", {
      method: "POST",
      body: JSON.stringify({
        instalacionId: "instalacion-1",
        horaInicio: "08:00",
        fechaInicio: "2026-05-01",
        fechaFin: "2026-05-31",
        frecuencia: "SEMANAL",
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(401)

    const data = await response.json()
    expect(data.error).toBeDefined()
  })

  it("rechaza CIUDADANO con 403", async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: {
        id: "user-1",
        email: "ciudadano@test.com",
        name: "Ciudadano",
        rol: "CIUDADANO",
        tenantId: "tenant-1",
      },
    } as any)

    const request = new NextRequest("http://localhost:3000/api/instructor/reservas-recurrentes", {
      method: "POST",
      body: JSON.stringify({
        instalacionId: "instalacion-1",
        horaInicio: "08:00",
        fechaInicio: "2026-05-01",
        fechaFin: "2026-05-31",
        frecuencia: "SEMANAL",
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(403)

    const data = await response.json()
    expect(data.error).toBeDefined()
  })

  it("crea grupo válido → devuelve { grupo, reservas }", async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: {
        id: "instructor-1",
        email: "instructor@test.com",
        name: "Instructor",
        rol: "INSTRUCTOR",
        tenantId: "tenant-1",
      },
    } as any)

    const mockGrupo = {
      id: "grupo-1",
      usuarioId: "instructor-1",
      tenantId: "tenant-1",
      instalacionId: "instalacion-1",
      horaInicio: "08:00",
      frecuencia: "SEMANAL",
      fechaInicio: new Date("2026-05-01"),
      fechaFin: new Date("2026-05-31"),
      activo: true,
      instalacion: { nombre: "Pádel 1" },
    }

    const mockReservas = [
      {
        id: "reserva-1",
        grupoRecurrenciaId: "grupo-1",
        estado: "ACTIVA",
        fecha: new Date("2026-05-01"),
      },
      {
        id: "reserva-2",
        grupoRecurrenciaId: "grupo-1",
        estado: "ACTIVA",
        fecha: new Date("2026-05-08"),
      },
    ]

    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => {
      const tx = {
        grupoRecurrencia: {
          create: jest.fn().mockResolvedValueOnce(mockGrupo),
        },
        reserva: {
          findFirst: jest.fn().mockResolvedValueOnce(null),
          create: jest.fn()
            .mockResolvedValueOnce(mockReservas[0])
            .mockResolvedValueOnce(mockReservas[1]),
        },
        bloqueo: {
          findFirst: jest.fn().mockResolvedValueOnce(null),
        },
      }
      return fn(tx)
    })

    const request = new NextRequest("http://localhost:3000/api/instructor/reservas-recurrentes", {
      method: "POST",
      body: JSON.stringify({
        instalacionId: "instalacion-1",
        horaInicio: "08:00",
        fechaInicio: "2026-05-01",
        fechaFin: "2026-05-08",
        frecuencia: "SEMANAL",
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(201)

    const data = await response.json()
    expect(data).toHaveProperty("grupo")
    expect(data).toHaveProperty("reservas")
    expect(data.grupo.id).toBe("grupo-1")
    expect(Array.isArray(data.reservas)).toBe(true)
  })

  it("rechaza con 409 si hay conflicto de fecha", async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: {
        id: "instructor-1",
        email: "instructor@test.com",
        name: "Instructor",
        rol: "INSTRUCTOR",
        tenantId: "tenant-1",
      },
    } as any)

    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => {
      const tx = {
        grupoRecurrencia: { create: jest.fn() },
        reserva: {
          findFirst: jest.fn().mockResolvedValueOnce({
            id: "reserva-conflictiva",
            instalacionId: "instalacion-1",
            estado: "ACTIVA",
          }),
          create: jest.fn(),
          updateMany: jest.fn(),
        },
        bloqueo: { findFirst: jest.fn() },
      }
      return fn(tx)
    })

    const request = new NextRequest("http://localhost:3000/api/instructor/reservas-recurrentes", {
      method: "POST",
      body: JSON.stringify({
        instalacionId: "instalacion-1",
        horaInicio: "08:00",
        fechaInicio: "2026-05-01",
        fechaFin: "2026-05-08",
        frecuencia: "SEMANAL",
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(409)

    const data = await response.json()
    expect(data).toHaveProperty("error")
    expect(data).toHaveProperty("conflictos")
    expect(Array.isArray(data.conflictos)).toBe(true)
  })
})

describe("DELETE /api/instructor/reservas-recurrentes/[grupoId]", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("rechaza sin auth (401)", async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce(null)

    const request = new NextRequest("http://localhost:3000/api/instructor/reservas-recurrentes/grupo-1", {
      method: "DELETE",
    })

    const response = await DELETE(request, { params: { grupoId: "grupo-1" } })
    expect(response.status).toBe(401)

    const data = await response.json()
    expect(data.error).toBeDefined()
  })

  it("rechaza si no es propietario (403)", async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: {
        id: "instructor-2",
        email: "otro@test.com",
        name: "Otro Instructor",
        rol: "INSTRUCTOR",
        tenantId: "tenant-1",
      },
    } as any)

    const mockGrupo = {
      id: "grupo-1",
      usuarioId: "instructor-1",
      tenantId: "tenant-1",
      instalacionId: "instalacion-1",
      horaInicio: "08:00",
      frecuencia: "SEMANAL",
      activo: true,
      instalacion: { nombre: "Pádel 1" },
    }

    prismaMock.grupoRecurrencia.findUnique.mockResolvedValueOnce(mockGrupo as any)

    const request = new NextRequest("http://localhost:3000/api/instructor/reservas-recurrentes/grupo-1", {
      method: "DELETE",
    })

    const response = await DELETE(request, { params: { grupoId: "grupo-1" } })
    expect(response.status).toBe(403)

    const data = await response.json()
    expect(data.error).toBeDefined()
  })

  it("cancela grupo y reservas futuras", async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: {
        id: "instructor-1",
        email: "instructor@test.com",
        name: "Instructor",
        rol: "INSTRUCTOR",
        tenantId: "tenant-1",
      },
    } as any)

    const mockGrupo = {
      id: "grupo-1",
      usuarioId: "instructor-1",
      tenantId: "tenant-1",
      instalacionId: "instalacion-1",
      horaInicio: "08:00",
      frecuencia: "SEMANAL",
      activo: true,
      instalacion: { nombre: "Pádel 1" },
    }

    prismaMock.grupoRecurrencia.findUnique.mockResolvedValueOnce(mockGrupo as any)

    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => {
      const tx = {
        grupoRecurrencia: {
          update: jest.fn().mockResolvedValueOnce({
            ...mockGrupo,
            activo: false,
          }),
        },
        reserva: {
          updateMany: jest.fn().mockResolvedValueOnce({ count: 3 }),
        },
      }
      return fn(tx)
    })

    const request = new NextRequest("http://localhost:3000/api/instructor/reservas-recurrentes/grupo-1", {
      method: "DELETE",
    })

    const response = await DELETE(request, { params: { grupoId: "grupo-1" } })
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toHaveProperty("grupo")
    expect(data).toHaveProperty("reservasCanceladas")
    expect(data.grupo.activo).toBe(false)
    expect(data.reservasCanceladas).toBe(3)
  })
})

describe("GET /api/instructor/reservas-recurrentes", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("rechaza sin auth (401)", async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce(null)

    const request = new NextRequest("http://localhost:3000/api/instructor/reservas-recurrentes", {
      method: "GET",
    })

    const response = await GET(request)
    expect(response.status).toBe(401)

    const data = await response.json()
    expect(data.error).toBeDefined()
  })

  it("devuelve lista de grupos activos del instructor", async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: {
        id: "instructor-1",
        email: "instructor@test.com",
        name: "Instructor",
        rol: "INSTRUCTOR",
        tenantId: "tenant-1",
      },
    } as any)

    const mockGrupos = [
      {
        id: "grupo-1",
        usuarioId: "instructor-1",
        tenantId: "tenant-1",
        instalacionId: "instalacion-1",
        horaInicio: "08:00",
        frecuencia: "SEMANAL",
        fechaInicio: new Date("2026-05-01"),
        fechaFin: new Date("2026-05-31"),
        activo: true,
        instalacion: { nombre: "Pádel 1" },
        reservas: [
          { id: "reserva-1", fecha: new Date("2026-05-01") },
          { id: "reserva-2", fecha: new Date("2026-05-08") },
        ],
      },
      {
        id: "grupo-2",
        usuarioId: "instructor-1",
        tenantId: "tenant-1",
        instalacionId: "instalacion-2",
        horaInicio: "16:45",
        frecuencia: "QUINCENAL",
        fechaInicio: new Date("2026-06-01"),
        fechaFin: new Date("2026-06-30"),
        activo: true,
        instalacion: { nombre: "Piscina" },
        reservas: [
          { id: "reserva-3", fecha: new Date("2026-06-01") },
        ],
      },
    ]

    prismaMock.grupoRecurrencia.findMany.mockResolvedValueOnce(mockGrupos as any)

    const request = new NextRequest("http://localhost:3000/api/instructor/reservas-recurrentes", {
      method: "GET",
    })

    const response = await GET(request)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toHaveProperty("grupos")
    expect(Array.isArray(data.grupos)).toBe(true)
    expect(data.grupos.length).toBe(2)
    expect(data.grupos[0].id).toBe("grupo-1")
    expect(data.grupos[1].id).toBe("grupo-2")
  })
})
