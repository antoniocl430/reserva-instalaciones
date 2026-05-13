# Próximos Pasos — Sistema de Reservas Deportivas

Estado del proyecto a 2026-05-12: Bloque 12 completado (INSTRUCTOR + Reservas Recurrentes).
291 tests Jest + 155 tests Vitest + 3 tests E2E en verde.

---

## Paso 1 — Completar y consolidar los tests E2E

**Prioridad:** Alta  
**Esfuerzo estimado:** Medio (1 sesión)

### Situación actual
- `e2e/tests/ciudadano.spec.ts` — 12 tests escritos pero con `BASE` hardcodeado a `localhost:3000`
- `e2e/tests/admin.spec.ts` — 14 tests escritos, mismo problema de `BASE` hardcodeado
- `e2e/tests/instructor.spec.ts` — 3 tests, pasan correctamente
- `e2e/tests/diagnostico.spec.ts` — archivo temporal de depuración, debe eliminarse

### Qué hacer
1. Eliminar `diagnostico.spec.ts` (archivo temporal, sus casos ya están cubiertos en ciudadano/admin)
2. Refactorizar los 3 archivos spec para usar URLs relativas (`page.goto('/login')` en lugar de `` `${BASE}/login` ``) — así usan el `baseURL` del `playwright.config.ts` con la variable de entorno `PLAYWRIGHT_TEST_PORT`
3. Verificar credenciales de admin en seed (`prisma/seed.ts`) y alinear con `admin.spec.ts`
4. Ejecutar la suite completa: `npx playwright test --config=e2e/playwright.config.ts`
5. Corregir los tests que fallen hasta que todos pasen de forma idempotente (múltiples runs consecutivos)

### Criterio de éxito
`npx playwright test --config=e2e/playwright.config.ts` pasa 29 tests (12 ciudadano + 14 admin + 3 instructor) en dos runs consecutivos sin limpiar la BD manualmente.

---

## Paso 2 — Completar cobertura de tests frontend del panel instructor

**Prioridad:** Media-Alta  
**Esfuerzo estimado:** Medio (1 sesión)

### Situación actual
- `src/__tests__/frontend/instructor.test.tsx` y `instructor-dashboard.test.tsx` existen
- Faltan tests para el formulario de creación de grupo, la tabla expandible de sesiones y el flujo de cancelación de grupo desde la UI

### Qué hacer
1. Revisar qué cubre `instructor.test.tsx` e `instructor-dashboard.test.tsx`
2. Añadir tests para: formulario crear grupo (validaciones de fecha/frecuencia), tabla de grupos con expand/collapse, botón cancelar grupo + confirmación, estados de carga y error
3. Ejecutar `npx vitest run` hasta que todos los tests pasen

### Criterio de éxito
Cobertura del panel instructor equivalente a la del panel admin (≥ 6 tests por componente principal).

---

## Paso 3 — Actualizar `docs/UI-FLOWS.md` con los flujos del instructor

**Prioridad:** Media  
**Esfuerzo estimado:** Bajo (< 1h)

### Situación actual
`docs/UI-FLOWS.md` documenta ciudadano, admin y superadmin pero no el panel del instructor, que se añadió en el Bloque 12.

### Qué hacer
Añadir sección "Pantallas del instructor" en `UI-FLOWS.md`:
- `/instructor` — dashboard con acceso rápido a mis-clases
- `/instructor/mis-clases` — tabla de grupos recurrentes con expand, detalle de sesiones, botón cancelar grupo

### Criterio de éxito
Un nuevo desarrollador puede entender el flujo del instructor leyendo solo `UI-FLOWS.md`.

---

## Paso 4 — Slots configurables por tenant desde el panel admin

**Prioridad:** Media  
**Esfuerzo estimado:** Alto (2-3 sesiones)

### Situación actual
Los 7 slots horarios están hardcodeados en el código (`validaciones.ts` y la lógica de disponibilidad). Cada ayuntamiento tiene su propio horario pero no puede cambiarlo sin tocar el código.

### Qué hacer
1. Añadir campo `configuracion.horarios` al modelo `Tenant` (ya existe el campo JSON `configuracion`)
2. Mover la lista de slots al objeto de configuración del tenant con valores por defecto
3. Añadir sección "Horarios" en `/admin/configuracion` con editor de slots (añadir/eliminar franjas)
4. Actualizar `GET /api/disponibilidad` para leer los slots del tenant en lugar de los hardcodeados
5. Actualizar `POST /api/reservas` para validar la hora contra los slots del tenant
6. Tests unitarios y E2E del nuevo flujo

### Criterio de éxito
Admin puede configurar un horario custom (ej: solo mañanas) y la disponibilidad refleja ese cambio sin modificar código.

---

## Paso 5 — Exportación de reservas a CSV

**Prioridad:** Media  
**Esfuerzo estimado:** Bajo-Medio (1 sesión)

### Situación actual
No existe ningún mecanismo de exportación. El personal del ayuntamiento no puede sacar un listado de reservas para informes o archivo.

### Qué hacer
1. Nuevo endpoint `GET /api/admin/reservas/exportar?desde=YYYY-MM-DD&hasta=YYYY-MM-DD` que devuelva CSV
2. Botón "Exportar CSV" en `/admin/reservas` con selector de rango de fechas
3. El CSV incluye: fecha, hora, instalación, ciudadano (nombre + email), estado
4. Tests del endpoint (formato correcto, filtro por fecha, filtro por tenant)

### Criterio de éxito
Admin puede descargar un CSV con todas las reservas de un mes con un clic.

---

## Paso 6 — Sistema de penalizaciones por no presentarse

**Prioridad:** Media  
**Esfuerzo estimado:** Alto (2-3 sesiones)

### Situación actual
Si un ciudadano no cancela y no se presenta, no hay consecuencia. Esto incentiva el no-show y ocupa slots que otros ciudadanos podrían usar.

### Qué hacer
1. Añadir campo `noShow Boolean @default(false)` a la tabla `Reserva`
2. Añadir campo `noShows Int @default(0)` a la tabla `Usuario`
3. Añadir botón "Marcar no-show" en el panel de reservas del admin (solo para reservas pasadas)
4. Regla de negocio configurable: después de N no-shows en X días, bloquear al usuario temporalmente
5. Mostrar contador de no-shows en el panel de usuarios del admin
6. Tests de la lógica de penalización

### Criterio de éxito
Admin puede marcar un no-show y el usuario acumula penalizaciones que el sistema gestiona automáticamente.

---

## Paso 7 — Estadísticas avanzadas por instalación

**Prioridad:** Media-Baja  
**Esfuerzo estimado:** Medio (1-2 sesiones)

### Situación actual
El dashboard admin solo muestra métricas del día actual (reservas hoy, activas, cancelaciones, pistas activas). No hay visión histórica ni por instalación.

### Qué hacer
1. Nuevo endpoint `GET /api/admin/estadisticas?periodo=semana|mes|trimestre`
2. Nueva página `/admin/estadisticas` con:
   - Gráfico de ocupación por instalación (últimas 4 semanas)
   - Porcentaje de ocupación por franja horaria (mañana vs tarde)
   - Top ciudadanos más activos
   - Evolución de reservas vs cancelaciones
3. Usar una librería ligera de gráficos (recharts ya viene con shadcn)
4. Tests del endpoint de estadísticas

### Criterio de éxito
Admin puede ver tendencias de uso de las últimas 4 semanas en un solo vistazo.

---

## Paso 8 — Merge develop → main y tag v1.0.0

**Prioridad:** Baja (hacer antes de trabajar features grandes)  
**Esfuerzo estimado:** Muy bajo (< 15 min)

### Situación actual
Toda la funcionalidad está en `develop`. `main` no ha recibido actualizaciones recientes. Antes de empezar nuevas features grandes conviene tener una línea base estable etiquetada.

### Qué hacer
1. Asegurarse de que `npm test` y `npx vitest run` pasan en `develop`
2. `git checkout main && git merge develop`
3. `git tag v1.0.0 -m "Primera versión estable: multi-tenant, PWA, push, instructor"`
4. Push con el tag

### Criterio de éxito
`main` tiene el historial completo y `git tag` muestra `v1.0.0`.

---

## Orden sugerido de ejecución

```
Paso 1  → E2E consolidado         (deuda técnica, confianza en CI)
Paso 2  → Tests frontend instructor (cierra gaps de cobertura)
Paso 3  → UI-FLOWS instructor      (documentación, < 1h)
Paso 8  → Merge + tag v1.0.0       (línea base limpia)
Paso 4  → Slots configurables      (valor real para SaaS)
Paso 5  → Exportación CSV          (quick win para admins)
Paso 6  → Penalizaciones           (feature compleja, cuando haya base estable)
Paso 7  → Estadísticas             (nice-to-have, visibilidad operativa)
```
