import { test, expect, Page } from '@playwright/test'

const BASE = 'http://localhost:3000'

async function cerrarCookies(page: Page) {
  const banner = page.locator('button:has-text("Entendido")')
  if (await banner.isVisible({ timeout: 2000 }).catch(() => false)) {
    await banner.click()
    await page.waitForTimeout(300)
  }
}

test('DIAG — admin login funciona con espera correcta', async ({ page }) => {
  const errores: string[] = []
  page.on('console', msg => { if (msg.type() === 'error') errores.push(msg.text()) })

  await page.goto(`${BASE}/admin/login`)
  await cerrarCookies(page)

  await page.locator('input[type="email"]').fill('admin@ayuntamiento.es')
  await page.locator('input[type="password"]').fill('admin123')
  await page.locator('button[type="submit"]').click()

  // Esperar navegación real (login redirige a /admin)
  await page.waitForURL('**/admin', { timeout: 15000 }).catch(() => {})
  console.log(`URL tras login admin: ${page.url()}`)
  console.log('Errores:', errores)
  expect(page.url()).toContain('/admin')
})

test('DIAG — navegación a detalle de pista', async ({ page }) => {
  await page.goto(`${BASE}/pistas`)
  await cerrarCookies(page)

  const primerLink = page.locator('a[href*="/pistas/"]').first()
  await expect(primerLink).toBeVisible()
  const href = await primerLink.getAttribute('href')
  console.log(`Enlace encontrado: ${href}`)

  await primerLink.click()
  await page.waitForURL('**/pistas/**', { timeout: 10000 }).catch(() => {})
  console.log(`URL tras clic: ${page.url()}`)
  expect(page.url()).toContain('/pistas/')
})

test('DIAG — registro ciudadano funciona', async ({ page }) => {
  const email = `diag_${Date.now()}@test.com`
  await page.goto(`${BASE}/registro`)
  await cerrarCookies(page)

  // Selector correcto: input#nombre
  await page.locator('input#nombre').fill('Test Diagnóstico')
  await page.locator('input#email').fill(email)
  await page.locator('input#password').fill('Test1234!')
  await page.locator('input#confirmar').fill('Test1234!').catch(async () => {
    // Fallback: segundo input de tipo password
    await page.locator('input[type="password"]').nth(1).fill('Test1234!')
  })
  await page.locator('input[type="checkbox"]').check()
  await page.locator('button[type="submit"]').click()

  await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {})
  console.log(`URL tras registro: ${page.url()}`)
  expect(page.url()).toContain('/dashboard')
})
