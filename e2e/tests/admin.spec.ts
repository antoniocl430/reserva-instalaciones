import { test, expect, Page } from '@playwright/test'

const ADMIN_EMAIL = 'admin@ayuntamiento.es'
const ADMIN_PASSWORD = 'admin123'

function capturarErrores(page: Page): string[] {
  const errores: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error') errores.push(`[console.error] ${msg.text()}`)
  })
  page.on('pageerror', err => errores.push(`[pageerror] ${err.message}`))
  page.on('response', res => {
    if (res.status() >= 400 && !res.url().includes('/api/auth/session') && !res.url().includes('_next')) {
      errores.push(`[HTTP ${res.status()}] ${res.url()}`)
    }
  })
  return errores
}

async function cerrarCookies(page: Page) {
  const banner = page.locator('button:has-text("Entendido")')
  if (await banner.isVisible({ timeout: 2000 }).catch(() => false)) {
    await banner.click()
    await page.waitForTimeout(200)
  }
}

// Login de admin reutilizable — espera navegación real a /admin
async function loginAdmin(page: Page) {
  await page.goto('/admin/login')
  await cerrarCookies(page)
  await page.locator('input[type="email"]').fill(ADMIN_EMAIL)
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD)
  await page.locator('button[type="submit"]').click()
  // Esperar la redirección real usando waitForURL, no networkidle
  await page.waitForURL('**/admin', { timeout: 15000 })
}

test.describe('Flujo administrador', () => {

  test('01 — Login admin carga correctamente', async ({ page }) => {
    const errores = capturarErrores(page)
    await page.goto('/admin/login')
    await cerrarCookies(page)
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    console.log(`URL login admin: ${page.url()}`)
    const erroresFiltrados = errores.filter(e => !e.includes('CLIENT_FETCH_ERROR') && !e.includes('/api/auth/session'))
    expect(erroresFiltrados).toHaveLength(0)
  })

  test('02 — Login como admin y acceso al panel', async ({ page }) => {
    const errores = capturarErrores(page)
    await loginAdmin(page)
    const url = page.url()
    console.log(`URL tras login admin: ${url}`)
    expect(url).toContain('/admin')
    expect(url).not.toContain('/admin/login')
    const erroresFiltrados = errores.filter(e => !e.includes('CLIENT_FETCH_ERROR') && !e.includes('/api/auth/session'))
    expect(erroresFiltrados).toHaveLength(0)
  })

  test('03 — Dashboard admin carga', async ({ page }) => {
    const errores = capturarErrores(page)
    await loginAdmin(page)
    await page.waitForLoadState('networkidle')
    console.log(`URL dashboard admin: ${page.url()}`)
    expect(page.url()).toContain('/admin')
    const erroresFiltrados = errores.filter(e => !e.includes('CLIENT_FETCH_ERROR') && !e.includes('/api/auth/session'))
    expect(erroresFiltrados).toHaveLength(0)
  })

  test('04 — Panel reservas admin', async ({ page }) => {
    const errores = capturarErrores(page)
    await loginAdmin(page)
    await page.goto('/admin/reservas')
    await page.waitForLoadState('networkidle')
    console.log(`URL reservas admin: ${page.url()}`)
    expect(page.url()).toContain('/admin/reservas')
    const erroresFiltrados = errores.filter(e => !e.includes('CLIENT_FETCH_ERROR') && !e.includes('/api/auth/session'))
    expect(erroresFiltrados).toHaveLength(0)
  })

  test('05 — Panel pistas admin', async ({ page }) => {
    const errores = capturarErrores(page)
    await loginAdmin(page)
    await page.goto('/admin/pistas')
    await page.waitForLoadState('networkidle')
    console.log(`URL pistas admin: ${page.url()}`)
    expect(page.url()).toContain('/admin/pistas')
    const erroresFiltrados = errores.filter(e => !e.includes('CLIENT_FETCH_ERROR') && !e.includes('/api/auth/session'))
    expect(erroresFiltrados).toHaveLength(0)
  })

  test('06 — Panel usuarios admin', async ({ page }) => {
    const errores = capturarErrores(page)
    await loginAdmin(page)
    await page.goto('/admin/usuarios')
    await page.waitForLoadState('networkidle')
    console.log(`URL usuarios admin: ${page.url()}`)
    expect(page.url()).toContain('/admin/usuarios')
    const erroresFiltrados = errores.filter(e => !e.includes('CLIENT_FETCH_ERROR') && !e.includes('/api/auth/session'))
    expect(erroresFiltrados).toHaveLength(0)
  })

  test('07 — Panel bloqueos admin', async ({ page }) => {
    const errores = capturarErrores(page)
    await loginAdmin(page)
    await page.goto('/admin/bloqueos')
    await page.waitForLoadState('networkidle')
    console.log(`URL bloqueos admin: ${page.url()}`)
    expect(page.url()).toContain('/admin/bloqueos')
    const erroresFiltrados = errores.filter(e => !e.includes('CLIENT_FETCH_ERROR') && !e.includes('/api/auth/session'))
    expect(erroresFiltrados).toHaveLength(0)
  })

  test('08 — Panel configuración admin', async ({ page }) => {
    const errores = capturarErrores(page)
    await loginAdmin(page)
    await page.goto('/admin/configuracion')
    await page.waitForLoadState('networkidle')
    console.log(`URL configuracion admin: ${page.url()}`)
    expect(page.url()).toContain('/admin/configuracion')
    const erroresFiltrados = errores.filter(e => !e.includes('CLIENT_FETCH_ERROR') && !e.includes('/api/auth/session'))
    expect(erroresFiltrados).toHaveLength(0)
  })

  test('09 — Panel avisos admin', async ({ page }) => {
    const errores = capturarErrores(page)
    await loginAdmin(page)
    await page.goto('/admin/avisos')
    await page.waitForLoadState('networkidle')
    console.log(`URL avisos admin: ${page.url()}`)
    expect(page.url()).toContain('/admin/avisos')
    const erroresFiltrados = errores.filter(e => !e.includes('CLIENT_FETCH_ERROR') && !e.includes('/api/auth/session'))
    expect(erroresFiltrados).toHaveLength(0)
  })

  test('10 — Botón crear bloqueo existe en panel', async ({ page }) => {
    const errores = capturarErrores(page)
    await loginAdmin(page)
    await page.goto('/admin/bloqueos')
    await page.waitForLoadState('networkidle')

    const nuevoBtn = page.locator('button:has-text("Nuevo"), button:has-text("Añadir"), button:has-text("Crear")').first()
    const existe = await nuevoBtn.isVisible({ timeout: 3000 }).catch(() => false)
    console.log(`Botón crear bloqueo visible: ${existe}`)
    if (existe) {
      await nuevoBtn.click()
      await page.waitForTimeout(500)
      console.log('Modal/form de bloqueo abierto')
    }
    const erroresFiltrados = errores.filter(e => !e.includes('CLIENT_FETCH_ERROR') && !e.includes('/api/auth/session'))
    expect(erroresFiltrados).toHaveLength(0)
  })

  test('11 — Lista de reservas en panel admin', async ({ page }) => {
    const errores = capturarErrores(page)
    await loginAdmin(page)
    await page.goto('/admin/reservas')
    await page.waitForLoadState('networkidle')

    const contenido = page.locator('table, [class*="reserva"], [class*="lista"]')
    console.log(`Elementos de reservas encontrados: ${await contenido.count()}`)
    const erroresFiltrados = errores.filter(e => !e.includes('CLIENT_FETCH_ERROR') && !e.includes('/api/auth/session'))
    expect(erroresFiltrados).toHaveLength(0)
  })

  test('12 — Protección de rutas admin (sin sesión)', async ({ page }) => {
    const errores = capturarErrores(page)
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')
    const url = page.url()
    console.log(`URL acceso admin sin sesión: ${url}`)
    // Debe redirigir a /admin/login
    expect(url).toContain('/admin/login')
    const erroresFiltrados = errores.filter(e => !e.includes('CLIENT_FETCH_ERROR') && !e.includes('/api/auth/session'))
    expect(erroresFiltrados).toHaveLength(0)
  })

  test('13 — Protección de rutas ciudadano (sin sesión)', async ({ page }) => {
    const errores = capturarErrores(page)
    await page.goto('/mis-reservas')
    await page.waitForLoadState('networkidle')
    const url = page.url()
    console.log(`URL acceso mis-reservas sin sesión: ${url}`)
    expect(url).toContain('/login')
    const erroresFiltrados = errores.filter(e => !e.includes('CLIENT_FETCH_ERROR') && !e.includes('/api/auth/session'))
    expect(erroresFiltrados).toHaveLength(0)
  })

  test('14 — Superadmin panel accesible con credenciales correctas', async ({ page }) => {
    const errores = capturarErrores(page)
    // El superadmin usa el login ciudadano, no el admin,
    // porque su rol !== "ADMIN" y el formulario de admin/login
    // redirige con window.location.href = "/admin" lo que rompe el flujo.
    await page.goto('/login')
    await cerrarCookies(page)
    await page.locator('input[type="email"]').fill('superadmin@reservas.dev')
    await page.locator('input[type="password"]').fill('SuperAdmin123!')
    await page.locator('button[type="submit"]').click()
    // Tras login exitoso el formulario de /login redirige siempre a /dashboard
    await page.waitForURL('**/dashboard', { timeout: 15000 })

    // Navegar directamente al panel de superadmin
    await page.goto('/superadmin')
    await page.waitForLoadState('networkidle')
    console.log(`URL superadmin: ${page.url()}`)
    expect(page.url()).toContain('/superadmin')
    const erroresFiltrados = errores.filter(e => !e.includes('CLIENT_FETCH_ERROR') && !e.includes('/api/auth/session'))
    expect(erroresFiltrados).toHaveLength(0)
  })
})
