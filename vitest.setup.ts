import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock de ResizeObserver — usado por shadcn/ui checkbox y otros componentes de Radix UI
// Necesita ser una clase (constructor), no una función normal
class MockResizeObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
global.ResizeObserver = MockResizeObserver as any

// Mock de window.matchMedia — usado por InstalarPWA
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
