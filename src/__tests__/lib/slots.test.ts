/**
 * Tests unitarios para src/lib/slots.ts
 *
 * Verifican:
 *  - generarSlots con la configuración por defecto
 *  - generarSlots con duración de 60 minutos
 *  - generarSlots con duración de 90 minutos
 *  - generarSlots con una sola franja
 *  - generarMapaSlots devuelve el Record correcto
 *  - crearHoraEnMadrid produce el instante UTC correcto
 */

import { describe, it, expect } from "vitest"
import {
  generarSlots,
  generarMapaSlots,
  crearHoraEnMadrid,
  SLOTS_CONFIG_DEFAULT,
  type SlotsConfig,
} from "@/lib/slots"

// ─── generarSlots ────────────────────────────────────────────────────────────

describe("generarSlots", () => {
  it("con la config por defecto genera exactamente 7 slots", () => {
    const slots = generarSlots(SLOTS_CONFIG_DEFAULT)
    expect(slots).toHaveLength(7)
  })

  it("con la config por defecto genera los slots correctos (inicio y fin)", () => {
    const slots = generarSlots(SLOTS_CONFIG_DEFAULT)
    // Primera franja 08:00-13:00 con 75 min: 08:00, 09:15, 10:30, 11:45
    expect(slots[0]).toEqual({ horaInicio: "08:00", horaFin: "09:15" })
    expect(slots[1]).toEqual({ horaInicio: "09:15", horaFin: "10:30" })
    expect(slots[2]).toEqual({ horaInicio: "10:30", horaFin: "11:45" })
    expect(slots[3]).toEqual({ horaInicio: "11:45", horaFin: "13:00" })
    // Segunda franja 16:45-20:30 con 75 min: 16:45, 18:00, 19:15
    expect(slots[4]).toEqual({ horaInicio: "16:45", horaFin: "18:00" })
    expect(slots[5]).toEqual({ horaInicio: "18:00", horaFin: "19:15" })
    expect(slots[6]).toEqual({ horaInicio: "19:15", horaFin: "20:30" })
  })

  it("con duración 60 min en las mismas franjas genera más slots", () => {
    const config: SlotsConfig = {
      duracionMinutos: 60,
      franjas: [
        { inicio: "08:00", fin: "13:00" },
        { inicio: "16:45", fin: "20:30" },
      ],
    }
    const slots = generarSlots(config)
    // Franja 1 08:00-13:00 con 60 min: 08:00, 09:00, 10:00, 11:00, 12:00 = 5 slots (13:00 exacto)
    // Franja 2 16:45-20:30 con 60 min: 16:45, 17:45, 18:45 = 3 slots
    //   (19:45+60=20:45 > 20:30, no cabe)
    expect(slots).toHaveLength(8)
    expect(slots[0]).toEqual({ horaInicio: "08:00", horaFin: "09:00" })
    expect(slots[4]).toEqual({ horaInicio: "12:00", horaFin: "13:00" })
    expect(slots[5]).toEqual({ horaInicio: "16:45", horaFin: "17:45" })
    expect(slots[7]).toEqual({ horaInicio: "18:45", horaFin: "19:45" })
  })

  it("con duración 90 min en las mismas franjas genera menos slots", () => {
    const config: SlotsConfig = {
      duracionMinutos: 90,
      franjas: [
        { inicio: "08:00", fin: "13:00" },
        { inicio: "16:45", fin: "20:30" },
      ],
    }
    const slots = generarSlots(config)
    // Franja 1 08:00-13:00 con 90 min: 08:00→09:30, 09:30→11:00, 11:00→12:30 = 3 slots
    // (12:30+90=14:00 > 13:00, no cabe)
    // Franja 2 16:45-20:30 con 90 min: 16:45→18:15, 18:15→19:45 = 2 slots
    // (19:45+90=21:15 > 20:30, no cabe)
    expect(slots).toHaveLength(5)
    expect(slots[0]).toEqual({ horaInicio: "08:00", horaFin: "09:30" })
    expect(slots[2]).toEqual({ horaInicio: "11:00", horaFin: "12:30" })
    expect(slots[3]).toEqual({ horaInicio: "16:45", horaFin: "18:15" })
    expect(slots[4]).toEqual({ horaInicio: "18:15", horaFin: "19:45" })
  })

  it("con una sola franja genera solo los slots de esa franja", () => {
    const config: SlotsConfig = {
      duracionMinutos: 60,
      franjas: [{ inicio: "10:00", fin: "12:00" }],
    }
    const slots = generarSlots(config)
    expect(slots).toHaveLength(2)
    expect(slots[0]).toEqual({ horaInicio: "10:00", horaFin: "11:00" })
    expect(slots[1]).toEqual({ horaInicio: "11:00", horaFin: "12:00" })
  })
})

// ─── generarMapaSlots ─────────────────────────────────────────────────────────

describe("generarMapaSlots", () => {
  it("devuelve el Record correcto con la config por defecto", () => {
    const mapa = generarMapaSlots(SLOTS_CONFIG_DEFAULT)
    expect(mapa).toEqual({
      "08:00": "09:15",
      "09:15": "10:30",
      "10:30": "11:45",
      "11:45": "13:00",
      "16:45": "18:00",
      "18:00": "19:15",
      "19:15": "20:30",
    })
  })
})

// ─── crearHoraEnMadrid ────────────────────────────────────────────────────────

describe("crearHoraEnMadrid", () => {
  it("en horario de invierno (UTC+1), 10:00 Madrid → T09:00Z", () => {
    // 25 de marzo de 2026 es horario de invierno (CET = UTC+1)
    // Nota: cambio de hora es el 29 de marzo de 2026
    const fecha = crearHoraEnMadrid("2026-03-25", "10:00")
    expect(fecha.toISOString()).toBe("2026-03-25T09:00:00.000Z")
  })

  it("en horario de verano (UTC+2), 10:00 Madrid → T08:00Z", () => {
    // 1 de junio de 2026 es horario de verano (CEST = UTC+2)
    const fecha = crearHoraEnMadrid("2026-06-01", "10:00")
    expect(fecha.toISOString()).toBe("2026-06-01T08:00:00.000Z")
  })
})
