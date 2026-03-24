# Roadmap — Sistema de Reservas Deportivas

## Fase 1 — Web app (actual)

### Bloque 1: Base del proyecto
- [ ] Estructura Next.js 14 + TypeScript + Tailwind + shadcn/ui
- [ ] Configuración Prisma + PostgreSQL (Supabase)
- [ ] Esquema de base de datos completo (Usuario, Instalacion, Reserva, Bloqueo)
- [ ] Seed de datos iniciales (13 instalaciones: 3 pádel + 10 piscina)
- [ ] Sistema de autenticación con NextAuth.js (registro, login, roles)

### Bloque 2: Funcionalidad ciudadano
- [ ] Página de inicio con lista de instalaciones
- [ ] Vista de disponibilidad semanal por instalación
- [ ] Flujo completo de reserva con validaciones
- [ ] Mis reservas (activas e historial)
- [ ] Cancelación de reserva propia
- [ ] Emails de confirmación (reserva y cancelación)

### Bloque 3: Panel de administración
- [ ] Dashboard con resumen del día
- [ ] Gestión de todas las reservas (ver, filtrar, cancelar)
- [ ] Creación manual de reservas por el admin
- [ ] Sistema de bloqueos (crear, ver, eliminar)
- [ ] Gestión de cuentas de administrador
- [ ] Exportación de reservas a CSV

### Bloque 4: Calidad y producción
- [ ] Diseño responsive revisado en móvil real
- [ ] Manejo de errores y estados de carga en toda la app
- [ ] Variables de entorno configuradas en Vercel
- [ ] Deploy en producción (Vercel + Supabase)
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