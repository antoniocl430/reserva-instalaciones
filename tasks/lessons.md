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

### LESSON-008: Los tests necesitan importar NextRequest cuando se usan en conjuntos nuevos
**Contexto:** Al crear admin.test.ts con tests de API routes, se usaba NextRequest() pero no estaba importado.
**Error:** ReferenceError: NextRequest is not defined durante la ejecución de tests.
**Corrección:** Añadir `import { NextRequest } from "next/server"` al inicio del fichero de test.
**Regla:** Siempre importar las clases de Next.js (NextRequest, NextResponse) explícitamente cuando se usan en tests.