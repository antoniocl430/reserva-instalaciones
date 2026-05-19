# Sistema de Reservas Deportivas Municipales
## Descripción funcional completa

---

## 1. Qué es y qué problema resuelve

El Sistema de Reservas Deportivas Municipales es una aplicación web que permite a los ciudadanos reservar instalaciones deportivas del ayuntamiento de forma online, desde cualquier dispositivo, las 24 horas del día.

Antes de este sistema, la gestión de reservas se realizaba por teléfono o en persona, lo que generaba:
- Colas y llamadas innecesarias al ayuntamiento
- Imposibilidad de ver la disponibilidad en tiempo real
- Sin registro histórico del uso de las instalaciones
- Carga de trabajo manual para el personal

Con este sistema, el ciudadano puede consultar la disponibilidad, hacer su reserva en segundos y recibir una confirmación automática por email y notificación en su móvil. El personal del ayuntamiento dispone de un panel de administración completo para gestionar todo sin intervención técnica.

**El servicio es completamente gratuito para los ciudadanos.**

---

## 2. Tipos de usuarios

El sistema tiene cuatro tipos de usuarios con distintos niveles de acceso:

| Tipo | Descripción |
|------|-------------|
| **Ciudadano** | Cualquier vecino que crea una cuenta. Puede reservar y gestionar sus propias reservas. |
| **Administrador** | Personal del ayuntamiento con acceso completo al panel de gestión. |
| **Instructor** | Monitor deportivo creado por el admin. Puede crear clases recurrentes. |
| **Superadmin** | Gestiona los ayuntamientos (tenants) desde un panel centralizado. |

---

## 3. El ciudadano — Funcionalidad completa

### 3.1 Registro y acceso

- **Registro**: el ciudadano crea una cuenta con su nombre, email y contraseña. El registro es instantáneo y gratuito.
- **Inicio de sesión**: accede con email y contraseña. La sesión dura 8 horas.
- **Recuperación de contraseña**: si olvida su contraseña, puede solicitar un enlace de recuperación por email. El enlace es de un solo uso y caduca en 1 hora.
- **Protección ante ataques**: el sistema bloquea automáticamente un email o IP tras 5 intentos fallidos de login en 15 minutos.

### 3.2 Página principal

Al entrar a la aplicación, el ciudadano ve:
- **Tablón de instalaciones**: tarjetas con todas las pistas o instalaciones disponibles del ayuntamiento, con su nombre, tipo y descripción.
- **Tablón de avisos**: avisos publicados por el ayuntamiento (informativos, alertas de cierre, mantenimiento, etc.). Los avisos caducados desaparecen automáticamente.
- Si no ha iniciado sesión, aparece un banner invitándole a registrarse o iniciar sesión.

### 3.3 Consultar disponibilidad sin cuenta

Cualquier visitante puede consultar la disponibilidad de las instalaciones **sin necesidad de registrarse**:

1. Desde la página principal, hace clic en cualquier instalación.
2. Selecciona una fecha y ve todos los slots del día con su estado en tiempo real.
3. Si quiere reservar un slot libre, el sistema le invita a crear una cuenta gratuita o a iniciar sesión, y le lleva directamente de vuelta al slot que le interesaba.

Esta funcionalidad está pensada para que los nuevos ciudadanos vean si hay disponibilidad antes de decidirse a registrarse.

### 3.4 Ver disponibilidad y reservar (usuario registrado)

1. El ciudadano hace clic en una instalación → accede a su página de detalle.
2. Selecciona una fecha en el calendario.
3. El sistema muestra todos los **slots horarios** del día seleccionado con su estado:
   - **Verde** — libre, se puede reservar
   - **Rojo** — ocupado por otro ciudadano (con opción de apuntarse a la lista de espera)
   - **Gris** — bloqueado por el administrador (mantenimiento, festivo, cierre)
   - **Azul** — reserva propia del ciudadano logueado
4. Hace clic en un slot verde → se muestra un modal de confirmación con el resumen (instalación, fecha, hora de inicio y fin).
5. Confirma → la reserva queda registrada al instante.
6. Recibe un **email de confirmación** con todos los detalles.

**Horario disponible** (configurable por el ayuntamiento):
- Por defecto: **8:00–13:00** (franja mañana) y **16:45–20:30** (franja tarde)
- **7 slots de 75 minutos** por día: 08:00, 09:15, 10:30, 11:45, 16:45, 18:00, 19:15

**Límite de reservas activas**: por defecto, cada ciudadano puede tener hasta **2 reservas activas simultáneas**. Este límite es configurable por el ayuntamiento.

**Bloqueo por suspensión**: si el ciudadano tiene la cuenta suspendida (por no presentarse repetidamente), el sistema le informa de la fecha hasta la que está suspendido y no puede hacer nuevas reservas.

### 3.5 Mis reservas

El ciudadano accede a la sección "Mis reservas" donde ve:
- **Pestaña "Activas"**: sus reservas futuras con estado ACTIVA, con botón para cancelar y botón para ver el código QR.
- **Pestaña "Historial"**: todas sus reservas pasadas y canceladas. Cada reserva finalizada muestra un botón **"Valorar"** si aún no ha sido valorada, o las estrellas ya dadas si ya la valoró.
- **Pestaña "Lista de espera"**: sus posiciones actuales en listas de espera (ver sección 3.7).

**Cancelación**: el ciudadano puede cancelar una reserva hasta **2 horas antes** del inicio. Si intenta cancelar después de ese plazo, el sistema se lo impide. Al cancelar, recibe un email de confirmación.

### 3.6 Código QR de verificación

Cada reserva activa tiene asociado un **código QR único** que sirve como entrada al recinto:

1. En la sección "Mis reservas > Activas", el ciudadano hace clic en **"Ver QR"** junto a su reserva.
2. Aparece un dialog con el código QR generado específicamente para esa reserva.
3. El ciudadano muestra el código en la entrada del recinto (desde la pantalla del móvil).
4. El personal del ayuntamiento escanea el código con su móvil y accede a una página de verificación que muestra:
   - **Verde** — "Reserva válida" (con nombre del ciudadano, instalación, fecha y hora)
   - **Rojo** — "Reserva cancelada" (si la reserva fue cancelada)
   - **Gris** — "Token no encontrado" (si el código no es válido)

La página de verificación es pública — el personal no necesita iniciar sesión para verificar una reserva.

### 3.7 Lista de espera

Cuando todos los slots de un horario están ocupados, el ciudadano puede apuntarse a la **lista de espera** en lugar de tener que comprobar manualmente si se libera un hueco.

**Cómo funciona**:

1. El ciudadano accede a la página de una instalación y selecciona una fecha.
2. En los slots marcados en rojo (ocupados), aparece el enlace **"Apuntarme a la lista"**.
3. Al hacer clic, queda inscrito en la cola de espera para ese slot concreto.
4. Si ya estaba en la lista para ese slot, el botón muestra **"En lista (pos. N)"** indicando su posición actual.

**Cuando se libera un hueco** (por cancelación):

1. El sistema avisa automáticamente al **primero de la cola** mediante **push y email** — "Tienes 30 minutos para confirmar tu reserva".
2. En la pestaña "Lista de espera" de "Mis reservas", la entrada pasa a estado **"¡Turno disponible!"** con un badge naranja y el botón **"Confirmar reserva"**.
3. Si el ciudadano confirma dentro de los 30 minutos → se crea la reserva al instante.
4. Si no confirma en 30 minutos → su posición expira y el sistema notifica al siguiente en la cola.

**Pestaña "Lista de espera" en Mis reservas**:
- **ESPERANDO**: muestra la posición en la cola (ej. "Posición 2") y el botón **"Abandonar"** para salir de la lista.
- **NOTIFICADO**: muestra un badge naranja "¡Turno disponible!" y el botón prominente **"Confirmar reserva"**.

**Reglas**:
- Un ciudadano no puede apuntarse dos veces al mismo slot.
- Solo se puede apuntar a slots que estén realmente ocupados (si queda libre, puede reservarlo directamente).
- Los ciudadanos suspendidos no pueden unirse a listas de espera.

### 3.8 Valoraciones de instalaciones

Tras el uso de una instalación, el ciudadano puede dejar su opinión para ayudar a otros vecinos y proporcionar feedback al ayuntamiento.

**Cómo valorar**:
1. En "Mis reservas > Historial", cada reserva ya finalizada muestra el botón **"Valorar"**.
2. Al hacer clic, se abre un dialog con un selector de estrellas (1 a 5) y un campo de comentario opcional.
3. Al enviar, la valoración queda registrada — solo se puede valorar una vez por reserva.
4. Si ya la valoró, se muestran las estrellas que dio en lugar del botón.

**Reglas**:
- Solo se puede valorar una reserva que ya haya finalizado.
- Una valoración por reserva (no se puede modificar ni repetir).
- Solo ciudadanos pueden valorar (no admins ni instructores).

**Visibilidad pública**:
- En la página principal y en el listado de instalaciones, cada tarjeta muestra la **media de estrellas** y el número total de valoraciones recibidas por esa instalación.
- Esta información es visible para cualquier visitante, incluso sin cuenta.

### 3.9 Perfil de usuario

El ciudadano puede acceder a su perfil desde la cabecera, donde puede:

- **Editar su nombre**
- **Cambiar su contraseña** (se le pide la contraseña actual por seguridad)
- **Activar o desactivar notificaciones push** en el dispositivo actual (ver sección 3.9)
- **Gestionar sus preferencias de notificación**: elegir qué tipo de avisos recibir (confirmaciones de reserva, recordatorios, cancelaciones, avisos del ayuntamiento)
- **Consultar sus penalizaciones**: ver cuántos no-shows acumula y, si está suspendido, la fecha de fin y el motivo

### 3.10 Notificaciones

El sistema notifica al ciudadano por dos canales:

**Email** (automático, no requiere configuración):
- Confirmación al hacer una reserva
- Confirmación al cancelar una reserva propia
- Aviso cuando el administrador cancela su reserva (con mensaje personalizado)
- Aviso si la cuenta queda suspendida por penalizaciones
- **Aviso de turno disponible en lista de espera** — "Tienes 30 minutos para confirmar"

**Notificaciones push** (requiere activación desde el perfil):
- Confirmación inmediata al hacer una reserva
- **Recordatorio 1 hora antes** de la reserva
- Aviso de cancelación por el administrador
- **Aviso urgente de turno en lista de espera** (cuando se libera el slot esperado)
- El ciudadano puede activar/desactivar cada tipo de notificación individualmente

---

## 4. El panel de administración — Funcionalidad completa

El panel de administración está disponible en `/admin` y es exclusivo para el personal del ayuntamiento con rol de Administrador. Usa un diseño con barra lateral de navegación.

### 4.1 Dashboard

Pantalla de inicio del panel con las **métricas del día en tiempo real**:
- Número de reservas para hoy
- Reservas activas en total
- Pistas activas
- Cancelaciones del día

Accesos rápidos a todas las secciones del panel.

### 4.2 Gestión de reservas

Vista completa de todas las reservas del ayuntamiento con:

- **Filtros**: por instalación, fecha, estado (activa/cancelada) y ciudadano
- **Tabla** con: ciudadano, instalación, fecha, hora, estado
- **Cancelar reserva**: el admin puede cancelar cualquier reserva sin restricción de tiempo. El ciudadano recibe un email de notificación.
- **Crear reserva manualmente**: el admin puede hacer una reserva a nombre de cualquier ciudadano registrado (útil para reservas telefónicas o presenciales).
- **Marcar como "No presentado"**: para reservas pasadas, el admin puede marcar que el ciudadano no se presentó. Esto acumula penalizaciones en la cuenta del ciudadano (ver sección 4.9).

### 4.3 Gestión de instalaciones

El admin puede gestionar el catálogo de instalaciones:
- **Ver** todas las instalaciones con su estado (activa/inactiva)
- **Crear** nueva instalación: nombre, tipo (PADEL, TENIS, PISCINA, FÚTBOL...), descripción y horario informativo
- **Editar** los datos de una instalación existente
- **Activar o desactivar** una instalación (si está inactiva, no aparece en la web del ciudadano)

### 4.4 Gestión de festivos

El admin puede definir días festivos para que todas las instalaciones queden automáticamente bloqueadas ese día, sin necesidad de crear bloqueos individuales por pista:

- **Ver** todos los festivos del año seleccionado con fecha, nombre y tipo
- **Añadir festivo**: seleccionar fecha, escribir el nombre y marcar opcionalmente "Repetir cada año"
  - Los festivos marcados como **anuales** bloquean ese día del mes cada año sin necesidad de reimportarlos
  - Los festivos puntuales solo aplican al año concreto de su fecha
- **Importar festivos nacionales**: con un clic se importan los 10 festivos nacionales de España (incluido Viernes Santo calculado automáticamente) para el año seleccionado. Los que ya existan no se duplican.
- **Eliminar** un festivo

**Efecto en la vista del ciudadano**: cuando un ciudadano consulta la disponibilidad de una instalación en un día festivo, todos los slots aparecen en gris con el motivo mostrado en un banner superior: "Festivo: [nombre] — Este día no hay disponibilidad".

### 4.5 Gestión de bloqueos

Los bloqueos permiten cerrar una instalación durante un periodo concreto (mantenimiento, festivo, evento especial, avería):
- **Ver** todos los bloqueos activos con instalación, fechas y motivo
- **Crear bloqueo**: seleccionar instalación, fecha y hora de inicio, fecha y hora de fin, y un motivo (texto libre). Las reservas ya existentes en ese periodo no se cancelan automáticamente — el admin debe gestionarlas manualmente si lo considera.
- **Eliminar** un bloqueo existente
- Los slots bloqueados aparecen en gris en el calendario del ciudadano y no pueden reservarse.

### 4.6 Gestión de usuarios administradores

El admin puede gestionar las cuentas de su propio ayuntamiento:
- **Ver** todos los administradores activos e inactivos
- **Crear** nuevo administrador o instructor (con email, nombre y contraseña inicial)
- **Desactivar** la cuenta de un administrador (no se puede eliminar, solo desactivar para conservar el historial)

### 4.7 Tablón de avisos

El admin gestiona los avisos que aparecen en la página principal del ciudadano:
- **Ver** todos los avisos con tipo y fecha
- **Crear aviso**: título, descripción, tipo (Informativo / Aviso / Cierre) y fecha del aviso
- **Fecha de caducidad** (opcional): si se establece, el aviso desaparece automáticamente del tablón público al llegar esa fecha. En el panel admin se muestra con badge "Caducado" pero no se elimina.
- **Editar** y **eliminar** avisos existentes

### 4.8 Comunicados masivos

El admin puede enviar mensajes directamente a todos los ciudadanos del ayuntamiento sin necesidad de ninguna herramienta externa:

- **Canal**: el admin elige si enviar solo por email, solo por notificación push, o por ambos canales a la vez
- **Formulario**: título (máx. 100 caracteres) y cuerpo del mensaje (máx. 1000 caracteres)
- **Confirmación**: el sistema pide confirmación antes de enviar para evitar envíos accidentales
- **Resultado**: tras el envío, muestra el número exacto de destinatarios alcanzados (emails enviados y pushes entregados)
- **Historial**: tabla con todos los comunicados enviados, fecha, título y canal usado
- **Respeta las preferencias**: los ciudadanos que han desactivado las notificaciones de avisos en su perfil no reciben el comunicado

Útil para avisos urgentes de cierre, averías, cambios de horario o eventos especiales.

### 4.9 Sistema de penalizaciones

El admin puede gestionar el comportamiento de los ciudadanos que no se presentan:

**No-show automático**:
- Al marcar una reserva pasada como "No presentado", se incrementa el contador de no-shows del ciudadano.
- Al alcanzar el umbral configurado (por defecto 3 no-shows), la cuenta queda **suspendida automáticamente** durante el periodo configurado (por defecto 14 días).
- El ciudadano recibe un email explicando la suspensión, su duración y el motivo.

**Suspensión manual**:
- El admin puede suspender manualmente la cuenta de cualquier ciudadano desde la tabla de usuarios.
- Debe indicar la fecha de fin de la suspensión y un motivo.
- El ciudadano recibe un email de notificación.
- El admin también puede **levantar la suspensión** en cualquier momento.

**Visibilidad**:
- En la tabla de usuarios, cada ciudadano muestra su contador de no-shows y, si está suspendido, un badge rojo con la fecha de fin.

### 4.10 Configuración del tenant

El admin puede personalizar su espacio del ayuntamiento sin necesidad de intervención técnica:

**Identidad del ayuntamiento**:
- Nombre oficial del ayuntamiento y municipio (aparecen en los metadatos y documentación del sistema)
- **Logo**: el admin sube una imagen (PNG, JPG o SVG, máx. 200 KB) desde su ordenador con un solo clic. El logo aparece de inmediato en la cabecera de la aplicación para todos los ciudadanos. Se puede eliminar en cualquier momento.
- Si no hay logo configurado, se muestra un icono deportivo por defecto.

**Identidad visual**:
- Nombre del servicio (texto que aparece junto al logo en la cabecera y en los emails)
- Color primario y secundario (con vista previa en tiempo real)
- Título SEO y descripción para buscadores

**Horarios y slots**:
- Duración de cada slot: 60, 75 o 90 minutos
- Franjas horarias: hasta 2 franjas (mañana y tarde) con hora de inicio y fin configurables
- Vista previa en tiempo real de los slots que se generarán con la configuración elegida

**Reservas**:
- Límite de reservas activas por ciudadano (de 1 a 10, por defecto 2)

**Penalizaciones**:
- Número de no-shows para activar suspensión automática (de 1 a 10, por defecto 3)
- Duración de la suspensión en días (de 1 a 365, por defecto 14)

### 4.11 Valoraciones de instalaciones

El admin tiene acceso a todas las valoraciones recibidas por las instalaciones de su ayuntamiento desde la sección "Valoraciones" del panel:

- **Tabla completa**: muestra todas las valoraciones con ciudadano, instalación, puntuación (estrellas), comentario y fecha.
- **Media por instalación**: en la cabecera de la tabla se calcula y muestra la puntuación media global.
- Las valoraciones son de solo lectura — el admin no puede modificarlas ni eliminarlas, solo consultarlas.

Esta sección sirve para detectar patrones de satisfacción, identificar instalaciones con baja valoración o revisar comentarios específicos de los ciudadanos.

---

## 5. El instructor — Funcionalidad completa

El rol de Instructor es creado por el administrador del ayuntamiento. Está pensado para monitores deportivos que imparten clases regulares y necesitan reservar el mismo slot de forma repetida.

### 5.1 Dashboard del instructor

Al acceder a `/instructor`, el monitor ve:
- Número de grupos de clases activos
- Número de sesiones próximas programadas
- Lista de sus 3 grupos más recientes
- Acceso rápido a "Crear nueva clase" y "Gestionar mis clases"

### 5.2 Crear una clase recurrente

El instructor reserva una instalación de forma recurrente desde el calendario de `/pistas`. Al seleccionar un slot, puede elegir:
- **Frecuencia**: SEMANAL (cada 7 días) o QUINCENAL (cada 14 días)
- **Fecha de inicio y fecha de fin**: el sistema genera automáticamente todas las sesiones dentro del rango (hasta 52 instancias)
- El sistema valida que no haya solapamientos con otras reservas antes de crear el grupo. Si hay algún conflicto, cancela toda la operación (transacción atómica).
- El instructor recibe un email de confirmación con el resumen del grupo creado.

### 5.3 Gestión de clases — "Mis clases"

En `/instructor/mis-clases`, el instructor ve todos sus grupos de clases:
- **Tarjeta por grupo**: instalación, frecuencia (badge Semanal/Quincenal), hora de inicio, rango de fechas
- **Expandir tarjeta**: muestra la lista de todas las sesiones individuales con fecha y estado (ACTIVA / CANCELADA)
- **Cancelar grupo**: cancela todas las sesiones futuras activas del grupo con un solo clic, previa confirmación. El instructor recibe un email de notificación.

---

## 6. El panel del superadmin

El superadmin gestiona los ayuntamientos (tenants) desde `/superadmin`. Tiene acceso a datos agregados pero **no** puede ver las reservas individuales de ningún ayuntamiento.

### 6.1 Dashboard global

- Total de tenants registrados
- Tenants activos, suspendidos y eliminados
- Total de reservas en toda la plataforma
- Total de usuarios registrados

### 6.2 Gestión de tenants

- **Ver** todos los ayuntamientos con su nombre, subdominio, municipio, estado y fecha de alta
- **Crear nuevo tenant**: indica el slug (subdominio), nombre del ayuntamiento, municipio y contraseña del admin inicial. El sistema crea automáticamente el tenant con 3 pistas de pádel y una cuenta de administrador lista para usar.
- **Editar** nombre, municipio y estado de un tenant
- **Suspender / reactivar**: los ciudadanos de un tenant suspendido no pueden acceder a la plataforma

---

## 7. Seguridad

El sistema incorpora múltiples capas de seguridad:

- **Autenticación**: sesiones JWT de 8 horas con revalidación del estado del usuario en cada refresh
- **Aislamiento de datos**: todos los datos están separados por ayuntamiento (`tenantId` en todas las consultas). Un usuario de un ayuntamiento nunca puede ver datos de otro.
- **Protección de rutas**: el middleware de Next.js valida el rol del usuario antes de cada petición. Un ciudadano no puede acceder al panel de administración aunque conozca la URL.
- **Validación de entrada**: todos los datos que llegan al servidor son validados con Zod antes de procesarse.
- **Protección frente a fuerza bruta**: 5 intentos fallidos de login bloquean el acceso durante 15 minutos.
- **Protección de enumeración**: los mensajes de error de login son siempre genéricos para no revelar si un email existe.
- **Protección de timing attacks**: el servidor siempre tarda el mismo tiempo en responder a un intento de login, independientemente de si el email existe o no.
- **Transacciones de base de datos**: las operaciones críticas (crear reserva, cancelar, crear grupo recurrente) usan transacciones para garantizar la consistencia de los datos.

---

## 8. Tecnología y accesibilidad

### Funciona en todos los dispositivos
La aplicación está diseñada con filosofía **mobile-first**: funciona correctamente en móviles, tablets y ordenadores. No requiere instalar nada — funciona desde el navegador.

### Instalable como app (PWA)
El ciudadano puede instalar la aplicación en la pantalla de inicio de su móvil como si fuera una app nativa, sin pasar por tiendas de aplicaciones. Una vez instalada, funciona con acceso rápido y experiencia de pantalla completa.

### Notificaciones en tiempo real
Gracias a las notificaciones push web, el ciudadano puede recibir avisos directamente en su móvil aunque la aplicación no esté abierta, tanto en Android como en iOS (versiones modernas).

### Multi-tenant
La plataforma está diseñada para ser compartida por múltiples ayuntamientos. Cada ayuntamiento tiene su propio subdominio, sus propios datos completamente aislados y su propia configuración visual. Un solo sistema sirve a todos los municipios.

### Emails automáticos
Todos los emails transaccionales (confirmaciones, recordatorios, notificaciones de cancelación) se envían automáticamente sin intervención manual. El sistema usa el servicio Resend para garantizar la entrega.

---

## 9. Funcionalidades en desarrollo

Las siguientes funcionalidades están planificadas para próximas versiones:

| Funcionalidad | Descripción |
|---------------|-------------|
| Integración con sede electrónica | Conexión con el portal ciudadano del ayuntamiento para acceso con certificado digital o Cl@ve. |
| Base de datos dedicada por tenant | Para ayuntamientos con alto volumen, aislar completamente los datos en una instancia PostgreSQL exclusiva. |
| Facturación por uso (SaaS) | Panel de facturación para el superadmin con precios por tenant según número de reservas o usuarios activos. |

---

## 10. Resumen de funcionalidades por tipo de usuario

### Ciudadano
| Funcionalidad | Disponible |
|---------------|-----------|
| Registro y login | ✓ |
| Recuperación de contraseña | ✓ |
| Consultar disponibilidad sin cuenta | ✓ |
| Reservar instalación | ✓ |
| Código QR de verificación en cada reserva | ✓ |
| Cancelar reserva propia | ✓ |
| Ver mis reservas e historial | ✓ |
| Lista de espera para slots ocupados | ✓ |
| Valorar instalaciones tras el uso | ✓ |
| Editar perfil y contraseña | ✓ |
| Notificaciones por email | ✓ |
| Notificaciones push en el móvil | ✓ |
| Preferencias de notificación | ✓ |
| Ver mis penalizaciones | ✓ |

### Administrador
| Funcionalidad | Disponible |
|---------------|-----------|
| Dashboard con métricas del día | ✓ |
| Ver, filtrar y cancelar reservas | ✓ |
| Crear reservas manualmente | ✓ |
| Marcar no-shows y gestionar penalizaciones | ✓ |
| Suspender y reactivar ciudadanos | ✓ |
| Gestionar instalaciones | ✓ |
| Gestionar festivos y festivos nacionales | ✓ |
| Gestionar bloqueos | ✓ |
| Gestionar cuentas de admin e instructor | ✓ |
| Gestionar tablón de avisos con caducidad | ✓ |
| Enviar comunicados masivos por email y/o push | ✓ |
| Ver y analizar valoraciones de ciudadanos | ✓ |
| Configurar nombre, municipio y logo del ayuntamiento | ✓ |
| Configurar horarios y slots | ✓ |
| Configurar identidad visual (colores, SEO) | ✓ |
| Configurar límites y penalizaciones | ✓ |

### Instructor
| Funcionalidad | Disponible |
|---------------|-----------|
| Dashboard de clases | ✓ |
| Crear clases recurrentes (semanal/quincenal) | ✓ |
| Ver todas mis clases y sesiones | ✓ |
| Cancelar grupo de clases | ✓ |
