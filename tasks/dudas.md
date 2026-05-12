# Dudas y decisiones del proyecto — Sistema de Reservas Deportivas

## Cómo usar este archivo
- Las dudas se irán resolviendo por orden de prioridad
- Al resolver una, marca con ✅ y añade la decisión tomada
- Guarda el historial de decisiones para referencia futura

---

## 🔴 Críticas (bloquean otros bloques)

### ❓ 1. Middleware de protección de rutas
**Estado:** Sin resolver
**Impacto:** Bloquea la creación de todas las rutas protegidas

¿Cómo manejamos el acceso a rutas que requieren autenticación?
- Opción A: Crear `middleware.ts` que redirija `/dashboard` → `/login` si no hay sesión
- Opción B: Cada página `page.tsx` valida sesión con `useSession()` y redirige

**Decisión:** _pendiente_

---

### ❓ 2. Transacciones en reservas (race condition)
**Estado:** Sin resolver
**Impacto:** Riesgo de doble reserva del mismo slot

El DATA-MODEL dice "No pueden existir dos reservas ACTIVAS para el mismo slot". Si dos usuarios hacen clic en el mismo slot al mismo tiempo:
- Opción A: Implementar `prisma.$transaction()` a nivel BD (bloqueo optimista)
- Opción B: Validación en servidor + retry client-side si falla

**Decisión:** _pendiente_

---

### ❓ 3. Base de datos de producción
**Estado:** Sin resolver
**Impacto:** Migración a producción

El `.env` tiene `DATABASE_URL="file:./dev.db"` (SQLite local). ¿Cuándo migramos a PostgreSQL?
- Opción A: Migrar a Supabase ahora (antes de terminar Bloque 1)
- Opción B: Mantener SQLite en desarrollo y migrar solo en Bloque 4 (producción)

**Decisión:** _pendiente_

---

## 🟡 Importantes (afectan al Bloque 2)

### ❓ 4. Validación de permisos por rol
**Estado:** Sin resolver
**Impacto:** Seguridad de API Routes

El CLAUDE.md dice "Validar siempre los permisos por rol en cada API Route". ¿Cómo lo hacemos?
- Opción A: Crear un helper/middleware reutilizable: `assertRole(session, "ADMIN")`
- Opción B: Validación manual en cada route: `if (session.user.rol !== "ADMIN") return 403`

**Decisión:** _pendiente_

---

### ❓ 5. Recuperación de contraseña (US-04)
**Estado:** Sin resolver
**Impacto:** Funcionalidad user story

El PRD lista esta funcionalidad, pero no está en el roadmap de Bloque 2.
- Opción A: Implementar ahora (token temporal por email con Resend)
- Opción B: Dejar para fase futura (Bloque 4 o Fase 2)

**Decisión:** _pendiente_

---

### ❓ 6. Emails de confirmación (US-08, US-12)
**Estado:** Sin resolver
**Impacto:** Experiencia del usuario en Bloque 2

Resend está en `package.json` pero sin implementación.
- Opción A: Integrar en Bloque 2 cuando creen la página de reserva
- Opción B: Implementar primero toda la lógica, luego añadir emails

**Decisión:** _pendiente_

---

## 🟢 Secundarias (no bloquean)

### ❓ 7. Ruta pública `/instalaciones`
**Estado:** Sin resolver
**Impacto:** Comportamiento de la UI

El UI-FLOWS dice que se puede ver disponibilidad sin login, pero reservar requiere login.
¿Significa que:
- `/instalaciones` → pública (listar)
- `/instalaciones/[id]` → pública (ver disponibilidad)
- `POST /api/reservas` → protegida (crear reserva)

**Decisión:** _pendiente_

---

### ❓ 8. Logout
**Estado:** Sin resolver
**Impacto:** Usabilidad

¿Cómo implementar logout?
- ¿Llamar `signOut()` de NextAuth en un botón "Cerrar sesión" de la cabecera?

**Decisión:** _pendiente_

---

### ❓ 9. Límite de 2 reservas simultáneas
**Estado:** Sin resolver
**Impacto:** Regla de negocio

¿Es un hardcoded 2 o debería ser configurable por admin?

**Decisión:** _pendiente_

---

### ❓ 10. NEXTAUTH_SECRET
**Estado:** Sin resolver
**Impacto:** Seguridad en desarrollo

El `.env` dice "cambia-este-secreto-en-produccion-usa-openssl-rand-base64-32".
¿Genero un secret seguro ahora o es suficiente placeholder para desarrollo?

**Decisión:** _pendiente_

---

### ❓ 11. Seed automático
**Estado:** Sin resolver
**Impacto:** DX (developer experience)

¿El `seed.ts` funciona automáticamente con `npm run dev` o hay que ejecutar `npm run db:seed` manualmente?

**Decisión:** _pendiente_

---

### ❓ 12. Diseño responsive
**Estado:** Sin resolver
**Impacto:** Calidad del Bloque 2

"Mobile-first" significa:
- ¿Ya debería estar testeable en móvil ahora (Bloque 2)?
- ¿O es para el Bloque 4 la revisión completa?

**Decisión:** _pendiente_

---

### ❓ 13. Estado de carga y errores
**Estado:** Sin resolver
**Impacto:** UX consistente

¿Hay un patrón de error handling definido o cada componente maneja los suyos?

**Decisión:** _pendiente_

---

### ❓ 14. APIs para Fase 2 móvil
**Estado:** Sin resolver
**Impacto:** Arquitectura futura

¿Las APIs REST ya están pensadas para ser consumidas por Capacitor o hay algo que cambiar en Fase 2?

**Decisión:** _pendiente_

---

## Orden recomendado para resolver

```
Sesión 1: Dudas 1, 2, 3 (críticas)
Sesión 2: Dudas 4, 5, 6 (Bloque 2)
Sesión 3: Dudas 7-14 (secundarias)
```
