# Roadmap — Sistema de Reservas Deportivas

## Fase 1 — Web app (actual)

### Bloque 1: Base del proyecto
- [x] Estructura Next.js 14 + TypeScript + Tailwind + shadcn/ui
- [x] Configuración Prisma + PostgreSQL (Supabase)
- [x] Esquema de base de datos completo (Usuario, Instalacion, Reserva, Bloqueo)
- [x] Seed de datos iniciales (3 pistas de pádel)
- [x] Sistema de autenticación con NextAuth.js (registro, login, roles)

### Bloque 2: Funcionalidad ciudadano
- [x] Página splash de inicio con botones de acceso
- [x] Vista de disponibilidad por pista y fecha (7 slots de 75 min)
- [x] Flujo completo de reserva con validaciones
- [x] Mis reservas (activas e historial)
- [x] Cancelación de reserva propia
- [x] Emails de confirmación (reserva y cancelación)

### Bloque 3: Panel de administración
- [x] Dashboard con métricas del día (reservas hoy, activas, pistas activas, cancelaciones)
- [x] Gestión de todas las reservas (ver, filtrar, cancelar)
- [x] Sistema de bloqueos (crear mediante Dialog modal, ver listado, eliminar)
- [x] Gestión de pistas (crear, editar, activar/desactivar)
- [x] Gestión de cuentas de administrador
- [ ] **Fase futura:** Creación manual de reservas por el admin
- [ ] **Fase futura:** Exportación de reservas a CSV

### Bloque 4: Calidad y producción
- [x] Validación con Zod en todas las API Routes
- [x] Rate limiting en login (5 intentos por IP / 15 min, implementado en memoria)
- [x] Emails transaccionales con Resend
- [x] Zona horaria Europe/Madrid en cálculos de slots
- [x] Deploy en producción (Vercel + Supabase)
- [x] Diseño responsive mobile-first en toda la app
- [x] Manejo de errores y estados de carga
- [ ] Pruebas de uso con el personal del ayuntamiento

---

## Fase 2 — App móvil (futura)

- [ ] Evaluación de Capacitor para conversión web → móvil
- [ ] Ajustes de UI para experiencia nativa
- [ ] Publicación en App Store (iOS)
- [ ] Publicación en Google Play (Android)
- [ ] Notificaciones push (recordatorio 1h antes de la reserva)

---

## Fase 3 — Mejoras futuras (ideas)

- [ ] Reservas recurrentes (ej: todos los martes a las 10h)
- [ ] Sistema de penalizaciones por no presentarse
- [ ] Integración con sede electrónica del ayuntamiento
- [ ] Festivos predefinidos por calendario oficial
- [ ] Estadísticas avanzadas de uso
- [ ] Múltiples ayuntamientos (multitenancy)
- [ ] Recuperación de contraseña por email
