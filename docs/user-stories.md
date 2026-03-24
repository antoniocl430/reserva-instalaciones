# User Stories — Sistema de Reservas Deportivas

## Ciudadano

### Registro y acceso
- **US-01** Como ciudadano, quiero registrarme con mi email y contraseña para poder hacer reservas.
- **US-02** Como ciudadano, quiero iniciar sesión para acceder a mi cuenta.
- **US-03** Como ciudadano, quiero cerrar sesión para proteger mi cuenta.
- **US-04** Como ciudadano, quiero recuperar mi contraseña si la olvido.

### Reservas
- **US-05** Como ciudadano, quiero ver qué instalaciones existen para saber qué puedo reservar.
- **US-06** Como ciudadano, quiero ver la disponibilidad semanal de una instalación para elegir fecha y hora.
- **US-07** Como ciudadano, quiero reservar un slot disponible en una instalación para asegurar mi turno.
- **US-08** Como ciudadano, quiero recibir un email de confirmación al reservar para tener constancia.
- **US-09** Como ciudadano, quiero ver mis reservas activas para saber cuándo tengo turno.
- **US-10** Como ciudadano, quiero ver el historial de mis reservas pasadas.
- **US-11** Como ciudadano, quiero cancelar una reserva activa (si faltan más de 2h) para liberar el slot.
- **US-12** Como ciudadano, quiero recibir un email al cancelar para confirmar la cancelación.
- **US-13** Como ciudadano, quiero ver un mensaje claro si ya tengo 2 reservas activas y no puedo reservar más.

---

## Administrador

### Gestión de reservas
- **US-14** Como admin, quiero ver todas las reservas del día filtradas por instalación para gestionar el aforo.
- **US-15** Como admin, quiero buscar reservas por usuario, instalación o fecha para encontrar lo que necesito.
- **US-16** Como admin, quiero cancelar cualquier reserva sin restricciones de tiempo.
- **US-17** Como admin, quiero crear una reserva manualmente para cualquier usuario registrado.

### Bloqueos de instalaciones
- **US-18** Como admin, quiero bloquear una instalación completa durante un período (mantenimiento, cierre, festivo) para que no aparezca como disponible.
- **US-19** Como admin, quiero bloquear una franja horaria concreta de una instalación (ej: Pádel 1 de 10:00 a 13:00 el lunes) sin bloquear el día entero.
- **US-20** Como admin, quiero añadir una razón al bloqueo (ej: "Mantenimiento del suelo") para tener registro.
- **US-21** Como admin, quiero ver todos los bloqueos activos para saber qué está cerrado.
- **US-22** Como admin, quiero desbloquear una instalación o franja para volver a dejarla disponible.

### Gestión de admins
- **US-23** Como admin, quiero crear nuevas cuentas de administrador para dar acceso al personal del ayuntamiento.
- **US-24** Como admin, quiero desactivar una cuenta de administrador sin eliminarla para mantener el historial.

### Informes
- **US-25** Como admin, quiero ver cuántas reservas ha tenido cada instalación este mes para conocer el uso.
- **US-26** Como admin, quiero exportar el listado de reservas en CSV para trabajar con él en Excel.