# Auditoria de Seguridad — Sistema de Reservas Deportivas

**Fecha:** 2026-04-06 (segunda auditoria)
**Auditoria anterior:** 2026-03-27
**Auditor:** Analisis estatico automatizado (Claude Code)
**Version auditada:** Next.js 14.2.25 / NextAuth 4.24.5 / Prisma 5.9.1 / Zod 4.3.6
**Alcance:** Codigo fuente completo (30 API routes) + dependencias + configuracion

---

## Resumen Ejecutivo

| Severidad | Cantidad | Corregidas desde auditoria anterior |
|-----------|----------|--------------------------------------|
| CRITICA   | 1        | 1 parcialmente corregida (VULN-002)  |
| ALTA      | 3        | 0                                    |
| MEDIA     | 4        | 2 corregidas (VULN-007, VULN-009)    |
| BAJA      | 3        | 2 corregidas (VULN-011, VULN-012)    |
| **TOTAL** | **11**   | **5 corregidas / 14 originales**     |

---

## Estado de vulnerabilidades de la auditoria anterior (2026-03-27)

| VULN | Estado | Detalle |
|------|--------|---------|
| VULN-001 (Credenciales en .env) | **SIN CORREGIR** | El archivo `.env` sigue conteniendo credenciales reales de Supabase, Resend y un NEXTAUTH_SECRET debil |
| VULN-002 (IDOR delete usuarios) | **CORREGIDA** | Ahora usa `deleteMany` con filtro `tenantId` (linea 33) |
| VULN-003 (Next.js CVEs) | **SIN CORREGIR** | Sigue en version ^14.2.25 |
| VULN-004 (Rate limit en memoria) | **PARCIALMENTE** | Se anadio `x-vercel-forwarded-for` como primera opcion (linea 18 auth.ts), pero el Map en memoria sigue sin persistencia entre instancias serverless |
| VULN-005 (CSP unsafe-inline) | **PARCIALMENTE** | `unsafe-eval` ahora solo se aplica en development (linea 25 next.config.js), pero `unsafe-inline` persiste en produccion |
| VULN-006 (x-tenant-id inyectable) | **CORREGIDA** | Las rutas publicas ahora solo usan `x-tenant-slug` y `host`, no aceptan `x-tenant-id` |
| VULN-007 (Contrasenas debiles) | **CORREGIDA** | Minimo 8 caracteres + mayuscula + numero en todos los schemas |
| VULN-008 (Middleware incompleto) | **PARCIALMENTE** | Se anadieron mas rutas al matcher (lineas 141-146), pero `/api/cuenta` y `/api/cron` siguen sin cubrir |
| VULN-009 (Tokens no invalidados) | **CORREGIDA** | `updateMany` invalida todos los tokens del usuario (linea 83 nueva-password/route.ts) |
| VULN-010 (NEXT_PUBLIC_APP_URL) | **NO APLICA** | La variable usa `APP_URL` y `VERCEL_URL` (sin NEXT_PUBLIC), correcto |
| VULN-011 (bcrypt coste 10) | **CORREGIDA** | Ahora usa coste 12 en superadmin/tenants (linea 72) |
| VULN-012 (PATCH sin Zod) | **CORREGIDA** | Ahora usa `schemaActualizarTenantSuperadmin.safeParse` (linea 29) |
| VULN-013 (devDependencies) | **PARCIALMENTE** | `npm audit` reporta 3 vulnerabilidades (1 moderate, 1 high, 1 critical) |

---

## Vulnerabilidades CRITICAS

---

### VULN-001: Credenciales reales de produccion en archivo `.env` en disco (SIN CORREGIR)

**Severidad:** CRITICA
**Tipo:** Exposicion de datos / Secretos
**Ubicacion:** `.env` lineas 1-6
**Descripcion:**
El archivo `.env` sigue conteniendo credenciales reales:
- URL completa de PostgreSQL en Supabase con usuario y contrasena
- API key de Resend
- NEXTAUTH_SECRET con valor placeholder extremadamente debil ("cambia-este-secreto-en-produccion...")
- Email personal del desarrollador

Aunque `.gitignore` incluye `.env` y los archivos nunca fueron commiteados al repositorio git (verificado con `git log --all`), las credenciales estan activas y el secreto JWT es trivialmente adivinable.

**Impacto:**
- Falsificacion de tokens JWT: cualquiera que conozca el secreto puede crear sesiones de ADMIN o SUPERADMIN
- Acceso completo a la base de datos PostgreSQL en Supabase
- Envio de emails fraudulentos con la API key de Resend
- El email personal expone informacion del desarrollador

**Evidencia:**
```
DATABASE_URL="postgresql://postgres.njxddgmppvzrkwqohgux:58945218ttUU@aws-1-eu-west-1.pooler.supabase.com:6543/postgres..."
NEXTAUTH_SECRET="cambia-este-secreto-en-produccion-usa-openssl-rand-base64-32"
RESEND_API_KEY="re_LpFKvBHA_FdM46w3AxRoELyYSDdVdQVQH"
```

**Correccion:**
1. **INMEDIATO:** Rotar la contrasena de la base de datos en Supabase
2. **INMEDIATO:** Revocar y regenerar la API key de Resend
3. **INMEDIATO:** Generar un NEXTAUTH_SECRET fuerte: `openssl rand -base64 32`
4. En Vercel, configurar todas las variables exclusivamente desde el Dashboard (Settings > Environment Variables)
5. El `.env` local debe usar valores de desarrollo, nunca credenciales de produccion

**Verificacion:**
```bash
# Confirmar que .env no tiene credenciales de produccion
grep -i "supabase\|resend\|cambia-este" .env
# El resultado debe ser vacio
```

---

## Vulnerabilidades ALTAS

---

### VULN-003: Next.js 14.2.25 con multiples CVEs activas (SIN CORREGIR)

**Severidad:** ALTA
**Tipo:** Dependencias / CVE conocidas
**Ubicacion:** `package.json` — `"next": "^14.2.25"`
**Descripcion:**
`npm audit` reporta 11 vulnerabilidades en Next.js incluyendo:
- **GHSA-mwv6-3258-q52c** (HIGH): DoS con Server Components
- **GHSA-5j59-xgg2-r9c4** (HIGH): DoS con Server Components (fix incompleto)
- **GHSA-4342-x723-ch2f** (MODERATE): SSRF via middleware redirects
- **GHSA-ggv3-7p47-pfv8** (MODERATE): HTTP Request Smuggling en rewrites
- **GHSA-h25m-26qc-wcjf** (HIGH): DoS via HTTP deserialization

Tambien hay vulnerabilidades criticas en `handlebars` (dependencia transitiva).

**Impacto:**
- Denegacion de servicio explotable remotamente
- Posible SSRF a traves del middleware
- HTTP request smuggling

**Correccion:**
```bash
npm audit fix
# Si hay breaking changes:
npm install next@latest
```

---

### VULN-004: Rate limiting solo en memoria — ineficaz en Vercel serverless (PARCIALMENTE CORREGIDO)

**Severidad:** ALTA
**Tipo:** Autenticacion / Fuerza bruta
**Ubicacion:** `src/lib/rate-limit.ts` linea 6, `src/lib/auth.ts` linea 15
**Descripcion:**
La mejora de usar `x-vercel-forwarded-for` como primera opcion para obtener la IP real es correcta y mitiga el bypass por cabeceras falsificadas en Vercel. Sin embargo, el almacenamiento en `Map` en memoria sigue sin persistir entre instancias serverless, haciendo que el rate limiting sea ineficaz en produccion.

**Evidencia:**
```typescript
// rate-limit.ts linea 6 — estado volatil entre cold starts
const intentos = new Map<string, { count: number; resetAt: number }>()
```

**Impacto:**
- Cada cold start en Vercel reinicia el contador de intentos
- Un atacante distribuido puede hacer fuerza bruta con miles de peticiones en paralelo
- La proteccion funciona correctamente en desarrollo local (proceso unico)

**Correccion:**
Implementar rate limiting con Redis distribuido:
```bash
npm install @upstash/ratelimit @upstash/redis
```
```typescript
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.fixedWindow(5, "15 m"),
})
```

---

### VULN-005: CSP con `unsafe-inline` en produccion (PARCIALMENTE CORREGIDO)

**Severidad:** ALTA
**Tipo:** Configuracion / XSS
**Ubicacion:** `next.config.js` linea 25
**Descripcion:**
Se corrigio correctamente que `unsafe-eval` solo se aplique en desarrollo. Sin embargo, `unsafe-inline` sigue presente en `script-src` para produccion, lo que permite la ejecucion de scripts inyectados inline.

**Evidencia:**
```javascript
// next.config.js linea 25-26
process.env.NODE_ENV === "development"
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
  : "script-src 'self' 'unsafe-inline'",  // <-- unsafe-inline en produccion
```

**Impacto:**
- Si un atacante logra inyectar HTML (por ejemplo via XSS stored en titulo de aviso), puede ejecutar JavaScript arbitrario
- La CSP no actua como segunda linea de defensa

**Correccion:**
Migrar a CSP basada en nonces con el soporte nativo de Next.js:
```javascript
// En produccion, usar strict-dynamic con nonces
"script-src 'self' 'nonce-${nonce}' 'strict-dynamic'",
```

---

## Vulnerabilidades MEDIAS

---

### VULN-008: Middleware no cubre `/api/cuenta` ni `/api/cron` (PARCIALMENTE CORREGIDO)

**Severidad:** MEDIA
**Tipo:** Configuracion / Defensa en profundidad
**Ubicacion:** `src/middleware.ts` lineas 124-147
**Descripcion:**
El matcher del middleware se amplio respecto a la auditoria anterior (ahora incluye `/api/admin/:path*`, `/api/reservas/:path*`, `/api/avisos/:path*`, `/api/push/:path*`). Sin embargo, las siguientes rutas siguen sin cobertura del middleware:
- `/api/cuenta` y `/api/cuenta/*` (perfil, avatar, exportar, eliminar cuenta)
- `/api/cron/recordatorios` (cron job)

Los endpoints si verifican autenticacion internamente, pero la falta de cobertura del middleware elimina la capa de inyeccion del header `x-tenant-slug` para estas rutas.

**Evidencia:**
```typescript
// middleware.ts — matcher actual (lineas 124-147)
export const config = {
  matcher: [
    // ... rutas de pagina ...
    "/api/disponibilidad/:path*",
    "/api/superadmin/:path*",
    "/api/admin/:path*",
    "/api/reservas/:path*",
    "/api/instalaciones/:path*",
    "/api/avisos/:path*",
    "/api/push/:path*",
    // AUSENTES: /api/cuenta/:path*, /api/cron/:path*
  ],
}
```

**Impacto:**
- Bajo impacto directo: los endpoints verifican sesion internamente
- `/api/cron/recordatorios` esta protegido por `CRON_SECRET`, no por sesion
- Riesgo principal: si se anade un nuevo endpoint bajo `/api/cuenta/` sin verificacion de sesion, no hay capa de defensa

**Correccion:**
Anadir al matcher:
```typescript
"/api/cuenta/:path*",
```

---

### VULN-014: Endpoint cron protegido solo por secreto compartido sin validacion adicional

**Severidad:** MEDIA
**Tipo:** Autenticacion / Autorizacion
**Ubicacion:** `src/app/api/cron/recordatorios/route.ts` lineas 18-25
**Descripcion:**
El endpoint `/api/cron/recordatorios` se protege comparando el header `Authorization: Bearer <CRON_SECRET>` con la variable de entorno `CRON_SECRET`. Esta comparacion usa `!==` (comparacion de strings estricta) en lugar de una comparacion de tiempo constante, lo que podria permitir un ataque de timing side-channel para deducir el secreto byte a byte.

Ademas, si `CRON_SECRET` no esta definido (`undefined`), la comparacion `authHeader !== "Bearer undefined"` podria ser bypasseada enviando exactamente ese valor.

**Evidencia:**
```typescript
// cron/recordatorios/route.ts lineas 21-25
const cronSecret = process.env.CRON_SECRET
if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
  // Si CRON_SECRET es undefined, authHeader === "Bearer undefined" pasa la validacion
```

**Impacto:**
- Si `CRON_SECRET` no esta configurado: cualquiera puede disparar el cron enviando `Authorization: Bearer undefined`
- Timing attack teorico (bajo riesgo practico por la latencia de red)

**Correccion:**
```typescript
const cronSecret = process.env.CRON_SECRET
if (!cronSecret) {
  console.error("[Cron] CRON_SECRET no configurado — endpoint deshabilitado")
  return NextResponse.json({ error: "Servicio no disponible" }, { status: 503 })
}
if (!authHeader || !timingSafeEqual(authHeader, `Bearer ${cronSecret}`)) {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 })
}
```

---

### VULN-015: Falta de rate limiting en registro y recuperacion de contrasena

**Severidad:** MEDIA
**Tipo:** Abuso / DoS
**Ubicacion:** `src/app/api/auth/registro/route.ts`, `src/app/api/auth/recuperar/route.ts`
**Descripcion:**
Los endpoints de registro y recuperacion de contrasena no tienen ningun rate limiting. Un atacante puede:
- Crear miles de cuentas de ciudadano automaticamente (spam de registros)
- Generar miles de tokens de recuperacion y emails (abuso de la cuota de Resend)

**Impacto:**
- Agotamiento de cuota de emails en Resend (plan gratuito: 100/dia)
- Llenado de la base de datos con usuarios falsos
- Posible enumeracion de emails via timing (aunque se mitiga parcialmente con la respuesta 200 constante en recuperacion)

**Correccion:**
Aplicar rate limiting por IP en estos endpoints (5 intentos/hora para registro, 3 intentos/hora para recuperacion).

---

### VULN-016: Plantillas de email con interpolacion de datos sin escapar HTML

**Severidad:** MEDIA
**Tipo:** XSS / Inyeccion
**Ubicacion:** `src/lib/email.ts` lineas 149, 154, 224
**Descripcion:**
Las plantillas HTML de email usan template literals con interpolacion directa de datos del usuario (`${datos.nombreUsuario}`, `${datos.nombreInstalacion}`, etc.) sin escapar caracteres HTML. Si un usuario se registra con un nombre como `<script>alert('xss')</script>`, ese contenido se inserta directamente en el HTML del email.

**Evidencia:**
```typescript
// email.ts linea 149
<p>Hola, <strong>${datos.nombreUsuario}</strong>:</p>
// Si nombreUsuario = '<img src=x onerror=alert(1)>' se inyecta directamente
```

**Impacto:**
- XSS en clientes de email que renderizan HTML (la mayoria de clientes modernos bloquean scripts, pero no todos bloquean tags como `<img>` con event handlers)
- Riesgo moderado porque los clientes de email tienen sus propias protecciones

**Correccion:**
Crear una funcion helper de escapado HTML y aplicarla a todos los datos interpolados:
```typescript
function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
```

---

## Vulnerabilidades BAJAS

---

### VULN-017: Log de ID de usuario en push/suscribir

**Severidad:** BAJA
**Tipo:** Exposicion de datos / Logs
**Ubicacion:** `src/app/api/push/suscribir/route.ts` linea 28
**Descripcion:**
El endpoint de suscripcion push loguea el ID del usuario en cada peticion POST:
```typescript
console.log("[Push] POST suscribir -- sesion:", sesion?.user?.id ?? "null")
```
Esto es un log de depuracion que no deberia estar en produccion. Los IDs de usuario en logs pueden facilitar la correlacion de actividad.

**Correccion:**
Eliminar o condicionar al entorno de desarrollo:
```typescript
if (process.env.NODE_ENV === "development") {
  console.log("[Push] POST suscribir -- sesion:", sesion?.user?.id ?? "null")
}
```

---

### VULN-018: CSP no permite imagenes externas necesarias para avatares

**Severidad:** BAJA
**Tipo:** Configuracion
**Ubicacion:** `next.config.js` linea 29
**Descripcion:**
La directiva `img-src` de la CSP es `'self' data: blob:`, pero los avatares pueden almacenarse en Vercel Blob (dominio externo) o usar `api.dicebear.com` como fallback. Las imagenes externas seran bloqueadas por la CSP en produccion.

**Evidencia:**
```typescript
// cuenta/avatar/route.ts — URLs de avatar externas
avatarUrl = `https://api.dicebear.com/8.x/initials/svg?seed=...`
// o
const { url } = await put(`avatars/${sesion.user.id}.${extension}`, ...)  // Vercel Blob URL
```

**Correccion:**
Ampliar `img-src` para incluir los dominios necesarios:
```javascript
"img-src 'self' data: blob: https://api.dicebear.com https://*.public.blob.vercel-storage.com",
```

---

### VULN-013: Dependencias con vulnerabilidades conocidas (ACTUALIZADO)

**Severidad:** BAJA
**Tipo:** Dependencias
**Ubicacion:** `package.json`
**Descripcion:**
`npm audit` reporta 3 vulnerabilidades:
- `brace-expansion` (moderate): DoS por secuencia zero-step
- `handlebars` (critical): Multiples inyecciones JS y prototype pollution — es dependencia transitiva de testing
- `next` (high): Multiples CVEs (ver VULN-003)

**Correccion:**
```bash
npm audit fix
```

---

## Verificacion de hallazgos previos solicitados por el usuario

### BUG-02: Cancelar usa transaccion
**Estado: VERIFICADO CORRECTO**
- `src/app/api/reservas/[id]/cancelar/route.ts` linea 35: toda la logica de cancelacion (busqueda, validacion de permisos, update) se ejecuta dentro de `prisma.$transaction`
- `src/app/api/admin/reservas/[id]/cancelar/route.ts` linea 25: idem para la cancelacion admin

### BUG-03: Crear reserva valida dentro de transaccion
**Estado: VERIFICADO CORRECTO**
- `src/app/api/reservas/route.ts` linea 123: el conteo de reservas activas del ciudadano Y la verificacion de slot disponible se ejecutan DENTRO de `prisma.$transaction`, previniendo race conditions

### SEG-02: Validacion de fecha con regex
**Estado: VERIFICADO CORRECTO**
- `src/app/api/disponibilidad/route.ts` linea 79: `REGEX_FECHA.test(fecha)` valida formato YYYY-MM-DD antes de usarlo

### SEG-01: Try/catch en instalaciones
**Estado: VERIFICADO CORRECTO**
- `src/app/api/instalaciones/route.ts` linea 23: toda la logica envuelta en try/catch con mensaje generico en caso de error

---

## Hallazgos Positivos — Buenas Practicas Identificadas

El codigo presenta un nivel de seguridad notablemente alto para su etapa de desarrollo:

1. **Aislamiento multi-tenant robusto**: TODAS las consultas a BD filtran por `tenantId` junto al `id` del recurso. Se verifico en los 30 endpoints. La VULN-002 (IDOR en delete usuarios) fue corregida.

2. **Proteccion contra timing attacks**: Hash dummy en login (linea 9 auth.ts) para igualar tiempo de respuesta cuando el usuario no existe.

3. **Transacciones en operaciones criticas**: Creacion de reservas, cancelacion y eliminacion de cuentas usan `$transaction` para prevenir race conditions y doble reserva.

4. **Limite de 72 bytes en contrasenas**: Previene DoS con payloads enormes en bcrypt (linea 49 auth.ts).

5. **Tokens de recuperacion seguros**: UUID criptografico (`randomUUID`), expiracion de 1 hora, single-use, invalidacion masiva al usar cualquier token del usuario.

6. **Headers de seguridad completos**: X-Frame-Options DENY, HSTS 1 ano, X-Content-Type-Options nosniff, Referrer-Policy strict-origin, Permissions-Policy restrictiva.

7. **Nunca se filtra passwordHash**: Todos los endpoints usan `select` explicito excluyendo el hash.

8. **Sesiones JWT con TTL de 8 horas**: Significativamente mejor que los 30 dias por defecto de NextAuth.

9. **Invalidacion proactiva de sesiones**: El callback JWT verifica en cada refresh que el usuario sigue activo en BD (lineas 98-114 auth.ts).

10. **Validacion de entrada exhaustiva con Zod**: 16 schemas definidos en validaciones.ts, aplicados consistentemente en todos los endpoints con body.

11. **Proteccion contra enumeracion de emails**: El endpoint de recuperacion devuelve 200 siempre (linea 49 recuperar/route.ts), impidiendo saber si un email existe.

12. **Tenant resuelto solo desde slug/host**: Las rutas publicas ya NO aceptan `x-tenant-id` del cliente (corregido desde la auditoria anterior).

13. **Verificacion de usuario activo en cada refresh JWT**: Si un admin desactiva un usuario, su sesion se invalida en el proximo refresh (linea 103 auth.ts).

14. **Soft delete en avisos**: Se desactivan en lugar de eliminarse, permitiendo auditoria.

15. **RGPD implementado**: Exportacion de datos, eliminacion de cuenta con transaccion atomica (cancela reservas + borra tokens + elimina usuario).

---

## Plan de Remediacion Priorizado

| Prioridad | VULN | Accion | Estimacion |
|-----------|------|--------|------------|
| P0 — INMEDIATO | VULN-001 | Rotar contrasena BD Supabase, revocar API key Resend, generar NEXTAUTH_SECRET fuerte | 30 min |
| P1 — Esta semana | VULN-003 | Ejecutar `npm audit fix` o actualizar Next.js | 1 h |
| P1 — Esta semana | VULN-004 | Implementar rate limiting con Upstash Redis | 3 h |
| P1 — Esta semana | VULN-014 | Validar que CRON_SECRET esta definido + comparacion segura | 15 min |
| P2 — Este sprint | VULN-005 | Migrar CSP a nonces y eliminar unsafe-inline | 3 h |
| P2 — Este sprint | VULN-015 | Rate limiting en registro y recuperacion | 2 h |
| P2 — Este sprint | VULN-016 | Escapar HTML en plantillas de email | 30 min |
| P3 — Backlog | VULN-008 | Anadir /api/cuenta al matcher del middleware | 10 min |
| P3 — Backlog | VULN-017 | Eliminar log de depuracion en push/suscribir | 5 min |
| P3 — Backlog | VULN-018 | Ampliar img-src en CSP para avatares externos | 10 min |
| P3 — Backlog | VULN-013 | Actualizar dependencias con vulnerabilidades | 30 min |

---

## Historial de auditorias

| Fecha | Fase | Vulnerabilidades encontradas | Criticas | Altas | Corregidas |
|---|---|---|---|---|---|
| 2026-03-27 | Primera auditoria estatica | 14 | 2 | 3 | 0 |
| 2026-04-06 | Segunda auditoria estatica | 11 (4 nuevas, 5 corregidas de la anterior) | 1 | 3 | 5 de 14 |

---

## Conclusion

El proyecto ha mejorado significativamente desde la primera auditoria: 5 de 14 vulnerabilidades fueron corregidas (incluyendo la CRITICA VULN-002 de IDOR). La arquitectura de seguridad es solida con excelente aislamiento multi-tenant, transacciones correctas y validacion exhaustiva.

Los puntos pendientes mas urgentes son:
1. **Rotacion de credenciales** (VULN-001) — riesgo critico inmediato
2. **Actualizacion de Next.js** (VULN-003) — CVEs publicas explotables
3. **Rate limiting distribuido** (VULN-004) — proteccion contra fuerza bruta ineficaz en produccion

Una vez resueltos estos tres puntos, el nivel de seguridad de la aplicacion sera adecuado para un despliegue en produccion con datos reales de ciudadanos.

---

*Fin del informe de auditoria — 2026-04-06*
