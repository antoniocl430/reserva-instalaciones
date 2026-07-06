import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // Ejecutar tests de frontend, componentes y lib (los de API usan Jest)
    include: [
      'src/__tests__/frontend/**/*.test.{ts,tsx}',
      'src/__tests__/components/**/*.test.{ts,tsx}',
      'src/__tests__/lib/**/*.test.{ts,tsx}',
    ],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
