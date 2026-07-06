# Próximos Pasos — Sistema de Reservas Deportivas

Estado del proyecto a 2026-05-13: Pasos A-D completados. 232 tests Vitest en verde.
Pasos 5 y 7 descartados (CSV y estadísticas no necesarios).

---

## Paso A — Perfil del ciudadano

**Prioridad:** Alta
**Esfuerzo estimado:** Medio (1 sesión)

### Qué hacer
1. Nueva página `/perfil` accesible desde la cabecera del ciudadano
2. Editar nombre y cambiar contraseña (con validación de contraseña actual)
3. Sección "Mis penalizaciones": contador de no-shows propios y, si está suspendido, fecha de fin y motivo
4. Endpoint `PATCH /api/perfil` para actualizar nombre y contraseña
5. Tests de la página y del endpoint

### Criterio de éxito
El ciudadano puede actualizar sus datos y consultar su historial de penalizaciones sin contactar al admin.

---

## Paso B — Notificaciones push

**Prioridad:** Media-Alta
**Esfuerzo estimado:** Alto (2 sesiones)

### Situación actual
El schema ya tiene `SuscripcionPush` y `PreferenciaNotificacion` con los campos necesarios,
pero el envío de notificaciones push no está implementado o está incompleto.

### Qué hacer
1. Revisar qué está implementado (service worker, suscripción, envío)
2. Completar el flujo de suscripción desde la UI del ciudadano (`/perfil` o `/dashboard`)
3. Implementar envío push en los eventos clave: confirmación de reserva, recordatorio 24h antes, cancelación
4. Respetar las `PreferenciaNotificacion` del usuario
5. Tests del endpoint de envío y del componente de suscripción

### Criterio de éxito
Un ciudadano suscrito recibe una notificación push cuando hace una reserva y otra 24h antes de su cita.

---

## Paso C — Límite de reservas configurable por tenant

**Prioridad:** Media
**Esfuerzo estimado:** Bajo (< 1 sesión)

### Situación actual
El límite de 2 reservas activas simultáneas por ciudadano está hardcodeado en `src/app/api/reservas/route.ts`.

### Qué hacer
1. Añadir `limiteReservasActivas: number` (default: 2) al objeto `configuracion` del tenant
2. Actualizar `POST /api/reservas` para leer el límite desde la config del tenant
3. Añadir campo editable en `/admin/(panel)/configuracion`
4. Tests del nuevo límite configurable

### Criterio de éxito
Un admin puede cambiar el límite a 3 reservas y los ciudadanos de ese tenant pueden tener hasta 3 activas.

---

## Paso D — Caducidad de anuncios del tablón

**Prioridad:** Media
**Esfuerzo estimado:** Bajo (< 1 sesión)

### Situación actual
Los avisos del tablón tienen un campo `activo` booleano pero ningún mecanismo de expiración automática. Los admins deben desactivarlos manualmente o quedan visibles indefinidamente.

### Qué hacer
1. Añadir campo `caducaEn DateTime?` al modelo `Aviso` (opcional, null = no caduca)
2. Migración de BD
3. En el endpoint `GET /api/avisos` (o donde se lean los avisos públicos): filtrar los que tengan `caducaEn < now()`
4. En el formulario de creación/edición de avisos del admin: campo "Fecha de caducidad" (opcional)
5. En la lista de avisos del admin: mostrar badge "Caducado" para los expirados en lugar de ocultarlos
6. Tests del filtrado y del formulario

### Criterio de éxito
Un admin crea un aviso con fecha de caducidad y desaparece del tablón público al llegar esa fecha, sin intervención manual.

---

## Paso F — Lista de espera en slots ocupados

**Prioridad:** Alta
**Esfuerzo estimado:** Medio (1-2 sesiones)

### Motivación
Cuando un ciudadano cancela una reserva, el slot queda libre pero nadie se entera. Los ciudadanos que intentaron reservar ese slot y no pudieron se pierden. La lista de espera resuelve esto automáticamente.

### Qué hacer
1. Nuevo modelo `EsperaSlot` en Prisma: `id`, `tenantId`, `instalacionId`, `fecha`, `horaInicio`, `usuarioId`, `posicion`, `creadoEn`, `notificadoEn?`, `expiraEn?`
2. Endpoint `POST /api/espera` — el ciudadano se apunta a la espera de un slot concreto (instalacionId + fecha + horaInicio). Validar que el slot esté efectivamente ocupado y que el usuario no tenga ya una entrada en esa lista
3. Endpoint `DELETE /api/espera/[id]` — el ciudadano abandona la lista
4. Lógica de activación: cuando se cancela una reserva (`PATCH /api/reservas/[id]/cancelar`), buscar si hay usuarios en espera para ese slot. Al primero notificarle por push + email con un enlace directo. Darle 30 minutos para confirmar (`expiraEn = now() + 30 min`). Si no confirma, pasar al siguiente.
5. Endpoint `POST /api/espera/[id]/confirmar` — el ciudadano confirma que quiere el slot (crea la reserva y elimina la entrada de espera)
6. Cron o check periódico: expirar entradas vencidas y notificar al siguiente de la lista
7. UI en `/pistas/[id]`: cuando un slot está ocupado, mostrar botón "Apuntarme a la lista de espera" y contador de personas en espera
8. UI en `/mis-reservas` o `/perfil`: sección "Listas de espera activas" con posición y botón para abandonar
9. Tests de toda la lógica (cola, notificación, confirmación, expiración)

### Criterio de éxito
Un ciudadano se apunta a un slot ocupado, otro cancela, el primero recibe notificación, confirma y obtiene la reserva automáticamente.

---

## Paso G — Calendario público sin login

**Prioridad:** Alta
**Esfuerzo estimado:** Bajo (< 1 sesión)

### Motivación
Actualmente para ver la disponibilidad hay que tener cuenta y estar logueado. Esto frena el registro de nuevos ciudadanos que quieren ver primero si hay huecos antes de molestarse en crear una cuenta.

### Qué hacer
1. Nueva ruta pública `/disponibilidad` (sin middleware de autenticación)
2. Selector de instalación + selector de fecha (igual que `/pistas/[id]` pero accesible sin login)
3. Mostrar los slots con su estado (libre/ocupado/bloqueado) en modo solo lectura — sin posibilidad de reservar
4. En slots libres: botón "Reservar" → redirige a `/login?redirect=/pistas/[id]` si no hay sesión
5. Enlace "Ver disponibilidad" en la página principal `/` y en la cabecera (sin sesión)
6. El endpoint `GET /api/disponibilidad` ya existe — solo quitar la protección de autenticación para peticiones sin sesión (devolver disponibilidad pero no permitir reservar)
7. Tests del componente y de que no filtra datos sensibles (sin nombres de usuarios)

### Criterio de éxito
Un visitante sin cuenta puede consultar la disponibilidad de cualquier instalación y fecha, y al intentar reservar se le redirige al login.

---

## Paso H — QR de verificación en la entrada

**Prioridad:** Alta
**Esfuerzo estimado:** Bajo (< 1 sesión)

### Motivación
El monitor o conserje necesita verificar que la persona que llega tiene reserva, sin depender de que el ciudadano recuerde su nombre o muestre un email. Un QR único por reserva resuelve esto con solo un móvil.

### Qué hacer
1. Al crear una reserva, generar un `codigoQr` único (UUID o token corto) y guardarlo en el modelo `Reserva` — nuevo campo `codigoQr String? @unique`
2. Migración de BD
3. Endpoint público `GET /api/verificar/[codigo]` — devuelve datos básicos de la reserva (instalación, fecha, hora, nombre del titular) si el código es válido y la reserva está ACTIVA. Sin autenticación requerida (el monitor lo usa desde su móvil).
4. Mostrar el QR en: email de confirmación de reserva, página `/mis-reservas` (en cada reserva activa futura), página `/perfil`
5. Usar la librería `qrcode` (ligera) para generar el QR como imagen SVG/PNG en cliente
6. Página `/verificar/[codigo]` — vista optimizada para móvil que muestra: nombre del titular, instalación, fecha y hora. Badge verde "VÁLIDA" o rojo "CANCELADA/CADUCADA"
7. Tests del endpoint de verificación y del componente QR

### Criterio de éxito
El ciudadano muestra el QR de su reserva, el monitor escanea con su móvil y ve en 2 segundos si la reserva es válida.

---

## Paso I — Comunicados masivos a ciudadanos

**Prioridad:** Alta
**Esfuerzo estimado:** Bajo-Medio (1 sesión)

### Motivación
El tablón de avisos es pasivo (el ciudadano tiene que ir a verlo). Para comunicaciones urgentes (cierre imprevisto, cambio de horario, avería) el ayuntamiento necesita llegar activamente a todos los usuarios.

### Qué hacer
1. Nueva página `/admin/(panel)/comunicados`
2. Formulario: asunto (texto), mensaje (texto largo), canal (Push / Email / Ambos)
3. Filtros opcionales de destinatarios: todos los ciudadanos del tenant, o solo los que tienen reservas en una fecha concreta, o solo los suscritos a push
4. Endpoint `POST /api/admin/comunicados` que:
   - Obtiene todos los usuarios activos del tenant con el filtro seleccionado
   - Envía push a los que tienen `SuscripcionPush` activa (si canal incluye Push)
   - Envía email a todos (si canal incluye Email) — en lotes para no saturar Resend
   - Registra el comunicado enviado en una nueva tabla `Comunicado` (id, tenantId, asunto, mensaje, canal, totalDestinatarios, enviadoEn, enviadoPorId)
5. Historial de comunicados enviados en la misma página
6. Tests del endpoint (permisos, conteo de destinatarios, llamadas a push/email)

### Criterio de éxito
El admin redacta un comunicado, selecciona "Ambos canales" y en menos de 1 minuto todos los ciudadanos activos reciben el mensaje por push y email.

---

## Paso E — Merge develop → main y tag v1.0.0

**Prioridad:** Alta (hacer antes de features grandes)
**Esfuerzo estimado:** Muy bajo (< 15 min)

### Qué hacer
1. Asegurarse de que `npx vitest run` y `npm test` pasan en `develop`
2. `git checkout main && git merge develop`
3. `git tag v1.0.0 -m "Primera versión estable"`
4. Push con el tag

### Criterio de éxito
`main` tiene el historial completo y `git tag` muestra `v1.0.0`.

---

## Orden sugerido de ejecución

```
Paso A → Perfil ciudadano          ✓ completado
Paso B → Notificaciones push       ✓ completado
Paso C → Límite configurable       ✓ completado
Paso D → Caducidad de anuncios     ✓ completado
Paso E → Merge + tag v1.0.0        (hacer antes de la siguiente fase)
Paso F → Lista de espera           (máximo impacto en experiencia ciudadano)
Paso G → Calendario público        (captación, bajo esfuerzo)
Paso H → QR de verificación        (operativa del personal, bajo esfuerzo)
Paso I → Comunicados masivos       (comunicación urgente del ayuntamiento)
```
