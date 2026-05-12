# Roadmap — Sistema de Reservas Deportivas Municipales

## Fase 1 — Web app ✅

### Bloque 1: Base del proyecto ✅
- [x] Estructura Next.js 14 + TypeScript + Tailwind + shadcn/ui
- [x] Configuración Prisma + PostgreSQL (Supabase)
- [x] Esquema de base de datos (Usuario, Instalacion, Reserva, Bloqueo)
- [x] Seed de datos iniciales (3 pistas de pádel + admin por defecto)
- [x] Sistema de autenticación con NextAuth.js (registro, login, roles)
- [x] Seguridad: rate limiting, headers HTTP, JWT de 8h, timing attack

### Bloque 2: Funcionalidad ciudadano ✅
- [x] Página de inicio con tablón de instalaciones y avisos
- [x] Vista de disponibilidad por pista y fecha (7 slots de 75 min)
- [x] Flujo completo de reserva con validaciones de negocio
- [x] Mis reservas (activas e historial) con cancelación
- [x] Emails de confirmación (reserva y cancelación) con Resend
- [x] Recuperación de contraseña por email

### Bloque 3: Panel de administración ✅
- [x] Dashboard con métricas del día
- [x] Gestión de reservas (ver, filtrar, cancelar, crear manualmente)
- [x] Sistema de bloqueos (crear, ver, eliminar)
- [x] Gestión de instalaciones (crear, editar, activar/desactivar)
- [x] Gestión de cuentas de administrador
- [x] Gestión de avisos del tablón de anuncios
- [x] Diseño profesional (sidebar oscuro, header dinámico)

### Bloque 4: Calidad ✅
- [x] Tests unitarios con Vitest (componentes/páginas) y Jest (API routes)
- [x] TDD aplicado en frontend y backend
- [x] Validación con Zod en todas las API Routes
- [x] Deploy en producción (Cloudflare + Supabase)
- [x] Diseño responsive mobile-first

---

## Fase 2 — Multi-tenancy ✅

### Bloque 5: Arquitectura multi-tenant ✅
- [x] Tabla `Tenant` en Prisma + columna `tenantId` en todas las tablas
- [x] Migración de datos existentes a tenant inicial
- [x] Middleware: detectar tenant por subdominio, inyectar en headers
- [x] NextAuth: incluir `tenantId` en JWT y sesión
- [x] Todas las API Routes filtran por `tenantId`
- [x] Tests de aislamiento: un tenant no accede a datos de otro

### Bloque 6: Personalización por tenant ✅
- [x] Nombre del servicio y municipio dinámicos en la UI
- [x] Colores corporativos mediante CSS variables (`--color-primario`, `--color-secundario`)
- [x] Configuración visual desde el panel admin (`/admin/configuracion`)
- [x] Metadata SEO dinámica por tenant en `layout.tsx`

### Bloque 7: Panel superadmin ✅
- [x] Ruta `/superadmin` protegida por rol SUPERADMIN
- [x] Dashboard con métricas agregadas de todos los tenants
- [x] Listado de tenants con estado y badges
- [x] Crear nuevo tenant con seed automático (pistas + admin inicial)
- [x] Editar tenant (nombre, municipio, estado)
- [x] Suspender / reactivar tenant

---

## Fase 3 — Experiencia móvil (en curso)

El objetivo es que la aplicación funcione de forma excelente en cualquier dispositivo
móvil desde el navegador, sin necesidad de app nativa. PWA, gestos táctiles y UX
optimizada para pantallas pequeñas.

### Bloque 8: Sistema de notificaciones por email
- [ ] Email al ciudadano cuando el admin cancela su reserva (plantilla diferenciada, con motivo)
- [ ] Email a todos los admins activos del tenant cuando un ciudadano hace una nueva reserva
- [ ] Email a todos los admins activos del tenant cuando un ciudadano cancela una reserva
- [ ] Refactorizar `email.ts`: añadir parámetro `canceladoPorAdmin` en `enviarEmailCancelacion` para adaptar el copy
- [ ] Añadir función `enviarEmailNotificacionAdmins` que consulta los admins activos del tenant y les envía el aviso
- [ ] Tests unitarios de las nuevas plantillas y funciones

### Bloque 9: Mejoras de UX y flujos de usuario ✅
- [x] Revisar y pulir todos los flujos ciudadano en mobile (reserva, mis reservas, cancelación)
- [x] Mejorar navegación entre páginas (breadcrumbs, botones de volver)
- [x] Feedback visual claro en acciones (toasts, estados de carga, confirmaciones)
- [x] Formularios optimizados para teclado móvil (tipos de input correctos, autocomplete)

### Bloque 10: PWA — instalable desde el navegador ✅
- [x] Configurar `manifest.ts` dinámico con nombre, iconos y colores por tenant
- [x] Service worker para carga offline básica (páginas visitadas) — extendido sw.js
- [x] Banner "Añadir a pantalla de inicio" en iOS y Android (componente InstalarPWA)
- [x] Icono SVG deportivo en /public/icons/ (icon.svg, apple-touch-icon.svg)
- [x] Meta tags PWA en layout.tsx (appleWebApp, themeColor, mobile-web-app-capable)

### Bloque 11: Notificaciones web push ✅
- [x] Integración con Web Push API (sin app nativa)
- [x] Recordatorio 1h antes de cada reserva
- [ ] Notificación al cancelar una reserva (propia o por el admin)
- [ ] Gestión de preferencias de notificación por usuario

---

## Fase 4 — Funcionalidades avanzadas (backlog)

- [ ] Reservas recurrentes (ej: todos los martes a las 10h)
- [ ] Sistema de penalizaciones por no presentarse
- [ ] Festivos predefinidos por calendario oficial
- [ ] Estadísticas avanzadas de uso por instalación
- [ ] Exportación de reservas a CSV
- [ ] Horarios y slots configurables por tenant desde el panel
- [ ] Límite de reservas configurable por tenant
- [ ] Integración con sede electrónica del ayuntamiento
- [ ] Base de datos dedicada por tenant (para ayuntamientos grandes)
- [ ] Facturación por uso (SaaS pricing)
