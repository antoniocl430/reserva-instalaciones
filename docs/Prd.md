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
- Puede crear, cancelar y gestionar cualquier reserva
- Puede bloquear instalaciones o franjas horarias por mantenimiento, cierre, festivos, etc.
- Puede crear y desactivar cuentas de otros admins

---

## 4. Instalaciones

| Instalación | Unidades | Descripción |
|---|---|---|
| Pistas de pádel | 3 | Pádel 1, Pádel 2, Pádel 3 |
| Calles de piscina | 10 | Calle 1 a Calle 10 |

- La piscina está operativa todo el año
- Los festivos y cierres especiales los gestiona el admin manualmente mediante bloqueos
- El servicio es completamente gratuito para los ciudadanos

---

## 5. Funcionalidades principales

### Ciudadano
- [ ] Registro con email y contraseña
- [ ] Login / logout
- [ ] Ver disponibilidad por instalación y fecha
- [ ] Realizar una reserva (instalación + fecha + hora)
- [ ] Ver mis reservas activas e historial
- [ ] Cancelar una reserva propia
- [ ] Recibir email de confirmación al reservar
- [ ] Recibir email de confirmación al cancelar

### Administrador
- [ ] Login al panel de administración
- [ ] Ver todas las reservas (filtros por instalación, fecha, usuario)
- [ ] Cancelar cualquier reserva
- [ ] Crear reservas manualmente para cualquier usuario
- [ ] **Bloquear una instalación o franja horaria** (mantenimiento, cierre, festivo, etc.)
- [ ] Desbloquear instalaciones o franjas
- [ ] Ver historial de uso de cada instalación
- [ ] Gestionar cuentas de administrador (crear, desactivar)

---

## 6. Reglas de negocio

- Horario disponible: **8:00 a 22:00**, slots de **1 hora**
- Máximo **2 reservas activas** por ciudadano simultáneamente
- Cancelación permitida hasta **2 horas antes** del inicio
- Un slot bloqueado por admin no puede ser reservado por ciudadanos
- El admin puede reservar o gestionar sin restricciones de tiempo
- No hay pagos — el servicio es gratuito
- Los festivos no están predefinidos en el sistema; el admin los bloquea manualmente

---

## 7. Fuera de alcance (por ahora)

- Pagos online
- App nativa iOS/Android (viene en fase 2)
- Integración con sede electrónica del ayuntamiento
- Notificaciones push
- Sistema de penalizaciones por no presentarse
- Reservas recurrentes o por temporada