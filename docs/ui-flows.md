# Flujos de UI — Sistema de Reservas Deportivas

## Pantallas del ciudadano

### Acceso público (sin login)
```
/ (Página principal)
├── Tablón de instalaciones con tarjetas por tipo
├── Tablón de avisos (lateral)
├── Banner "Inicia sesión para reservar" → /login  (solo visible sin sesión)
└── Título personalizado con el municipio del tenant

/login
├── Formulario: email + contraseña
├── Enlace "¿Olvidaste tu contraseña?" → /recuperar-contrasena
└── Enlace "Crear cuenta" → /registro

/registro
├── Formulario: nombre + email + contraseña + confirmar contraseña
└── Al registrarse → redirige a /dashboard con sesión iniciada

/recuperar-contrasena
├── Formulario: email
└── Envío de enlace de recuperación por email con token de 1 hora

/recuperar-contrasena/[token]
├── Formulario: nueva contraseña + confirmar contraseña
└── Al guardar → redirige a /login
```

> **Nota:** La ruta `/pistas` y todas las rutas del área ciudadano requieren login.
> El middleware de Next.js redirige a `/login` si no hay sesión activa.

### Área del ciudadano (con login)
```
/dashboard
├── Saludo con nombre del usuario
├── Acceso rápido a "Reservar instalación" → /pistas
├── Acceso rápido a "Mis reservas" → /mis-reservas (con contador de activas)
└── Sección "Reservas activas" con lista de reservas próximas

/pistas
├── Tarjetas de todas las instalaciones activas del tenant
└── Click en tarjeta → /pistas/[id]

/pistas/[id]
├── Info de la instalación (nombre, tipo, descripción, horario)
├── Selector de fecha (calendario)
├── Vista de slots del día seleccionado (7 slots de 75 min)
│   ├── Verde → disponible (clickable)
│   ├── Rojo → ocupado
│   ├── Gris → bloqueado por admin
│   └── Azul → mi reserva
└── Click en slot verde → modal de confirmación
    ├── Resumen: instalación + fecha + hora
    ├── Botón "Confirmar reserva"
    └── Botón "Cancelar"
    → Error si ya tiene 1 reserva activa del mismo tipo

/mis-reservas
├── Pestaña "Activas": reservas futuras con botón cancelar
├── Pestaña "Historial": reservas pasadas y canceladas
└── Modal de confirmación al cancelar
```

---

## Pantallas del administrador

El panel de administración usa un layout compartido en `/admin/(panel)/` con
barra lateral de navegación y cabecera con el nombre del admin.

```
/admin (panel) → dashboard
├── Métricas del día: reservas hoy, reservas activas, pistas activas, cancelaciones
└── Accesos rápidos a las secciones del panel

/admin/(panel)/reservas
├── Tabla de todas las reservas con filtros (instalación, fecha, estado, usuario)
├── Botón cancelar por fila
└── Botón "Nueva reserva" → modal para crear reserva a nombre de un ciudadano

/admin/(panel)/pistas
├── Lista de instalaciones con estado (activa/inactiva)
├── Botón "Nueva instalación" → dialog con nombre, tipo, descripción, horario
└── Por cada instalación: editar y activar/desactivar

/admin/(panel)/bloqueos
├── Listado de bloqueos activos
├── Botón "Nuevo bloqueo" → dialog con:
│   ├── Selector de instalación
│   ├── Selector de fechaInicio y fechaFin (con hora)
│   ├── Campo motivo (texto libre)
│   └── Botón "Crear bloqueo"
└── Botón "Eliminar" por fila

/admin/(panel)/usuarios
├── Lista de admins activos e inactivos
├── Botón "Crear nuevo admin"
└── Botón "Desactivar" por fila

/admin/(panel)/avisos
├── Lista de avisos publicados con tipo y fecha
├── Botón "Nuevo aviso" → formulario con título, descripción, tipo (INFO/AVISO/CIERRE), fecha
└── Por cada aviso: editar y eliminar

/admin/(panel)/configuracion
├── Formulario de configuración del tenant:
│   ├── Nombre del servicio
│   ├── Color primario y secundario (con vista previa en tiempo real)
│   └── Título y descripción SEO
└── Botón "Guardar cambios"
```

---

## Pantallas del instructor

El área de instructor usa el layout del ciudadano con acceso restringido por rol (`INSTRUCTOR`).
Las rutas redirigen a `/login` si no hay sesión, y muestran "Acceso denegado" si el rol no es INSTRUCTOR.

```
/instructor → DashboardInstructor
├── Contador "Grupos activos" (grupos con activo=true)
├── Contador "Próximas sesiones" (reservas ACTIVA futuras dentro de todos sus grupos)
├── Botón "Crear nueva clase" → /pistas (crea una reserva recurrente desde el calendario)
├── Botón "Gestionar mis clases" → /instructor/mis-clases
└── Sección "Clases recientes": lista de hasta 3 grupos recurrentes activos
    ├── Por cada grupo: nombre de instalación + horario (horaInicio) + frecuencia
    └── Estado vacío: "No tienes clases programadas aún"

/instructor/mis-clases → MisClases
├── Lista de todos los grupos de recurrencia del instructor (activos e inactivos)
│   └── Por cada grupo: tarjeta expandible
│       ├── Cabecera (click para expandir/colapsar):
│       │   ├── Nombre de la instalación
│       │   ├── Badge de frecuencia: "Semanal" (verde) | "Quincenal" (azul)
│       │   ├── Hora de inicio (ej. 08:00)
│       │   └── Rango de fechas: dd/mm/aaaa – dd/mm/aaaa
│       └── Cuerpo (visible al expandir):
│           ├── Lista de sesiones individuales con fecha y estado (ACTIVA / CANCELADA)
│           └── Botón "Cancelar grupo" → dialog de confirmación
│               ├── Mensaje: "¿Cancelar todas las sesiones activas de este grupo?"
│               ├── Botón "Confirmar" → DELETE /api/instructor/grupos/[id] → recarga lista
│               └── Botón "Volver"
└── Estado vacío: "No hay clases creadas"
```

---

## Pantallas del superadmin

El panel superadmin usa un layout propio en `/superadmin/(panel)/` con sidebar oscuro.

```
/superadmin (panel) → dashboard
├── 5 métricas globales: total tenants, activos, suspendidos, total reservas, total usuarios
└── Acceso rápido a la gestión de tenants

/superadmin/(panel)/tenants
├── Tabla de todos los tenants con: nombre, slug, municipio, estado, fecha de alta
├── Botón "Nuevo tenant" → dialog con:
│   ├── Slug (subdominio)
│   ├── Nombre del ayuntamiento
│   ├── Municipio
│   └── Contraseña del admin inicial
├── Por cada tenant:
│   ├── Botón "Editar" → dialog con nombre, municipio, estado
│   └── Botón "Suspender" / "Activar"
└── Badges de estado: verde (ACTIVO), amarillo (SUSPENDIDO), rojo (ELIMINADO)
```

---

## Navegación general

### Cabecera (ciudadano logueado)
```
[Nombre del servicio] | Pistas | Mis reservas | [Nombre usuario] | Cerrar sesión
```

### Cabecera (instructor logueado)
```
[Nombre del servicio] | Mis clases | [Nombre instructor] | Cerrar sesión
```

### Cabecera (admin logueado)
```
[Nombre del servicio] | Panel Admin | [Nombre admin] | Cerrar sesión
```

### Cabecera (sin sesión)
```
[Nombre del servicio] | Iniciar sesión | Crear cuenta
```

> El nombre del servicio se obtiene de la configuración del tenant y se muestra
> dinámicamente en la cabecera de cada ayuntamiento.
