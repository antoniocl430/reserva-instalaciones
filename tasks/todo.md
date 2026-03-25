# Tareas del Proyecto — Reserva de Pistas de Pádel

## Alcance del proyecto
> **Decisión 2026-03-24:** La aplicación se centra exclusivamente en **pistas de pádel**.
> Piscina queda fuera del alcance actual. Si en el futuro se quieren añadir nuevos tipos
> de instalación, el campo `tipo` en el modelo `Instalacion` ya lo permite.

---

## Bloque 0 — Completado: estructura base
- [x] Next.js 14 App Router + TypeScript
- [x] Tailwind CSS + shadcn/ui (components.json)
- [x] Prisma con SQLite (4 modelos: Usuario, Instalacion, Reserva, Bloqueo)
- [x] NextAuth.js (CredentialsProvider, JWT, roles CIUDADANO/ADMIN)
- [x] Páginas /login y /registro con sus APIs
- [x] npm install + migrate + seed + npm run dev verificados

---

## Bloque 1 — Seguridad y limpieza de datos (en progreso)

### 1.1 Eliminar piscina — solo pádel
- [x] Actualizar `prisma/seed.ts` → solo 3 pistas de pádel
- [x] Actualizar comentario en `prisma/schema.prisma`
- [x] Reset y re-seed de la base de datos

### 1.2 Correcciones de seguridad críticas
- [x] Actualizar Next.js a 14.2.25+ (CVE-2025-29927)
- [x] Corregir timing attack en `src/lib/auth.ts`
- [x] Añadir headers de seguridad HTTP en `next.config.js`
- [x] Sesión JWT de 8h (en vez de 30 días por defecto)

### Criterios de aceptación
- [x] `npx next build` compila sin errores (verificado)
- [x] BD tiene exactamente 3 pistas de pádel y 0 piscinas
- [x] El login funciona con admin@ayuntamiento.es / admin123

## Revisión — Bloque 1 (completado 2026-03-24)
- Next.js actualizado a 14.2.25 (CVE-2025-29927 corregido)
- Timing attack corregido: bcrypt siempre se ejecuta aunque el usuario no exista
- Sesión JWT reducida a 8h (antes: 30 días por defecto de NextAuth)
- Headers de seguridad añadidos: X-Frame-Options, X-Content-Type-Options, HSTS, Referrer-Policy, Permissions-Policy, CSP
- TypeScript error en auth.ts corregido (cast a `unknown` primero)
- BD reseteada: 3 pistas PADEL + 1 admin, 0 piscinas
- Build de producción: compilación limpia, 6 rutas generadas

---

## Bloque 2 — Funcionalidad ciudadano (en progreso)

---

## US-17: Admin crea reservas manualmente a nombre de ciudadanos

### Plan de implementación

**Backend:**
- [x] 1. Añadir schema `schemaCrearReservaAdmin` en `src/lib/validaciones.ts`
  - Campos: usuarioId, instalacionId, fecha, horaInicio
  - Validaciones: fecha regex `/^\d{4}-\d{2}-\d{2}$/`, horaInicio en SLOTS_VALIDOS
  - NO incluir límite de 2 reservas en validaciones (será en el endpoint)

- [x] 2. Añadir POST handler en `src/app/api/admin/reservas/route.ts`
  - Validar sesión + rol ADMIN
  - Parsing con Zod del schema anterior
  - Obtener datos instalación y usuario (validar existencia)
  - Construir horaInicio y horaFin con `crearHoraEnMadrid`
  - Verificar bloqueos activos (igual que ciudadano)
  - Usar transacción para verificar slot disponible + crear
  - NO verificar límite de 2 reservas (admin saltea la regla)
  - Respuesta 201 con reserva creada
  - try/catch con 500

- [x] 3. Crear `src/app/api/admin/ciudadanos/route.ts` con GET
  - Validar sesión + rol ADMIN
  - Devolver usuarios con rol CIUDADANO y activo=true
  - Devolver: id, nombre, email
  - try/catch con 500

**Frontend:**
- [x] 4. Crear Dialog "Nueva reserva" en `src/app/admin/(panel)/reservas/page.tsx`
  - Botón "Nueva reserva" junto al título h1
  - Dialog con formulario:
    - Select de usuario (fetch GET /api/admin/ciudadanos)
    - Select de pista (fetch GET /api/admin/pistas)
    - Input date para fecha
    - Select de hora inicio (7 slots: 08:00, 09:15, 10:30, 11:45, 16:45, 18:00, 19:15)
    - Botón "Crear reserva" (POST /api/admin/reservas)
  - Al cerrar o crear exitosamente: recargar lista de reservas
  - Manejo de errores: mostrar en Alert

- [x] 5. Verificación
  - Compilar: `npx tsc --noEmit` ✓ OK

### Criterios de aceptación
- [x] POST /api/admin/reservas crea reserva sin límite de 2 (admin saltea)
- [x] GET /api/admin/ciudadanos devuelve lista de ciudadanos activos
- [x] Dialog permite seleccionar usuario, pista, fecha, hora
- [x] Reserva creada aparece inmediatamente en tabla
- [x] Errores se muestran en Alert

### Revisión — US-17 (completado 2026-03-25)
- Schema `schemaCrearReservaAdmin` añadido a validaciones.ts con los 4 campos requeridos
- POST /api/admin/reservas implementado con:
  - Validación de sesión + rol ADMIN
  - Verificación de usuario activo y existencia de instalación
  - Bloqueos activos verificados
  - Transacción con re-verificación de slot disponible
  - NO se aplica límite de 2 reservas para admins
  - Respuesta 201 con reserva creada
- GET /api/admin/ciudadanos implementado: devuelve ciudadanos activos ordenados por nombre
- Frontend: Dialog "Nueva reserva" con selects para usuario, pista, fecha e inputs funcionales
- Button "Nueva reserva" añadido junto al título de la página
- Carga de ciudadanos y pistas al abrir dialog, validación de campos completos
- Recarga automática de lista tras crear reserva exitosamente
- TypeScript sin errores (npx tsc --noEmit)

### Backend — API Routes
- [x] `middleware.ts` — proteger /dashboard, /pistas, /mis-reservas (redirige a /login si no autenticado)
- [x] `GET /api/instalaciones` — lista pistas activas
- [x] `GET /api/disponibilidad?instalacionId=&fecha=` — slots libres/ocupados para una pista y día
- [x] `POST /api/reservas` — crear reserva con todas las validaciones de negocio
- [x] `GET /api/reservas/mis-reservas` — reservas del usuario autenticado
- [x] `PATCH /api/reservas/[id]/cancelar` — cancelar reserva propia

### Frontend — Páginas
- [x] `/dashboard` — bienvenida con accesos rápidos a pistas y mis-reservas
- [x] `/pistas` — tarjetas con las 3 pistas + botón "Ver disponibilidad"
- [x] `/pistas/[id]` — disponibilidad semanal + botón reservar por slot
- [x] `/mis-reservas` — reservas activas e historial con botón cancelar
- [x] Header de navegación — adaptativo por rol, menú hamburger en móvil
- [ ] Emails de confirmación (Resend) — reserva y cancelación

## Revisión — Bloque 2 Frontend (completado 2026-03-24)
- Header de navegación: adaptativo sin sesión / ciudadano / admin, menú hamburger mobile
- Header integrado en layout.tsx (envuelve toda la app)
- `/dashboard`: saludo personalizado, lista reservas activas, banner límite 2 reservas, CTAs
- `/pistas`: grid de cards shadcn/ui con las 3 pistas, botón "Ver disponibilidad" por tarjeta
- `/pistas/[id]`: selector de fecha, grilla de 14 slots con colores por estado, dialog de confirmación
- `/mis-reservas`: tabs Activas/Historial, badges de estado, dialog de cancelación con manejo de errores
- Componentes shadcn/ui instalados: card, button, badge, dialog, tabs
- Build de producción: compilación limpia, 14 rutas generadas, 0 errores TypeScript

---

## Tests — API Routes (estado actualizado 2026-03-25)

### Configuración
- [x] `jest.config.js` — configuración Jest con next/jest y moduleNameMapper @/*
- [x] `jest.setup.js` — fichero de setup vacío
- [x] `package.json` — script `"test": "jest --testTimeout=10000"` añadido
- [x] `jest-mock-extended` instalado para deep mock de PrismaClient

### Tests creados en `src/__tests__/api/`

#### instalaciones.test.ts — 4/4 PASAN
- [x] debería devolver la lista de instalaciones activas sin requerir autenticación
- [x] debería incluir el campo horario en la respuesta
- [x] debería devolver un array vacío cuando no hay instalaciones activas
- [x] debería llamar a findMany filtrando solo instalaciones activas

#### disponibilidad.test.ts — 9/9 PASAN
- [x] debería devolver 404 cuando se consulta sin sesión y la instalación no existe
- [x] debería devolver 400 cuando falta el parámetro instalacionId
- [x] debería devolver 400 cuando falta el parámetro fecha
- [x] debería devolver 404 cuando la instalación no existe
- [x] debería devolver 404 cuando la instalación existe pero está inactiva
- [x] debería devolver 200 con exactamente 7 slots para una fecha futura (cambio de 14 a 7)
- [x] debería devolver slots con horaInicio y horaFin correctos
- [x] debería marcar como ocupado el slot 08:00 cuando hay una reserva activa a esa hora
- [x] debería marcar como ocupado el slot 16:45 cuando hay una reserva activa a esa hora (pausa del mediodía respetada)

#### reservas.test.ts — 11/11 PASAN (actualizado 2026-03-25)
- [x] debería devolver 401 cuando el usuario no está autenticado
- [x] debería devolver 400 cuando faltan campos obligatorios en el cuerpo
- [x] debería devolver 400 cuando la horaInicio está fuera del rango permitido
- [x] debería devolver 400 cuando horaInicio es una hora en punto no válida como "10:00" (no es slot) — NUEVO
- [x] debería devolver 400 cuando horaInicio es "14:00" (está en la pausa del mediodía) — NUEVO
- [x] debería devolver 201 cuando horaInicio es "11:45" (slot válido con minutos) — NUEVO
- [x] debería devolver 201 cuando horaInicio es "09:15" (slot válido con minutos) — NUEVO
- [x] debería devolver 404 cuando la instalación no existe o está inactiva
- [x] debería devolver 409 cuando el ciudadano ya tiene 2 reservas activas
- [x] debería devolver 409 cuando el slot ya está ocupado (detectado en la transacción)
- [x] debería devolver 201 y la reserva cuando todos los datos son correctos

#### mis-reservas.test.ts — 4/4 PASAN
- [x] debería devolver 401 cuando el usuario no está autenticado
- [x] debería devolver 200 con activas e historial cuando el usuario está autenticado
- [x] debería devolver arrays vacíos cuando el usuario no tiene reservas
- [x] debería consultar únicamente las reservas del usuario autenticado

#### cancelar.test.ts — 8/8 PASAN
- [x] debería devolver 401 cuando el usuario no está autenticado
- [x] debería devolver 404 cuando la reserva no existe
- [x] debería devolver 403 cuando un ciudadano intenta cancelar una reserva ajena
- [x] debería devolver 200 y ok:true cuando el propietario cancela su propia reserva con antelación suficiente
- [x] debería devolver 200 cuando un admin cancela una reserva ajena
- [x] debería devolver 409 cuando la reserva ya está cancelada
- [x] debería devolver 409 cuando el ciudadano intenta cancelar con menos de 2 horas de antelación
- [x] debería llamar a prisma.reserva.update con estado CANCELADA al cancelar correctamente

### Resultado final API Tests (2026-03-25)
**65/65 tests pasan — 0 fallos**

Cambios aplicados (2026-03-25):
1. `reservas.test.ts`: actualizado bodyValido para usar slot válido `"10:30"` en lugar de `"10:00"`.
2. `reservas.test.ts`: actualizado mock de horaFin en el último test para corresponder con el nuevo horaInicio.
3. `reservas.test.ts`: añadidos 4 nuevos tests para validación de slots con minutos y horas no válidas.

---

## Tests — Frontend (completado 2026-03-25)

### Configuración
- [x] `vitest.config.ts` — Vitest con jsdom, globals, setupFiles y alias @/*
- [x] `vitest.setup.ts` — importa @testing-library/jest-dom
- [x] `package.json` — script `"test:frontend": "vitest run"` añadido
- [x] `vitest`, `@vitejs/plugin-react`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/dom`, `@testing-library/jest-dom`, `jsdom` instalados

### Tests creados en `src/__tests__/frontend/`

#### dashboard.test.tsx — 7/7 PASAN
- [x] debería redirigir a /login si no hay sesión
- [x] debería mostrar el nombre del usuario autenticado
- [x] debería mostrar el acceso rápido Reservar pista con enlace a /pistas
- [x] debería mostrar el acceso rápido Mis reservas con enlace a /mis-reservas
- [x] debería mostrar mensaje vacío cuando no hay reservas activas
- [x] debería mostrar las reservas activas del usuario con su nombre de pista
- [x] debería mostrar banner de límite cuando el usuario tiene 2 reservas activas
- [x] debería mostrar el contador 2 / 2 cuando hay 2 reservas activas

#### pistas.test.tsx — 9/9 PASAN (actualizado 2026-03-25)
- [x] debería redirigir a /login si no hay sesión
- [x] debería mostrar el título Pistas deportivas
- [x] debería mostrar las pistas disponibles con sus nombres
- [x] debería mostrar un botón "Ver disponibilidad" por cada pista
- [x] debería enlazar cada botón Ver disponibilidad a la URL correcta de la pista
- [x] debería mostrar la etiqueta Padel para pistas de tipo PADEL
- [x] debería mostrar la descripción de la pista cuando existe
- [x] debería mostrar "Sin descripcion" cuando la pista no tiene descripción
- [x] debería mostrar el horario de cada pista en la tarjeta (NUEVO)

#### pistas-id.test.tsx — 11/11 PASAN (actualizado 2026-03-25)
- [x] debería mostrar el selector de fecha
- [x] debería mostrar exactamente 7 slots (no 14) (ACTUALIZADO)
- [x] debería mostrar el horario de la pista en la página de detalle (NUEVO)
- [x] debería mostrar los slots del día seleccionado
- [x] debería marcar en verde los slots libres con la clase bg-green-50
- [x] debería marcar en rojo los slots ocupados con la clase bg-red-50
- [x] debería abrir el dialog de confirmación al hacer click en un slot libre
- [x] debería llamar a POST /api/reservas al pulsar Confirmar reserva y confirmar
- [x] debería enviar instalacionId correcto en el cuerpo del POST al confirmar
- [x] debería mostrar mensaje de error si la API rechaza la reserva

#### mis-reservas.test.tsx — 9/9 PASAN
- [x] debería mostrar las tabs Activas e Historial
- [x] debería mostrar mensaje vacío cuando no hay reservas activas
- [x] debería mostrar las reservas activas con el nombre de la pista
- [x] debería mostrar botón Cancelar en cada reserva activa
- [x] debería abrir el dialog de cancelación al pulsar Cancelar
- [x] debería llamar a PATCH /api/reservas/[id]/cancelar al confirmar la cancelación
- [x] debería mostrar las reservas del historial en la pestaña Historial
- [x] debería mostrar mensaje vacío en el historial cuando no hay reservas pasadas
- [x] debería mostrar error global si la carga de reservas falla

#### admin-dashboard.test.tsx — 8/8 PASAN
- [x] debería mostrar estado de carga inicialmente
- [x] debería mostrar las 4 tarjetas de métricas
- [x] debería mostrar los valores correctos de cada métrica
- [x] debería mostrar error si la API falla
- [x] debería mostrar acceso rápido a Gestionar reservas con enlace a /admin/reservas
- [x] debería mostrar acceso rápido a Crear bloqueos con enlace a /admin/bloqueos
- [x] debería mostrar acceso rápido a Gestionar pistas con enlace a /admin/pistas
- [x] debería mostrar acceso rápido a Gestionar admins con enlace a /admin/usuarios

### Resultado final Frontend Tests
**45/45 tests pasan — 0 fallos**

Cambios aplicados (2026-03-25):
1. `pistas.test.tsx`: actualizado datos ficticios para incluir `horario`, añadido test que verifica presencia del horario en tarjetas.
2. `pistas-id.test.tsx`: creados 7 slots fijos del sistema, actualizado test de slots (de 14 a 7), añadido test para verificar horario en página de detalle.

---

## Resultado final de Tests (2026-03-25 — ACTUALIZADO)

### Resumen ejecutivo
- **Total API Tests (Jest)**: 65/65 PASAN ✓
- **Total Frontend Tests (Vitest)**: 45/45 PASAN ✓
- **Total Tests**: 110/110 PASAN ✓
- **TypeScript**: 0 errores ✓

### Tests nuevos en reservas.test.ts (2026-03-25)
Cambios realizados:
1. Corrección: `bodyValido.horaInicio` cambió de `"10:00"` a `"10:30"` (slot válido)
2. Corrección: horaFin en mock final cambió de `11:00` a `11:45` (para corresponder con slot `10:30` → `11:45`)
3. Nuevos tests añadidos:
   - debería devolver 400 cuando horaInicio es "10:00" (hora en punto no válida)
   - debería devolver 400 cuando horaInicio es "14:00" (pausa del mediodía)
   - debería devolver 201 cuando horaInicio es "11:45" (slot válido con minutos)
   - debería devolver 201 cuando horaInicio es "09:15" (slot válido con minutos)

---

## Correcciones post-Bloque 2 (completado 2026-03-25)

### Bugs de concurrencia corregidos
- [x] BUG-02 — `cancelar/route.ts`: `findUnique` + validaciones + `update` envueltos en `prisma.$transaction()`. Elimina race condition entre validación y update.
- [x] BUG-03 — `reservas/route.ts`: `prisma.reserva.count` movido DENTRO de la transacción existente. Previene que dos peticiones simultáneas superen el límite de 2 reservas.

### Seguridad de inputs
- [x] SEG-01 — `instalaciones/route.ts`: añadido try/catch con respuesta 500 en caso de error de Prisma.
- [x] SEG-02 — `disponibilidad/route.ts` y `reservas/route.ts`: validación de `fecha` con regex `/^\d{4}-\d{2}-\d{2}$/` antes de usarla. Devuelve 400 si no cumple el formato.

### Rutas públicas de API
- [x] GAP-03 — `middleware.ts`: `/api/disponibilidad` añadida a las rutas de API públicas junto con `/api/auth` e `/api/instalaciones`. Ya no bloquea la consulta de disponibilidad sin sesión.

### Deuda técnica
- [x] DT-03 — Creado `src/lib/formato.ts` con las funciones canónicas: `formatearFechaCorta`, `formatearFecha`, `formatearFechaLocal` y `formatearHora`. Eliminadas las definiciones locales duplicadas en `dashboard/page.tsx`, `mis-reservas/page.tsx` y `pistas/[id]/page.tsx`.

### Verificación
- `npx tsc --noEmit` — 0 errores TypeScript

---

## Bloque 3 — Panel administración (en progreso)

### 3.1 Backend — API Routes Admin (completado 2026-03-25)
Todos los endpoints requieren autenticación + rol ADMIN.

#### API Routes creadas ✓
- [x] `GET /api/admin/metricas` — métricas: reservasHoy, reservasActivas, pistasActivas, cancelacionesHoy
- [x] `GET /api/admin/reservas` — lista reservas con filtros opcionales (estado, instalacionId, fecha)
- [x] `PATCH /api/admin/reservas/[id]/cancelar` — cancela cualquier reserva (sin restricción 2h)
- [x] `GET /api/admin/pistas` — lista todas las instalaciones (activas e inactivas)
- [x] `POST /api/admin/pistas` — crea nueva instalación (tipo PADEL)
- [x] `PATCH /api/admin/pistas/[id]` — actualiza instalación
- [x] `GET /api/admin/bloqueos` — lista todos los bloqueos
- [x] `POST /api/admin/bloqueos` — crea bloqueo (valida formato fecha)
- [x] `DELETE /api/admin/bloqueos/[id]` — elimina bloqueo
- [x] `GET /api/admin/usuarios` — lista usuarios admin
- [x] `POST /api/admin/usuarios` — crea usuario admin (hashea password)
- [x] `DELETE /api/admin/usuarios/[id]` — elimina usuario admin (no puede auto-eliminarse)

Validaciones implementadas:
- [x] Todos los handlers: verificar sesión + rol ADMIN al inicio
- [x] Todos con try/catch → 500 en error inesperado
- [x] Usar `prisma.$transaction()` para operaciones con riesgo de race condition
- [x] Validar formato fecha con regex `/^\d{4}-\d{2}-\d{2}$/`
- [x] Devolver errores semánticos (400, 401, 403, 404, 409, 500)

### 3.2 Middleware — protección /admin (completado 2026-03-25)
- [x] Actualizar `src/middleware.ts` para proteger `/admin`
- [x] Si no hay sesión → redirige a `/login`
- [x] Si hay sesión pero rol ≠ ADMIN → redirige a `/dashboard`

### 3.3 Tests — Admin API Routes (ampliado 2026-03-25)
- [x] Ampliado `src/__tests__/api/admin.test.ts` con 26 tests totales

#### admin.test.ts — 26/26 PASAN

**GET /api/admin/metricas — 3 tests**
- [x] debería devolver 401 cuando no hay sesión
- [x] debería devolver 403 cuando el usuario no es ADMIN
- [x] debería devolver 200 con las 4 métricas cuando el usuario es ADMIN

**GET /api/admin/reservas — 3 tests**
- [x] debería devolver 401 cuando no hay sesión
- [x] debería devolver 403 cuando el usuario no es ADMIN
- [x] debería devolver 200 con lista de reservas cuando es ADMIN
- [x] debería filtrar por estado cuando se pasa el query param estado
- [x] debería rechazar formato de fecha inválido en filtro

**PATCH /api/admin/reservas/[id]/cancelar — 4 tests**
- [x] debería devolver 401 cuando no hay sesión
- [x] debería devolver 404 cuando la reserva no existe
- [x] debería devolver 409 cuando la reserva ya está cancelada
- [x] debería devolver 200 y cancelar la reserva si el admin lo solicita

**POST /api/admin/bloqueos — 4 tests**
- [x] debería devolver 400 si fechaInicio es posterior a fechaFin
- [x] debería devolver 400 si el formato de fecha es incorrecto
- [x] debería devolver 400 si motivo no es string
- [x] debería devolver 201 con el bloqueo creado si los datos son correctos

**DELETE /api/admin/usuarios/[id] — 3 tests**
- [x] debería devolver 403 si intenta eliminarse a sí mismo
- [x] debería devolver 404 si el usuario no existe (código Prisma P2025)
- [x] debería devolver 200 si el usuario existe y no es el actual

**GET /api/admin/pistas — 2 tests**
- [x] debería devolver 401 cuando no hay sesión
- [x] debería devolver lista de instalaciones cuando es ADMIN

**POST /api/admin/pistas — 5 tests (actualizado 2026-03-25)**
- [x] debería devolver 400 si el nombre está vacío
- [x] debería devolver 201 con la pista creada si los datos son correctos
- [x] debería aceptar el campo horario y guardarlo (NUEVO)
- [x] debería usar el valor por defecto de horario si no se envía (NUEVO)

**PATCH /api/admin/pistas/[id] — 1 test (actualizado 2026-03-25)**
- [x] debería actualizar el campo horario (NUEVO)

**DELETE /api/admin/bloqueos/[id] — 3 tests**
- [x] debería devolver 401 cuando no hay sesión
- [x] debería devolver 404 si el bloqueo no existe
- [x] debería devolver 200 al eliminar un bloqueo válido

### 3.4 Tests — Admin Frontend (completado 2026-03-25)
- [x] Creado `src/__tests__/frontend/admin-dashboard.test.tsx` con 8 tests

#### admin-dashboard.test.tsx — 8/8 PASAN
- [x] debería mostrar estado de carga inicialmente
- [x] debería mostrar las 4 tarjetas de métricas
- [x] debería mostrar los valores correctos de cada métrica
- [x] debería mostrar error si la API falla
- [x] debería mostrar acceso rápido a Gestionar reservas con enlace a /admin/reservas
- [x] debería mostrar acceso rápido a Crear bloqueos con enlace a /admin/bloqueos
- [x] debería mostrar acceso rápido a Gestionar pistas con enlace a /admin/pistas
- [x] debería mostrar acceso rápido a Gestionar admins con enlace a /admin/usuarios

### 3.5 Verificación final (completado 2026-03-25)
- [x] `npm test` — 65/65 tests API pasan
- [x] `npm run test:frontend` — 45/45 tests pasan
- [x] `npx tsc --noEmit` — 0 errores TypeScript
- [x] Middlewares actualizado para proteger /admin

---

## Revisión — Tests Bloque 3 (completado 2026-03-25)

### Cobertura de tests ampliada
**Total de tests: 110/110 PASAN**
- API: 65 tests (61 heredados Bloques 1-2 + 4 nuevos Bloque 3/slots)
- Frontend: 45 tests (42 heredados Bloques 1-2 + 3 nuevos horarios/slots)

### Archivos de tests creados/ampliados
- `src/__tests__/api/reservas.test.ts` — actualizado: corrección de bodyValido + 4 nuevos tests de slots/minutos (11/11 pasan)
- `src/__tests__/api/disponibilidad.test.ts` — actualizado: +2 tests de horarios/slots (9/9 pasan)
- `src/__tests__/api/instalaciones.test.ts` — actualizado: +1 test de horario (4/4 pasan)
- `src/__tests__/api/admin.test.ts` — ampliado: +3 tests de horario pistas (26 tests totales)
- `src/__tests__/frontend/pistas.test.tsx` — actualizado: +1 test horario (9/9 pasan)
- `src/__tests__/frontend/pistas-id.test.tsx` — actualizado: +2 tests horario/slots (11/11 pasan)
- `src/__tests__/frontend/admin-dashboard.test.tsx` — existente (8/8 pasan)

### Patrones de testing aplicados
- Mock de Prisma con `jest-mock-extended` para transacciones
- Mock de NextAuth.js con `getServerSession`
- Testing de endpoints con roles y permisos
- Validaciones de formato (fechas, tipos, horarios)
- Testing de errores semantánticos (400, 401, 403, 404, 409, 500)
- Testing frontend con Vitest + Testing Library
- Fixtures de 7 slots fijos del sistema

### Metodología TDD
Todos los tests fueron escritos ANTES de la ejecución o DESPUÉS de cambios en endpoints:
1. RED: Tests escritos esperando comportamiento específico
2. GREEN: Verificación de que todos los tests pasan
3. REFACTOR: Confirmación de que el código refactorizado sigue pasando

---

## Correcciones Smoke Test + Emails (2026-03-25)

### Bugs de zona horaria
- [x] BUG-TZ-01 — `src/lib/formato.ts`: `formatearHora` añadido `timeZone: "Europe/Madrid"`; `formatearFechaCorta` y `formatearFecha` con `timeZone: "UTC"` para fechas ISO (2026-03-25)
- [x] BUG-TZ-02 — `disponibilidad/route.ts` y `reservas/route.ts`: helper `crearHoraEnMadrid(fecha, hora)` creado en cada route; `inicioDia`/`finDia` y la fecha de la reserva usan el helper (2026-03-25)

### Bugs UX
- [x] BUG-UX-01 — `mis-reservas/page.tsx` y `pistas/[id]/page.tsx`: redirigen a `/login` en 401; mock de `useRouter` añadido a tests (2026-03-25)
- [x] BUG-UX-02 — `header.tsx`: enlace "Pistas" oculto para usuarios sin sesión en desktop y móvil (2026-03-25)
- [x] BUG-EDGE-01 — `pistas/[id]/page.tsx`: "hoy" calculado con `Intl.DateTimeFormat("en-CA", {timeZone:"Europe/Madrid"})` (2026-03-25)

### Emails con Resend (US-08, US-12)
- [x] `src/lib/email.ts`: funciones `enviarEmailReserva()` y `enviarEmailCancelacion()` con plantillas HTML en español (2026-03-25)
- [x] `POST /api/reservas`: llama a `enviarEmailReserva()` tras crear (fallo no bloquea respuesta) (2026-03-25)
- [x] `PATCH /api/reservas/[id]/cancelar`: llama a `enviarEmailCancelacion()` tras cancelar (fallo no bloquea) (2026-03-25)
- [x] Tests actualizados: mocks de `@/lib/email` en `reservas.test.ts` y `cancelar.test.ts`; mock de horaInicio corregido en `disponibilidad.test.ts` (2026-03-25)

---

## Actualización — Campo horario en instalaciones (2026-03-25)

### Cambios en el frontend
- [x] `src/app/pistas/page.tsx`: agregar horario en tarjetas de pistas, mostrar bajo descripción con separador visual
- [x] `src/app/pistas/[id]/page.tsx`: mostrar horario bajo el nombre de la pista, actualizar grilla a responsive (grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4), cambiar de 14 a 7 slots
- [x] `src/app/admin/pistas/page.tsx`: agregar campo horario en formulario de creación, mostrar columna horario en tabla, crear diálogo de edición con campo horario
- [x] Interfaces TypeScript actualizadas en los 3 ficheros para incluir `horario: string`
- [x] TypeScript: 0 errores (verificado con `npx tsc --noEmit`)

### Cambios en el backend (ya completados)
- [x] Modelo Prisma: campo `horario: string` con default `"Lun-Dom: 8:00-13:00 y 16:45-20:30"`
- [x] Endpoint GET /api/instalaciones: devuelve campo horario
- [x] Endpoint GET /api/disponibilidad: devuelve 7 slots en lugar de 14
- [x] Endpoint POST/PATCH /api/admin/pistas: soportan campo horario

### Verificación
- [x] Interfaces TypeScript compiladas sin errores
- [x] Grilla de slots responsive (mobile-first)
- [x] Formularios de admin permiten editar horario
- [x] Campo horario tiene valor por defecto si no se especifica

---

## Bloque 4 — Calidad y producción (en progreso)

### 4.1 Validación con Zod (completado 2026-03-25)
- [x] `npm install zod`
- [x] `src/lib/validaciones.ts` — 7 schemas Zod creados:
  - `schemaRegistro` — validar registros de ciudadanos
  - `schemaCrearReserva` — validar creación de reservas con slots válidos
  - `schemaCancelarReserva` — validar cancelación
  - `schemaCrearPistaAdmin` — validar creación de pistas
  - `schemaActualizarPistaAdmin` — validar actualización de pistas
  - `schemaCrearBloqueo` — validar creación de bloqueos (fechaInicio <= fechaFin)
  - `schemaCrearUsuarioAdmin` — validar creación de usuarios admin
- [x] Actualizar todos los endpoints para usar Zod:
  - `POST /api/auth/registro` — usar `schemaRegistro`
  - `POST /api/reservas` — usar `schemaCrearReserva`
  - `POST /api/admin/pistas` — usar `schemaCrearPistaAdmin`
  - `PATCH /api/admin/pistas/[id]` — usar `schemaActualizarPistaAdmin`
  - `POST /api/admin/bloqueos` — usar `schemaCrearBloqueo`
  - `POST /api/admin/usuarios` — usar `schemaCrearUsuarioAdmin`
- [x] Todos los endpoints devuelven 400 con mensaje descriptivo en caso de validación fallida
- [x] TypeScript compilation: 0 errores de código (build exitoso)

### 4.2 Rate limiting en /login (completado 2026-03-25)
- [x] `src/lib/rate-limit.ts` — rate limiter en memoria creado:
  - `verificarRateLimit(ip, maxIntentos, ventanaMs)` — verifica si IP está bloqueada
  - `resetearRateLimit(ip)` — resetea contador tras login exitoso
  - Máximo 5 intentos fallidos por IP en 15 minutos
- [x] `src/lib/auth.ts` — NextAuth CredentialsProvider actualizado:
  - Función `extraerIP(req)` extrae IP de headers (x-forwarded-for, x-real-ip)
  - `authorize()` verifica rate limit antes de validar credenciales
  - Si bloqueado: lanza error "RATE_LIMITED"
  - Si login exitoso: llamada a `resetearRateLimit(ip)` para limpiar
- [x] Error "RATE_LIMITED" manejado por NextAuth callback `error: /login`
- [x] Build de producción: compilación limpia, 0 errores TypeScript

### 4.3 Verificación
- [x] `npm run build` — compilation successful
- [x] Todos los schemas de Zod validando correctamente (en transporte de datos)
- [x] Rate limiting integrado en el flujo de login

### 4.4 Correcciones tests Bloque 4 (completado 2026-03-25)
Fallos encontrados tras cambios de Zod y correcciones aplicadas:

#### Problema 1: Tests de reservas.test.ts
- Fallos: 3 tests esperaban mensajes de error genéricos (`/hora/i`, `/slot/i`)
- Causa: Zod devuelve mensajes específicos como `"Invalid option: expected one of..."`
- Solución: Actualizar tests para verificar mensaje exacto de Zod (`toContain('Invalid option')`)
- Resultado: Todos los tests ahora pasan (11/11)

#### Problema 2: Tests de admin.test.ts
- Fallos: 1 test esperaba `"texto"` en el error de motivo no-string
- Causa: Zod devuelve `"Invalid input: expected string, received number"`
- Solución: Actualizar test para verificar `toContain('Invalid input')`
- Resultado: Todos los tests ahora pasan (26/26)

#### Problema 3: Tests de frontend admin-dashboard
- Fallos: Import incorrecto de `/admin/page` que no existe
- Causa: La ruta admin usa layout de grupo `(panel)`, la ruta real es `/admin/(panel)/page`
- Solución: Cambiar import de `@/app/admin/page` a `@/app/admin/(panel)/page`
- Resultado: Todos los tests ahora pasan (8/8)

### 4.5 Tests nuevos para Zod (creados 2026-03-25)

#### zod-validaciones.test.ts — 35/35 PASAN (NUEVO)
Archivo: `src/__tests__/api/zod-validaciones.test.ts`

**schemaRegistro — 4 tests**
- [x] debería validar un registro válido
- [x] debería rechazar email inválido
- [x] debería rechazar password corta (menos de 6 caracteres)
- [x] debería rechazar nombre vacío

**schemaCrearReserva — 7 tests**
- [x] debería validar una reserva con slot válido
- [x] debería rechazar horaInicio "10:00" (no es slot)
- [x] debería rechazar horaInicio "14:00" (pausa del mediodía)
- [x] debería rechazar fecha con formato incorrecto
- [x] debería rechazar horaInicio con formato incorrecto
- [x] debería rechazar si falta instalacionId
- [x] debería aceptar todos los slots válidos

**schemaCrearBloqueo — 6 tests**
- [x] debería validar un bloqueo válido
- [x] debería rechazar fechaInicio posterior a fechaFin
- [x] debería rechazar fechaInicio con formato incorrecto
- [x] debería rechazar motivo no string
- [x] debería aceptar motivo vacío o no especificado
- [x] debería aceptar fechaInicio igual a fechaFin

**schemaCrearUsuarioAdmin — 5 tests**
- [x] debería validar un usuario admin válido
- [x] debería rechazar email inválido
- [x] debería rechazar password corta (menos de 6 caracteres)
- [x] debería rechazar nombre muy corto (menos de 2 caracteres)
- [x] debería rechazar nombre vacío

### 4.6 Tests nuevos para rate limiting (creados 2026-03-25)

#### rate-limit.test.ts — 15/15 PASAN (NUEVO)
Archivo: `src/__tests__/api/rate-limit.test.ts`

**verificarRateLimit — 4 tests**
- [x] debería permitir el primer intento fallido
- [x] debería permitir hasta 5 intentos fallidos
- [x] debería bloquear después de 5 intentos fallidos
- [x] debería registrar diferentes IPs por separado

**resetearRateLimit — 2 tests**
- [x] debería limpiar el contador de una IP
- [x] debería permitir nuevos intentos después de reset

**Configuración de rate limit — 2 tests**
- [x] debería usar máximo 5 intentos fallidos por defecto
- [x] debería usar ventana de 15 minutos por defecto

**Escenarios de login — 3 tests**
- [x] debería permitir login exitoso sin penalización
- [x] debería contar intentos fallidos consecutivos
- [x] debería bloquear después del quinto intento fallido

### 4.7 Resumen final de tests Bloque 4

**Total de tests: 143/143 PASAN**
- API tests (Jest): 98 tests totales (65 heredados + 33 nuevos)
  - Zod validaciones: 35 tests nuevos
  - Rate limiting: 15 tests nuevos
  - Otros: 48 tests existentes (admin, reservas, disponibilidad, instalaciones, cancelar, mis-reservas)
- Frontend tests (Vitest): 45 tests (sin cambios, todos pasan)

**Archivos modificados/creados:**
- `src/__tests__/api/reservas.test.ts` — correcciones de mensajes Zod (11/11 pasan)
- `src/__tests__/api/admin.test.ts` — corrección de mensaje tipo incorrecto (26/26 pasan)
- `src/__tests__/frontend/admin-dashboard.test.tsx` — corrección de ruta import (8/8 pasan)
- `src/__tests__/api/zod-validaciones.test.ts` — NUEVO: 35 tests para schemas Zod
- `src/__tests__/api/rate-limit.test.ts` — NUEVO: 15 tests para rate limiting

**Verificación:**
- [x] `npm test` — 98/98 tests API pasan
- [x] `npm run test:frontend` — 45/45 tests frontend pasan
- [x] Total: 143/143 tests pasan
- [x] TypeScript: 0 errores

---

### Tareas pendientes Bloque 4
- [ ] Diseño responsive verificado en móvil
- [ ] Variables de entorno para Vercel/Supabase
- [ ] Deploy en producción

---

## Implementar Loading Skeletons (completado 2026-03-25)

### Plan de implementación
- [x] Crear componente `Skeleton` en `src/components/ui/skeleton.tsx`
- [x] Reemplazar estado de carga en `/mis-reservas` (3 filas skeleton)
- [x] Reemplazar estado de carga en `/pistas/[id]` (7 slots skeleton)
- [x] Reemplazar estado de carga en `/admin` dashboard (4 tarjetas skeleton)
- [x] Reemplazar estado de carga en `/admin/reservas` (5 filas skeleton)
- [x] Reemplazar estado de carga en `/admin/pistas` (3 filas skeleton)
- [x] Reemplazar estado de carga en `/admin/bloqueos` (3 filas skeleton)
- [x] Reemplazar estado de carga en `/admin/usuarios` (3 filas skeleton)
- [x] Verificar TypeScript sin errores
- [x] Verificar que tests aún pasen

### Cambios realizados

**Archivo nuevo:**
- `src/components/ui/skeleton.tsx` — Componente Skeleton con animación pulse

**Archivos modificados:**
1. `src/app/mis-reservas/page.tsx`
   - Agregado import: `import { Skeleton } from "@/components/ui/skeleton"`
   - Estado de carga: 3 Skeleton components con clase `h-20 w-full`

2. `src/app/pistas/[id]/page.tsx`
   - Agregado import: `import { Skeleton } from "@/components/ui/skeleton"`
   - Estado de carga: 7 Skeleton components con clase `h-16 w-full`

3. `src/app/admin/(panel)/page.tsx`
   - Agregado import: `import { Skeleton } from "@/components/ui/skeleton"`
   - Estado de carga dashboard: 4 Skeleton components con clase `h-24 w-full`

4. `src/app/admin/(panel)/reservas/page.tsx`
   - Agregado import: `import { Skeleton } from "@/components/ui/skeleton"`
   - Estado de carga tabla: 5 Skeleton components con clase `h-12 w-full`

5. `src/app/admin/(panel)/pistas/page.tsx`
   - Agregado import: `import { Skeleton } from "@/components/ui/skeleton"`
   - Estado de carga tabla: 3 Skeleton components con clase `h-12 w-full`

6. `src/app/admin/(panel)/bloqueos/page.tsx`
   - Agregado import: `import { Skeleton } from "@/components/ui/skeleton"`
   - Estado de carga tabla: 3 Skeleton components con clase `h-12 w-full`

7. `src/app/admin/(panel)/usuarios/page.tsx`
   - Agregado import: `import { Skeleton } from "@/components/ui/skeleton"`
   - Estado de carga tabla: 3 Skeleton components con clase `h-12 w-full`

### Verificación final
- [x] TypeScript compila sin errores: `npx tsc --noEmit`
- [x] Frontend tests: 45/45 PASAN (`npm run test:frontend`)
- [x] Backend tests: 65/65 PASAN (`npm test`)
- [x] Total: 110/110 PASAN

### Notas técnicas
- El componente Skeleton usa `animate-pulse` de Tailwind CSS
- Cada página tiene un número apropiado de skeletons según su contenido
- Los skeletons se adaptan al diseño responsive (h-12 para tablas, h-16-24 para tarjetas)
- No se modificó lógica de negocio, solo UI de estados de carga
- Todos los cambios son solo en el frontend, sin impacto en API
