# Flujos de UI — Sistema de Reservas Deportivas

## Pantallas del ciudadano

### Acceso público (sin login)
```
/ (Splash)
├── Título y descripción del servicio
├── Botón "Iniciar sesión" → /login
└── Botón "Crear cuenta" → /registro

/login
├── Formulario: email + contraseña
└── Enlace "Crear cuenta" → /registro

/registro
├── Formulario: nombre + email + contraseña + confirmar contraseña
└── Al registrarse → redirige a /dashboard con sesión iniciada
```

> **Nota:** La ruta `/pistas` y todas las rutas del área ciudadano requieren login.
> El middleware de Next.js redirige a `/login` si no hay sesión activa.

### Área del ciudadano (con login)
```
/dashboard
├── Resumen: mis reservas activas (máx 2)
├── Acceso rápido a "Nueva reserva" → /pistas
└── Aviso si ya tiene 2 reservas activas

/pistas
├── Tarjetas de las 3 pistas de pádel
└── Click en tarjeta → /pistas/[id]

/pistas/[id]
├── Info de la pista (nombre, descripción, horario)
├── Selector de fecha (calendario)
├── Vista de slots del día seleccionado (7 slots de 75 min)
│   ├── Verde → disponible (clickable)
│   ├── Rojo → ocupado
│   ├── Gris → bloqueado por admin
│   └── Azul → mi reserva
└── Click en slot verde → modal de confirmación
    ├── Resumen: pista + fecha + hora
    ├── Botón "Confirmar reserva"
    └── Botón "Cancelar"

/mis-reservas
├── Pestaña "Activas": reservas futuras con botón cancelar
├── Pestaña "Historial": reservas pasadas y canceladas
└── Modal de confirmación al cancelar
```

---

## Pantallas del administrador

El panel de administración usa un layout compartido en `/admin/(panel)/` que incluye
la barra lateral de navegación y la cabecera con el nombre del admin.

```
/admin (panel) → /admin/(panel)/page
├── Dashboard con métricas del día:
│   ├── Reservas hoy
│   ├── Reservas activas
│   ├── Pistas activas
│   └── Cancelaciones
└── Accesos rápidos a las secciones del panel

/admin/(panel)/reservas
├── Tabla de todas las reservas
├── Filtros: instalación, fecha, estado (activa/cancelada), usuario
└── Botón cancelar por fila

/admin/(panel)/pistas
├── Lista de pistas con estado (activa/inactiva)
├── Botón "Nueva pista"
└── Por cada pista:
    ├── Editar (nombre, descripción, horario)
    └── Activar / Desactivar

/admin/(panel)/bloqueos
├── Listado de bloqueos activos
├── Botón "Nuevo bloqueo" → abre Dialog modal con:
│   ├── Selector de instalación
│   ├── Selector de fechaInicio y fechaFin (con hora)
│   ├── Campo motivo (texto libre)
│   └── Botón "Crear bloqueo"
└── Botón "Eliminar" por fila de bloqueo

/admin/(panel)/usuarios
├── Lista de admins activos e inactivos
├── Botón "Crear nuevo admin"
└── Botón "Desactivar" por fila
```

> **Nota:** La ruta `/admin/informes` no está implementada. La exportación CSV
> y los informes de uso están previstos para una fase futura.

---

## Navegación general

### Cabecera (ciudadano logueado)
```
Logo Ayuntamiento | Pistas | Mis reservas | [Nombre usuario] ▾ | Cerrar sesión
```

### Cabecera (admin logueado)
```
Logo Ayuntamiento | Panel Admin | [Nombre admin] ▾ | Cerrar sesión
```

### Cabecera (sin sesión)
```
Logo Ayuntamiento | Iniciar sesión | Crear cuenta
```
