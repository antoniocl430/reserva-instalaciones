# Tareas del Proyecto — Reservas Deportivas Municipales

## Estado actual (2026-03-26)

El proyecto tiene la funcionalidad base completa para un único ayuntamiento:
- Autenticación (ciudadano / admin) con NextAuth.js
- Reservas de pistas de pádel con todas las validaciones de negocio
- Panel de administración completo (reservas, pistas, bloqueos, usuarios, avisos)
- Tablón de anuncios en página principal (avisos desde BD)
- Tests unitarios con Vitest (frontend) y Jest (backend)
- Deploy en Vercel + Supabase (PostgreSQL)

---

## Informe de calidad — 2026-03-26

### Resumen de tests

| Runner | Suites | Tests totales | Pasados | Fallados |
|--------|--------|---------------|---------|----------|
| Jest (API) | 10/10 | 137 | 137 | 0 |
| Vitest (frontend/componentes) | 5/6 | 57 | 53 | **4** |
| **TOTAL** | **15/16** | **194** | **190** | **4** |

### Tests fallados (Vitest) — suite: admin-dashboard.test.tsx

Los 4 tests fallados pertenecen al mismo fichero y al mismo motivo raíz:
el componente `AdminDashboard` fue refactorizado y el título que renderiza
en estado de carga/cargado cambió de `"Dashboard"` a `"Resumen de actividad"`,
y la tarjeta de instalaciones cambió de `"Pistas activas"` a `"Instalaciones activas"`.
Los accesos rápidos también cambiaron de `"Gestionar pistas"` a `"Gestionar instalaciones"`
y de `"Gestionar admins"` a `"Gestionar administradores"`.

Tests fallados concretos:
- [FALLA] `debería mostrar estado de carga inicialmente` — busca texto "Dashboard" que ya no existe; el componente muestra "Resumen de actividad"
- [FALLA] `debería mostrar las 4 tarjetas de métricas` — busca "Pistas activas"; el componente renderiza "Instalaciones activas"
- [FALLA] `debería mostrar acceso rápido a Gestionar pistas con enlace a /admin/pistas` — busca texto "Gestionar pistas"; el componente dice "Gestionar instalaciones"
- [FALLA] `debería mostrar acceso rápido a Gestionar admins con enlace a /admin/usuarios` — busca texto "Gestionar admins"; el componente dice "Gestionar administradores"

---

## Bloque 5 — Fundación Multi-tenancy (en progreso)

**Objetivo:** Escalar la aplicación para que sea usable por múltiples ayuntamientos,
cada uno con su propio subdominio, configuración y datos completamente aislados.

**Estrategia:** Row-level multi-tenancy con una sola BD compartida.

### Plan TDD — Bloque 5 Fase 1-3

#### Paso 1: Escribir tests (RED) — antes de cualquier código
- [x] Crear `src/__tests__/api/tenant.test.ts` con tests de `extraerSlugDelHost` y `obtenerTenantIdPorSlug`
- [x] Crear `src/__tests__/api/auth-tenant.test.ts` con tests de NextAuth + tenantId
- [x] Confirmar que los tests fallan (módulo no existe aún)

#### Paso 2: Schema Prisma — modelo Tenant y tenantId
- [x] Añadir modelo `Tenant` a `prisma/schema.prisma`
- [x] Añadir `tenantId String` a: Usuario, Instalacion, Reserva, Bloqueo, Aviso, TokenRecuperacion
- [x] Cambiar `@@unique` de email en Usuario a `@@unique([tenantId, email])`
- [x] Añadir `@@index([tenantId])` a todos los modelos
- [x] Ejecutar `npx prisma migrate dev --name add_multi_tenant`

#### Paso 3: Helper `src/lib/tenant.ts`
- [x] Crear helper con `extraerSlugDelHost`, `obtenerTenantPorSlug`, `obtenerTenantIdPorSlug`
- [x] Lógica: localhost → "desarrollo", subdominio → SLUG, fallback → "desarrollo"

#### Paso 4: Middleware actualizado
- [x] Extraer slug del host en cada request
- [x] Buscar tenantId en BD (con caché si es posible)
- [x] Inyectar `x-tenant-id` y `x-tenant-slug` en headers
- [x] Si tenant no existe y no es localhost → error 404

#### Paso 5: NextAuth actualizado
- [x] Buscar usuario con `{ email, tenantId }` en `authorize`
- [x] Añadir `tenantId` al JWT en callback `jwt`
- [x] Exponer `tenantId` en sesión en callback `session`
- [x] Actualizar/crear `src/types/next-auth.d.ts`

#### Paso 6: Seed actualizado
- [x] Crear tenant "desarrollo" si no existe
- [x] Asignar tenantId a las 3 pistas y al admin

#### Paso 7: Verificación (GREEN)
- [x] Ejecutar `npx jest --testTimeout=15000` — 154/154 tests pasan
- [x] Ejecutar seed — crea tenant "desarrollo" y verifica los 3 registros existentes
- [x] TypeScript sin errores (`npx tsc --noEmit` limpio)
- [x] Migración aplicada limpiamente en Supabase PostgreSQL

---

## Bloque actual — Multi-tenancy

**Objetivo:** Escalar la aplicación para que sea usable por múltiples ayuntamientos,
cada uno con su propio subdominio, configuración y datos completamente aislados.

**Estrategia elegida:** Row-level multi-tenancy con una sola BD compartida.

### Pendiente

- [ ] PREVIO: corregir los 4 tests fallados en admin-dashboard.test.tsx (textos desactualizados)
- [x] Fase 1 — Data model: añadir tabla `Tenant` y columna `tenantId` a todas las tablas
- [x] Fase 2 — Middleware: detectar tenant por subdominio, inyectar `tenantId` en headers
- [x] Fase 3 — NextAuth: incluir `tenantId` en JWT y sesión
- [x] Fase 4 — API Routes: filtrar todas las queries por `tenantId`
- [x] Fase 5 — UI dinámica: logo, colores, título de página y textos por tenant
  - [x] TDD Paso 1 (RED): escribir Tablon.test.tsx y Header.test.tsx — confirmado que fallaban
  - [x] TDD Paso 2: añadir prop `municipio` a Tablon y `nombreServicio` a Header
  - [x] TDD Paso 3: actualizar layout.tsx con generateMetadata dinámica
  - [x] TDD Paso 4: actualizar page.tsx para obtener tenant y pasar props
  - [x] TDD Paso 5 (GREEN): 66/66 tests pasan (57 existentes + 9 nuevos)
- [ ] Fase 6 — Panel superadmin: crear y configurar nuevos tenants
- [x] Fase 7 — Testing de aislamiento: verificar que un tenant no accede a datos de otro

---
