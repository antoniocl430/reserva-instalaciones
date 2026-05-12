# Plan Fase B — Frontend INSTRUCTOR (Integración con Backend)

**Fecha:** 2026-04-14
**Estado:** Fase A (backend) en progreso

## ACTUALIZACIÓN IMPORTANTE

El Header **YA TIENE** navegación INSTRUCTOR implementada:
- Detecta `sesion?.user?.rol === "INSTRUCTOR"`
- Muestra links: Instalaciones, Mis Clases, Perfil, Cerrar sesión
- NO muestra "Panel Admin" (correcto)

**Problema:** Los tipos de Auth aún no incluyen "INSTRUCTOR".

## Tareas ejecutables AHORA (antes de backend)

### ✅ HECHO: Tests TDD en RED
- Tests creados: `src/__tests__/frontend/instructor-dashboard.test.tsx`
- 13 tests pasando
- Cubren: roles, navegación, toggles, estructura de datos

### PRÓXIMO: Crear componentes con mocks

1. **`/instructor/page.tsx`** — Dashboard
   - Protegida por middleware (rol INSTRUCTOR)
   - Consumirá GET /api/instructor/reservas-recurrentes (mock por ahora)
   - UI: resumen, botón crear clase, enlace mis-clases

2. **`/instructor/mis-clases/page.tsx`** — Gestión de grupos
   - Protegida
   - Consumirá GET /api/instructor/reservas-recurrentes
   - UI: tabla expandible, acciones cancelar/ver

3. **`/pistas/[id]/page.tsx`** — Toggle recurrente
   - Agregará toggle "Reserva recurrente" (solo si INSTRUCTOR)
   - Si activo: frecuencia + fecha fin + resumen
   - Llamará POST /api/instructor/reservas-recurrentes (cuando exista)

4. **`/admin/(panel)/usuarios/page.tsx`** — Gestión usuarios
   - Agregará selector de rol (ADMIN / INSTRUCTOR)
   - Mostrará columna "Rol" con badges
   - Consumirá GET /api/admin/usuarios actualizado

## DEPENDENCIAS BLOQUEANTES

Esperando que backend complete:

- [ ] Types Auth: añadir "INSTRUCTOR"
- [ ] Schema Prisma: GrupoRecurrencia migrado
- [ ] Middleware: proteger /instructor/*
- [ ] GET /api/instructor/reservas-recurrentes (funcional)
- [ ] POST /api/instructor/reservas-recurrentes (funcional)
- [ ] POST /api/admin/usuarios: aceptar rol INSTRUCTOR

## Estrategia de ejecución

### Fase B.1 — Componentes con MOCKS (AHORA)
- Crear archivos de componentes vacíos
- Escribir tests que usen mocks de fetch
- Implementar UI sin lógica de API

### Fase B.2 — Integración real (CUANDO BACKEND ESTÁ LISTO)
- Reemplazar mocks con llamadas reales a /api/instructor/*
- Ejecutar npx vitest run (todos verdes)
- Prueba manual del flujo completo

### Fase B.3 — Verificación final (POST-BACKEND)
- npm run dev — navegación y UI funcional
- npx playwright test (si hay E2E nuevos)
- Cierre de la tarea

## Timeline estimado

- **Backend:** 3-4 horas (en progreso)
- **Frontend (B.1):** 2-3 horas (componentes + tests)
- **Frontend (B.2):** 1 hora (integración real)
- **Total:** ~6-8 horas

---

## Status actual
- ✅ Tests en RED (13/13 verdes)
- ⏳ Esperando tipo INSTRUCTOR en Auth
- ⏳ Esperando schema GrupoRecurrencia migrado

