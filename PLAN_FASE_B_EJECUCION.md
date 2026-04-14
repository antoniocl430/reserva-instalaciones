# Ejecución de Fase B — Frontend INSTRUCTOR (Reservas Recurrentes)

**Estado actual:** Fase A (backend) NO está implementada. Rol INSTRUCTOR no existe en types.

**Plan de ejecución en paralelo:**

## BLOQUEANTE: Fase A (Backend)
Requiere completar ANTES de Fase B:
1. Schema Prisma: modelo GrupoRecurrencia + fields + migración
2. Types Auth: añadir "INSTRUCTOR" a next-auth.d.ts
3. Middleware: proteger rutas /instructor/*
4. Validaciones Zod: schemaCrearReservaRecurrente
5. APIs:
   - POST /api/instructor/reservas-recurrentes
   - GET /api/instructor/reservas-recurrentes (opcional para dashboard)
   - DELETE /api/instructor/reservas-recurrentes/[grupoId]
   - Actualizar /api/admin/usuarios para aceptar rol INSTRUCTOR
6. Tests backend: vitest

**Responsable:** subagente backend
**Estimado:** 3-4 horas

## PARALELO: Fase B (Frontend) — TDD Driven
Puede iniciarse ANTES de que backend esté completo usando mocks.

### Paso 1: Preparar tests (SIN implementación aún)
- Crear tests TDD en RED para todos los componentes
- Tests usan mocks de las APIs del backend
- Archivo: `src/__tests__/frontend/instructor-dashboard.test.tsx`

### Paso 2: Implementar (GREEN)
Una vez tests están en RED:
1. Header navegación INSTRUCTOR
2. /instructor/page.tsx dashboard
3. /instructor/mis-clases/page.tsx
4. Toggle recurrente en /pistas/[id]/page.tsx
5. Admin usuarios: selector rol + mostrar INSTRUCTOR

### Paso 3: Integración real (una vez backend listo)
Reemplazar mocks con llamadas reales a APIs

### Paso 4: Verificación
- npx vitest run (todos verdes)
- npm run dev (prueba manual)
- npx playwright test (E2E, si aplica)

---

## INICIO INMEDIATO
1. **Backend:** Esperar confirmación de inicio
2. **Frontend:** Crear tests TDD en RED inmediatamente (pueden usar mocks)

---

Actualizado: 2026-04-14
