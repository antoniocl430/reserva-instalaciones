# Modelo de Datos — Sistema de Reservas Deportivas

## Arquitectura: Multi-tenant con Row-Level Isolation

Todas las entidades principales tienen una columna `tenantId` que las vincula a un
ayuntamiento concreto. Esto garantiza el aislamiento completo de datos entre tenants
a nivel de aplicación (filtro obligatorio en todas las queries) y a nivel de base de
datos (PostgreSQL RLS en producción).

---

## Entidades

---

### Tenant *(nuevo — en desarrollo)*
Representa un ayuntamiento. Cada tenant tiene su subdominio, configuración y datos propios.

| Campo | Tipo | Descripción |
|---|---|---|
| id | String (uuid) | Identificador único |
| slug | String | Subdominio único (`sevilla`, `malaga`) — `@unique` |
| nombre | String | Nombre oficial (`"Ayuntamiento de Sevilla"`) |
| municipio | String | Nombre del municipio |
| logoUrl | String? | URL del logotipo |
| configuracion | Json? | Configuración personalizable (ver abajo) |
| estado | String | `"ACTIVO"` \| `"SUSPENDIDO"` \| `"ELIMINADO"` |
| creadoEn | DateTime | Fecha de alta |
| actualizadoEn | DateTime | Última modificación |

**Configuración personalizable por tenant (JSON):**
- `maxReservasSimultaneas` — límite de reservas activas por ciudadano (default: 2)
- `cancelacionHorasAntes` — antelación mínima para cancelar (default: 2)
- `horariosApertura` — franjas horarias y slots
- `duracionSlotMinutos` — duración de cada slot (default: 75)
- `nombreServicio` — nombre del servicio en la UI
- `colores` — colores corporativos en hex
- `zonaHoraria` — zona horaria (default: `"Europe/Madrid"`)
- `metadata` — título y descripción para SEO

---

### Usuario
Representa tanto a ciudadanos como a administradores. Único por email **dentro de un tenant**.

| Campo | Tipo | Descripción |
|---|---|---|
| id | String (uuid) | Identificador único |
| tenantId | String | FK → Tenant |
| email | String | Email — único por tenant (`@@unique([tenantId, email])`) |
| nombre | String | Nombre completo |
| passwordHash | String | Contraseña encriptada con bcrypt |
| rol | String | `"CIUDADANO"` \| `"ADMIN"` |
| activo | Boolean | Si la cuenta está activa (default: true) |
| creadoEn | DateTime | Fecha de registro |
| actualizadoEn | DateTime | Última modificación |

> El email es único **por tenant**, no globalmente. Un mismo email puede existir en dos
> ayuntamientos distintos sin conflicto.

---

### Instalacion
Cada pista, campo o instalación del complejo deportivo de un ayuntamiento.

| Campo | Tipo | Descripción |
|---|---|---|
| id | String (uuid) | Identificador único |
| tenantId | String | FK → Tenant |
| nombre | String | Ej: `"Pádel 1"` — único por tenant |
| tipo | String | `"PADEL"` \| `"TENIS"` \| `"PISCINA"` \| ... |
| descripcion | String? | Descripción opcional |
| horario | String | Horario de apertura visible |
| activa | Boolean | Si aparece en el sistema (default: true) |
| creadoEn | DateTime | Fecha de creación |

---

### Reserva
Una reserva de un ciudadano en una instalación para un slot horario.

| Campo | Tipo | Descripción |
|---|---|---|
| id | String (uuid) | Identificador único |
| tenantId | String | FK → Tenant |
| usuarioId | String | FK → Usuario |
| instalacionId | String | FK → Instalacion |
| fecha | DateTime | Día de la reserva |
| horaInicio | DateTime | Inicio del slot |
| horaFin | DateTime | Fin del slot (horaInicio + duración del slot) |
| estado | String | `"ACTIVA"` \| `"CANCELADA"` |
| creadoEn | DateTime | Cuándo se hizo la reserva |
| canceladoEn | DateTime? | Cuándo se canceló (si aplica) |
| canceladoPor | String? | FK → Usuario (quién canceló) |

---

### Bloqueo
Bloqueo de una instalación o franja horaria por parte de un admin.

| Campo | Tipo | Descripción |
|---|---|---|
| id | String (uuid) | Identificador único |
| tenantId | String | FK → Tenant |
| instalacionId | String | FK → Instalacion |
| fechaInicio | DateTime | Inicio del bloqueo |
| fechaFin | DateTime | Fin del bloqueo |
| motivo | String | Razón del bloqueo |
| creadoPorId | String | FK → Usuario (admin que creó el bloqueo) |
| creadoEn | DateTime | Cuándo se creó |
| activo | Boolean | Si el bloqueo sigue vigente (default: true) |

---

### Aviso
Aviso publicado en el tablón de anuncios de la página principal.

| Campo | Tipo | Descripción |
|---|---|---|
| id | String (cuid) | Identificador único |
| tenantId | String | FK → Tenant |
| titulo | String | Título del aviso (max 100 chars) |
| descripcion | String | Contenido del aviso (max 500 chars) |
| tipo | String | `"INFO"` \| `"AVISO"` \| `"CIERRE"` |
| fecha | DateTime | Fecha del aviso (visible en la UI) |
| activo | Boolean | Si aparece en el tablón (default: true) |
| creadoEn | DateTime | Fecha de creación |
| actualizadoEn | DateTime | Última modificación |

---

### TokenRecuperacion
Token de un solo uso para recuperación de contraseña por email.

| Campo | Tipo | Descripción |
|---|---|---|
| id | String (uuid) | Identificador único |
| tenantId | String | FK → Tenant |
| token | String | Token único generado aleatoriamente |
| usuarioId | String | FK → Usuario |
| expiraEn | DateTime | Expiración (1 hora desde creación) |
| usado | Boolean | Si ya fue usado (default: false) |
| creadoEn | DateTime | Cuándo se generó |

---

## Relaciones

```
Tenant          1 ──── N    Usuario
Tenant          1 ──── N    Instalacion
Tenant          1 ──── N    Reserva
Tenant          1 ──── N    Bloqueo
Tenant          1 ──── N    Aviso
Tenant          1 ──── N    TokenRecuperacion

Usuario         1 ──── N    Reserva
Instalacion     1 ──── N    Reserva
Instalacion     1 ──── N    Bloqueo
Usuario         1 ──── N    Bloqueo (creadoPor)
Usuario         1 ──── N    TokenRecuperacion
```

---

## Reglas de integridad

- No pueden existir dos reservas ACTIVAS para la misma instalación en el mismo slot
- Un slot bloqueado no puede tener reservas ACTIVAS
- Un usuario CIUDADANO no puede superar el límite de reservas activas de su tenant (default: 2)
- La horaFin siempre es horaInicio + duración del slot del tenant
- Solo usuarios con rol ADMIN pueden crear o modificar Bloqueos y Avisos
- Solo usuarios con rol ADMIN pueden cancelar reservas de otros usuarios
- Todas las queries deben filtrar por `tenantId` — un tenant nunca accede a datos de otro

---

## Slots horarios (configuración actual por defecto)

Horario: 8:00-13:00 y 16:45-20:30 — 7 slots de 75 minutos por día por instalación

```
Mañana:
08:00 - 09:15
09:15 - 10:30
10:30 - 11:45
11:45 - 13:00

[Pausa: 13:00 - 16:45]

Tarde:
16:45 - 18:00
18:00 - 19:15
19:15 - 20:30
```

Todos los horarios se gestionan en la zona horaria **Europe/Madrid** (configurable por tenant).
