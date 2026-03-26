# Roadmap — Sistema de Reservas Deportivas Municipales

## Fase 1 — Web app (completada)

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
- [x] Tests unitarios con Vitest (componentes) y Jest (API routes)
- [x] TDD aplicado en frontend y backend
- [x] Validación con Zod en todas las API Routes
- [x] Deploy en producción (Vercel + Supabase)
- [x] Diseño responsive mobile-first

---

## Fase 2 — Multi-tenancy (en curso)

### Bloque 5: Arquitectura multi-tenant
- [ ] Tabla `Tenant` en Prisma + columna `tenantId` en todas las tablas
- [ ] Migración de datos existentes a tenant inicial
- [ ] Middleware: detectar tenant por subdominio, inyectar en headers
- [ ] NextAuth: incluir `tenantId` en JWT y sesión
- [ ] Todas las API Routes filtran por `tenantId`
- [ ] Tests de aislamiento: un tenant no accede a datos de otro

### Bloque 6: Personalización por tenant
- [ ] Logo y favicon por tenant (metadata dinámica en `layout.tsx`)
- [ ] Colores corporativos mediante CSS variables
- [ ] Nombre del servicio y textos personalizados
- [ ] Horarios y slots configurables por tenant
- [ ] Límite de reservas configurable por tenant

### Bloque 7: Panel superadmin
- [ ] Ruta `/superadmin` protegida por rol SUPERADMIN
- [ ] Crear nuevo tenant (slug, nombre, municipio)
- [ ] Seed automático al crear tenant (pistas, admin inicial)
- [ ] Configurar tenant (logo, colores, reglas de negocio)
- [ ] Suspender / reactivar tenant
- [ ] Vista de métricas agregadas de todos los tenants

---

## Fase 3 — App móvil (futura)

- [ ] Evaluación de Capacitor para conversión web → móvil
- [ ] Ajustes de UI para experiencia nativa
- [ ] Publicación en App Store (iOS) y Google Play (Android)
- [ ] Notificaciones push (recordatorio 1h antes de la reserva)

---

## Fase 4 — Mejoras futuras (backlog)

- [ ] Reservas recurrentes (ej: todos los martes a las 10h)
- [ ] Sistema de penalizaciones por no presentarse
- [ ] Integración con sede electrónica del ayuntamiento
- [ ] Festivos predefinidos por calendario oficial
- [ ] Estadísticas avanzadas de uso por instalación
- [ ] Exportación de reservas a CSV
- [ ] Base de datos dedicada por tenant (para ayuntamientos grandes)
- [ ] Facturación por uso (SaaS pricing)
