# Modelo de Datos — Sistema de Reservas Deportivas

## Entidades y campos

---

### Usuario
Representa tanto a ciudadanos como a administradores.

| Campo | Tipo | Descripción |
|---|---|---|
| id | String (uuid) | Identificador único |
| email | String | Email único, usado para login |
| nombre | String | Nombre completo |
| passwordHash | String | Contraseña encriptada |
| rol | String ("CIUDADANO" \| "ADMIN") | Tipo de usuario |
| activo | Boolean | Si la cuenta está activa (default: true) |
| creadoEn | DateTime | Fecha de registro |
| actualizadoEn | DateTime | Última modificación |

> **Nota:** Los campos `rol`, `tipo` y `estado` se almacenan como `String` en PostgreSQL, no como tipos Enum nativos. Los valores válidos están controlados por la aplicación y documentados en cada campo.

---

### Instalacion
Cada pista de pádel del complejo deportivo municipal.

| Campo | Tipo | Descripción |
|---|---|---|
| id | String (uuid) | Identificador único |
| nombre | String | Ej: "Pádel 1", "Pádel 2" — valor único (`@unique`) |
| tipo | String ("PADEL") | Tipo de instalación |
| descripcion | String? | Descripción opcional |
| horario | String | Horario de apertura (default: "Lun-Dom: 8:00-13:00 y 16:45-20:30") |
| activa | Boolean | Si aparece en el sistema (default: true) |
| creadoEn | DateTime | Fecha de creación |

**Instalaciones iniciales (seed):**
- Pádel 1, Pádel 2, Pádel 3 (tipo: PADEL)

---

### Reserva
Una reserva de un ciudadano en una instalación para un slot horario de 75 minutos.

| Campo | Tipo | Descripción |
|---|---|---|
| id | String (uuid) | Identificador único |
| usuarioId | String | FK → Usuario |
| instalacionId | String | FK → Instalacion |
| fecha | DateTime | Día de la reserva |
| horaInicio | DateTime | Inicio del slot (ej: 10:30) |
| horaFin | DateTime | Fin del slot (ej: 11:45) — siempre +75 minutos |
| estado | String ("ACTIVA" \| "CANCELADA") | Estado de la reserva |
| creadoEn | DateTime | Cuándo se hizo la reserva |
| canceladoEn | DateTime? | Cuándo se canceló (si aplica) |
| canceladoPor | String? | FK → Usuario (quién canceló: el propio usuario o un admin) |

---

### Bloqueo
Bloqueo de una instalación o franja horaria por parte de un admin.

| Campo | Tipo | Descripción |
|---|---|---|
| id | String (uuid) | Identificador único |
| instalacionId | String | FK → Instalacion |
| fechaInicio | DateTime | Inicio del bloqueo |
| fechaFin | DateTime | Fin del bloqueo |
| motivo | String | Razón del bloqueo (ej: "Mantenimiento") |
| creadoPorId | String | FK → Usuario (admin que creó el bloqueo) |
| creadoEn | DateTime | Cuándo se creó el bloqueo |
| activo | Boolean | Si el bloqueo sigue vigente (default: true) |

---

## Relaciones

```
Usuario         1 ──── N    Reserva
Instalacion     1 ──── N    Reserva
Instalacion     1 ──── N    Bloqueo
Usuario         1 ──── N    Bloqueo (creadoPor)
```

---

## Reglas de integridad

- No pueden existir dos reservas ACTIVAS para la misma instalación en el mismo slot
- Un slot bloqueado no puede tener reservas ACTIVAS
- Un usuario CIUDADANO no puede tener más de 2 reservas con estado ACTIVA
- La horaFin siempre es horaInicio + 75 minutos
- Solo usuarios con rol ADMIN pueden crear o modificar Bloqueos
- Solo usuarios con rol ADMIN pueden cancelar reservas de otros usuarios

---

## Slots horarios disponibles

Horario: 8:00-13:00 y 16:45-20:30 (con pausa al mediodía) — 7 slots de 75 minutos por día por instalación

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

Todos los horarios se gestionan en la zona horaria **Europe/Madrid**.
