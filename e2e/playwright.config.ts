import { defineConfig } from '@playwright/test'

const port = process.env.PLAYWRIGHT_TEST_PORT || '3000'

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 1,
  workers: 1, // secuencial para no interferir entre tests
  reporter: [['list'], ['json', { outputFile: './results.json' }]],
  use: {
    baseURL: `http://localhost:${port}`,
    headless: true,
    screenshot: 'only-on-failure',
    video: 'off',
  },
})
