/**
 * Tests del componente Tablon
 *
 * Estrategia: mockeamos next/link, lucide-react y componentes shadcn/ui
 * para aislar el comportamiento visual del componente.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// --- Mocks ---

// Mock de next/link: renderiza como <a> con href
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    React.createElement('a', { href, className }, children),
}))

// Mock de lucide-react: todos los iconos como spans vacíos para no depender de SVG
vi.mock('lucide-react', () => ({
  Clock: () => React.createElement('span', { 'data-testid': 'icon-clock' }),
  Bell: () => React.createElement('span', { 'data-testid': 'icon-bell' }),
  AlertCircle: () => React.createElement('span', { 'data-testid': 'icon-alert' }),
  CheckCircle: () => React.createElement('span', { 'data-testid': 'icon-check' }),
  LogIn: () => React.createElement('span', { 'data-testid': 'icon-login' }),
}))

// Mock de shadcn/ui Badge: renderiza directamente los hijos
vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('span', { className }, children),
}))

// Mock de shadcn/ui Card: renderiza directamente los hijos
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('div', { className }, children),
}))

import Tablon from '@/components/Tablon'
import type { Aviso } from '@/components/Tablon'

// Datos de prueba reutilizables
const instalaciones = [
  {
    id: 'pista-padel-1',
    nombre: 'Pista de Pádel 1',
    tipo: 'PADEL',
    descripcion: 'Pista cubierta',
    horario: 'Lun-Dom: 8:00-20:30',
    activa: true,
  },
  {
    id: 'pista-tenis-1',
    nombre: 'Pista de Tenis 1',
    tipo: 'TENIS',
    descripcion: 'Pista exterior',
    horario: 'Lun-Vie: 9:00-21:00',
    activa: true,
  },
  {
    id: 'futbol-1',
    nombre: 'Campo de Fútbol',
    tipo: 'FUTBOL',
    descripcion: null,
    horario: 'Sáb-Dom: 10:00-20:00',
    activa: false,
  },
]

const avisosSinDatos: Aviso[] = []

describe('Tablon', () => {
  describe('banner anónimo (sesionActiva=false)', () => {
    it('cuando sesionActiva=false, muestra texto sobre consultar disponibilidad sin registrarse', () => {
      render(
        React.createElement(Tablon, {
          pistas: instalaciones,
          avisos: avisosSinDatos,
          sesionActiva: false,
        })
      )

      // El banner debe mencionar que se puede consultar sin cuenta
      const body = document.body.textContent ?? ''
      const tieneTexto =
        /Consulta la disponibilidad sin cuenta/i.test(body) ||
        /consulta la disponibilidad/i.test(body) ||
        /sin cuenta/i.test(body)

      expect(tieneTexto).toBe(true)
    })

    it('cuando sesionActiva=false, muestra enlace a /registro', () => {
      render(
        React.createElement(Tablon, {
          pistas: instalaciones,
          avisos: avisosSinDatos,
          sesionActiva: false,
        })
      )

      // Debe existir al menos un enlace que apunte a /registro
      const enlaceRegistro = document.querySelector('[href="/registro"]')
      expect(enlaceRegistro).toBeInTheDocument()
    })

    it('cuando sesionActiva=false, muestra enlace a /login', () => {
      render(
        React.createElement(Tablon, {
          pistas: instalaciones,
          avisos: avisosSinDatos,
          sesionActiva: false,
        })
      )

      // Debe existir al menos un enlace que apunte a /login
      const enlaceLogin = document.querySelector('[href="/login"]')
      expect(enlaceLogin).toBeInTheDocument()
    })

    it('cuando sesionActiva=true, no muestra el banner de acceso', () => {
      render(
        React.createElement(Tablon, {
          pistas: instalaciones,
          avisos: avisosSinDatos,
          sesionActiva: true,
        })
      )

      // El enlace a /registro del banner NO debe aparecer cuando hay sesión
      // (puede haber otras referencias pero no el banner de acceso anónimo)
      const body = document.body.textContent ?? ''
      expect(/Consulta la disponibilidad sin cuenta/i.test(body)).toBe(false)

      // No debe haber enlace a /registro cuando hay sesión activa
      const enlaceRegistro = document.querySelector('[href="/registro"]')
      expect(enlaceRegistro).not.toBeInTheDocument()
    })
  })

  describe('tarjetas de instalaciones', () => {
    it('muestra las tarjetas de instalaciones activas con link a /pistas/[id]', () => {
      render(
        React.createElement(Tablon, {
          pistas: instalaciones,
          avisos: avisosSinDatos,
          sesionActiva: false,
        })
      )

      // Deben mostrarse los nombres de las instalaciones
      expect(screen.getByText('Pista de Pádel 1')).toBeInTheDocument()
      expect(screen.getByText('Pista de Tenis 1')).toBeInTheDocument()
      expect(screen.getByText('Campo de Fútbol')).toBeInTheDocument()

      // Las instalaciones activas deben tener su enlace correspondiente
      const enlacePadel = document.querySelector('[href="/pistas/pista-padel-1"]')
      expect(enlacePadel).toBeInTheDocument()

      const enlaceTenis = document.querySelector('[href="/pistas/pista-tenis-1"]')
      expect(enlaceTenis).toBeInTheDocument()

      // La instalación inactiva NO debe tener enlace (cursor-not-allowed, no link)
      const enlaceFutbol = document.querySelector('[href="/pistas/futbol-1"]')
      expect(enlaceFutbol).not.toBeInTheDocument()
    })
  })
})
