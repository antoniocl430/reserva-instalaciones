# User Stories — Sistema de Reservas Deportivas

## Ciudadano

### Registro y acceso
- **US-01** Como ciudadano, quiero registrarme con mi email y contraseña para poder hacer reservas.
- **US-02** Como ciudadano, quiero iniciar sesión para acceder a mi cuenta.
- **US-03** Como ciudadano, quiero cerrar sesión para proteger mi cuenta.
- **US-04** Como ciudadano, quiero recuperar mi contraseña si la olvido, recibiendo un enlace por email.

### Reservas
- **US-05** Como ciudadano, quiero ver qué instalaciones existen para saber qué puedo reservar.
- **US-06** Como ciudadano, quiero ver la disponibilidad de una instalación por fecha para elegir hora.
- **US-07** Como ciudadano, quiero reservar un slot disponible para asegurar mi turno.
- **US-08** Como ciudadano, quiero recibir un email de confirmación al reservar para tener constancia.
- **US-09** Como ciudadano, quiero ver mis reservas activas para saber cuándo tengo turno.
- **US-10** Como ciudadano, quiero ver el historial de mis reservas pasadas.
- **US-11** Como ciudadano, quiero cancelar una reserva activa (si faltan más de 2h) para liberar el slot.
- **US-12** Como ciudadano, quiero recibir un email al cancelar para confirmar la cancelación.
- **US-13** Como ciudadano, quiero ver un mensaje claro si ya tengo una reserva activa de ese tipo y no puedo reservar otra del mismo tipo.

### Página principal
- **US-31** Como ciudadano sin sesión, quiero ver un banner que me invite a iniciar sesión para reservar.
- **US-32** Como ciudadano con sesión activa, quiero que el banner de "Inicia sesión" no aparezca.

---

## Administrador

### Gestión de reservas
- **US-14** Como admin, quiero ver todas las reservas del día filtradas por instalación para gestionar el aforo.
- **US-15** Como admin, quiero buscar reservas por usuario, instalación o fecha para encontrar lo que necesito.
- **US-16** Como admin, quiero cancelar cualquier reserva sin restricciones de tiempo.
- **US-17** Como admin, quiero crear una reserva manualmente a nombre de cualquier usuario registrado.

### Bloqueos de instalaciones
- **US-18** Como admin, quiero bloquear una instalación completa durante un período (mantenimiento, cierre, festivo) para que no aparezca como disponible.
- **US-19** Como admin, quiero bloquear una franja horaria concreta de una instalación sin bloquear el día entero.
- **US-20** Como admin, quiero añadir una razón al bloqueo para tener registro.
- **US-21** Como admin, quiero ver todos los bloqueos activos para saber qué está cerrado.
- **US-22** Como admin, quiero desbloquear una instalación o franja para volver a dejarla disponible.

### Gestión de pistas
- **US-27** Como admin, quiero crear nuevas instalaciones para ampliar la oferta del complejo.
- **US-28** Como admin, quiero editar los datos de una instalación (nombre, descripción, horario) para mantenerlos actualizados.
- **US-29** Como admin, quiero desactivar una instalación sin eliminarla para que no aparezca disponible temporalmente.

### Dashboard y métricas
- **US-30** Como admin, quiero ver en el dashboard las métricas del día (reservas hoy, reservas activas, pistas activas, cancelaciones).

### Gestión de admins
- **US-23** Como admin, quiero crear nuevas cuentas de administrador para dar acceso al personal del ayuntamiento.
- **US-24** Como admin, quiero desactivar una cuenta de administrador sin eliminarla para mantener el historial.

### Tablón de avisos
- **US-33** Como admin, quiero crear avisos (INFO, AVISO, CIERRE) para el tablón de la página principal.
- **US-34** Como admin, quiero editar o eliminar avisos publicados.

### Configuración del tenant
- **US-35** Como admin, quiero configurar el nombre del servicio, colores corporativos y datos SEO para personalizar la apariencia del municipio.

### Informes
- **US-25** _(Fase futura)_ Como admin, quiero ver cuántas reservas ha tenido cada instalación este mes para conocer el uso.
- **US-26** _(Fase futura)_ Como admin, quiero exportar el listado de reservas en CSV para trabajar con él en Excel.

---

## Superadmin

- **US-36** Como superadmin, quiero ver métricas agregadas de todos los tenants (total reservas, tenants activos, usuarios registrados).
- **US-37** Como superadmin, quiero ver el listado de todos los tenants con su estado (activo/suspendido).
- **US-38** Como superadmin, quiero crear un nuevo tenant con slug, nombre y municipio, generando automáticamente las instalaciones y el admin inicial.
- **US-39** Como superadmin, quiero editar el nombre, municipio y estado de un tenant existente.
- **US-40** Como superadmin, quiero suspender o reactivar un tenant para cortar o restaurar su acceso.
