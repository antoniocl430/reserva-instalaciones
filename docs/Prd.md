# PRD — Sistema de Reservas Deportivas Municipales

## 1. Visión general

Plataforma SaaS para gestionar reservas de instalaciones deportivas municipales.
Cada ayuntamiento tiene su propio espacio aislado (subdominio, datos, configuración).
Los ciudadanos reservan online de forma gratuita. El personal del ayuntamiento gestiona
las instalaciones desde un panel de administración.

**Modelo de negocio:** Multi-tenant. Una sola aplicación, múltiples ayuntamientos.
**Fase actual:** Web app responsive con multi-tenancy completo y panel superadmin.
**Fase siguiente:** Experiencia móvil de primera clase — PWA instalable, notificaciones push web, UX optimizada para táctil. Sin app nativa.

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
- Puede crear reservas manualmente a nombre de ciudadanos registrados

### 3.3 Superadmin
- Gestiona todos los ayuntamientos (tenants) desde un panel centralizado en `/superadmin`
- Puede crear, configurar y suspender tenants
- Ve métricas agregadas de todos los tenants
- No tiene acceso a los datos de reservas de cada ayuntamiento

---

## 4. Instalaciones

Cada ayuntamiento configura sus propias instalaciones. Por defecto, el seed inicial
crea 3 pistas de pádel. Los tipos disponibles son extensibles por configuración.

| Tipo | Descripción |
|---|---|
| PADEL | Pistas de pádel cubiertas o descubiertas |
| TENIS | Pistas de tenis |
| PISCINA | Calles de piscina (futuro) |
| FUTBOL | Campos de fútbol sala |
| BASQUETBOL | Pistas de baloncesto |

- Los festivos y cierres especiales los gestiona el admin mediante bloqueos
- El servicio es completamente gratuito para los ciudadanos

---

## 5. Funcionalidades implementadas

### Ciudadano
- [x] Registro con email y contraseña
- [x] Login / logout
- [x] Recuperación de contraseña por email
- [x] Ver disponibilidad por pista y fecha
- [x] Realizar una reserva (pista + fecha + hora)
- [x] Ver mis reservas activas e historial
- [x] Cancelar una reserva propia (hasta 2h antes)
- [x] Recibir email de confirmación al reservar y cancelar
- [x] Página principal con tablón de instalaciones y avisos (sin banner de login si hay sesión activa)

### Administrador
- [x] Login al panel de administración
- [x] Dashboard con métricas del día
- [x] Ver, filtrar y cancelar todas las reservas
- [x] Crear reservas manualmente a nombre de ciudadanos
- [x] Sistema de bloqueos (crear, ver, eliminar)
- [x] Gestión de instalaciones (crear, editar, activar/desactivar)
- [x] Gestión de cuentas de administrador (crear, desactivar)
- [x] Gestión de avisos del tablón de anuncios (crear, editar, eliminar)
- [x] Configuración visual del tenant (nombre, colores, SEO)

### Multi-tenant
- [x] Subdominio propio por ayuntamiento
- [x] Aislamiento completo de datos por tenant (tenantId en todas las queries)
- [x] Configuración personalizada (logo, colores, nombre del servicio, SEO)
- [x] Nombre del municipio en el tablón de instalaciones
- [x] JWT con tenantId incluido

### Panel superadmin
- [x] Dashboard con métricas agregadas de todos los tenants
- [x] Listado de tenants con estado (activo/suspendido)
- [x] Crear nuevo tenant con seed automático (pistas + admin inicial)
- [x] Editar tenant (nombre, municipio, estado)
- [x] Suspender / reactivar tenant

---

## 6. Reglas de negocio

- Horario disponible: **8:00-13:00 y 16:45-20:30**, slots de **75 minutos**
- Slots del día: 08:00, 09:15, 10:30, 11:45 (mañana) y 16:45, 18:00, 19:15 (tarde)
- Máximo **1 reserva activa por tipo de instalación** por ciudadano (puede tener pádel + tenis simultáneamente, pero no dos pádel)
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
- **Aislamiento multi-tenant:** Filtro `tenantId` obligatorio en todas las queries
- **JWT:** Sesión de 8h, revalidación del estado del usuario en cada refresh
- **Timing attacks:** Hash dummy en login para normalizar tiempos de respuesta
- **User enumeration:** Mensaje genérico único en todos los fallos de login

---

## 8. Fuera de alcance (por ahora)

- Pagos online
- App nativa iOS/Android (se descarta — se apuesta por PWA)
- Integración con sede electrónica del ayuntamiento
- Sistema de penalizaciones por no presentarse
- Reservas recurrentes o por temporada
- Exportación CSV
- Festivos predefinidos por calendario oficial
- Base de datos dedicada por tenant
- Facturación por uso (SaaS pricing)
