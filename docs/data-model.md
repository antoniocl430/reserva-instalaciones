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
| rol | Enum (CIUDADANO, ADMIN) | Tipo de usuario |
| activo | Boolean | Si la cuenta está activa (default: true) |
| creadoEn | DateTime | Fecha de registro |
| actualizadoEn | DateTime | Última modificación |

---

### Instalacion
Cada unidad reservable (cada pista de pádel o cada calle de piscina es una instalación).

| Campo | Tipo | Descripción |
|---|---|---|
| id | String (uuid) | Identificador único |
| nombre | String | Ej: "Pádel 1", "Calle 3" |
| tipo | Enum (PADEL, PISCINA) | Tipo de instalación |
| descripcion | String? | Descripción opcional |
| activa | Boolean | Si aparece en el sistema (default: true) |
| creadoEn | DateTime | Fecha de creación |

**Instalaciones iniciales:**
- Pádel 1, Pádel 2, Pádel 3 (tipo: PADEL)
- Calle 1 a Calle 10 (tipo: PISCINA)

---

### Reserva
Una reserva de un ciudadano en una instalación para un slot horario.

| Campo | Tipo | Descripción |
|---|---|---|
| id | String (uuid) | Identificador único |
| usuarioId | String | FK → Usuario |
| instalacionId | String | FK → Instalacion |
| fecha | Date | Día de la reserva |
| horaInicio | DateTime | Inicio del slot (ej: 10:00) |
| horaFin | DateTime | Fin del slot (ej: 11:00) — siempre +1h |
| estado | Enum (ACTIVA, CANCELADA) | Estado de la reserva |
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
- La horaFin siempre es horaInicio + 1 hora
- Solo usuarios con rol ADMIN pueden crear o modificar Bloqueos
- Solo usuarios con rol ADMIN pueden cancelar reservas de otros usuarios

---

## Slots horarios disponibles

Horario: 8:00 a 22:00 — 14 slots por día por instalación

```
08:00 - 09:00
09:00 - 10:00
10:00 - 11:00
11:00 - 12:00
12:00 - 13:00
13:00 - 14:00
14:00 - 15:00
15:00 - 16:00
16:00 - 17:00
17:00 - 18:00
18:00 - 19:00
19:00 - 20:00
20:00 - 21:00
21:00 - 22:00
```