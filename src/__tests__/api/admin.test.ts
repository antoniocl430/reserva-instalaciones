// eslint-disable-next-line no-var
var prismaMock: any

jest.mock("@/lib/prisma", () => {
  const { mockDeep } = require("jest-mock-extended")
  prismaMock = mockDeep()
  return { prisma: prismaMock }
})

jest.mock("next-auth", () => ({
  default: jest.fn(),
  getServerSession: jest.fn(),
}))

jest.mock("@/lib/email", () => ({
  enviarEmailCancelacion: jest.fn().mockResolvedValue(undefined),
}))

import { getServerSession } from "next-auth"
import { NextRequest } from "next/server"

// Importar todos los handlers
import { GET as metricas_GET } from "@/app/api/admin/metricas/route"
import {
  GET as pistas_GET,
  POST as pistas_POST,
} from "@/app/api/admin/pistas/route"
import { PATCH as pistas_PATCH } from "@/app/api/admin/pistas/[id]/route"
import { DELETE as bloqueos_DELETE } from "@/app/api/admin/bloqueos/[id]/route"
import {
  GET as bloqueos_GET,
  POST as bloqueos_POST,
} from "@/app/api/admin/bloqueos/route"
import { GET as reservas_GET, POST as reservas_POST } from "@/app/api/admin/reservas/route"
import { PATCH as reservas_cancelar_PATCH } from "@/app/api/admin/reservas/[id]/cancelar/route"
import { DELETE as usuarios_DELETE } from "@/app/api/admin/usuarios/[id]/route"
import { GET as ciudadanos_GET } from "@/app/api/admin/ciudadanos/route"

describe("Admin API Routes — Bloque 3: Panel de Administración", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock de transacción para rutas que usan prisma.$transaction
    prismaMock.$transaction.mockImplementation((fn: any) => fn(prismaMock))
  })

  // ============================================================================
  // GET /api/admin/metricas
  // ============================================================================

  describe("GET /api/admin/metricas", () => {
    it("debería devolver 401 cuando no hay sesión", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce(null)

      const request = new NextRequest("http://localhost:3000/api/admin/metricas")
      const response = await metricas_GET(request)

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe("No autenticado")
    })

    it("debería devolver 403 cuando el usuario no es ADMIN", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: "123", rol: "CIUDADANO" },
      })

      const request = new NextRequest("http://localhost:3000/api/admin/metricas")
      const response = await metricas_GET(request)

      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.error).toContain("No tienes permiso")
    })

    it("debería devolver 200 con las 4 métricas cuando el usuario es ADMIN", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: "admin-id", rol: "ADMIN" },
      })

      prismaMock.reserva.count.mockResolvedValueOnce(5)
      prismaMock.reserva.count.mockResolvedValueOnce(10)
      prismaMock.instalacion.count.mockResolvedValueOnce(3)
      prismaMock.reserva.count.mockResolvedValueOnce(2)

      const request = new NextRequest("http://localhost:3000/api/admin/metricas")
      const response = await metricas_GET(request)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body).toHaveProperty("reservasHoy")
      expect(body).toHaveProperty("reservasActivas")
      expect(body).toHaveProperty("pistasActivas")
      expect(body).toHaveProperty("cancelacionesHoy")
    })
  })

  // ============================================================================
  // GET /api/admin/reservas
  // ============================================================================

  describe("GET /api/admin/reservas", () => {
    it("debería devolver 401 cuando no hay sesión", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce(null)

      const request = new NextRequest("http://localhost:3000/api/admin/reservas")
      const response = await reservas_GET(request)

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe("No autenticado")
    })

    it("debería devolver 403 cuando el usuario no es ADMIN", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: "123", rol: "CIUDADANO" },
      })

      const request = new NextRequest("http://localhost:3000/api/admin/reservas")
      const response = await reservas_GET(request)

      expect(response.status).toBe(403)
    })

    it("debería devolver 200 con lista de reservas cuando es ADMIN", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: "admin-id", rol: "ADMIN" },
      })

      prismaMock.reserva.findMany.mockResolvedValueOnce([
        {
          id: "res-1",
          usuarioId: "user-1",
          instalacionId: "inst-1",
          fecha: new Date("2026-03-25"),
          horaInicio: new Date("2026-03-25T10:00:00Z"),
          horaFin: new Date("2026-03-25T11:00:00Z"),
          estado: "ACTIVA",
          creadoEn: new Date(),
          canceladoEn: null,
          canceladoPor: null,
          usuario: { nombre: "Juan", email: "juan@test.com" },
          instalacion: { nombre: "Pádel 1" },
        },
      ])

      const request = new NextRequest("http://localhost:3000/api/admin/reservas")
      const response = await reservas_GET(request)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(Array.isArray(body.reservas)).toBe(true)
      expect(body.reservas.length).toBe(1)
    })

    it("debería filtrar por estado cuando se pasa el query param estado", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: "admin-id", rol: "ADMIN" },
      })

      prismaMock.reserva.findMany.mockResolvedValueOnce([
        {
          id: "res-1",
          estado: "CANCELADA",
          usuario: { nombre: "Juan", email: "juan@test.com" },
          instalacion: { nombre: "Pádel 1" },
        },
      ])

      const request = new NextRequest(
        "http://localhost:3000/api/admin/reservas?estado=CANCELADA"
      )
      const response = await reservas_GET(request)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.reservas[0].estado).toBe("CANCELADA")
    })

    it("debería rechazar formato de fecha inválido en filtro", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: "admin-id", rol: "ADMIN" },
      })

      const request = new NextRequest(
        "http://localhost:3000/api/admin/reservas?fecha=25-03-2026"
      )
      const response = await reservas_GET(request)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toContain("YYYY-MM-DD")
    })
  })

  // ============================================================================
  // PATCH /api/admin/reservas/[id]/cancelar
  // ============================================================================

  describe("PATCH /api/admin/reservas/[id]/cancelar", () => {
    it("debería devolver 401 cuando no hay sesión", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce(null)

      const request = new NextRequest(
        "http://localhost:3000/api/admin/reservas/res-1/cancelar",
        { method: "PATCH" }
      )
      const response = await reservas_cancelar_PATCH(request, {
        params: { id: "res-1" },
      })

      expect(response.status).toBe(401)
    })

    it("debería devolver 404 cuando la reserva no existe", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: "admin-id", rol: "ADMIN", tenantId: "tenant-test" },
      })

      // La ruta usa findFirst con { id, tenantId } desde Fase 4 (LESSON-016)
      prismaMock.reserva.findFirst.mockResolvedValueOnce(null)

      const request = new NextRequest(
        "http://localhost:3000/api/admin/reservas/no-existe/cancelar",
        { method: "PATCH" }
      )
      const response = await reservas_cancelar_PATCH(request, {
        params: { id: "no-existe" },
      })

      expect(response.status).toBe(404)
      const body = await response.json()
      expect(body.error).toContain("no encontrada")
    })

    it("debería devolver 409 cuando la reserva ya está cancelada", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: "admin-id", rol: "ADMIN", tenantId: "tenant-test" },
      })

      // La ruta usa findFirst con { id, tenantId } desde Fase 4 (LESSON-016)
      prismaMock.reserva.findFirst.mockResolvedValueOnce({
        id: "res-1",
        estado: "CANCELADA",
      })

      const request = new NextRequest(
        "http://localhost:3000/api/admin/reservas/res-1/cancelar",
        { method: "PATCH" }
      )
      const response = await reservas_cancelar_PATCH(request, {
        params: { id: "res-1" },
      })

      expect(response.status).toBe(409)
      const body = await response.json()
      expect(body.error).toContain("no está activa")
    })

    it("debería devolver 200 y cancelar la reserva si el admin lo solicita", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: "admin-id", rol: "ADMIN", tenantId: "tenant-test" },
      })

      const reservaActiva = {
        id: "res-1",
        tenantId: "tenant-test",
        estado: "ACTIVA",
        fecha: new Date("2099-12-30"),
        horaInicio: new Date("2099-12-30T10:00:00Z"),
        usuario: { nombre: "Juan", email: "juan@test.com" },
        instalacion: { nombre: "Pádel 1" },
      }

      // La ruta usa findFirst con { id, tenantId } desde Fase 4 (LESSON-016)
      prismaMock.reserva.findFirst.mockResolvedValueOnce(reservaActiva)
      prismaMock.reserva.update.mockResolvedValueOnce({
        ...reservaActiva,
        estado: "CANCELADA",
      })

      const request = new NextRequest(
        "http://localhost:3000/api/admin/reservas/res-1/cancelar",
        { method: "PATCH" }
      )
      const response = await reservas_cancelar_PATCH(request, {
        params: { id: "res-1" },
      })

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body).toHaveProperty("reserva")
    })
  })

  // ============================================================================
  // POST /api/admin/bloqueos
  // ============================================================================

  describe("POST /api/admin/bloqueos", () => {
    it("debería devolver 400 si fechaInicio es posterior a fechaFin", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: "admin-id", rol: "ADMIN" },
      })

      const request = new NextRequest(
        "http://localhost:3000/api/admin/bloqueos",
        {
          method: "POST",
          body: JSON.stringify({
            instalacionId: "inst-1",
            fechaInicio: "2026-03-30",
            fechaFin: "2026-03-25",
            motivo: "Mantenimiento",
          }),
        }
      )

      const response = await bloqueos_POST(request)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toContain("posterior")
    })

    it("debería devolver 400 si el formato de fecha es incorrecto", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: "admin-id", rol: "ADMIN" },
      })

      const request = new NextRequest(
        "http://localhost:3000/api/admin/bloqueos",
        {
          method: "POST",
          body: JSON.stringify({
            instalacionId: "inst-1",
            fechaInicio: "25/03/2026",
            fechaFin: "2026-03-30",
            motivo: "Mantenimiento",
          }),
        }
      )

      const response = await bloqueos_POST(request)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toContain("YYYY-MM-DD")
    })

    it("debería devolver 400 si motivo no es string", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: "admin-id", rol: "ADMIN" },
      })

      const request = new NextRequest(
        "http://localhost:3000/api/admin/bloqueos",
        {
          method: "POST",
          body: JSON.stringify({
            instalacionId: "inst-1",
            fechaInicio: "2026-03-25",
            fechaFin: "2026-03-30",
            motivo: 123, // número en lugar de string
          }),
        }
      )

      const response = await bloqueos_POST(request)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toContain("Invalid input")
    })

    it("debería devolver 201 con el bloqueo creado si los datos son correctos", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: "admin-id", rol: "ADMIN", tenantId: "tenant-test" },
      })

      // La ruta usa findFirst con { id, tenantId } desde Fase 4 (LESSON-016)
      prismaMock.instalacion.findFirst.mockResolvedValueOnce({
        id: "inst-1",
        nombre: "Pádel 1",
      })

      prismaMock.bloqueo.create.mockResolvedValueOnce({
        id: "bloqueo-1",
        instalacionId: "inst-1",
        fechaInicio: new Date("2026-03-25"),
        fechaFin: new Date("2026-03-30"),
        motivo: "Mantenimiento",
        creadoPorId: "admin-id",
        creadoEn: new Date(),
        activo: true,
        instalacion: { nombre: "Pádel 1" },
      })

      const request = new NextRequest(
        "http://localhost:3000/api/admin/bloqueos",
        {
          method: "POST",
          body: JSON.stringify({
            instalacionId: "inst-1",
            fechaInicio: "2026-03-25",
            fechaFin: "2026-03-30",
            motivo: "Mantenimiento",
          }),
        }
      )

      const response = await bloqueos_POST(request)
      expect(response.status).toBe(201)
      const body = await response.json()
      expect(body).toHaveProperty("bloqueo")
      expect(body.bloqueo.id).toBe("bloqueo-1")
    })
  })

  // ============================================================================
  // DELETE /api/admin/usuarios/[id]
  // ============================================================================

  describe("DELETE /api/admin/usuarios/[id]", () => {
    it("debería devolver 403 si intenta eliminarse a sí mismo", async () => {
      const sessionUser = { id: "admin-id", rol: "ADMIN" }
      ;(getServerSession as jest.Mock).mockResolvedValueOnce({
        user: sessionUser,
      })

      const request = new NextRequest(
        "http://localhost:3000/api/admin/usuarios/admin-id",
        { method: "DELETE" }
      )
      const response = await usuarios_DELETE(request, {
        params: { id: "admin-id" },
      })

      expect(response.status).toBe(409)
      const body = await response.json()
      expect(body.error).toContain("propia")
    })

    it("debería devolver 404 si el usuario no existe en el tenant", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: "admin-id", rol: "ADMIN", tenantId: "tenant-test" },
      })

      // deleteMany devuelve { count: 0 } cuando no encuentra el registro
      prismaMock.usuario.deleteMany.mockResolvedValueOnce({ count: 0 })

      const request = new NextRequest(
        "http://localhost:3000/api/admin/usuarios/no-existe",
        { method: "DELETE" }
      )
      const response = await usuarios_DELETE(request, {
        params: { id: "no-existe" },
      })

      expect(response.status).toBe(404)
      const body = await response.json()
      expect(body.error).toContain("Usuario no encontrado")
    })

    it("debería devolver 200 si el usuario existe y no es el actual", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: "admin-1", rol: "ADMIN", tenantId: "tenant-test" },
      })

      // deleteMany devuelve { count: 1 } cuando elimina un registro
      prismaMock.usuario.deleteMany.mockResolvedValueOnce({ count: 1 })

      const request = new NextRequest(
        "http://localhost:3000/api/admin/usuarios/admin-2",
        { method: "DELETE" }
      )
      const response = await usuarios_DELETE(request, {
        params: { id: "admin-2" },
      })

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.mensaje).toContain("eliminado")
    })
  })

  // ============================================================================
  // GET /api/admin/pistas
  // ============================================================================

  describe("GET /api/admin/pistas", () => {
    it("debería devolver 401 cuando no hay sesión", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce(null)

      const request = new NextRequest("http://localhost:3000/api/admin/pistas")
      const response = await pistas_GET(request)

      expect(response.status).toBe(401)
    })

    it("debería devolver lista de instalaciones cuando es ADMIN", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: "admin-id", rol: "ADMIN" },
      })

      prismaMock.instalacion.findMany.mockResolvedValueOnce([
        {
          id: "1",
          nombre: "Pádel 1",
          tipo: "PADEL",
          descripcion: null,
          activa: true,
          creadoEn: new Date(),
          horario: "Lun-Dom: 8:00-13:00 y 16:45-20:30",
        },
      ])

      const request = new NextRequest("http://localhost:3000/api/admin/pistas")
      const response = await pistas_GET(request)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body).toHaveProperty("instalaciones")
      expect(Array.isArray(body.instalaciones)).toBe(true)
    })
  })

  // ============================================================================
  // POST /api/admin/pistas
  // ============================================================================

  describe("POST /api/admin/pistas", () => {
    it("debería devolver 400 si el nombre está vacío", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: "admin-id", rol: "ADMIN" },
      })

      const request = new NextRequest("http://localhost:3000/api/admin/pistas", {
        method: "POST",
        body: JSON.stringify({ nombre: "", tipo: "PADEL" }),
      })

      const response = await pistas_POST(request)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toContain("nombre")
    })

    it("debería devolver 201 con la pista creada si los datos son correctos", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: "admin-id", rol: "ADMIN", tenantId: "tenant-1" },
      })

      // El código usa findFirst (no findUnique) para verificar nombre único por tenant
      prismaMock.instalacion.findFirst.mockResolvedValueOnce(null)
      prismaMock.instalacion.create.mockResolvedValueOnce({
        id: "new-id",
        nombre: "Pádel 4",
        tipo: "PADEL",
        descripcion: null,
        activa: true,
        creadoEn: new Date(),
        horario: "Lun-Dom: 8:00-13:00 y 16:45-20:30",
      })

      const request = new NextRequest("http://localhost:3000/api/admin/pistas", {
        method: "POST",
        body: JSON.stringify({ nombre: "Pádel 4", tipo: "PADEL" }),
      })

      const response = await pistas_POST(request)
      expect(response.status).toBe(201)
      const body = await response.json()
      expect(body).toHaveProperty("instalacion")
    })

    it("debería aceptar el campo horario y guardarlo", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: "admin-id", rol: "ADMIN", tenantId: "tenant-1" },
      })

      // El código usa findFirst (no findUnique) para verificar nombre único por tenant
      prismaMock.instalacion.findFirst.mockResolvedValueOnce(null)
      prismaMock.instalacion.create.mockResolvedValueOnce({
        id: "new-id",
        nombre: "Pádel 5",
        tipo: "PADEL",
        descripcion: null,
        activa: true,
        creadoEn: new Date(),
        horario: "Lun-Vie: 9:00-14:00 y 17:00-21:00",
      })

      const request = new NextRequest("http://localhost:3000/api/admin/pistas", {
        method: "POST",
        body: JSON.stringify({
          nombre: "Pádel 5",
          tipo: "PADEL",
          horario: "Lun-Vie: 9:00-14:00 y 17:00-21:00",
        }),
      })

      const response = await pistas_POST(request)
      expect(response.status).toBe(201)
      const body = await response.json()
      expect(body.instalacion.horario).toBe("Lun-Vie: 9:00-14:00 y 17:00-21:00")
    })

    it("debería usar el valor por defecto de horario si no se envía", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: "admin-id", rol: "ADMIN", tenantId: "tenant-1" },
      })

      // El código usa findFirst (no findUnique) para verificar nombre único por tenant
      prismaMock.instalacion.findFirst.mockResolvedValueOnce(null)
      prismaMock.instalacion.create.mockResolvedValueOnce({
        id: "new-id",
        nombre: "Pádel 6",
        tipo: "PADEL",
        descripcion: null,
        activa: true,
        creadoEn: new Date(),
        horario: "Lun-Dom: 8:00-13:00 y 16:45-20:30",
      })

      const request = new NextRequest("http://localhost:3000/api/admin/pistas", {
        method: "POST",
        body: JSON.stringify({ nombre: "Pádel 6", tipo: "PADEL" }),
      })

      const response = await pistas_POST(request)
      expect(response.status).toBe(201)
      const body = await response.json()
      expect(body.instalacion.horario).toBe("Lun-Dom: 8:00-13:00 y 16:45-20:30")
    })
  })

  // ============================================================================
  // PATCH /api/admin/pistas/[id]
  // ============================================================================

  describe("PATCH /api/admin/pistas/[id]", () => {
    it("debería actualizar el campo horario", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: "admin-id", rol: "ADMIN", tenantId: "tenant-test" },
      })

      // La ruta usa findFirst con { id, tenantId } desde Fase 4 (LESSON-016)
      prismaMock.instalacion.findFirst.mockResolvedValueOnce({
        id: "inst-1",
        nombre: "Pádel 1",
        tipo: "PADEL",
        descripcion: null,
        activa: true,
        creadoEn: new Date(),
        horario: "Lun-Dom: 8:00-13:00 y 16:45-20:30",
      })

      prismaMock.instalacion.update.mockResolvedValueOnce({
        id: "inst-1",
        nombre: "Pádel 1",
        tipo: "PADEL",
        descripcion: null,
        activa: true,
        creadoEn: new Date(),
        horario: "Lun-Sab: 9:00-13:00 y 17:00-21:00",
      })

      const request = new NextRequest("http://localhost:3000/api/admin/pistas/inst-1", {
        method: "PATCH",
        body: JSON.stringify({
          horario: "Lun-Sab: 9:00-13:00 y 17:00-21:00",
        }),
      })

      const response = await pistas_PATCH(request, {
        params: { id: "inst-1" },
      })

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.instalacion.horario).toBe("Lun-Sab: 9:00-13:00 y 17:00-21:00")
    })
  })

  // ============================================================================
  // DELETE /api/admin/bloqueos/[id]
  // ============================================================================

  describe("DELETE /api/admin/bloqueos/[id]", () => {
    it("debería devolver 401 cuando no hay sesión", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce(null)

      const request = new NextRequest(
        "http://localhost:3000/api/admin/bloqueos/123"
      )
      const response = await bloqueos_DELETE(request, { params: { id: "123" } })

      expect(response.status).toBe(401)
    })

    it("debería devolver 404 si el bloqueo no existe", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: "admin-id", rol: "ADMIN", tenantId: "tenant-test" },
      })

      // La ruta usa findFirst con { id, tenantId } desde Fase 4 (LESSON-016)
      prismaMock.bloqueo.findFirst.mockResolvedValueOnce(null)

      const request = new NextRequest(
        "http://localhost:3000/api/admin/bloqueos/no-existe"
      )
      const response = await bloqueos_DELETE(request, { params: { id: "no-existe" } })

      expect(response.status).toBe(404)
    })

    it("debería devolver 200 al eliminar un bloqueo válido", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: "admin-id", rol: "ADMIN", tenantId: "tenant-test" },
      })

      // La ruta usa findFirst con { id, tenantId } desde Fase 4 (LESSON-016)
      prismaMock.bloqueo.findFirst.mockResolvedValueOnce({
        id: "bloqueo-id",
        instalacionId: "pista-1",
        fechaInicio: new Date(),
        fechaFin: new Date(),
        motivo: "Test",
        creadoPorId: "admin-id",
        creadoEn: new Date(),
        activo: true,
      })

      prismaMock.bloqueo.delete.mockResolvedValueOnce({
        id: "bloqueo-id",
        instalacionId: "pista-1",
        fechaInicio: new Date(),
        fechaFin: new Date(),
        motivo: "Test",
        creadoPorId: "admin-id",
        creadoEn: new Date(),
        activo: true,
      })

      const request = new NextRequest(
        "http://localhost:3000/api/admin/bloqueos/bloqueo-id"
      )
      const response = await bloqueos_DELETE(request, { params: { id: "bloqueo-id" } })

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.ok).toBe(true)
    })
  })

  // ============================================================================
  // POST /api/admin/reservas
  // ============================================================================

  describe("POST /api/admin/reservas", () => {
    it("debería devolver 401 cuando no hay sesión", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce(null)

      const request = new NextRequest("http://localhost:3000/api/admin/reservas", {
        method: "POST",
        body: JSON.stringify({
          usuarioId: "user-1",
          instalacionId: "inst-1",
          fecha: "2026-03-30",
          horaInicio: "10:30",
        }),
      })

      const response = await reservas_POST(request)
      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe("No autenticado")
    })

    it("debería devolver 403 cuando el usuario no es ADMIN", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: "user-1", rol: "CIUDADANO" },
      })

      const request = new NextRequest("http://localhost:3000/api/admin/reservas", {
        method: "POST",
        body: JSON.stringify({
          usuarioId: "user-1",
          instalacionId: "inst-1",
          fecha: "2026-03-30",
          horaInicio: "10:30",
        }),
      })

      const response = await reservas_POST(request)
      expect(response.status).toBe(403)
    })

    it("debería devolver 400 si la fecha no tiene formato YYYY-MM-DD", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: "admin-id", rol: "ADMIN" },
      })

      const request = new NextRequest("http://localhost:3000/api/admin/reservas", {
        method: "POST",
        body: JSON.stringify({
          usuarioId: "user-1",
          instalacionId: "inst-1",
          fecha: "30/03/2026",
          horaInicio: "10:30",
        }),
      })

      const response = await reservas_POST(request)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toContain("YYYY-MM-DD")
    })

    it("debería devolver 400 si la hora no es un slot válido", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: "admin-id", rol: "ADMIN" },
      })

      const request = new NextRequest("http://localhost:3000/api/admin/reservas", {
        method: "POST",
        body: JSON.stringify({
          usuarioId: "user-1",
          instalacionId: "inst-1",
          fecha: "2026-03-30",
          horaInicio: "15:00",
        }),
      })

      const response = await reservas_POST(request)
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBeTruthy()
      const errorLower = body.error.toLowerCase()
      expect(errorLower.includes("slot") || errorLower.includes("hora") || errorLower.includes("option")).toBe(true)
    })

    it("debería devolver 404 si el usuario no existe", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: "admin-id", rol: "ADMIN", tenantId: "tenant-test" },
      })

      // La ruta usa findFirst con { id, tenantId } desde Fase 4 (LESSON-016)
      prismaMock.usuario.findFirst.mockResolvedValueOnce(null)

      const request = new NextRequest("http://localhost:3000/api/admin/reservas", {
        method: "POST",
        body: JSON.stringify({
          usuarioId: "user-no-existe",
          instalacionId: "inst-1",
          fecha: "2026-03-30",
          horaInicio: "10:30",
        }),
      })

      const response = await reservas_POST(request)
      expect(response.status).toBe(404)
      const body = await response.json()
      expect(body.error).toContain("usuario")
    })

    it("debería devolver 404 si la instalación no existe", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: "admin-id", rol: "ADMIN", tenantId: "tenant-test" },
      })

      // La ruta usa findFirst con { id, tenantId } desde Fase 4 (LESSON-016)
      prismaMock.usuario.findFirst.mockResolvedValueOnce({
        id: "user-1",
        activo: true,
        email: "user@test.com",
        nombre: "Usuario",
      })

      prismaMock.instalacion.findFirst.mockResolvedValueOnce(null)

      const request = new NextRequest("http://localhost:3000/api/admin/reservas", {
        method: "POST",
        body: JSON.stringify({
          usuarioId: "user-1",
          instalacionId: "inst-no-existe",
          fecha: "2026-03-30",
          horaInicio: "10:30",
        }),
      })

      const response = await reservas_POST(request)
      expect(response.status).toBe(404)
      const body = await response.json()
      expect(body.error).toContain("Instalación")
    })

    it("debería devolver 409 si el slot ya está ocupado", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: "admin-id", rol: "ADMIN", tenantId: "tenant-test" },
      })

      // La ruta usa findFirst con { id, tenantId } desde Fase 4 (LESSON-016)
      prismaMock.usuario.findFirst.mockResolvedValueOnce({
        id: "user-1",
        activo: true,
        email: "user@test.com",
        nombre: "Usuario",
      })

      prismaMock.instalacion.findFirst.mockResolvedValueOnce({
        id: "inst-1",
        activa: true,
        nombre: "Pádel 1",
      })

      prismaMock.bloqueo.findFirst.mockResolvedValueOnce(null)

      prismaMock.$transaction.mockImplementation(async (fn: any) => {
        // Simular que el slot ya está ocupado dentro de la transacción
        throw new Error("SLOT_OCUPADO")
      })

      const request = new NextRequest("http://localhost:3000/api/admin/reservas", {
        method: "POST",
        body: JSON.stringify({
          usuarioId: "user-1",
          instalacionId: "inst-1",
          fecha: "2026-03-30",
          horaInicio: "10:30",
        }),
      })

      const response = await reservas_POST(request)
      expect(response.status).toBe(409)
    })

    it("debería devolver 201 con la reserva creada si los datos son correctos", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: "admin-id", rol: "ADMIN", tenantId: "tenant-test" },
      })

      // La ruta usa findFirst con { id, tenantId } desde Fase 4 (LESSON-016)
      prismaMock.usuario.findFirst.mockResolvedValueOnce({
        id: "user-1",
        activo: true,
        email: "user@test.com",
        nombre: "Usuario 1",
      })

      prismaMock.instalacion.findFirst.mockResolvedValueOnce({
        id: "inst-1",
        activa: true,
        nombre: "Pádel 1",
      })

      prismaMock.bloqueo.findFirst.mockResolvedValueOnce(null)

      prismaMock.$transaction.mockImplementation(async (fn: any) => {
        return fn(prismaMock)
      })

      prismaMock.reserva.findFirst.mockResolvedValueOnce(null)

      prismaMock.reserva.create.mockResolvedValueOnce({
        id: "res-1",
        usuarioId: "user-1",
        instalacionId: "inst-1",
        fecha: new Date("2026-03-30"),
        horaInicio: new Date("2026-03-30T10:30:00.000Z"),
        horaFin: new Date("2026-03-30T11:45:00.000Z"),
        estado: "ACTIVA",
        instalacion: { nombre: "Pádel 1" },
      })

      const request = new NextRequest("http://localhost:3000/api/admin/reservas", {
        method: "POST",
        body: JSON.stringify({
          usuarioId: "user-1",
          instalacionId: "inst-1",
          fecha: "2026-03-30",
          horaInicio: "10:30",
        }),
      })

      const response = await reservas_POST(request)
      expect(response.status).toBe(201)
      const body = await response.json()
      expect(body).toHaveProperty("reserva")
      expect(body.reserva.id).toBe("res-1")
    })
  })

  // ============================================================================
  // GET /api/admin/ciudadanos
  // ============================================================================

  describe("GET /api/admin/ciudadanos", () => {
    it("debería devolver 401 cuando no hay sesión", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce(null)

      const request = new NextRequest("http://localhost:3000/api/admin/ciudadanos")
      const response = await ciudadanos_GET(request)

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe("No autenticado")
    })

    it("debería devolver 403 cuando el usuario no es ADMIN", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: "user-1", rol: "CIUDADANO" },
      })

      const request = new NextRequest("http://localhost:3000/api/admin/ciudadanos")
      const response = await ciudadanos_GET(request)

      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.error).toContain("No tienes permiso")
    })

    it("debería devolver 200 con lista vacía cuando no hay ciudadanos", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: "admin-id", rol: "ADMIN" },
      })

      prismaMock.usuario.findMany.mockResolvedValueOnce([])

      const request = new NextRequest("http://localhost:3000/api/admin/ciudadanos")
      const response = await ciudadanos_GET(request)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(Array.isArray(body.ciudadanos)).toBe(true)
      expect(body.ciudadanos.length).toBe(0)
    })

    it("debería devolver 200 con lista de ciudadanos activos ordenados por nombre", async () => {
      ;(getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: "admin-id", rol: "ADMIN" },
      })

      prismaMock.usuario.findMany.mockResolvedValueOnce([
        {
          id: "user-1",
          nombre: "Alice",
          email: "alice@test.com",
        },
        {
          id: "user-2",
          nombre: "Bob",
          email: "bob@test.com",
        },
      ])

      const request = new NextRequest("http://localhost:3000/api/admin/ciudadanos")
      const response = await ciudadanos_GET(request)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(Array.isArray(body.ciudadanos)).toBe(true)
      expect(body.ciudadanos.length).toBe(2)
      expect(body.ciudadanos[0].nombre).toBe("Alice")
      expect(body.ciudadanos[1].nombre).toBe("Bob")
    })
  })
})
