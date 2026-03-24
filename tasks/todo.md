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

### Backend — API Routes
- [x] `middleware.ts` — proteger /dashboard, /pistas, /mis-reservas (redirige a /login si no autenticado)
- [x] `GET /api/instalaciones` — lista pistas activas
- [x] `GET /api/disponibilidad?instalacionId=&fecha=` — slots libres/ocupados para una pista y día
- [x] `POST /api/reservas` — crear reserva con todas las validaciones de negocio
- [x] `GET /api/reservas/mis-reservas` — reservas del usuario autenticado
- [x] `PATCH /api/reservas/[id]/cancelar` — cancelar reserva propia

### Frontend — Páginas
- [ ] `/dashboard` — bienvenida con accesos rápidos a pistas y mis-reservas
- [ ] `/pistas` — tarjetas con las 3 pistas + botón "Ver disponibilidad"
- [ ] `/pistas/[id]` — disponibilidad semanal + botón reservar por slot
- [ ] `/mis-reservas` — reservas activas e historial con botón cancelar
- [ ] Emails de confirmación (Resend) — reserva y cancelación

---

## Bloque 3 — Panel administración (pendiente)
- [ ] Middleware de protección para /admin
- [ ] AdminLayout con verificación de rol server-side
- [ ] /admin — dashboard con métricas del día
- [ ] /admin/reservas — tabla con filtros y cancelación masiva
- [ ] /admin/pistas — gestión de pistas (añadir, desactivar)
- [ ] /admin/bloqueos — crear y gestionar bloqueos
- [ ] /admin/usuarios — gestión de cuentas admin

---

## Bloque 4 — Calidad y producción (pendiente)
- [ ] Validación con Zod en todas las APIs
- [ ] Rate limiting en /login (5 intentos/IP/15min)
- [ ] Diseño responsive verificado en móvil
- [ ] Variables de entorno para Vercel/Supabase
- [ ] Deploy en producción
