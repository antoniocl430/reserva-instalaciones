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
**Contexto:** Los schemas de Zod para avisos usaban `errorMap: () => (...)` en `z.enum()`. Al implementar `z.literal(true, { errorMap: ... })` para RGPD, el test fallaba con "Invalid input: expected true" en lugar del mensaje personalizado.
**Error:** TypeScript lo acepta en `z.literal()` pero en Zod v4 el parámetro `errorMap` ya no funciona; el mensaje personalizado no se aplica.
**Corrección:** Cambiar `errorMap: () => ({ message: "..." })` por `error: () => ({ message: "..." })` en todas las llamadas a `z.enum()` y `z.literal()`.
**Regla:** En Zod v4, el parámetro de mapeo de errores en `z.enum()` y `z.literal()` se llama `error`, no `errorMap`. Aplica a cualquier constructor de Zod que acepte opciones de mensaje personalizado.

### LESSON-021: Los módulos con dependencias transitivas (web-push) deben mockearse en tests de rutas que los importan
**Contexto:** Al integrar `@/lib/push` en `cancelar/route.ts`, ese módulo importa `web-push` que intenta configurar VAPID al cargarse.
**Error:** Los tests de `cancelar.test.ts` fallaban porque `web-push` intentaba ejecutarse sin claves VAPID.
**Corrección:** Añadir `jest.mock('web-push', ...)` en cualquier test que importe directamente o transitivamente un módulo que usa web-push.
**Regla:** Cuando se añade un import a una route que usa servicios externos (push, email, SMS), revisar todos los tests de esa route y añadir los mocks necesarios de las dependencias transitivas.

### LESSON-022: El `update` del upsert de Prisma puede diferir del `create` en campos opcionales
**Contexto:** Al implementar `suscripcionPush.upsert`, el test esperaba `update: { activa: true }` pero la implementación también actualizaba p256dh y auth en el update.
**Error:** `toHaveBeenCalledWith` con `update: { activa: true }` falla cuando el update real incluye campos adicionales.
**Corrección:** Usar `update: expect.objectContaining({ activa: true })` para validar solo los campos relevantes sin ser estricto con los adicionales.
**Regla:** En tests de upsert, usar `expect.objectContaining()` en la propiedad `update` cuando la implementación puede incluir más campos que los mínimos esperados.

### LESSON-023: Los tests de componentes que integran InstalarPWA necesitan mock de matchMedia
**Contexto:** Al integrar `InstalarPWA` en el `Header`, los tests de Header fallaban con `TypeError: window.matchMedia is not a function` porque jsdom no implementa `matchMedia`.
**Error:** `InstalarPWA` llama a `window.matchMedia("(display-mode: standalone)")` en su `useEffect`. Los tests de componentes que renderizan el Header transitan por ese código.
**Corrección:** En cualquier test que renderice un componente que use `matchMedia` (directa o transitivamente), añadir `vi.mock('@/components/InstalarPWA', () => ({ default: () => null }))` para aislar el componente. En los tests propios de `InstalarPWA`, usar el helper `mockMatchMedia` en `beforeEach`.
**Regla:** Cuando un componente usa APIs de navegador (matchMedia, navigator, geolocation), los tests de componentes que lo integran deben mockearlo o configurar el entorno jsdom adecuadamente.

### LESSON-020: getByText falla cuando el texto aparece en múltiples elementos del DOM
**Contexto:** En el test del formulario de registro, "Crear cuenta" aparece tanto en el h1 como en el botón submit.
**Error:** `screen.getByText('Crear cuenta')` lanza "Found multiple elements with the text" porque hay dos nodos que contienen ese texto.
**Corrección:** Usar `screen.getByRole('heading', { name: /Crear cuenta/i })` para apuntar al h1, o `screen.getByRole('button', { name: /Crear cuenta/i })` para el botón.
**Regla:** Cuando un texto puede aparecer en múltiples elementos (heading + button, label + badge, etc.), usar `getByRole` con el rol específico en lugar de `getByText` genérico.

### LESSON-024: El puerto del dev server en E2E tests debe ser configurable vía variable de entorno
**Contexto:** Tests E2E en Playwright con baseURL hardcodeado a localhost:3000, pero dev server corriendo en 3002 debido a port contention.
**Error:** Tests conectaban a localhost:3000 mientras el servidor estaba en 3002, causando timeouts en login (waiting for navigation).
**Corrección:** (1) Actualizar `e2e/playwright.config.ts` para usar variable de entorno: `const port = process.env.PLAYWRIGHT_TEST_PORT || '3000'` y `baseURL: \`http://localhost:\${port}\``. (2) Ejecutar tests con `PLAYWRIGHT_TEST_PORT=3002 npx playwright test`.
**Regla:** Cualquier hardcoded URL/port en E2E tests debe extraerse a variable de entorno para soportar múltiples entornos de desarrollo.

### LESSON-025: El contenido HTML con opacity:0 en headless mode requiere esperas explícitas
**Contexto:** Tests E2E que navigaban a `/pistas` no podían encontrar los slots (divs con role="button"). El HTML mostraba los elementos pero con `opacity:0` (animación Framer Motion inicial).
**Error:** `toBeVisible()` devuelve false para elementos con opacity:0. En headless mode sin interacción del usuario, la animación no se ejecuta siempre de inmediato.
**Corrección:** (1) Añadir `await page.waitForTimeout(800)` después de `waitForLoadState('networkidle')` para permitir que animaciones cliente completen. (2) Para selectores específicos, usar `waitForSelector()` en lugar de `toBeVisible()` cuando el elemento existe pero está animando.
**Regla:** En tests E2E headless, después de navegar a una página con animaciones CSS/Framer Motion, esperar explícitamente 0.5-1s para que el contenido sea visible. No usar `toBeVisible()` como mecanismo de espera principal en headless mode; usa `waitForSelector()` o `waitForLoadState()` primero.

### LESSON-026: En tests E2E, la autenticación con page.request mantiene cookies de sesión automáticamente
**Contexto:** Test E2E que intentaba hacer una llamada POST autenticada a una API usando `request` fixture global de Playwright.
**Error:** POST devolvía 401 porque `request` (fixture global) no incluye las cookies de sesión que se configuraron mediante la UI (`await loginInstructor(page)`).
**Corrección:** Usar `page.request.post()` en lugar de `request.post()`. El `page.request` context hereda las cookies de la página actual.
**Regla:** Para requests autenticadas en tests E2E, usar siempre `page.request` (context-aware con cookies) en lugar de `request` (global sin cookies). Alternativamente, pasar explícitamente las cookies: `{ headers: { 'Cookie': cookieString } }`.

### LESSON-027: Los tests E2E que dependen de datos previos necesitan cleanup explícito
**Contexto:** Test E2E que creaba un grupo recurrente (test 1), luego otros tests (2, 3) asumían que el grupo existía. En la segunda ejecución, la primer creación fallaba (409 Conflict) por un grupo previo.
**Error:** Tests no eran idempotentes. La segunda ejecución encontraba grupos de la ejecución anterior, causando conflictos.
**Corrección:** (1) En el test que crea datos, llamar primero a un DELETE/cleanup: `const respListar = await page.request.get('/api/instructor/reservas-recurrentes'); for (const grupo of grupos) await page.request.delete(/api/.../grupo.id)`. (2) Usar fechas/horas variadas (semana 7+ en el futuro) para evitar solapamientos entre runs.
**Regla:** Tests E2E que crean datos compartidos deben limpiar estado anterior al inicio. Alternativa: usar identifiers únicos por ejecución (timestamps, UUIDs) para evitar colisiones.

### LESSON-028: Los usuarios de prueba E2E deben estar en el seed, nunca solo en la fixture del test
**Contexto:** El spec de instructor.spec.ts requería `instructor@test.es` con rol INSTRUCTOR. El usuario no estaba en el seed y el spec asumía que lo creaba Prisma en setup.
**Error:** Sin el usuario en la BD, el login E2E devolvía "Credenciales incorrectas" y todos los tests del spec fallaban.
**Corrección:** Añadir el usuario al `prisma/seed.ts` con upsert/findFirst + create, siguiendo la misma estructura que admin y superadmin.
**Regla:** Todo usuario necesario para los tests E2E debe estar en `prisma/seed.ts`. No depender de que el spec lo cree en tiempo de ejecución.

### LESSON-029: El error "FATAL: (ENOTFOUND) tenant/user X not found" de Supabase es de credenciales, no de red
**Contexto:** `npx prisma db seed` fallaba con `FATAL: (ENOTFOUND) tenant/user postgres.njxddgmppvzrkwqohgux not found` incluso cuando el DNS resolvía y el puerto 6543 era alcanzable.
**Error:** El mensaje de error de Supabase imita un error DNS pero en realidad indica que el proyecto Supabase con ese ID no existe (fue eliminado o las credenciales expiraron).
**Diagnóstico:** Verificar con `nslookup aws-1-eu-west-1.pooler.supabase.com` (DNS OK) y `nc/telnet` al puerto 6543 (puerto abierto). Si ambos pasan pero Prisma falla, el proyecto Supabase fue eliminado.
**Corrección:** Crear un nuevo proyecto en Supabase y actualizar `DATABASE_URL` y `DIRECT_URL` en `.env` y `.env.local` con las nuevas credenciales.
**Regla:** Cuando el seed o cualquier operación Prisma falla con `ENOTFOUND tenant/user` y el DNS/red están OK, el problema es que el proyecto Supabase no existe. Actualizar las variables de entorno es la única solución.

### LESSON-030: Los mocks de @/lib/tenant deben incluir TODAS las funciones importadas por la ruta bajo test
**Contexto:** Al añadir `parsearConfiguracion` a `disponibilidad/route.ts` (importado de `@/lib/tenant`), el mock de ese módulo en `disponibilidad.test.ts` solo declaraba `obtenerTenantIdPorSlug` y `extraerSlugDelHost`.
**Error:** Jest reemplaza el módulo entero con el mock. Las funciones no declaradas en el mock quedan como `undefined`. El handler captura el TypeError y devuelve 500.
**Corrección:** Añadir `parsearConfiguracion: jest.fn().mockReturnValue({})` al mock del módulo en el test.
**Regla:** Cuando se añade un import de una función nueva a una ruta que ya tiene un mock de ese módulo en tests, añadir la función al mock en el mismo commit. Si el mock no cubre todas las funciones importadas, la ruta devolverá 500 en tests.

### LESSON-032: clearAllMocks no limpia retornos acumulados de mockResolvedValueOnce entre describes
**Contexto:** En tests de `levantar-suspension`, el `beforeEach` usaba `jest.clearAllMocks()`. Un test anterior (401) registraba `mockResolvedValueOnce(null)` que no se consumía porque la ruta retornaba antes de llamar a `findFirst`. Ese null se acumulaba y se consumía en el siguiente test, invirtiendo los resultados esperados.
**Error:** Tests con `clearAllMocks()` en `beforeEach` pueden tener mocks `mockResolvedValueOnce` no consumidos de tests anteriores que interfieren en el siguiente test, especialmente cuando la ruta retorna tempranamente sin llegar a llamar al método mockeado.
**Corrección:** Usar `jest.resetAllMocks()` en lugar de `jest.clearAllMocks()` en el `beforeEach` de describes que pueden tener retornos tempranos. `resetAllMocks()` elimina tanto las llamadas registradas como las implementaciones/retornos acumulados.
**Regla:** Para describes donde algunos tests registran `mockResolvedValueOnce` pero la ruta puede retornar antes de consumirlos, usar `jest.resetAllMocks()` (no `clearAllMocks()`) para garantizar limpieza completa entre tests.

### LESSON-031: Los tests de Vitest en carpetas nuevas bajo src/__tests__/ deben excluirse de Jest
**Contexto:** Al crear `src/__tests__/lib/slots.test.ts` usando `import { describe } from "vitest"`, Jest también recogía ese archivo porque `testMatch` era `src/__tests__/**/*.test.ts`.
**Error:** Jest intenta ejecutar el test y falla con "Vitest cannot be imported in a CommonJS module using require()".
**Corrección:** Actualizar `jest.config.js` para limitar `testMatch` a solo `api/**` y `backend/**`, las carpetas que usan Jest. Las carpetas `frontend/`, `components/` y `lib/` son Vitest.
**Regla:** Al crear una nueva carpeta de tests bajo `src/__tests__/` que use Vitest, verificar que `jest.config.js` NO la incluye en `testMatch`. Las carpetas de Vitest deben estar en `vitest.config.ts` y excluidas de Jest.
