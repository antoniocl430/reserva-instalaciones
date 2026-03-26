# PRD — Sistema de Reservas Deportivas Municipales

## 1. Visión general

Plataforma SaaS para gestionar reservas de instalaciones deportivas municipales.
Cada ayuntamiento tiene su propio espacio aislado (subdominio, datos, configuración).
Los ciudadanos reservan online de forma gratuita. El personal del ayuntamiento gestiona
las instalaciones desde un panel de administración.

**Modelo de negocio:** Multi-tenant. Una sola aplicación, múltiples ayuntamientos.
**Fase actual:** Web app responsive (single-tenant funcional, multi-tenant en desarrollo)
**Fase futura:** App móvil iOS/Android (Capacitor)

---

## 2. Problema que resuelve

Actualmente las reservas se gestionan por teléfono o en persona, lo que genera:
- Colas y llamadas innecesarias al ayuntamiento
- Dificultad para ver disponibilidad en tiempo real
- Sin registro histórico de uso de instalaciones
- Sin solución asequible para municipios pequeños/medianos

---

## 3. Usuarios del sistema

### 3.1 Ciudadano (usuario registrado)
- Cualquier persona que cree una cuenta con email y contraseña
- Solo puede reservar instalaciones de su ayuntamiento
- Ve sus propias reservas, puede cancelarlas
- No tiene acceso al panel de administración

### 3.2 Administrador
- Personal del ayuntamiento con cuenta de tipo admin
- Pueden existir múltiples admins por ayuntamiento
- Acceso completo al panel de administración de su tenant
- Puede cancelar cualquier reserva, gestionar instalaciones, bloqueos, usuarios y avisos

### 3.3 Superadmin (futuro)
- Gestiona todos los ayuntamientos (tenants) desde un panel centralizado
- Puede crear, configurar y suspender tenants
- No tiene acceso a los datos de reservas de cada ayuntamiento

---

## 4. Instalaciones

Cada ayuntamiento configura sus propias instalaciones. Por defecto, el seed inicial
crea 3 pistas de pádel. Los tipos disponibles son extensibles por configuración.

| Tipo | Descripción |
|---|---|
| PADEL | Pistas de pádel cubiertas o descubiertas |
| TENIS | Pistas de tenis (futuro) |
| PISCINA | Calles de piscina (futuro) |
| FUTBOL | Campos de fútbol sala (futuro) |

- Los festivos y cierres especiales los gestiona el admin mediante bloqueos
- El servicio es completamente gratuito para los ciudadanos

---

## 5. Funcionalidades implementadas

### Ciudadano
- [x] Registro con email y contraseña
- [x] Login / logout
- [x] Ver disponibilidad por pista y fecha
- [x] Realizar una reserva (pista + fecha + hora)
- [x] Ver mis reservas activas e historial
- [x] Cancelar una reserva propia
- [x] Recibir email de confirmación al reservar y cancelar
- [x] Recuperación de contraseña por email

### Administrador
- [x] Login al panel de administración
- [x] Dashboard con métricas del día
- [x] Ver, filtrar y cancelar todas las reservas
- [x] Crear reservas manualmente a nombre de ciudadanos
- [x] Sistema de bloqueos (crear, ver, eliminar)
- [x] Gestión de instalaciones (crear, editar, activar/desactivar)
- [x] Gestión de cuentas de administrador (crear, desactivar)
- [x] Gestión de avisos del tablón de anuncios (crear, editar, eliminar)

### Multi-tenant (en desarrollo)
- [ ] Subdominio propio por ayuntamiento
- [ ] Configuración personalizada (logo, colores, nombre, horarios, límites)
- [ ] Aislamiento completo de datos por tenant (RLS + tenantId)
- [ ] Panel superadmin para onboarding de nuevos ayuntamientos

---

## 6. Reglas de negocio (configurables por tenant en el futuro)

- Horario disponible: **8:00-13:00 y 16:45-20:30**, slots de **75 minutos**
- Slots del día: 08:00, 09:15, 10:30, 11:45 (mañana) y 16:45, 18:00, 19:15 (tarde)
- Máximo **2 reservas activas** por ciudadano simultáneamente
- Cancelación permitida hasta **2 horas antes** del inicio
- Un slot bloqueado por admin no puede ser reservado por ciudadanos
- El admin puede gestionar sin restricciones de tiempo
- No hay pagos — el servicio es gratuito
- Todos los horarios se gestionan en la zona horaria **Europe/Madrid**

---

## 7. Seguridad

- **Rate limiting:** 5 intentos fallidos de login por IP en 15 minutos
- **Validación:** Zod en todas las API Routes del servidor
- **Protección de rutas:** Middleware de Next.js con validación de rol
- **Aislamiento multi-tenant:** Filtro `tenantId` en todas las queries + RLS en PostgreSQL (futuro)
- **JWT:** Sesión de 8h, revalidación del estado del usuario en cada refresh

---

## 8. Fuera de alcance (por ahora)

- Pagos online
- App nativa iOS/Android (viene en fase 2)
- Integración con sede electrónica del ayuntamiento
- Notificaciones push
- Sistema de penalizaciones por no presentarse
- Reservas recurrentes o por temporada
- Exportación CSV
- Festivos predefinidos por calendario oficial
