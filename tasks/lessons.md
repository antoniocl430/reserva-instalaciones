# Lecciones Aprendidas — Reserva de Pistas

## Cómo usar este archivo
El agente actualiza este archivo después de CUALQUIER corrección del usuario.
Cada lección sigue el formato:

```
### LESSON-XXX: Título corto
**Contexto:** Qué estaba haciendo cuando ocurrió el error
**Error:** Qué salió mal
**Corrección:** Cómo se arregló
**Regla:** La regla que previene este error en el futuro
```

Revisar este archivo al inicio de cada sesión.

---

## Lecciones (se irán añadiendo durante el desarrollo)

### LESSON-001: Las validaciones previas a la transacción crean race conditions
**Contexto:** En `reservas/route.ts`, el conteo de reservas activas del ciudadano se hacía fuera de la transacción de creación.
**Error:** Dos peticiones simultáneas podían pasar ambas el conteo (0 activas) y luego crear una tercera reserva cada una.
**Corrección:** Mover el `prisma.reserva.count` DENTRO de la `prisma.$transaction()`, justo antes del `create`.
**Regla:** Cualquier validación cuyo resultado afecte a una escritura debe ejecutarse dentro de la misma transacción que la escritura.

### LESSON-002: Los endpoints de cancelación necesitan una transacción única
**Contexto:** En `cancelar/route.ts`, el `findUnique` y las validaciones estaban fuera de la transacción; solo el `update` estaba dentro.
**Error:** Entre la validación y el update podía colarse otra petición que cancelara la misma reserva, dejando estados inconsistentes.
**Corrección:** Envolver `findUnique` + todas las validaciones + `update` en una sola `prisma.$transaction()`. Los errores de negocio se lanzan con `throw new Error("CODIGO")` y se capturan fuera.
**Regla:** Para operaciones de cancelación o actualización condicional: leer, validar y escribir siempre en la misma transacción.

### LESSON-003: Validar el formato de parámetros de entrada antes de usarlos en consultas
**Contexto:** El parámetro `fecha` en `disponibilidad/route.ts` y `reservas/route.ts` se usaba directamente en `new Date()` sin validar su formato.
**Error:** Un valor malformado como `"../../etc"` o `"2026-13-99"` puede producir resultados inesperados o errores no controlados.
**Corrección:** Añadir validación con regex `/^\d{4}-\d{2}-\d{2}$/` antes de cualquier uso del parámetro. Devolver 400 si no cumple.
**Regla:** Todo parámetro de URL o cuerpo de request debe validarse en formato antes de usarse en lógica de negocio o consultas.

### LESSON-004: Revisar el middleware cuando una ruta de API se declara pública
**Contexto:** UI-FLOWS.md declara que la disponibilidad es pública, pero el middleware bloqueaba `/api/disponibilidad` requiriendo autenticación.
**Error:** El middleware solo controlaba rutas de página (`/dashboard`, etc.), pero las API routes también pueden verse afectadas si se añaden al matcher.
**Corrección:** Añadir una lista `RUTAS_API_PUBLICAS` en el middleware y hacer early-return para esas rutas antes de verificar el token.
**Regla:** Cada vez que se crea o modifica una API route pública, verificar si el middleware la intercepta.

### LESSON-005: Los imports deben ir en el bloque de imports al inicio del fichero
**Contexto:** Al eliminar una función local y sustituirla por un import, el import quedó en mitad del fichero (después de las interfaces).
**Error:** TypeScript lo acepta, pero es un anti-patrón que confunde la lectura del código.
**Corrección:** Siempre mover el import al bloque inicial de imports, junto con el resto.
**Regla:** Tras editar un fichero para añadir imports, verificar que quedan en las primeras líneas del fichero.

### LESSON-006: El middleware requiere protección explícita para rutas /admin
**Contexto:** Al crear `/admin` como ruta protegida (solo ADMIN), el middleware original solo protegía `/dashboard`, `/pistas`, `/mis-reservas`.
**Error:** Sin actualizar el middleware, una petición a `/admin` desde un usuario CIUDADANO no sería redirigida.
**Corrección:** Añadir `RUTAS_ADMIN` como lista separada en middleware, con checks: (1) sin sesión → /login, (2) sesión no-ADMIN → /dashboard. Actualizar `config.matcher` para incluir `/admin/:path*`.
**Regla:** Whenever a new protected route is created, update middleware with the required role checks and add to config.matcher.

### LESSON-007: Las API routes admin necesitan el mismo patrón de validación en todos los handlers
**Contexto:** Creando 12 endpoints de admin con diferentes responsabilidades (GET/POST/PATCH/DELETE).
**Error:** Si cada endpoint repite el check de autenticación/rol, hay código duplicado y riesgo de inconsistencia.
**Corrección:** Usar un patrón consistente: (1) getServerSession() al inicio, (2) validar rol === "ADMIN", (3) devolver 401 o 403, (4) lógica de negocio en try/catch con 500 en error. Aplicar en todos los 12 endpoints.
**Regla:** Para conjuntos de endpoints con la misma protección, documentar el patrón una vez y aplicar de manera uniforme en todos.**

### LESSON-009: Los mocks de tests deben reflejar el formato UTC real de los timestamps corregidos
**Contexto:** Al corregir la zona horaria con `crearHoraEnMadrid`, los timestamps almacenados cambian (ej: 10:00 Madrid → T09:00Z en invierno, no T10:00Z).
**Error:** Los tests que mockeaban `horaInicio: new Date('...T10:00:00.000Z')` dejaban de coincidir con el valor que el helper genera internamente.
**Corrección:** Actualizar el mock para usar el instante UTC correcto (T09:00Z para las 10:00 de invierno en Madrid).
**Regla:** Cuando se corrige la lógica de zona horaria en una route, revisar todos los mocks de tests que contengan timestamps hardcodeados con esa hora y actualizarlos al UTC real correspondiente.

### LESSON-010: Los módulos con dependencias externas (Resend, SMTP) deben mockearse en los tests
**Contexto:** Al añadir `import { enviarEmailReserva } from "@/lib/email"` a una route, los tests de esa route importan transitivamente el SDK de Resend.
**Error:** Sin mock de `@/lib/email`, los tests pueden fallar o emitir warnings si `RESEND_API_KEY` no está configurada en el entorno de test.
**Corrección:** Añadir `jest.mock('@/lib/email', () => ({ enviarEmailReserva: jest.fn().mockResolvedValue(undefined) }))` en cada fichero de test que pruebe una route que usa emails.
**Regla:** Cualquier módulo que llame a servicios externos (email, SMS, pagos) debe mockearse explícitamente en los tests para evitar dependencias de entorno.

### LESSON-011: Las transacciones que necesitan datos para lógica post-transacción deben devolver esos datos
**Contexto:** `cancelar/route.ts` necesita datos de la reserva (usuario, instalación) para enviar el email después de que la transacción complete.
**Error:** La transacción original era `await prisma.$transaction(async (tx) => { ... })` y devolvía void; no había forma de acceder a los datos fuera del bloque.
**Corrección:** Refactorizar la transacción para que devuelva explícitamente los datos necesarios: `const datos = await prisma.$transaction(async (tx) => { ...; return reserva })`.
**Regla:** Si una transacción necesita pasar datos a la lógica siguiente (emails, respuesta HTTP enriquecida), diseñarla para devolver esos datos desde el inicio.

### LESSON-012: El callback jwt de NextAuth no verifica la BD en refreshes posteriores al login
**Contexto:** El callback `jwt` solo poblaba el token en el primer login (`if (user)`). En los refreshes posteriores devolvía el token directamente sin consultar la BD.
**Error:** Un usuario desactivado (`activo = false`) conservaba su sesión JWT activa hasta 8 horas porque el token nunca se revalidaba contra la BD.
**Corrección:** En el path de refresh (cuando no existe `user`), consultar `prisma.usuario.findUnique` con `select: { activo: true }`. Si no existe o `activo === false`, devolver `{ ...token, error: "SessionInvalidada" as const }`. El callback `session` propaga el error al cliente. Extender los tipos JWT y Session en `next-auth.d.ts` para incluir `error?: "SessionInvalidada"`.
**Regla:** El callback `jwt` siempre debe tener dos ramas: (1) primer login con `user` presente → poblar token, (2) refresh → verificar estado del usuario en BD y marcar error si fue desactivado.

### LESSON-008: Los tests necesitan importar NextRequest cuando se usan en conjuntos nuevos
**Contexto:** Al crear admin.test.ts con tests de API routes, se usaba NextRequest() pero no estaba importado.
**Error:** ReferenceError: NextRequest is not defined durante la ejecución de tests.
**Corrección:** Añadir `import { NextRequest } from "next/server"` al inicio del fichero de test.
**Regla:** Siempre importar las clases de Next.js (NextRequest, NextResponse) explícitamente cuando se usan en tests.
### LESSON-013: El mock de Select de shadcn/ui renderiza un div que no es labellable
**Contexto:** Al testear `FormularioAviso`, el mock de `SelectTrigger` renderiza un `<div>` con el mismo `id` que la label (`aviso-tipo`). La label apunta al div con `for="aviso-tipo"`.
**Error:** `getByLabelText(/tipo/i)` falla porque el elemento asociado es un `<div>`, que no es un elemento labellable según la especificación HTML.
**Corrección:** En el test, buscar la label por texto con `getByText('Tipo', { selector: 'label' })` y verificar las opciones del select con `getByTestId('select-item-INFO')`.
**Regla:** Cuando se mockea Select de shadcn/ui para tests, usar `getByText(..., { selector: 'label' })` para la label del campo, y `getByTestId('select-item-*')` para verificar las opciones. No usar `getByLabelText` para selects mockeados con divs.

### LESSON-014: El vitest.config.ts debe incluir explícitamente todas las carpetas de tests
**Contexto:** Al crear tests en `src/__tests__/components/` (carpeta nueva), vitest no los encontraba porque el `include` solo cubría `src/__tests__/frontend/**`.
**Error:** `No test files found` cuando se ejecuta vitest apuntando a la carpeta `components`.
**Corrección:** Añadir `'src/__tests__/components/**/*.test.{ts,tsx}'` al array `include` de `vitest.config.ts`.
**Regla:** Al crear una nueva carpeta de tests bajo `src/__tests__/`, actualizar `vitest.config.ts` para incluirla en el array `include`.

### LESSON-016: Cambiar findUnique a findFirst en rutas invalida mocks de tests existentes
**Contexto:** Al migrar a multi-tenant, se cambia `findUnique({ where: { nombre } })` a `findFirst({ where: { nombre, tenantId } })` en rutas como `admin/pistas`.
**Error:** Los tests existentes que mockeaban `prismaMock.instalacion.findUnique.mockResolvedValueOnce(null)` dejan sus mocks sin consumir. Los tests siguientes que legítimamente usan `findUnique` (ej: PATCH que busca por `id`) reciben esos mocks `null` acumulados y fallan con 404 inesperado.
**Corrección:** Actualizar los tests afectados para que mockeen `findFirst` en lugar de `findUnique` cuando el código de producción cambió de uno al otro.
**Regla:** Cada vez que se cambia un `findUnique` a `findFirst` (o viceversa) en una ruta, buscar en los tests todos los `mockResolvedValueOnce` para ese método y actualizarlos. Los mocks acumulados sin consumir entre tests son silenciosos y difíciles de detectar.

### LESSON-017: En migraciones multi-tenant, usar default temporal para columnas NOT NULL en tablas con datos
**Contexto:** Al añadir `tenantId NOT NULL` a tablas que ya tienen filas (Instalacion, Usuario, Reserva), Prisma rechaza la migración automática.
**Error:** `npx prisma migrate dev` falla con "Added the required column tenantId without a default value — there are N rows in this table".
**Corrección:** Crear la migración manualmente con `--create-only`, usar `ADD COLUMN tenantId TEXT NOT NULL DEFAULT 'tenant-id-fijo'` para asignar el tenant inicial a todos los registros, luego `ALTER COLUMN tenantId DROP DEFAULT` para quitar el default temporal.
**Regla:** Para migraciones que añaden columnas NOT NULL a tablas con datos existentes: (1) crear tenant inicial con ID fijo conocido, (2) usar ese ID como default temporal en la migración SQL, (3) eliminar el default tras la asignación.

### LESSON-018: Las rutas públicas también necesitan tenantId desde el header, no solo las autenticadas
**Contexto:** En la Fase 4 de multi-tenancy, las rutas públicas (`GET /api/instalaciones`, `GET /api/avisos`, `GET /api/disponibilidad`) no tienen sesión de NextAuth donde leer el tenantId.
**Error:** Si se intenta leer `sesion.user.tenantId` en rutas públicas, la sesión es null y hay un crash. Si no se filtra por tenantId, se devuelven datos de todos los tenants.
**Corrección:** Las rutas públicas leen el tenantId del header `x-tenant-id` inyectado por el middleware: `const tenantId = request.headers.get("x-tenant-id")`. La firma de la función debe recibir `request: NextRequest`.
**Regla:** Para rutas públicas, el tenantId siempre viene del header `x-tenant-id`. Para rutas autenticadas, viene de `sesion.user.tenantId`. Nunca mezclar ambas fuentes.

### LESSON-019: Al añadir tenantId a rutas públicas, los tests que llamaban sin parámetros necesitan actualización
**Contexto:** `GET /api/instalaciones` tenía firma `GET()` sin parámetros. Al añadir `request: NextRequest` para leer el header, todos los tests que hacían `await GET()` fallan con `Cannot read properties of undefined (reading 'headers')`.
**Corrección:** Actualizar los tests para pasar un `NextRequest` con el header `x-tenant-id`: `new NextRequest(url, { headers: { 'x-tenant-id': TENANT_ID } })`.
**Regla:** Cuando se cambia la firma de una ruta para añadir parámetros, buscar en todos los tests las llamadas sin argumentos y actualizarlas en el mismo commit.

### LESSON-015: El parámetro `errorMap` de Zod v4 se renombró a `error`
**Contexto:** Los schemas de Zod para avisos usaban `errorMap: () => (...)` en `z.enum()`.
**Error:** TypeScript reporta `TS2769: No overload matches this call` porque en Zod v4 la propiedad se renombró de `errorMap` a `error`.
**Corrección:** Cambiar `errorMap: () => ({ message: "..." })` por `error: () => ({ message: "..." })` en todas las llamadas a `z.enum()`.
**Regla:** En Zod v4, el parámetro de mapeo de errores en `z.enum()` se llama `error`, no `errorMap`. Verificar esto al actualizar versiones de Zod o al crear nuevos schemas.
