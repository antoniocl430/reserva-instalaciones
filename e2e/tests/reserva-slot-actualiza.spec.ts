import { test, expect, Page } from '@playwright/test'
import { PrismaClient } from '@prisma/client'

// ── Credenciales del ciudadano de prueba (debe estar en el seed) ────────────
const EMAIL = 'ciudadano@test.es'
const PASSWORD = 'Test1234!'

// Fecha futura segura: 2 semanas desde hoy
function fechaFutura(diasOffset = 14): string {
  const d = new Date()
  d.setDate(d.getDate() + diasOffset)
  return d.toISOString().slice(0, 10)
}

async function loginCiudadano(page: Page) {
  await page.goto('/login')
  const cookieBtn = page.locator('button:has-text("Entendido")')
  if (await cookieBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await cookieBtn.click()
  }
  await page.locator('input[type="email"]').fill(EMAIL)
  await page.locator('input[type="password"]').fill(PASSWORD)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL('**/dashboard', { timeout: 10000 })
}

test.describe('UX — slot se actualiza al instante tras reservar', () => {

  test('vista diaria: slot pasa de "Libre" a su estado reservado sin recargar', async ({ page }) => {
    await loginCiudadano(page)

    // Ir a la primera instalación
    const res = await page.request.get('/api/instalaciones')
    const data = await res.json()
    const instalacion = data.instalaciones?.[0]
    if (!instalacion) test.skip(true, 'No hay instalaciones en la BD')

    const fecha = fechaFutura(14)
    await page.goto(`/pistas/${instalacion.id}`)
    await page.waitForLoadState('networkidle')

    // Asegurarse de estar en vista "Día"
    const btnDia = page.locator('button:has-text("Día"), button:has-text("dia")')
    if (await btnDia.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btnDia.click()
      await page.waitForTimeout(300)
    }

    // Seleccionar la fecha futura en el input de fecha
    const dateInput = page.locator('input[type="date"]')
    if (await dateInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dateInput.fill(fecha)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(500)
    }

    // Contar slots libres antes de reservar
    const slotsLibresAntes = page.locator('[data-estado="libre"]')
    const numLibresAntes = await slotsLibresAntes.count()
    console.log(`Slots libres antes: ${numLibresAntes}`)
    if (numLibresAntes === 0) test.skip(true, 'No hay slots libres para esta fecha')

    // Hacer clic en el primer slot libre
    const primerSlot = slotsLibresAntes.first()
    const textoSlot = await primerSlot.textContent()
    console.log(`Slot a reservar: ${textoSlot}`)
    await primerSlot.click()
    await page.waitForTimeout(300)

    // Confirmar en el dialog
    const btnReservar = page.locator('button:has-text("Reservar"), button:has-text("Confirmar reserva")')
    await expect(btnReservar.first()).toBeVisible({ timeout: 5000 })
    await btnReservar.first().click()

    // Esperar a que el dialog se cierre (reserva completada)
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 8000 })

    // VERIFICACIÓN: ¿ha bajado el número de slots libres SIN recargar la página?
    await page.waitForTimeout(500)
    const slotsLibresDespues = page.locator('[data-estado="libre"]')
    const numLibresDespues = await slotsLibresDespues.count()
    console.log(`Slots libres después: ${numLibresDespues}`)

    expect(numLibresDespues).toBeLessThan(numLibresAntes)
  })

  test('vista semanal: slot pasa de "Libre" a "Ocupado" sin recargar', async ({ page }) => {
    await loginCiudadano(page)

    // Obtener primera instalación
    const res = await page.request.get('/api/instalaciones')
    const data = await res.json()
    const instalacion = data.instalaciones?.[0]
    if (!instalacion) test.skip(true, 'No hay instalaciones en la BD')

    await page.goto(`/pistas/${instalacion.id}`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(800) // esperar animaciones

    // Cambiar a vista semanal
    const btnSemana = page.locator('button:has-text("Semana")')
    await expect(btnSemana).toBeVisible({ timeout: 5000 })
    await btnSemana.click()
    await page.waitForTimeout(1000) // esperar carga de semana

    // Contar celdas "Libre" en la vista semanal antes de reservar
    const celdasLibresAntes = page.locator('[data-estado="libre"]')
    const numAntes = await celdasLibresAntes.count()
    console.log(`Celdas libres en vista semanal antes: ${numAntes}`)
    if (numAntes === 0) test.skip(true, 'No hay slots libres en la semana actual')

    // Capturar el texto del primer slot libre para identificar qué reservamos
    const primerCelda = celdasLibresAntes.first()
    const ariaLabel = await primerCelda.getAttribute('aria-label')
    console.log(`Celda libre a reservar: ${ariaLabel}`)

    // Hacer clic en la primera celda libre
    await primerCelda.click()
    await page.waitForTimeout(300)

    // Confirmar en el dialog
    const btnConfirmar = page.locator('button:has-text("Reservar"), button:has-text("Confirmar reserva")')
    await expect(btnConfirmar.first()).toBeVisible({ timeout: 5000 })
    await btnConfirmar.first().click()

    // Esperar a que el dialog de confirmación desaparezca
    await expect(page.locator('[role="dialog"][data-state="open"]').filter({ hasText: /reserva/i })).not.toBeVisible({ timeout: 8000 })

    // VERIFICACIÓN CRÍTICA: sin recargar, ¿bajó el número de celdas libres?
    await page.waitForTimeout(800)
    const celdasLibresDespues = page.locator('[data-estado="libre"]')
    const numDespues = await celdasLibresDespues.count()
    console.log(`Celdas libres en vista semanal después: ${numDespues}`)

    // Si no actualiza al instante, numDespues === numAntes → el test FALLA
    expect(numDespues).toBeLessThan(numAntes)
  })

})
