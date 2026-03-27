# Auditoría de Seguridad — Sistema de Reservas Deportivas

**Fecha:** 2026-03-27
**Auditor:** Análisis estático automatizado (Claude Code)
**Versión auditada:** Next.js 14.2.25 / NextAuth 4.24.5 / Prisma 5.9.1
**Alcance:** Código fuente completo + dependencias (`npm audit`)

---

## Resumen Ejecutivo

| Severidad | Cantidad |
|-----------|----------|
| CRÍTICA   | 2        |
| ALTA      | 3        |
| MEDIA     | 5        |
| BAJA      | 4        |
| **TOTAL** | **14**   |

---

## Vulnerabilidades CRÍTICAS

---

## VULN-001: Credenciales reales de producción en archivos `.env` versionados

**Severidad:** CRÍTICA
**Tipo:** Exposición de datos / Secretos
**Ubicación:** `.env` líneas 1-5 y `.env.local` líneas 1-5
**Descripción:**
Los archivos `.env` y `.env.local` contienen credenciales reales de la base de datos en Supabase (usuario, contraseña y URL completa), una API key de Resend y el secreto de NextAuth. Aunque el `.gitignore` incluye `.env` y `.env.*`, estos archivos existen en disco y podrían haber sido comprometidos si el repositorio fue empujado a un origen remoto.

Adicionalmente, el `NEXTAUTH_SECRET` es el valor por defecto de plantilla (`"cambia-este-secreto-en-produccion..."`) — extremadamente débil.

**Impacto:**
- Acceso completo a la base de datos PostgreSQL en Supabase (lectura y escritura de todos los datos de todos los tenants)
- Envío de emails fraudulentos usando la cuenta de Resend (API key expuesta)
- Falsificación de tokens JWT de sesión al conocer el `NEXTAUTH_SECRET` débil
- Escalada de privilegios: un atacante puede crear usuarios ADMIN o SUPERADMIN directamente en BD

**Evidencia:**
```
DATABASE_URL="postgresql://postgres.njxddgmppvzrkwqohgux:58945218ttUU@aws-1-eu-west-1.pooler.supabase.com:6543/postgres..."
DIRECT_URL="postgresql://postgres.njxddgmppvzrkwqohgux:58945218ttUU@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"
NEXTAUTH_SECRET="cambia-este-secreto-en-produccion-usa-openssl-rand-base64-32"
RESEND_API_KEY="re_LpFKvBHA_FdM46w3AxRoELyYSDdVdQVQH"
```

**Corrección:**
1. **Acción inmediata:** Rotar TODAS las credenciales expuestas en el panel de Supabase y en Resend.
2. Generar un `NEXTAUTH_SECRET` fuerte: `openssl rand -base64 32`
3. Revisar historial git: `git log --all --full-history -- .env .env.local` para confirmar que no fueron commiteados.
4. En producción, usar exclusivamente variables de entorno del proveedor (Vercel Dashboard), nunca archivos `.env` locales con secretos reales.

---

## VULN-002: IDOR en eliminación de usuarios admin — sin filtro de tenant

**Severidad:** CRÍTICA
**Tipo:** Autorización / IDOR (Insecure Direct Object Reference)
**Ubicación:** `src/app/api/admin/usuarios/[id]/route.ts` línea 34
**Descripción:**
El endpoint `DELETE /api/admin/usuarios/[id]` verifica que el solicitante tiene rol ADMIN, pero **no verifica** que el usuario a eliminar pertenece al mismo tenant. Un administrador del tenant A puede eliminar usuarios administradores del tenant B simplemente conociendo (o adivinando) el UUID.

**Impacto:**
- Un admin de cualquier tenant puede eliminar cuentas de admin de otros tenants
- Dejar tenants sin ningún administrador (indisponibilidad de servicio para ese ayuntamiento)
- Eliminar el admin raíz de un tenant rival dejándolo sin acceso

**Evidencia:**
```typescript
// src/app/api/admin/usuarios/[id]/route.ts — línea 34
await prisma.usuario.delete({
  where: { id: params.id }, // ← SIN filtro tenantId: cualquier UUID es eliminable
})
```
Contrasta con el patrón correcto usado en otros endpoints del mismo proyecto:
```typescript
// src/app/api/admin/bloqueos/[id]/route.ts — línea 27 (correcto)
const bloqueo = await prisma.bloqueo.findFirst({
  where: { id: params.id, tenantId: sesion.user.tenantId }, // ← verificación correcta
})
```

**Corrección:**
```typescript
// Verificar primero que el usuario pertenece al tenant del admin autenticado
const usuarioAEliminar = await prisma.usuario.findFirst({
  where: { id: params.id, tenantId: sesion.user.tenantId },
})
if (!usuarioAEliminar) {
  return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
}
await prisma.usuario.delete({ where: { id: params.id } })
```

---

## Vulnerabilidades ALTAS

---

## VULN-003: Next.js desactualizado con múltiples CVEs de severidad alta (DoS y SSRF)

**Severidad:** ALTA
**Tipo:** Configuración / Dependencias desactualizadas
**Ubicación:** `package.json` línea 35 — `"next": "^14.2.25"`
**Descripción:**
La versión instalada (14.2.25) está afectada por al menos 10 vulnerabilidades conocidas según `npm audit`:

- **GHSA-mwv6-3258-q52c** (HIGH, CVSS 7.5): DoS con Server Components maliciosos — `>=13.3.0 <14.2.34`
- **GHSA-5j59-xgg2-r9c4** (HIGH, CVSS 7.5): DoS con Server Components (fix incompleto) — `>=13.3.1 <14.2.35`
- **GHSA-4342-x723-ch2f** (MODERATE, CVSS 6.5): SSRF mediante redirecciones en Middleware — `<14.2.32`
- **GHSA-g5qg-72qw-gw5v** (MODERATE, CVSS 6.2): Cache Key Confusion en Image Optimization — `<14.2.31`
- **GHSA-h25m-26qc-wcjf** (HIGH, CVSS 7.5): DoS por deserialización HTTP en Server Components — `<15.0.8`
- **GHSA-ggv3-7p47-pfv8** (MODERATE): HTTP Request Smuggling en rewrites — `<15.5.13`
- **GHSA-223j-4rm8-mrmf** (LOW): Filtración de `x-middleware-subrequest-id` — versión exacta 14.2.25

**Impacto:**
- Denegación de servicio mediante peticiones HTTP especialmente crafteadas a Server Components
- Posible SSRF explotando redirecciones del middleware
- Filtración de cabeceras internas de subpeticiones (exacerba otros ataques)

**Corrección:**
```bash
npm install next@latest   # Actualizar a >= 15.5.14 para corregir todas las CVEs conocidas
```

---

## VULN-004: Rate limiting en memoria — bypasseable en entorno serverless y mediante cabeceras forjadas

**Severidad:** ALTA
**Tipo:** Autenticación / Control de acceso
**Ubicación:** `src/lib/rate-limit.ts` línea 6 y `src/lib/auth.ts` línea 18
**Descripción:**
El rate limiter de login usa un `Map` en memoria del proceso Node.js. En Vercel (serverless), cada petición puede ejecutarse en una instancia diferente, por lo que el estado del mapa no se comparte entre instancias. Un atacante puede realizar miles de intentos de fuerza bruta en paralelo.

Adicionalmente, la función de extracción de IP confía en el header `x-forwarded-for` que puede ser inyectado por el cliente:

**Evidencia:**
```typescript
// rate-limit.ts línea 6 — estado en memoria, no persistente entre instancias serverless
const intentos = new Map<string, { count: number; resetAt: number }>()

// auth.ts línea 17 — header falsificable por el cliente
const forwarded = req.headers?.["x-forwarded-for"]
if (forwarded) {
  return forwarded.split(",")[0].trim() // ← el cliente puede enviar cualquier IP aquí
}
```

**Impacto:**
- En Vercel: rate limiting esencialmente inoperativo
- Con cabeceras forjadas: bypass completo del rate limit con solo cambiar el header `X-Forwarded-For` en cada petición
- Ataques de fuerza bruta sobre contraseñas de 6 caracteres mínimo son viables

**Corrección:**
1. Usar Redis distribuido (Upstash Redis + `@upstash/ratelimit`) para estado compartido
2. En Vercel, usar `request.ip` o el header `x-vercel-forwarded-for` (establecido por Vercel, no modificable por el cliente)
3. Aumentar el mínimo de contraseñas a 8 caracteres (ver VULN-007)

---

## VULN-005: CSP con `unsafe-inline` y `unsafe-eval` — protección XSS nula

**Severidad:** ALTA
**Tipo:** Configuración / XSS
**Ubicación:** `next.config.js` línea 22
**Descripción:**
La política Content-Security-Policy incluye `'unsafe-inline'` y `'unsafe-eval'` en `script-src`, lo que anula completamente la protección XSS que ofrece una CSP. Si algún atacante logra inyectar HTML en la página (a través de un aviso del tablón, nombre de instalación u otro campo renderizado), puede ejecutar JavaScript arbitrario.

**Evidencia:**
```javascript
// next.config.js línea 22
"script-src 'self' 'unsafe-inline' 'unsafe-eval'", // unsafe-eval requerido por Next.js en dev
```

**Impacto:**
- La CSP no actúa como segunda línea de defensa contra XSS
- Aunque el ORM (Prisma) y el framework (React) previenen XSS por defecto al escapar salidas, la ausencia de CSP efectiva elimina la defensa en profundidad

**Corrección:**
1. En producción, eliminar `'unsafe-eval'` (Next.js 14+ no lo requiere)
2. Migrar a CSP basada en nonces usando el soporte nativo de Next.js App Router
3. Usar `'strict-dynamic'` para scripts de confianza sin `unsafe-inline`

---

## Vulnerabilidades MEDIAS

---

## VULN-006: Header `x-tenant-id` inyectable por clientes externos en rutas públicas

**Severidad:** MEDIA
**Tipo:** Autorización / Manipulación de tenant
**Ubicación:** `src/app/api/instalaciones/route.ts` línea 7, `src/app/api/disponibilidad/route.ts` línea 6, `src/app/api/avisos/route.ts` línea 16
**Descripción:**
Las rutas públicas resuelven el `tenantId` dando prioridad al header `x-tenant-id` si está presente, antes de leer `x-tenant-slug` o derivar del host. Un cliente externo puede incluir este header con el UUID de cualquier tenant y obtener datos de esa organización.

**Evidencia:**
```typescript
async function resolverTenantId(request: NextRequest): Promise<string | null> {
  const tenantId = request.headers.get("x-tenant-id") // ← cliente puede inyectar cualquier UUID
  if (tenantId) return tenantId
  // ...
}
```

**Impacto:**
- Enumeración de instalaciones, disponibilidad y avisos de cualquier tenant conociendo su UUID
- En sistemas multi-tenant, esto representa filtración de datos entre organizaciones

**Corrección:**
Eliminar el soporte para `x-tenant-id` en las rutas públicas. Solo confiar en `x-tenant-slug` (inyectado por el middleware Edge) o en el `host` directamente:
```typescript
async function resolverTenantId(request: NextRequest): Promise<string | null> {
  // Solo confiar en x-tenant-slug (inyectado por middleware) o en el host
  const slug =
    request.headers.get("x-tenant-slug") ??
    extraerSlugDelHost(request.headers.get("host") ?? "")
  return obtenerTenantIdPorSlug(slug)
}
```

---

## VULN-007: Contraseñas débiles — mínimo de solo 6 caracteres

**Severidad:** MEDIA
**Tipo:** Autenticación
**Ubicación:** `src/lib/validaciones.ts` líneas 15, 93, 247
**Descripción:**
Los schemas de Zod aceptan contraseñas con mínimo de 6 caracteres, sin requisitos de complejidad. Esto aplica al registro de ciudadanos, creación de usuarios admin y creación de tenants por superadmin. Sin un rate limiting robusto (ver VULN-004), contraseñas simples como "123456" son vulnerables a fuerza bruta.

**Evidencia:**
```typescript
// validaciones.ts — líneas 15, 93, 247
password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
```

**Corrección:**
```typescript
password: z.string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .regex(/^(?=.*[A-Za-z])(?=.*\d)/, "La contraseña debe contener letras y números"),
```

---

## VULN-008: Middleware no cubre rutas de API privadas — riesgo ante descuidos futuros

**Severidad:** MEDIA
**Tipo:** Configuración / Autenticación
**Ubicación:** `src/middleware.ts` líneas 124-138
**Descripción:**
El `matcher` del middleware no incluye las rutas de API privadas (excepto `/api/disponibilidad` y `/api/superadmin`). La seguridad depende completamente de que cada API route llame a `getServerSession` individualmente. Si un desarrollador añade una nueva ruta sin verificación de sesión, quedará expuesta sin ninguna capa de defensa previa.

**Evidencia:**
```typescript
export const config = {
  matcher: [
    // UI routes...
    "/api/disponibilidad/:path*",
    "/api/superadmin/:path*",
    // ← Ausentes: /api/admin/:path*, /api/reservas/:path*, /api/avisos
  ],
}
```

**Corrección:**
Adoptar un patrón deny-by-default para las rutas de API con una allowlist explícita para las rutas públicas:
```typescript
const RUTAS_API_PUBLICAS = ["/api/auth", "/api/instalaciones", "/api/disponibilidad", "/api/avisos"]
// matcher: incluir /api/:path* y verificar en middleware
```

---

## VULN-009: Tokens de recuperación no se invalidan masivamente al cambiar contraseña

**Severidad:** MEDIA
**Tipo:** Autenticación
**Ubicación:** `src/app/api/auth/nueva-password/route.ts` líneas 77-85
**Descripción:**
Al resetear la contraseña, solo se marca como usado el token que se utilizó. Si el usuario (o un atacante) generó múltiples tokens de recuperación para el mismo email, los tokens adicionales siguen siendo válidos durante 1 hora tras el cambio de contraseña.

**Evidencia:**
```typescript
// nueva-password/route.ts — solo invalida el token actual, no todos los del usuario
await prisma.$transaction([
  prisma.usuario.update({ where: { id: ... }, data: { passwordHash } }),
  prisma.tokenRecuperacion.update({ where: { id: tokenRecuperacion.id }, data: { usado: true } }),
  // ← Faltan: invalidar TODOS los tokens pendientes del usuario
])
```

**Corrección:**
```typescript
await prisma.$transaction([
  prisma.usuario.update({ where: { id: tokenRecuperacion.usuario.id }, data: { passwordHash } }),
  prisma.tokenRecuperacion.updateMany({
    where: { usuarioId: tokenRecuperacion.usuario.id, usado: false },
    data: { usado: true },
  }),
])
```

---

## Vulnerabilidades BAJAS

---

## VULN-010: `NEXT_PUBLIC_APP_URL` expone innecesariamente configuración al bundle cliente

**Severidad:** BAJA
**Tipo:** Configuración / Exposición de datos
**Ubicación:** `src/app/page.tsx` líneas 50, 76
**Descripción:**
La variable `NEXT_PUBLIC_APP_URL` tiene el prefijo `NEXT_PUBLIC_`, lo que la incrusta en el bundle JavaScript del cliente. La variable se usa en un Server Component donde no es necesaria la exposición al cliente. Las variables `NEXT_PUBLIC_` deben usarse solo cuando el código del navegador las necesita.

**Corrección:**
Renombrar a `APP_URL` (sin prefijo `NEXT_PUBLIC_`) para mantenerla solo en el servidor.

---

## VULN-011: Coste de bcrypt inconsistente — coste 10 en creación de tenants

**Severidad:** BAJA
**Tipo:** Autenticación
**Ubicación:** `src/app/api/superadmin/tenants/route.ts` línea 72
**Descripción:**
El endpoint de creación de tenants usa `bcrypt.hash(passwordAdmin, 10)`, mientras que el resto del código usa coste 12 de manera consistente.

**Evidencia:**
```typescript
// superadmin/tenants/route.ts línea 72 — coste 10 (inconsistente)
const passwordHash = await bcrypt.hash(passwordAdmin, 10)
// vs. auth/registro/route.ts línea 46 — coste 12 (estándar del proyecto)
const passwordHash = await bcrypt.hash(password, 12)
```

**Corrección:**
```typescript
const passwordHash = await bcrypt.hash(passwordAdmin, 12)
```

---

## VULN-012: `PATCH /api/superadmin/tenants/[id]` sin validación Zod

**Severidad:** BAJA
**Tipo:** Validación de entrada
**Ubicación:** `src/app/api/superadmin/tenants/[id]/route.ts` líneas 28-39
**Descripción:**
Este endpoint extrae campos del body directamente sin usar el schema `schemaActualizarTenantSuperadmin` definido en validaciones.ts, a diferencia del patrón uniforme del resto de endpoints. La validación manual implementada es correcta pero inconsistente y frágil ante cambios futuros.

**Corrección:**
```typescript
const validacion = schemaActualizarTenantSuperadmin.safeParse(body)
if (!validacion.success) {
  return NextResponse.json({ error: "Datos inválidos", detalles: validacion.error.flatten().fieldErrors }, { status: 400 })
}
```

---

## VULN-013: Dependencias de desarrollo con 26 vulnerabilidades moderadas

**Severidad:** BAJA
**Tipo:** Dependencias
**Ubicación:** `package.json` — `devDependencies`
**Descripción:**
`npm audit` reporta 26 vulnerabilidades de severidad moderada en cadenas de dependencias de Jest y `@react-email/render` (vía Resend). Al ser dependencias de desarrollo, el riesgo se limita a entornos de CI/CD y máquinas de desarrollo, no al runtime de producción.

**Corrección:**
- Ejecutar `npm audit --production` en CI/CD para verificar solo dependencias de producción
- Revisar periódicamente y actualizar dependencias de testing cuando los fixes estén disponibles

---

## Hallazgos Positivos — Buenas Prácticas Identificadas

El código presenta numerosas buenas prácticas de seguridad:

1. **Aislamiento de tenant consistente**: casi todas las consultas filtran por `tenantId` junto al `id`, previniendo acceso cruzado entre organizaciones (excepto VULN-002).
2. **Protección contra timing attacks en login**: uso de `HASH_DUMMY` para igualar el tiempo de respuesta si el usuario no existe.
3. **Transacciones para prevenir race conditions**: `prisma.$transaction` en creación y cancelación de reservas.
4. **Límite de longitud en contraseñas**: 72 bytes máximo para prevenir DoS con bcrypt.
5. **Tokens de reset con expiración y single-use**: expiran en 1 hora y se invalidan tras el uso.
6. **Headers de seguridad**: X-Frame-Options DENY, HSTS, X-Content-Type-Options, Referrer-Policy y Permissions-Policy configurados.
7. **Sin filtración de passwordHash**: los endpoints usan `select` explícito y nunca devuelven hashes.
8. **Sesiones JWT con TTL corto**: 8 horas en lugar de 30 días por defecto.
9. **Invalidación proactiva de sesiones**: el callback JWT verifica en cada refresh que el usuario sigue activo en BD.
10. **Validación de entrada con Zod**: la mayoría de endpoints validan y sanitizan entradas de forma estricta.

---

## Plan de Remediación Priorizado

| Prioridad | VULN | Acción | Estimación |
|-----------|------|--------|------------|
| P0 — Inmediato | VULN-001 | Rotar credenciales Supabase y Resend | 30 min |
| P0 — Inmediato | VULN-001 | Generar NEXTAUTH_SECRET fuerte y seguro | 5 min |
| P1 — Esta semana | VULN-002 | Añadir filtro `tenantId` en DELETE usuarios | 15 min |
| P1 — Esta semana | VULN-003 | Actualizar Next.js a >= 15.5.14 | 1 h |
| P1 — Esta semana | VULN-004 | Implementar rate limiting con Redis (Upstash) | 3 h |
| P2 — Este sprint | VULN-005 | Migrar CSP a nonces en producción | 3 h |
| P2 — Este sprint | VULN-006 | Eliminar soporte `x-tenant-id` en rutas públicas | 30 min |
| P2 — Este sprint | VULN-007 | Aumentar mínimo contraseñas a 8 caracteres | 15 min |
| P2 — Este sprint | VULN-009 | Invalidar todos los tokens al resetear contraseña | 30 min |
| P3 — Backlog | VULN-008 | Ampliar matcher del middleware a rutas API privadas | 1 h |
| P3 — Backlog | VULN-011 | Unificar coste bcrypt a 12 en todos los endpoints | 5 min |
| P3 — Backlog | VULN-012 | Añadir validación Zod en PATCH superadmin/tenants | 20 min |
| P3 — Backlog | VULN-010 | Renombrar NEXT_PUBLIC_APP_URL → APP_URL | 10 min |
| P3 — Backlog | VULN-013 | Actualizar devDependencies Jest | 30 min |

---

*Fin del informe de auditoría — 2026-03-27*

## Estado actual
> Primera auditoría pendiente — ejecutar cuando el Bloque 1 esté completado.

---

## Historial de auditorías

| Fecha | Fase | Vulnerabilidades encontradas | Críticas | Altas | Resueltas |
|---|---|---|---|---|---|
| Pendiente | — | — | — | — | — |

---

## Vulnerabilidades abiertas
> Se irán añadiendo automáticamente por el agente de seguridad.

---

## Vulnerabilidades resueltas
> Se moverán aquí cuando estén corregidas y verificadas.