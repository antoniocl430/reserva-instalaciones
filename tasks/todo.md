# Tareas del Proyecto — Reservas Deportivas Municipales

## Bloque 9 — Página de perfil de usuario (COMPLETADO 2026-03-27)

### Plan TDD

#### Tareas implementadas
- [x] TAREA 1: Crear `src/app/perfil/page.tsx` (Client Component) con:
  - Sección avatar: muestra DiceBear con iniciales si no hay avatarUrl; preview inmediata al seleccionar; POST /api/cuenta/avatar
  - Sección datos: formulario nombre + email deshabilitado; PATCH /api/cuenta al guardar; estado de carga en botón
  - Zona de peligro: dialog de confirmación; DELETE /api/cuenta + signOut al confirmar
  - Skeleton de carga mientras status === "loading"
  - Redirección a /login si status === "unauthenticated"
- [x] TAREA 2: Añadir "/perfil" a RUTAS_PROTEGIDAS en `src/middleware.ts` + matcher
- [x] TAREA 3: Enlace "Mi perfil" en `src/components/header.tsx` (desktop + menú móvil) con avatar DiceBear
- [x] TAREA 4: Enlace "Mi perfil" en `src/app/dashboard/page.tsx` junto al saludo de bienvenida
- [x] TAREA 5: Tests TDD en `src/__tests__/frontend/perfil.test.tsx` (7 tests — todos pasan)

### Resultado final

| Metrica | Valor |
|---------|-------|
| Tests nuevos (vitest) | 7 |
| Tests totales (vitest) | 103 |
| Tests fallados | 0 |
| Archivos creados | 2 (`perfil/page.tsx`, `perfil.test.tsx`) |
| Archivos modificados | 3 (`middleware.ts`, `header.tsx`, `dashboard/page.tsx`) |

---

## Bloque 8 — Accesibilidad WCAG 2.1 AA, páginas legales y RGPD (COMPLETADO 2026-03-27)

### Plan TDD

#### Tareas implementadas
- [x] TAREA 1: Skip-to-content en layout.tsx + id="contenido-principal" en page.tsx
- [x] TAREA 2: Fixes WCAG en Header (aria-label logo, nav principal, nav móvil)
- [x] TAREA 3: Fixes WCAG en Tablon.tsx (emojis con aria-hidden)
- [x] TAREA 4: Fixes WCAG en login (role="alert") y registro (role="alert", placeholder 8 chars, checkbox privacidad)
- [x] TAREA 5: Fixes WCAG en pistas/[id]/page.tsx (aria-label slots, role="alert" error)
- [x] TAREA 6: Componente Footer con enlaces legales + añadido a layout.tsx
- [x] TAREA 7: Páginas legales (/legal, /privacidad, /accesibilidad) con datos del tenant
- [x] TAREA 8: BannerCookies informativo + añadido a layout.tsx
- [x] TAREA 9: Sección "Mis datos" RGPD en dashboard + componente BotonesRGPD
- [x] TAREA 10: Tests TDD (RED → GREEN → REFACTOR)
  - [x] BotonesRGPD.test.tsx — 5 tests
  - [x] registro.test.tsx — 6 tests

### Resultado final

| Metrica | Valor |
|---------|-------|
| Tests nuevos (vitest) | 11 |
| Tests totales (vitest) | 96 |
| Tests fallados | 0 |
| Archivos creados | 8 (Footer, BannerCookies, BotonesRGPD, /legal, /privacidad, /accesibilidad, BotonesRGPD.test.tsx, registro.test.tsx) |
| Archivos modificados | 6 (layout.tsx, page.tsx, header.tsx, Tablon.tsx, login/page.tsx, registro/page.tsx, pistas/[id]/page.tsx, dashboard/page.tsx) |

---

## Informe de calidad — POST BLOQUE 7 (2026-03-26)

### Resumen de tests — ejecucion verificada

| Runner | Suites | Tests totales | Pasados | Fallados |
|--------|--------|---------------|---------|----------|
| Jest (API) | 15/15 | 203 | 203 | 0 |
| Vitest (frontend/componentes) | 11/11 | 85 | 85 | 0 |
| **TOTAL** | **26/26** | **288** | **288** | **0** |

### Tests nuevos añadidos en Bloque 7

| Archivo | Tests | Comportamientos cubiertos |
|---------|-------|--------------------------|
| `src/__tests__/api/superadmin.test.ts` | 16 | GET metricas, GET/POST/PATCH tenants, auth SUPERADMIN, aislamiento |
| `src/__tests__/frontend/superadmin-dashboard.test.tsx` | 6 | Dashboard: render metricas, loading, error, acceso rapido |
| `src/__tests__/frontend/superadmin-tenants.test.tsx` | 6 | Lista tenants: tabla, badges, dialog crear, dialog editar, suspender |
| **SUBTOTAL nuevos Bloque 7** | **28** | |

### Tests fallados
Ninguno. Todos los tests pasan.

### Regresiones detectadas
Ninguna. Los 260 tests que pasaban al final del Bloque 6 siguen pasando sin cambios.

### Cobertura acumulada del proyecto

| Area funcional | Suite de tests | Estado |
|----------------|---------------|--------|
| Autenticacion (login, registro, JWT) | `zod-validaciones.test.ts`, `auth-tenant.test.ts` | CUBIERTO |
| Recuperacion de contrasena | `recuperacion.test.ts` | CUBIERTO |
| Rate limiting en /login | `rate-limit.test.ts` | CUBIERTO |
| Reservas (crear, cancelar, mis reservas) | `reservas.test.ts`, `cancelar.test.ts`, `mis-reservas.test.ts` | CUBIERTO |
| Disponibilidad de slots | `disponibilidad.test.ts` | CUBIERTO |
| Instalaciones publicas | `instalaciones.test.ts` | CUBIERTO |
| Avisos / Tablon de anuncios | `avisos.test.ts` | CUBIERTO |
| Panel admin (metricas, reservas, pistas, bloqueos, usuarios) | `admin.test.ts` | CUBIERTO |
| Multi-tenancy helpers | `tenant.test.ts` | CUBIERTO |
| Aislamiento entre tenants | `aislamiento-tenant.test.ts` | CUBIERTO |
| NextAuth con tenantId | `auth-tenant.test.ts` | CUBIERTO |
| Configuracion visual por tenant (API) | `configuracion.test.ts` | CUBIERTO |
| Dashboard ciudadano (frontend) | `dashboard.test.tsx` | CUBIERTO |
| Pistas — listado (frontend) | `pistas.test.tsx` | CUBIERTO |
| Pistas — detalle y reserva (frontend) | `pistas-id.test.tsx` | CUBIERTO |
| Mis reservas (frontend) | `mis-reservas.test.tsx` | CUBIERTO |
| Admin dashboard (frontend) | `admin-dashboard.test.tsx` | CUBIERTO |
| Header con nombre de servicio por tenant | `Header.test.tsx` | CUBIERTO |
| Tablon con municipio por tenant | `Tablon.test.tsx` | CUBIERTO |
| Formulario de aviso (frontend) | `FormularioAviso.test.tsx` | CUBIERTO |
| Configuracion visual por tenant (frontend) | `ConfiguracionTenant.test.tsx` | CUBIERTO |
| Panel superadmin — API (metricas, tenants CRUD) | `superadmin.test.ts` | CUBIERTO (Bloque 7) |
| Panel superadmin — Frontend dashboard | `superadmin-dashboard.test.tsx` | CUBIERTO (Bloque 7) |
| Panel superadmin — Frontend lista tenants | `superadmin-tenants.test.tsx` | CUBIERTO (Bloque 7) |

### Veredicto
LISTO PARA PRODUCCION. Los 288 tests pasan (203 Jest + 85 Vitest), sin regresiones, sin tests fallados.

---

## Bloque 7 — Frontend Panel Superadmin (COMPLETADO)

### Plan TDD — Bloque 7 Frontend

#### Paso 1: Escribir tests (RED)
- [x] Crear `src/__tests__/frontend/superadmin-dashboard.test.tsx` con 6 tests
- [x] Crear `src/__tests__/frontend/superadmin-tenants.test.tsx` con 6 tests
- [x] Confirmar que los tests fallan (modulos no existen)

#### Paso 2: Layout del superadmin
- [x] Crear `src/app/superadmin/(panel)/layout.tsx` con verificacion de sesion SUPERADMIN

#### Paso 3: Sidebar del superadmin
- [x] Crear `src/components/SuperadminSidebar.tsx` con bg-gray-950, nav items, mobile hamburger

#### Paso 4: Dashboard `/superadmin`
- [x] Crear `src/app/superadmin/(panel)/page.tsx` con 5 tarjetas de metricas
- [x] Fetch a GET /api/superadmin/metricas
- [x] Loading skeletons, error handling, acceso rapido a tenants

#### Paso 5: Lista de tenants `/superadmin/tenants`
- [x] Crear `src/app/superadmin/(panel)/tenants/page.tsx` con tabla, badges, dialogs
- [x] Dialog de creacion con validaciones (slug, password, etc.)
- [x] Dialog de edicion con nombre, municipio, estado
- [x] Boton suspender/activar por fila

#### Paso 6: GREEN — todos los tests pasan
- [x] 12/12 tests nuevos pasan
- [x] 85/85 tests vitest totales pasan (73 existentes + 12 nuevos)
- [x] Sin regresiones

### Resultado final

| Metrica | Valor |
|---------|-------|
| Tests nuevos (vitest) | 12 |
| Tests totales (vitest) | 85 |
| Tests fallados | 0 |
| Archivos creados | 6 |
| Archivos modificados | 0 |

---

## Bloque 6 — Frontend de personalización visual por tenant (COMPLETADO)

### Plan TDD — Bloque 6 Frontend

#### Paso 1: Escribir tests (RED)
- [x] Crear `src/__tests__/components/ConfiguracionTenant.test.tsx` con 7 tests
- [x] Confirmar que los tests fallan (componente no existia)

#### Paso 2: Implementar pagina `/admin/configuracion`
- [x] Crear `src/app/admin/(panel)/configuracion/page.tsx`
- [x] Formulario: nombre servicio, colores (con vista previa), SEO
- [x] Fetch a GET /api/admin/configuracion al montar
- [x] PATCH a /api/admin/configuracion al guardar
- [x] Vista previa de color en tiempo real
- [x] Alerts de exito y error

#### Paso 3: CSS variables para colores dinamicos
- [x] Añadir `--color-primario` y `--color-secundario` a `globals.css`
- [x] Inyectar CSS variables en el `<html>` del layout.tsx via `obtenerColoresTenant()`

#### Paso 4: Enlace en AdminSidebar
- [x] Añadir item "Configuracion" con icono Settings al final de navItems

#### Paso 5: Verificacion (GREEN)
- [x] 7/7 tests nuevos pasan
- [x] 73/73 tests vitest totales pasan (66 existentes + 7 nuevos)
- [x] TypeScript sin errores

### Resultado final

| Metrica | Valor |
|---------|-------|
| Tests nuevos (vitest) | 7 |
| Tests totales (vitest) | 73 |
| Tests fallados | 0 |
| Archivos creados | 2 (`configuracion/page.tsx`, `ConfiguracionTenant.test.tsx`) |
| Archivos modificados | 3 (`globals.css`, `layout.tsx`, `AdminSidebar.tsx`) |

---

## Bloque 6 — Backend de personalización por tenant (COMPLETADO)

### Plan TDD — Bloque 6

#### Paso 1: Escribir tests (RED)
- [x] Crear `src/__tests__/api/configuracion.test.ts` con todos los casos descritos
- [x] Confirmar que los tests fallan (módulos no existen aún)

#### Paso 2: Añadir schemas Zod en `src/lib/validaciones.ts`
- [x] `schemaColores`
- [x] `schemaConfiguracionTenant`
- [x] `schemaActualizarTenant`

#### Paso 3: Añadir helpers en `src/lib/tenant.ts`
- [x] Interface `ConfiguracionTenant`
- [x] `parsearConfiguracion(configuracion: string | null): ConfiguracionTenant`
- [x] `mergearConfiguracion(base, override): ConfiguracionTenant`

#### Paso 4: Implementar endpoints
- [x] `src/app/api/admin/configuracion/route.ts` con GET y PATCH

#### Paso 5: Verificación (GREEN)
- [x] Todos los tests nuevos pasan (17 nuevos)
- [x] Los 170 tests existentes siguen pasando (187 total)
- [x] Código de producción limpio de errores TypeScript

### Resultado final

| Métrica | Valor |
|---------|-------|
| Tests nuevos | 17 |
| Tests totales (Jest) | 187 |
| Tests fallados | 0 |
| Archivos creados | 2 (`route.ts`, `configuracion.test.ts`) |
| Archivos modificados | 2 (`validaciones.ts`, `tenant.ts`) |

---

## Informe de calidad — POST BLOQUE 6 (2026-03-26)

### Resumen de tests

| Runner | Suites | Tests totales | Pasados | Fallados |
|--------|--------|---------------|---------|----------|
| Jest (API) | 14/14 | 187 | 187 | 0 |
| Vitest (frontend/componentes) | 9/9 | 73 | 73 | 0 |
| **TOTAL** | **23/23** | **260** | **260** | **0** |

### Tests nuevos añadidos en Bloque 6

| Archivo | Tests | Comportamientos cubiertos |
|---------|-------|--------------------------|
| `src/__tests__/api/configuracion.test.ts` | 17 | GET/PATCH `/api/admin/configuracion`, `parsearConfiguracion`, `mergearConfiguracion` |
| `src/__tests__/components/ConfiguracionTenant.test.tsx` | 7 | Formulario de configuracion: render, carga, edicion, guardado, errores, loading |
| **SUBTOTAL nuevos Bloque 6** | **24** | |

### Tests fallados
Ninguno. Todos los tests pasan.

### Observaciones de la ejecucion
- Un `console.error` esperado aparece durante el test "devuelve 500 si el tenant no se encuentra en BD" — es comportamiento correcto del codigo de produccion (loguea el error antes de devolver 500). No es un fallo.

### Estado TypeScript
Sin errores. `npx tsc --noEmit` termina limpio sin salida.

### Estado de la base de datos

| Campo | Valor |
|-------|-------|
| id | `tenant-desarrollo-0000-0000-000000000001` |
| slug | `desarrollo` |
| nombre | `Ayuntamiento de Desarrollo` |
| municipio | `Desarrollo` |
| logoUrl | `null` |
| configuracion | `null` (sin personalizar aun — valores por defecto en codigo) |
| estado | `ACTIVO` |

Nota: el campo `configuracion` es `null` en la BD de desarrollo, lo que es correcto. La API devuelve un objeto con valores por defecto cuando el campo es null.

### Regresiones detectadas
Ninguna. Los 236 tests que pasaban al final del Bloque 5 siguen pasando.

### Cobertura acumulada del proyecto

| Area funcional | Suite de tests | Estado |
|----------------|---------------|--------|
| Autenticacion (login, registro, JWT) | `zod-validaciones.test.ts`, `auth-tenant.test.ts` | CUBIERTO |
| Recuperacion de contrasena | `recuperacion.test.ts` | CUBIERTO |
| Rate limiting en /login | `rate-limit.test.ts` | CUBIERTO |
| Reservas (crear, cancelar, mis reservas) | `reservas.test.ts`, `cancelar.test.ts`, `mis-reservas.test.ts` | CUBIERTO |
| Disponibilidad de slots | `disponibilidad.test.ts` | CUBIERTO |
| Instalaciones publicas | `instalaciones.test.ts` | CUBIERTO |
| Avisos / Tablon de anuncios | `avisos.test.ts` | CUBIERTO |
| Panel admin (metricas, reservas, pistas, bloqueos, usuarios) | `admin.test.ts` | CUBIERTO |
| Multi-tenancy helpers | `tenant.test.ts` | CUBIERTO |
| Aislamiento entre tenants | `aislamiento-tenant.test.ts` | CUBIERTO |
| NextAuth con tenantId | `auth-tenant.test.ts` | CUBIERTO |
| Configuracion visual por tenant (API) | `configuracion.test.ts` | CUBIERTO (Bloque 6) |
| Dashboard ciudadano (frontend) | `dashboard.test.tsx` | CUBIERTO |
| Pistas — listado (frontend) | `pistas.test.tsx` | CUBIERTO |
| Pistas — detalle y reserva (frontend) | `pistas-id.test.tsx` | CUBIERTO |
| Mis reservas (frontend) | `mis-reservas.test.tsx` | CUBIERTO |
| Admin dashboard (frontend) | `admin-dashboard.test.tsx` | CUBIERTO |
| Header con nombre de servicio por tenant | `Header.test.tsx` | CUBIERTO |
| Tablon con municipio por tenant | `Tablon.test.tsx` | CUBIERTO |
| Formulario de aviso (frontend) | `FormularioAviso.test.tsx` | CUBIERTO |
| Configuracion visual por tenant (frontend) | `ConfiguracionTenant.test.tsx` | CUBIERTO (Bloque 6) |
| Panel superadmin (crear tenants) | — | SIN CUBRIR (Bloque 7 pendiente) |

### Veredicto
LISTO PARA BLOQUE 7. Los 260 tests pasan, TypeScript sin errores, base de datos correcta, sin regresiones.

---

## Bloque 7 — Panel Superadmin (COMPLETADO)

### Plan TDD

#### Paso 1: Escribir tests (RED)
- [x] Crear `src/__tests__/api/superadmin.test.ts` con 16 tests
- [x] Confirmar que los tests fallan (modulo no existe)

#### Paso 2: Schema Prisma
- [x] Añadir SUPERADMIN al comentario de rol
- [x] Hacer tenantId opcional en Usuario (String?)
- [x] Ejecutar migracion `add_superadmin_role`

#### Paso 3: Actualizar NextAuth y tipos
- [x] Actualizar next-auth.d.ts con rol union type y tenantId opcional
- [x] auth.ts ya soporta cualquier valor de rol (string generico)

#### Paso 4: Actualizar Middleware
- [x] Añadir RUTAS_SUPERADMIN = ["/superadmin"]
- [x] Añadir /superadmin/:path* y /api/superadmin/:path* al matcher

#### Paso 5: Implementar API Routes
- [x] GET /api/superadmin/metricas
- [x] GET /api/superadmin/tenants
- [x] POST /api/superadmin/tenants (con transaccion + seed automatico)
- [x] PATCH /api/superadmin/tenants/[id]

#### Paso 6: Schemas Zod
- [x] schemaCrearTenant y schemaActualizarTenantSuperadmin en validaciones.ts

#### Paso 7: Seed superadmin
- [x] superadmin@reservas.dev creado en seed

#### Paso 8: GREEN — todos los tests pasan
- [x] 203/203 tests Jest pasan (187 existentes + 16 nuevos)

### Resultado final

| Metrica | Valor |
|---------|-------|
| Tests nuevos | 16 |
| Tests totales (Jest) | 203 |
| Tests fallados | 0 |
| Archivos creados | 4 (3 routes + 1 test) |
| Archivos modificados | 5 (schema, middleware, validaciones, types, seed) |
| Credenciales superadmin | superadmin@reservas.dev / SuperAdmin123! |

---

## Estado actual (2026-03-26)

El proyecto tiene la funcionalidad base completa para un único ayuntamiento:
- Autenticación (ciudadano / admin) con NextAuth.js
- Reservas de pistas de pádel con todas las validaciones de negocio
- Panel de administración completo (reservas, pistas, bloqueos, usuarios, avisos)
- Tablón de anuncios en página principal (avisos desde BD)
- Tests unitarios con Vitest (frontend) y Jest (backend)
- Deploy en Vercel + Supabase (PostgreSQL)
- Multi-tenancy completo (Bloque 5)
- Personalización visual por tenant (Bloque 6)

---

## Informe de calidad — POST BLOQUE 5 (2026-03-26) — ACTUALIZADO

### Resumen de tests

| Runner | Suites | Tests totales | Pasados | Fallados |
|--------|--------|---------------|---------|----------|
| Jest (API) | 13/13 | 170 | 170 | 0 |
| Vitest (frontend/componentes) | 8/8 | 66 | 66 | 0 |
| **TOTAL** | **21/21** | **236** | **236** | **0** |

### Tests nuevos añadidos en Bloque 5

| Archivo | Tests | Descripcion |
|---------|-------|-------------|
| `src/__tests__/api/tenant.test.ts` | 12 | Helper extraerSlugDelHost y obtenerTenantIdPorSlug |
| `src/__tests__/api/auth-tenant.test.ts` | 5 | NextAuth: authorize con tenantId, callbacks JWT y session |
| `src/__tests__/api/aislamiento-tenant.test.ts` | 15 | Aislamiento de datos entre tenants en todas las API routes |
| `src/__tests__/components/Header.test.tsx` | 3 | Header: nombreServicio por tenant, botones de sesion |
| `src/__tests__/components/Tablon.test.tsx` | 6 | Tablon: titulo por municipio, renderizado de pistas y avisos |
| **SUBTOTAL nuevos** | **41** | |

### Tests fallados
Ninguno. Todos los tests pasan.

### Estado de TypeScript
Sin errores. `npx tsc --noEmit` termina limpio sin salida.

### Estado de la base de datos
- Tenant activo: slug=`desarrollo`, nombre=`Ayuntamiento de Desarrollo`
- Usuarios: 2
- Instalaciones: 3

### Regresiones detectadas
Ninguna. Los 195 tests que existian antes del Bloque 5 (los 4 de admin-dashboard que
fallaban en el informe anterior ya habian sido corregidos en Bloque 5 Fase 5)
siguen pasando sin cambios.

### Veredicto final
Todo en orden — listo para Bloque 6.

---

## Bloque 5 — Fundacion Multi-tenancy (COMPLETADO)

**Objetivo:** Escalar la aplicacion para que sea usable por multiples ayuntamientos,
cada uno con su propio subdominio, configuracion y datos completamente aislados.

**Estrategia:** Row-level multi-tenancy con una sola BD compartida.

### Plan TDD — Bloque 5 Fase 1-3

#### Paso 1: Escribir tests (RED) — antes de cualquier codigo
- [x] Crear `src/__tests__/api/tenant.test.ts` con tests de `extraerSlugDelHost` y `obtenerTenantIdPorSlug`
- [x] Crear `src/__tests__/api/auth-tenant.test.ts` con tests de NextAuth + tenantId
- [x] Confirmar que los tests fallan (modulo no existe aun)

#### Paso 2: Schema Prisma — modelo Tenant y tenantId
- [x] Añadir modelo `Tenant` a `prisma/schema.prisma`
- [x] Añadir `tenantId String` a: Usuario, Instalacion, Reserva, Bloqueo, Aviso, TokenRecuperacion
- [x] Cambiar `@@unique` de email en Usuario a `@@unique([tenantId, email])`
- [x] Añadir `@@index([tenantId])` a todos los modelos
- [x] Ejecutar `npx prisma migrate dev --name add_multi_tenant`

#### Paso 3: Helper `src/lib/tenant.ts`
- [x] Crear helper con `extraerSlugDelHost`, `obtenerTenantPorSlug`, `obtenerTenantIdPorSlug`
- [x] Logica: localhost -> "desarrollo", subdominio -> SLUG, fallback -> "desarrollo"

#### Paso 4: Middleware actualizado
- [x] Extraer slug del host en cada request
- [x] Buscar tenantId en BD (con cache si es posible)
- [x] Inyectar `x-tenant-id` y `x-tenant-slug` en headers
- [x] Si tenant no existe y no es localhost -> error 404

#### Paso 5: NextAuth actualizado
- [x] Buscar usuario con `{ email, tenantId }` en `authorize`
- [x] Añadir `tenantId` al JWT en callback `jwt`
- [x] Exponer `tenantId` en sesion en callback `session`
- [x] Actualizar/crear `src/types/next-auth.d.ts`

#### Paso 6: Seed actualizado
- [x] Crear tenant "desarrollo" si no existe
- [x] Asignar tenantId a las 3 pistas y al admin

#### Paso 7: Verificacion (GREEN)
- [x] Ejecutar `npx jest --testTimeout=15000` — 170/170 tests pasan
- [x] Ejecutar `npx vitest run` — 66/66 tests pasan
- [x] Ejecutar seed — crea tenant "desarrollo" y verifica los 3 registros existentes
- [x] TypeScript sin errores (`npx tsc --noEmit` limpio)
- [x] Migracion aplicada limpiamente en Supabase PostgreSQL

---

## Bloque actual — Multi-tenancy

**Objetivo:** Escalar la aplicacion para que sea usable por multiples ayuntamientos,
cada uno con su propio subdominio, configuracion y datos completamente aislados.

**Estrategia elegida:** Row-level multi-tenancy con una sola BD compartida.

### Estado

- [x] PREVIO: corregir los 4 tests fallados en admin-dashboard.test.tsx (textos desactualizados)
- [x] Fase 1 — Data model: añadir tabla `Tenant` y columna `tenantId` a todas las tablas
- [x] Fase 2 — Middleware: detectar tenant por subdominio, inyectar `tenantId` en headers
- [x] Fase 3 — NextAuth: incluir `tenantId` en JWT y sesion
- [x] Fase 4 — API Routes: filtrar todas las queries por `tenantId`
- [x] Fase 5 — UI dinamica: logo, colores, titulo de pagina y textos por tenant
  - [x] TDD Paso 1 (RED): escribir Tablon.test.tsx y Header.test.tsx — confirmado que fallaban
  - [x] TDD Paso 2: añadir prop `municipio` a Tablon y `nombreServicio` a Header
  - [x] TDD Paso 3: actualizar layout.tsx con generateMetadata dinamica
  - [x] TDD Paso 4: actualizar page.tsx para obtener tenant y pasar props
  - [x] TDD Paso 5 (GREEN): 66/66 tests pasan (57 existentes + 9 nuevos)
- [ ] Fase 6 — Panel superadmin: crear y configurar nuevos tenants
- [x] Fase 7 — Testing de aislamiento: verificar que un tenant no accede a datos de otro

---
