/**
 * Tests del componente StarRating
 * TDD: tests escritos ANTES de implementar el componente
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

import StarRating from '@/components/StarRating'

describe('StarRating', () => {
  describe('modo lectura (interactive=false por defecto)', () => {
    it('renderiza 5 estrellas en modo lectura', () => {
      render(React.createElement(StarRating, { value: 3 }))
      // Debe haber 5 elementos de estrella con role=img o aria-label
      const estrellas = screen.getAllByRole('img', { hidden: true })
      expect(estrellas).toHaveLength(5)
    })

    it('las primeras "value" estrellas tienen clase de relleno', () => {
      const { container } = render(React.createElement(StarRating, { value: 3 }))
      const rellenas = container.querySelectorAll('.text-yellow-400')
      const vacias = container.querySelectorAll('.text-gray-300')
      expect(rellenas).toHaveLength(3)
      expect(vacias).toHaveLength(2)
    })

    it('con value=0, todas las estrellas están vacías', () => {
      const { container } = render(React.createElement(StarRating, { value: 0 }))
      const rellenas = container.querySelectorAll('.text-yellow-400')
      const vacias = container.querySelectorAll('.text-gray-300')
      expect(rellenas).toHaveLength(0)
      expect(vacias).toHaveLength(5)
    })

    it('con value=5, todas las estrellas están rellenas', () => {
      const { container } = render(React.createElement(StarRating, { value: 5 }))
      const rellenas = container.querySelectorAll('.text-yellow-400')
      expect(rellenas).toHaveLength(5)
    })
  })

  describe('modo interactivo (interactive=true)', () => {
    it('click en estrella 3 llama onChange(3)', () => {
      const onChange = vi.fn()
      render(React.createElement(StarRating, { value: 0, interactive: true, onChange }))

      // Las estrellas interactivas tienen role=button
      const botones = screen.getAllByRole('button')
      expect(botones).toHaveLength(5)
      fireEvent.click(botones[2]) // índice 2 → estrella 3
      expect(onChange).toHaveBeenCalledWith(3)
    })

    it('hover en estrella 4 muestra 4 estrellas rellenas', () => {
      render(React.createElement(StarRating, { value: 0, interactive: true, onChange: vi.fn() }))
      const botones = screen.getAllByRole('button')

      fireEvent.mouseEnter(botones[3]) // índice 3 → estrella 4

      // Después del hover deben verse 4 estrellas rellenas
      const { container } = { container: botones[0].closest('[data-testid="star-rating"]')!.closest('div')! }
      // Buscamos por aria-label en el contenedor padre
      const ratingContainer = screen.getByTestId('star-rating')
      const rellenas = ratingContainer.querySelectorAll('.text-yellow-400')
      expect(rellenas.length).toBeGreaterThanOrEqual(4)
    })

    it('al salir del hover restaura el valor original', () => {
      const { container } = render(
        React.createElement(StarRating, { value: 2, interactive: true, onChange: vi.fn() })
      )
      const botones = screen.getAllByRole('button')

      // Hover en estrella 5
      fireEvent.mouseEnter(botones[4])
      // Salir del hover
      fireEvent.mouseLeave(botones[4])

      // Debe volver a mostrar 2 estrellas rellenas
      const ratingContainer = screen.getByTestId('star-rating')
      const rellenas = ratingContainer.querySelectorAll('.text-yellow-400')
      expect(rellenas).toHaveLength(2)
    })
  })
})
