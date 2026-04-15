/**
 * Tests E2E — Flujo del instructor
 *
 * Prerequisitos:
 *   - El servidor Next.js debe estar corriendo en http://localhost:3000
 *   - El usuario instructor debe existir en la base de datos con:
 *       email:    instructor@test.es
 *       password: Instructor123
 *       rol:      INSTRUCTOR
 *   - El setup usa Prisma directamente para garantizar que el usuario existe.
 *     Si Prisma no está disponible en el entorno E2E, crear el usuario manualmente:
 *       npx ts-node -e "const {PrismaClient}=require('@prisma/client'); ..."
 *
 * Flujos cubiertos:
 *   1. Instructor crea grupo recurrente → aparece en /instructor/mis-clases
 *   2. Instructor expande grupo → ve lista de sesiones
 *   3. Instructor cancela grupo → desaparece de la lista
 *
 * Nota: los tests 2 y 3 dependen de que el test 1 haya creado el grupo.
 * Se ejecutan de forma secuencial (workers: 1 en playwright.config.ts).
 */

import { test, expect, Page } from '@playwright/test'

const INSTRUCTOR_EMAIL = 'instructor@test.es'
const INSTRUCTOR_PASSWORD = 'Instructor123'
const BASE = 'http://localhost:3000'

// ── Helpers ────────────────────────────────────────────────────────────────

function capturarErrores(page: Page): string[] {
  const errores: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error') errores.push(`[console.error] ${msg.text()}`)
  })
  page.on('pageerror', err => errores.push(`[pageerror] ${err.message}`))
  page.on('response', res => {
    if (
      res.status() >= 400 &&
      !res.url().includes('/api/auth/session') &&
      !res.url().includes('_next')
    ) {
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

/**
 * Login como instructor.
 * El formulario /login redirige siempre a /dashboard tras autenticación exitosa.
 */
async function loginInstructor(page: Page) {
  await page.goto(`${BASE}/login`)
  await page.waitForLoadState('domcontentloaded')
  await cerrarCookies(page)

  // Esperar a que el formulario esté visible
  await page.locator('input[type="email"]').waitFor({ state: 'visible', timeout: 10000 })

  // Llenar el formulario
  await page.locator('input[type="email"]').fill(INSTRUCTOR_EMAIL)
  await page.locator('input[type="password"]').fill(INSTRUCTOR_PASSWORD)

  // Esperar a que el botón sea visible y clickeable
  const submitBtn = page.locator('button[type="submit"]')
  await submitBtn.waitFor({ state: 'visible', timeout: 5000 })
  await submitBtn.click()

  // Esperar el redirect a /dashboard
  await page.waitForURL('**/dashboard', { timeout: 15000 })
}

// ── Tests ──────────────────────────────────────────────────────────────────

test.describe('Flujo instructor', () => {

  test('01 — Instructor crea grupo recurrente y aparece en mis-clases', async ({ page }) => {
    const errores = capturarErrores(page)

    // Login
    await loginInstructor(page)
    console.log(`URL tras login: ${page.url()}`)

    // Calcular fechas para la reserva recurrente
    // Usar una fecha más lejana para evitar conflictos con ejecuciones anteriores
    const inicio = new Date()
    inicio.setDate(inicio.getDate() + 7) // Una semana en el futuro
    const fechaISO = inicio.toISOString().split('T')[0]

    const fin = new Date(inicio)
    fin.setDate(fin.getDate() + 21) // 3 semanas más
    const fechaFinISO = fin.toISOString().split('T')[0]

    // Primero, limpiar cualquier grupo existente (DELETE de todos los grupos activos)
    const respListar = await page.request.get(`${BASE}/api/instructor/reservas-recurrentes`)
    if (respListar.ok) {
      const { grupos } = await respListar.json()
      for (const grupo of grupos || []) {
        await page.request.delete(`${BASE}/api/instructor/reservas-recurrentes/${grupo.id}`)
      }
      console.log(`Limpiados ${(grupos || []).length} grupos anteriores`)
    }

    // Crear la reserva recurrente
    const respCrear = await page.request.post(`${BASE}/api/instructor/reservas-recurrentes`, {
      data: {
        instalacionId: '246318d6-9a40-4000-8c54-53d42fc1ab5c',
        horaInicio: '10:30',
        fechaInicio: fechaISO,
        fechaFin: fechaFinISO,
        frecuencia: 'SEMANAL',
      },
    })

    expect(respCrear.status()).toBe(201)
    const resultadoCrear = await respCrear.json()
    console.log(`Grupo recurrente creado: ${resultadoCrear.grupo?.id}`)
    expect(resultadoCrear.grupo?.frecuencia).toBe('SEMANAL')
    expect(resultadoCrear.reservas?.length).toBeGreaterThan(0)

    // Navegar a /instructor/mis-clases para verificar que el grupo aparece
    await page.goto(`${BASE}/instructor/mis-clases`)
    await page.waitForLoadState('networkidle')
    // Esperar a que la animación de carga complete
    await page.waitForTimeout(800)
    await page.waitForSelector('text=Mis Clases', { timeout: 10000 })
    console.log(`URL mis-clases: ${page.url()}`)

    // Verificar que hay al menos un grupo activo con badge de frecuencia
    const grupoCard = page.locator('text=Semanal').first()
    await expect(grupoCard).toBeVisible({ timeout: 10000 })
    console.log('Badge "Semanal" visible en mis-clases')

    const erroresFiltrados = errores.filter(
      e => !e.includes('CLIENT_FETCH_ERROR') && !e.includes('/api/auth/session')
    )
    if (erroresFiltrados.length) console.warn('Errores detectados:', erroresFiltrados)
    expect(erroresFiltrados).toHaveLength(0)
  })

  test('02 — Instructor expande grupo y ve lista de sesiones', async ({ page }) => {
    const errores = capturarErrores(page)

    await loginInstructor(page)
    await page.goto(`${BASE}/instructor/mis-clases`)
    await page.waitForLoadState('networkidle')
    // Esperar a que la animación de carga complete
    await page.waitForTimeout(800)
    await page.waitForSelector('text=Mis Clases', { timeout: 10000 })

    // Debe existir al menos un grupo (creado en el test anterior)
    const botonExpandir = page.locator('button.w-full').first()
    await expect(botonExpandir).toBeVisible({ timeout: 10000 })
    console.log('Haciendo click para expandir grupo...')
    await botonExpandir.click()
    await page.waitForTimeout(500)

    // Verificar que aparece la sección de sesiones
    await expect(page.locator('text=Sesiones')).toBeVisible({ timeout: 5000 })
    console.log('Sección "Sesiones" visible tras expandir')

    // Verificar que hay al menos una sesión (filas en el listado expandido)
    const sesiones = page.locator('[class*="bg-gray-50"]')
    const numSesiones = await sesiones.count()
    console.log(`Número de sesiones visibles: ${numSesiones}`)
    expect(numSesiones).toBeGreaterThan(0)

    // Verificar que el botón "Cancelar grupo" está visible
    await expect(page.locator('button:has-text("Cancelar grupo")')).toBeVisible({ timeout: 3000 })

    const erroresFiltrados = errores.filter(
      e => !e.includes('CLIENT_FETCH_ERROR') && !e.includes('/api/auth/session')
    )
    if (erroresFiltrados.length) console.warn('Errores detectados:', erroresFiltrados)
    expect(erroresFiltrados).toHaveLength(0)
  })

  test('03 — Instructor cancela grupo y desaparece de la lista', async ({ page }) => {
    const errores = capturarErrores(page)

    await loginInstructor(page)
    await page.goto(`${BASE}/instructor/mis-clases`)
    await page.waitForLoadState('networkidle')
    // Esperar a que la animación de carga complete
    await page.waitForTimeout(800)
    await page.waitForSelector('text=Mis Clases', { timeout: 10000 })

    // Contar grupos activos antes de cancelar
    const gruposAntes = await page.locator('button.w-full').count()
    console.log(`Grupos activos antes de cancelar: ${gruposAntes}`)
    expect(gruposAntes).toBeGreaterThan(0)

    // Expandir el primer grupo para ver el botón de cancelar
    await page.locator('button.w-full').first().click()
    await page.waitForTimeout(300)

    // Click en "Cancelar grupo"
    const btnCancelar = page.locator('button:has-text("Cancelar grupo")')
    await expect(btnCancelar).toBeVisible({ timeout: 5000 })
    await btnCancelar.click()

    // Aparece el dialog de confirmación
    await expect(page.locator('text=Cancelar grupo de clases')).toBeVisible({ timeout: 5000 })
    console.log('Dialog de confirmación visible')

    // Confirmar cancelación y esperar respuesta de la API DELETE
    const [respuestaCancelacion] = await Promise.all([
      page.waitForResponse(
        resp => resp.url().includes('/api/instructor/reservas-recurrentes/') && resp.request().method() === 'DELETE',
        { timeout: 10000 }
      ),
      page.locator('button:has-text("Confirmar cancelación")').click(),
    ])
    const statusCancelacion = respuestaCancelacion.status()
    console.log('Respuesta cancelación HTTP:', statusCancelacion)
    expect(statusCancelacion).toBe(200)

    // Esperar a que la UI recargue los datos
    await page.waitForTimeout(2500)

    // Verificar que el grupo desapareció o la lista está vacía
    const gruposDespues = await page.locator('button.w-full').count()
    console.log(`Grupos activos después de cancelar: ${gruposDespues}`)

    // Puede mostrar "No hay clases creadas" o simplemente tener un grupo menos
    const noHayClases = await page.locator('text=No hay clases creadas').isVisible().catch(() => false)
    console.log(`"No hay clases creadas" visible: ${noHayClases}`)

    expect(noHayClases || gruposDespues < gruposAntes).toBeTruthy()

    const erroresFiltrados = errores.filter(
      e => !e.includes('CLIENT_FETCH_ERROR') && !e.includes('/api/auth/session')
    )
    if (erroresFiltrados.length) console.warn('Errores detectados:', erroresFiltrados)
    expect(erroresFiltrados).toHaveLength(0)
  })
})
