# Flujos de UI — Sistema de Reservas Deportivas

## Pantallas del ciudadano

### Acceso público (sin login)
```
/ (Inicio)
├── Lista de instalaciones con foto y descripción
├── Botón "Ver disponibilidad" por instalación
├── Botón "Iniciar sesión" y "Registrarse" en la cabecera
└── Vista de disponibilidad es pública (se puede ver sin cuenta)
    └── Para reservar → redirige al login

/login
├── Formulario: email + contraseña
├── Enlace "¿Olvidaste tu contraseña?"
└── Enlace "Crear cuenta"

/registro
├── Formulario: nombre + email + contraseña + confirmar contraseña
└── Al registrarse → redirige a /inicio con sesión iniciada
```

### Área del ciudadano (con login)
```
/inicio
├── Resumen: mis reservas activas (máx 2)
├── Acceso rápido a "Nueva reserva"
└── Aviso si ya tiene 2 reservas activas

/instalaciones
├── Tarjetas de instalaciones (Pádel y Piscina)
└── Filtro por tipo (Pádel / Piscina)

/instalaciones/[id]
├── Info de la instalación
├── Selector de fecha (calendario)
├── Vista semanal de slots (8:00 a 22:00)
│   ├── Verde → disponible (clickable)
│   ├── Rojo → ocupado
│   ├── Gris → bloqueado por admin
│   └── Azul → mi reserva
└── Click en slot verde → modal de confirmación
    ├── Resumen: instalación + fecha + hora
    ├── Botón "Confirmar reserva"
    └── Botón "Cancelar"

/mis-reservas
├── Pestaña "Activas": reservas futuras con botón cancelar
├── Pestaña "Historial": reservas pasadas y canceladas
└── Modal de confirmación al cancelar
```

---

## Pantallas del administrador

```
/admin (dashboard)
├── Resumen del día: total reservas, instalaciones bloqueadas
├── Lista de reservas de hoy por instalación
└── Accesos rápidos: Nueva reserva, Nuevo bloqueo

/admin/reservas
├── Tabla de todas las reservas
├── Filtros: instalación, fecha, estado (activa/cancelada), usuario
├── Botón cancelar por fila
├── Botón "Nueva reserva manual"
└── Botón "Exportar CSV"

/admin/instalaciones
├── Lista de instalaciones con estado (activa/bloqueada)
├── Por cada instalación:
│   ├── Ver bloqueos activos
│   ├── Crear nuevo bloqueo
│   └── Eliminar bloqueo activo

/admin/bloqueos/nuevo
├── Selector de instalación
├── Selector de fechaInicio y fechaFin (con hora)
├── Campo motivo (texto libre)
└── Botón "Crear bloqueo"

/admin/usuarios
├── Lista de admins activos e inactivos
├── Botón "Crear nuevo admin"
└── Botón "Desactivar" por fila

/admin/informes
├── Gráfico de reservas por instalación (mes actual)
├── Tabla de uso por instalación
└── Botón "Exportar CSV"
```

---

## Navegación general

### Cabecera (ciudadano logueado)
```
Logo Ayuntamiento | Instalaciones | Mis reservas | [Nombre usuario] ▾ | Cerrar sesión
```

### Cabecera (admin logueado)
```
Logo Ayuntamiento | Panel Admin | [Nombre admin] ▾ | Cerrar sesión
```

### Cabecera (sin sesión)
```
Logo Ayuntamiento | Instalaciones | Iniciar sesión | Registrarse
```