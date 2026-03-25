# PRD — Sistema de Reservas Deportivas Municipales

## 1. Visión general

Aplicación web para gestionar reservas de instalaciones deportivas del ayuntamiento.
Los ciudadanos reservan online de forma gratuita. El personal del ayuntamiento
gestiona las instalaciones desde un panel de administración.

**Fase actual:** Web app responsive
**Fase futura:** App móvil iOS/Android (Capacitor)

---

## 2. Problema que resuelve

Actualmente las reservas se gestionan por teléfono o en persona, lo que genera:
- Colas y llamadas innecesarias al ayuntamiento
- Dificultad para ver disponibilidad en tiempo real
- Sin registro histórico de uso de instalaciones

---

## 3. Usuarios del sistema

### 3.1 Ciudadano (usuario registrado)
- Cualquier persona que cree una cuenta con email y contraseña
- Solo puede reservar instalaciones disponibles
- Ve sus propias reservas, puede cancelarlas
- No tiene acceso al panel de administración

### 3.2 Administrador
- Personal del ayuntamiento con cuenta de tipo admin
- Pueden existir múltiples admins (cualquiera con rol admin tiene acceso total)
- Acceso completo al panel de administración
- Puede cancelar cualquier reserva
- Puede bloquear instalaciones o franjas horarias por mantenimiento, cierre, festivos, etc.
- Puede gestionar instalaciones (crear, editar, activar/desactivar)
- Puede crear y desactivar cuentas de otros admins

---

## 4. Instalaciones

La aplicación gestiona exclusivamente **3 pistas de pádel**:

| Instalación | Unidades | Descripción |
|---|---|---|
| Pistas de pádel | 3 | Pádel 1, Pádel 2, Pádel 3 |

- Los festivos y cierres especiales los gestiona el admin manualmente mediante bloqueos
- El servicio es completamente gratuito para los ciudadanos

---

## 5. Funcionalidades principales

### Ciudadano
- [x] Registro con email y contraseña
- [x] Login / logout
- [x] Ver disponibilidad por pista y fecha
- [x] Realizar una reserva (pista + fecha + hora)
- [x] Ver mis reservas activas e historial
- [x] Cancelar una reserva propia
- [x] Recibir email de confirmación al reservar
- [x] Recibir email de confirmación al cancelar

### Administrador
- [x] Login al panel de administración
- [x] Dashboard con métricas del día (reservas hoy, reservas activas, pistas activas, cancelaciones)
- [x] Ver todas las reservas (filtros por instalación, fecha, usuario)
- [x] Cancelar cualquier reserva
- [x] Sistema de bloqueos (crear mediante modal, ver listado, eliminar)
- [x] Gestión de pistas (crear, editar, activar/desactivar)
- [x] Gestión de cuentas de administrador (crear, desactivar)
- [ ] **Fase futura:** Crear reservas manualmente para cualquier usuario registrado
- [ ] **Fase futura:** Ver historial de uso de cada instalación
- [ ] **Fase futura:** Exportación de reservas a CSV

---

## 6. Reglas de negocio

- Horario disponible: **8:00-13:00 y 16:45-20:30**, slots de **75 minutos**
- Slots del día: 08:00, 09:15, 10:30, 11:45 (mañana) y 16:45, 18:00, 19:15 (tarde)
- Máximo **2 reservas activas** por ciudadano simultáneamente
- Cancelación permitida hasta **2 horas antes** del inicio
- Un slot bloqueado por admin no puede ser reservado por ciudadanos
- El admin puede gestionar sin restricciones de tiempo
- No hay pagos — el servicio es gratuito
- Los festivos no están predefinidos en el sistema; el admin los bloquea manualmente
- Todos los horarios se gestionan en la zona horaria **Europe/Madrid**

---

## 7. Seguridad implementada

- **Rate limiting:** 5 intentos fallidos de login por IP en ventana de 15 minutos (implementado en memoria con `Map`)
- **Validación de datos:** Zod en todas las API Routes del servidor
- **Protección de rutas:** Middleware de Next.js protege `/pistas`, `/dashboard`, `/mis-reservas` y todo `/admin`

---

## 8. Fuera de alcance (por ahora)

- Pagos online
- App nativa iOS/Android (viene en fase 2)
- Integración con sede electrónica del ayuntamiento
- Notificaciones push
- Sistema de penalizaciones por no presentarse
- Reservas recurrentes o por temporada
- Exportación CSV
- Recuperación de contraseña
- Creación manual de reservas por el admin
