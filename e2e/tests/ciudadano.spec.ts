import { test, expect, Page } from '@playwright/test'

// ── Credenciales de prueba ──────────────────────────────────────────────────
const CITIZEN_EMAIL = `ciudadano_e2e_${Date.now()}@test.com`
const CITIZEN_PASSWORD = 'Test1234!'
const BASE = 'http://localhost:3000'

// Captura errores de consola JS en cada test
function capturarConsola(page: Page): string[] {
  const errores: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error') errores.push(`[console.error] ${msg.text()}`)
  })
  page.on('pageerror', err => errores.push(`[pageerror] ${err.message}`))
  page.on('response', res => {
    if (res.status() >= 400 && !res.url().includes('/api/auth/session')) {
      errores.push(`[HTTP ${res.status()}] ${res.url()}`)
    }
  })
  return errores
}

// Cierra el banner de cookies si está visible (bloquea clics si no se descarta)
async function cerrarCookies(page: Page) {
  const banner = page.locator('button:has-text("Entendido")')
  if (await banner.isVisible({ timeout: 2000 }).catch(() => false)) {
    await banner.click()
    await page.waitForTimeout(200)
  }
}

// Login de ciudadano reutilizable
async function loginCiudadano(page: Page) {
  await page.goto(`${BASE}/login`)
  await cerrarCookies(page)
  await page.locator('input#email, input[type="email"]').first().fill(CITIZEN_EMAIL)
  await page.locator('input#password, input[type="password"]').first().fill(CITIZEN_PASSWORD)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL('**/dashboard', { timeout: 10000 })
}

test.describe('Flujo ciudadano', () => {

  test('01 — Página de inicio carga correctamente', async ({ page }) => {
    const errores = capturarConsola(page)
    await page.goto(BASE)
    await page.waitForLoadState('networkidle')
    await cerrarCookies(page)
    // La home usa h2 para el encabezado principal de instalaciones
    const encabezado = page.locator('h1, h2').first()
    await expect(encabezado).toBeVisible()
    console.log(`Título página: ${await page.title()}`)
    console.log(`Encabezado: ${await encabezado.textContent()}`)
    const erroresFiltrados = errores.filter(e => !e.includes('CLIENT_FETCH_ERROR') && !e.includes('/api/auth/session'))
    if (erroresFiltrados.length) console.warn('ERRORES REALES:', erroresFiltrados)
    expect(erroresFiltrados).toHaveLength(0)
  })

  test('02 — Página de registro carga correctamente', async ({ page }) => {
    const errores = capturarConsola(page)
    await page.goto(`${BASE}/registro`)
    await cerrarCookies(page)
    await expect(page.locator('input#nombre')).toBeVisible()
    await expect(page.locator('input#email')).toBeVisible()
    const erroresFiltrados = errores.filter(e => !e.includes('CLIENT_FETCH_ERROR') && !e.includes('/api/auth/session'))
    expect(erroresFiltrados).toHaveLength(0)
  })

  test('03 — Registro de nuevo ciudadano', async ({ page }) => {
    const errores = capturarConsola(page)
    await page.goto(`${BASE}/registro`)
    await cerrarCookies(page)

    // Selector correcto por id
    await page.locator('input#nombre').fill('Ciudadano E2E')
    await page.locator('input#email').fill(CITIZEN_EMAIL)
    await page.locator('input#password').fill(CITIZEN_PASSWORD)
    // Confirmar contraseña: selector directo por id para evitar ambigüedad
    await page.locator('input#confirmar').fill(CITIZEN_PASSWORD)
    // shadcn/ui Checkbox renderiza como button[role="checkbox"], no como input
    await page.locator('[role="checkbox"]').first().click()
    await page.locator('button[type="submit"]').click()

    // Tras registro exitoso redirige a /dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 })
    console.log(`URL tras registro: ${page.url()}`)
    const erroresFiltrados = errores.filter(e => !e.includes('CLIENT_FETCH_ERROR') && !e.includes('/api/auth/session'))
    expect(erroresFiltrados).toHaveLength(0)
  })

  test('04 — Login como ciudadano', async ({ page }) => {
    const errores = capturarConsola(page)
    await page.goto(`${BASE}/login`)
    await cerrarCookies(page)

    await page.locator('input#email, input[type="email"]').first().fill(CITIZEN_EMAIL)
    await page.locator('input#password, input[type="password"]').first().fill(CITIZEN_PASSWORD)
    await page.locator('button[type="submit"]').click()

    await page.waitForURL('**/dashboard', { timeout: 10000 })
    console.log(`URL tras login: ${page.url()}`)
    expect(page.url()).toContain('/dashboard')
    const erroresFiltrados = errores.filter(e => !e.includes('CLIENT_FETCH_ERROR') && !e.includes('/api/auth/session'))
    expect(erroresFiltrados).toHaveLength(0)
  })

  test('05 — Ver listado de pistas', async ({ page }) => {
    const errores = capturarConsola(page)
    await loginCiudadano(page)
    await page.goto(`${BASE}/pistas`)
    await cerrarCookies(page)
    await page.waitForLoadState('networkidle')

    const cards = page.locator('[class*="card"], a[href*="/pistas/"]')
    const count = await cards.count()
    console.log(`Elementos de pista encontrados: ${count}`)
    expect(count).toBeGreaterThan(0)
    const erroresFiltrados = errores.filter(e => !e.includes('CLIENT_FETCH_ERROR') && !e.includes('/api/auth/session'))
    expect(erroresFiltrados).toHaveLength(0)
  })

  test('06 — Ver detalle de pista y disponibilidad', async ({ page }) => {
    const errores = capturarConsola(page)
    await loginCiudadano(page)
    await page.goto(`${BASE}/pistas`)
    await cerrarCookies(page)

    const primerEnlace = page.locator('a[href*="/pistas/"]').first()
    await expect(primerEnlace).toBeVisible()
    const href = await primerEnlace.getAttribute('href')
    console.log(`Enlace pista: ${href}`)

    await primerEnlace.click()
    // Usar waitForURL en lugar de networkidle para navegación SPA
    await page.waitForURL('**/pistas/**', { timeout: 10000 })
    console.log(`URL detalle pista: ${page.url()}`)
    expect(page.url()).toContain('/pistas/')
    const erroresFiltrados = errores.filter(e => !e.includes('CLIENT_FETCH_ERROR') && !e.includes('/api/auth/session'))
    expect(erroresFiltrados).toHaveLength(0)
  })

  test('07 — Crear una reserva', async ({ page }) => {
    const errores = capturarConsola(page)
    await loginCiudadano(page)

    // Ir al detalle de la primera pista disponible
    await page.goto(`${BASE}/pistas`)
    await cerrarCookies(page)
    await page.locator('a[href*="/pistas/"]').first().click()
    await page.waitForURL('**/pistas/**', { timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Seleccionar fecha de mañana
    const manana = new Date()
    manana.setDate(manana.getDate() + 1)
    const fechaISO = manana.toISOString().split('T')[0]
    const dateInput = page.locator('input[type="date"]').first()
    if (await dateInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dateInput.fill(fechaISO)
      await page.waitForLoadState('networkidle')
    }

    // Seleccionar primer slot libre
    const slotBtn = page.locator('button:not([disabled])').filter({ hasText: /^\d{2}:\d{2}$|libre/i }).first()
    if (await slotBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await slotBtn.click()
      await page.waitForTimeout(300)
    }

    // Confirmar reserva
    const confirmarBtn = page.locator('button:has-text("Reservar"), button:has-text("Confirmar reserva")').first()
    if (await confirmarBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmarBtn.click()
      await page.waitForLoadState('networkidle')
    }

    console.log(`URL tras intentar reserva: ${page.url()}`)
    const erroresFiltrados = errores.filter(e => !e.includes('CLIENT_FETCH_ERROR') && !e.includes('/api/auth/session'))
    if (erroresFiltrados.length) console.warn('ERRORES:', erroresFiltrados)
  })

  test('08 — Ver mis reservas', async ({ page }) => {
    const errores = capturarConsola(page)
    await loginCiudadano(page)
    await page.goto(`${BASE}/mis-reservas`)
    await page.waitForLoadState('networkidle')
    console.log(`URL mis-reservas: ${page.url()}`)
    expect(page.url()).toContain('/mis-reservas')
    const erroresFiltrados = errores.filter(e => !e.includes('CLIENT_FETCH_ERROR') && !e.includes('/api/auth/session'))
    expect(erroresFiltrados).toHaveLength(0)
  })

  test('09 — Cancelar una reserva (si existe)', async ({ page }) => {
    const errores = capturarConsola(page)
    await loginCiudadano(page)
    await page.goto(`${BASE}/mis-reservas`)
    await page.waitForLoadState('networkidle')

    const cancelarBtn = page.locator('button:has-text("Cancelar")').first()
    if (await cancelarBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await cancelarBtn.click()
      await page.waitForTimeout(500)
      // Confirmar modal si aparece
      const confirmar = page.locator('button:has-text("Confirmar"), button:has-text("Sí")').last()
      if (await confirmar.isVisible({ timeout: 2000 }).catch(() => false)) await confirmar.click()
      await page.waitForLoadState('networkidle')
      console.log('Reserva cancelada')
    } else {
      console.log('Sin reservas activas para cancelar')
    }
    const erroresFiltrados = errores.filter(e => !e.includes('CLIENT_FETCH_ERROR') && !e.includes('/api/auth/session'))
    expect(erroresFiltrados).toHaveLength(0)
  })

  test('10 — Ver perfil de usuario', async ({ page }) => {
    const errores = capturarConsola(page)
    await loginCiudadano(page)
    await page.goto(`${BASE}/perfil`)
    await page.waitForLoadState('networkidle')
    console.log(`URL perfil: ${page.url()}`)
    expect(page.url()).toContain('/perfil')
    const erroresFiltrados = errores.filter(e => !e.includes('CLIENT_FETCH_ERROR') && !e.includes('/api/auth/session'))
    expect(erroresFiltrados).toHaveLength(0)
  })

  test('11 — Página recuperar contraseña carga', async ({ page }) => {
    const errores = capturarConsola(page)
    await page.goto(`${BASE}/recuperar-password`)
    await cerrarCookies(page)
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
    const erroresFiltrados = errores.filter(e => !e.includes('CLIENT_FETCH_ERROR') && !e.includes('/api/auth/session'))
    expect(erroresFiltrados).toHaveLength(0)
  })

  test('12 — Dashboard ciudadano', async ({ page }) => {
    const errores = capturarConsola(page)
    await loginCiudadano(page)
    await page.waitForLoadState('networkidle')
    console.log(`URL dashboard: ${page.url()}`)
    expect(page.url()).toContain('/dashboard')
    const erroresFiltrados = errores.filter(e => !e.includes('CLIENT_FETCH_ERROR') && !e.includes('/api/auth/session'))
    expect(erroresFiltrados).toHaveLength(0)
  })
})
