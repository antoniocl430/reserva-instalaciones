# Changelog

Todos los cambios notables del proyecto quedan documentados aquí.

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).
Versionado siguiendo [Semantic Versioning](https://semver.org/lang/es/).

---

## [Sin publicar]

### Pendiente (Fase 2 — majors menores)
- `lucide-react` 0.344 → 1.x
- `bcryptjs` 2 → 3
- `resend` 3 → 6
- `tailwind-merge` 2 → 3

### Pendiente (Fase 3 — majors grandes)
- `tailwindcss` 3 → 4 (reescritura de configuración)
- `react` 18 → 19 + `next` 14 → 16 (async params/headers/cookies)
- `typescript` 5 → 6

---

## [0.8.0] — 2026-05-20

### Añadido
- Regla de negocio: un ciudadano puede tener como máximo **1 reserva activa por día** (cualquier instalación o franja horaria)
- Restricción en lista de espera: un ciudadano con reserva activa en un slot no puede apuntarse a la lista de espera de ese mismo slot
- 16 tests nuevos (9 unitarios de API + 7 de frontend) cubriendo las nuevas reglas
- Suite corregida: 23 tests rotos por cambios de UI previos vuelven a verde

### Cambiado
- Caducidad de avisos: la fecha indicada es el **último día visible** — el aviso desaparece a partir del día siguiente (antes desaparecía el mismo día a las 00:00 UTC)
- Documentación actualizada en `docs/app.md`

### Arreglado
- `obtenerAvisos()` en la página principal no filtraba avisos caducados — los avisos expirados ya no aparecen en el tablón público

---

## [0.7.0] — 2026-05-19

### Añadido
- **Logo del ayuntamiento**: el admin puede subir un logo (PNG/JPG/SVG, máx. 200 KB) que aparece en la cabecera para todos los ciudadanos
- **Eliminar cuenta**: el ciudadano puede eliminar su cuenta desde el perfil con confirmación de contraseña
- **Vista semanal**: en la página de detalle de instalación el ciudadano puede cambiar entre vista diaria y semanal de disponibilidad
- **Aceptación de privacidad**: casilla obligatoria de política de privacidad en el registro

### Cambiado
- Cabecera actualizada para mostrar el logo del ayuntamiento si está configurado, o un icono deportivo por defecto

---

## [0.6.0] — 2026-05-15

### Añadido
- **Valoraciones de instalaciones**: el ciudadano puede valorar de 1 a 5 estrellas cada instalación que ha usado, con comentario opcional
- Media de estrellas y número de valoraciones visibles en el tablón de instalaciones (sin necesidad de cuenta)
- Panel de admin con tabla completa de valoraciones recibidas por instalación
- Restricción: solo se puede valorar una vez por reserva finalizada

---

## [0.5.0] — 2026-05-15

### Añadido
- **Verificación QR**: cada reserva activa tiene un código QR único que el personal puede escanear para validar la entrada al recinto
- Página pública `/verificar/[token]` — el personal no necesita iniciar sesión para verificar
- **Comunicados masivos**: el admin puede enviar mensajes a todos los ciudadanos del ayuntamiento por email, por push o por ambos canales
- Historial de comunicados enviados en el panel de administración
- Los comunicados respetan las preferencias de notificación del ciudadano

---

## [0.4.0] — 2026-05-14

### Añadido
- **Lista de espera**: el ciudadano puede apuntarse a la cola de un slot ocupado
- Notificación automática (email + push) al primero de la cola cuando se libera un hueco — tiene 30 minutos para confirmar
- Pestaña "Lista de espera" en "Mis reservas" con posición en cola y botón de confirmación
- **Gestión de festivos**: el admin puede definir días festivos que bloquean automáticamente todas las instalaciones
- Importación de festivos nacionales de España con un clic (incluye Viernes Santo calculado dinámicamente)
- Festivos anuales que se repiten cada año sin reimportación
- **Calendario público**: cualquier visitante puede consultar la disponibilidad sin necesidad de registrarse

---

## [0.3.0] — 2026-04-14

### Añadido
- **Rol instructor**: monitor deportivo que puede crear y gestionar reservas recurrentes (semanales o quincenales)
- Dashboard del instructor en `/instructor` con grupos de clases activos y sesiones próximas
- Cancelación de grupo: cancela todas las sesiones futuras de un grupo con un clic
- Redirección post-login: si el ciudadano intentó acceder a una página protegida, vuelve a ella tras iniciar sesión
- **Deploy en Cloudflare Workers**: la aplicación se despliega en el edge con latencia mínima

### Arreglado
- Error de inicialización de Resend en tiempo de build sin variables de entorno
- Configuración de `open-next.config.ts` para compatibilidad con Cloudflare

---

## [0.2.0] — 2026-03-27

### Añadido
- **Multi-tenant**: la plataforma sirve a múltiples ayuntamientos, cada uno con su propio subdominio y datos completamente aislados
- Panel de superadmin en `/superadmin` para gestionar los ayuntamientos (tenants)
- **Perfil de usuario**: el ciudadano puede editar su nombre, cambiar contraseña y gestionar preferencias de notificación
- **Notificaciones push**: el ciudadano puede activar notificaciones push en su dispositivo (confirmaciones, recordatorios 1 hora antes, cancelaciones)
- Preferencias de notificación individuales por tipo de evento
- **Sistema de penalizaciones**: los no-shows acumulan penalizaciones; al alcanzar el umbral configurado la cuenta queda suspendida automáticamente
- Suspensión manual por el admin con fecha de fin y motivo
- El ciudadano recibe email con los detalles de su suspensión
- **RGPD**: aceptación de condiciones en el registro; política de privacidad disponible
- Protección anti-fuerza-bruta: bloqueo tras 5 intentos fallidos de login en 15 minutos

### Cambiado
- Configuración del tenant: nombre, municipio, logo, colores, horarios, slots y límites configurables desde el panel de admin

---

## [0.1.0] — 2026-03-24

### Añadido
- Registro e inicio de sesión de ciudadanos con email y contraseña
- Recuperación de contraseña por email (enlace de un solo uso, caduca en 1 hora)
- Tablón de instalaciones deportivas con nombre, tipo y descripción
- Tablón de avisos del ayuntamiento (informativos, avisos, cierres) con fecha de caducidad opcional
- Consulta de disponibilidad de slots con estados: libre, ocupado, bloqueado, propio
- Reserva de slots horarios con confirmación por email
- Cancelación de reservas hasta 2 horas antes del inicio
- Sección "Mis reservas" con reservas activas e historial
- Panel de administración con dashboard de métricas diarias
- Gestión de instalaciones (crear, editar, activar/desactivar)
- Gestión de bloqueos (mantenimiento, cierres, eventos especiales)
- Gestión de reservas: ver, filtrar, cancelar y crear manualmente
- Marcar ciudadanos como "no presentado" (no-show)
- Gestión del tablón de avisos
- Configuración de horarios y duración de slots por instalación
- Autenticación con roles: CIUDADANO, ADMIN, INSTRUCTOR, SUPERADMIN
- Aislamiento completo de datos por tenant (`tenantId` en todas las consultas)
- Validación de entrada con Zod en todas las API routes
- Transacciones de base de datos para reservas (evita doble reserva y race conditions)
