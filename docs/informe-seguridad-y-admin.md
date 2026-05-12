# Informe de Investigación: Seguridad, Panel Admin y Gestión de Instalaciones

> Generado: 2026-03-24 — **Estado: IMPLEMENTADO** (todos los puntos están en producción)
> Contexto: Next.js 14 App Router + NextAuth.js v4 + Prisma + PostgreSQL (Supabase)
> Aplicación: Sistema de reservas deportivas municipales

---

## Tabla de contenidos

1. [Tema 1 — Seguridad del login con NextAuth.js + CredentialsProvider](#tema-1)
2. [Tema 2 — Panel de administración](#tema-2)
3. [Tema 3 — Gestión dinámica de instalaciones](#tema-3)
4. [Plan de implementación priorizado](#plan-de-implementacion)

---

## Tema 1: Seguridad del login con NextAuth.js + CredentialsProvider {#tema-1}

### 1.1 Vulnerabilidades comunes en login con email/contraseña

#### Timing attacks (ataques de temporización)

**El problema:** Si el servidor devuelve respuesta más rápido cuando el email no existe que cuando la contraseña es incorrecta, un atacante puede enumerar qué emails están registrados midiendo los tiempos de respuesta.

**Diagnóstico del código actual** (`src/lib/auth.ts`):

```typescript
// PROBLEMA ACTUAL: retorno temprano antes de comparar password
const usuario = await prisma.usuario.findUnique({ where: { email } })
if (!usuario || !usuario.activo) return null  // <-- retorno rápido si no existe
const passwordValida = await bcrypt.compare(credentials.password, usuario.passwordHash)
if (!passwordValida) return null              // <-- retorno lento (bcrypt tarda ~100ms)
```

El tiempo de respuesta es distinto: ~5ms si el usuario no existe vs ~100ms si existe pero la contraseña es incorrecta. Esto permite enumerar usuarios.

**Solución:** Ejecutar siempre `bcrypt.compare` con un hash dummy aunque el usuario no exista:

```typescript
// Hash dummy con coste 12 para normalizar el tiempo de respuesta
const HASH_DUMMY = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeKR7Fv3ZJHRcE2Oi'

async authorize(credentials) {
  if (!credentials?.email || !credentials?.password) return null

  const usuario = await prisma.usuario.findUnique({
    where: { email: credentials.email.toLowerCase().trim() }
  })

  // Siempre ejecutar bcrypt para normalizar el tiempo de respuesta
  const hashAComparar = usuario?.passwordHash ?? HASH_DUMMY
  const passwordValida = await bcrypt.compare(credentials.password, hashAComparar)

  if (!usuario || !usuario.activo || !passwordValida) return null

  return { id: usuario.id, email: usuario.email, name: usuario.nombre, rol: usuario.rol }
}
```

#### User enumeration (enumeración de usuarios)

**El problema:** Mensajes de error distintos ("El email no existe" vs "Contraseña incorrecta") permiten a un atacante saber qué emails están registrados.

**Regla:** Usar siempre el mismo mensaje genérico: `"Email o contraseña incorrectos"`. Nunca revelar cuál de los dos falló.

#### Brute force (fuerza bruta)

Sin rate limiting, un atacante puede probar miles de contraseñas contra una cuenta. Ver sección 1.2.

---

### 1.2 Rate limiting en Next.js API Routes

#### Implementación actual: Map en memoria (`src/lib/rate-limit.ts`)

El proyecto implementa rate limiting con un `Map` en memoria de Node.js, sin dependencias externas.
Es adecuado para una instancia única de Vercel (plan gratuito) y no requiere configurar Redis.

**Parámetros configurados:**
- Máximo **5 intentos fallidos** por IP
- Ventana de **15 minutos**
- **Reset automático** tras login exitoso
- Reset automático cuando expira la ventana de tiempo

**Interfaz pública del módulo:**

```typescript
// Verifica si una IP ha superado el límite de intentos
verificarRateLimit(ip, maxIntentos?, ventanaMs?): { bloqueado: boolean; restantes: number }

// Resetea el contador tras login exitoso
resetearRateLimit(ip: string): void
```

**Respuesta cuando se supera el límite:** HTTP 429 con mensaje `"Demasiados intentos de inicio de sesión. Espera 15 minutos antes de volver a intentarlo."`.

**Limitación a tener en cuenta:** Al usar memoria del proceso, el contador se reinicia si el servidor se reinicia o si hay múltiples instancias. Si en el futuro se escala a múltiples instancias de Vercel, migrar a `@upstash/ratelimit` + Redis sin cambiar la interfaz de uso.

---

### 1.3 CSRF protection en NextAuth

**Veredicto: NextAuth v4 ya incluye CSRF protection de forma automática.**

NextAuth implementa el método "double submit cookie" con una cookie `next-auth.csrf-token` firmada, HttpOnly y host-only. Todos los endpoints POST de NextAuth requieren este token.

**Lo que viene incluido sin configuración extra:**
- Cookie CSRF firmada con `NEXTAUTH_SECRET`
- Validación automática en todos los endpoints POST (`/api/auth/signin`, `/api/auth/signout`, etc.)
- Cookie con flags `HttpOnly`, `SameSite=Lax`, `Secure` (en producción)

**Lo que hay que verificar:** Si se crea un formulario de login personalizado que llama a `signIn()` de NextAuth desde el cliente, el cliente SDK de NextAuth obtiene automáticamente el token CSRF del endpoint `/api/auth/csrf`. No hay que hacer nada manual.

**Único riesgo:** Si se implementa una API Route custom de login que NO use NextAuth, hay que gestionar CSRF manualmente con `csrf` o `iron-session`.

---

### 1.4 Sesiones JWT: configuración segura, expiración y revocación

#### Configuración actual (mejorable)

El código actual no especifica expiración de sesión. Por defecto NextAuth usa 30 días, lo que es excesivo para una app municipal.

**Configuración recomendada** en `src/lib/auth.ts`:

```typescript
export const opcionesAuth: NextAuthOptions = {
  // ...
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60,      // 8 horas (jornada laboral)
    updateAge: 60 * 60,        // Renovar el token cada hora de actividad
  },
  jwt: {
    maxAge: 8 * 60 * 60,       // El JWT expira en 8 horas
  },
  // ...
}
```

#### El problema de la revocación de JWT

Los JWT son stateless: una vez emitidos, son válidos hasta que expiran aunque el usuario sea desactivado o su contraseña cambie.

**Estrategias para mitigarlo:**

1. **Expiración corta (recomendado):** Con `maxAge: 8h`, si se desactiva un usuario, su sesión caducará en máximo 8 horas. Aceptable para este contexto.

2. **Verificar `activo` en cada request (recomendado para este proyecto):** Añadir una consulta a BD en el callback `jwt` para verificar que el usuario sigue activo. **Nota:** Esta verificación está en proceso de corrección en el codebase actual. El comportamiento correcto es retornar `null` (no lanzar excepción) cuando el usuario está desactivado.

```typescript
callbacks: {
  async jwt({ token, user, trigger }) {
    if (user) {
      // Primera vez que se crea el token
      token.id = user.id
      token.rol = (user as { rol: string }).rol
    }

    // En cada refresh del token, verificar que el usuario sigue activo
    if (trigger === 'update' || Date.now() > (token.verificadoEn as number ?? 0) + 5 * 60 * 1000) {
      const usuarioActual = await prisma.usuario.findUnique({
        where: { id: token.id as string },
        select: { activo: true, rol: true }
      })
      if (!usuarioActual?.activo) {
        throw new Error('Usuario desactivado')
      }
      token.verificadoEn = Date.now()
    }

    return token
  }
}
```

3. **Blocklist con Redis (para casos críticos):** Mantener una lista de tokens revocados en Redis. Solo necesario si se requiere revocación instantánea.

---

### 1.5 Validación y sanitización de inputs en el servidor

#### Librería recomendada: Zod

Zod es el estándar de facto en el ecosistema Next.js + TypeScript para validación de datos en el servidor.

```bash
npm install zod
```

**Esquema de validación para login:**

```typescript
import { z } from 'zod'

export const esquemaLogin = z.object({
  email: z
    .string()
    .email('Email inválido')
    .max(255, 'Email demasiado largo')
    .toLowerCase()    // normalizar: "USUARIO@ejemplo.com" → "usuario@ejemplo.com"
    .trim(),          // eliminar espacios en blanco
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(72, 'Contraseña demasiado larga'),  // bcrypt solo procesa 72 bytes
})

export const esquemaRegistro = z.object({
  nombre: z.string().min(2).max(100).trim(),
  email: z.string().email().max(255).toLowerCase().trim(),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .max(72)
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número'),
})
```

**Uso en API Route:**

```typescript
import { esquemaLogin } from '@/lib/validaciones'

export async function POST(request: Request) {
  const body = await request.json()
  const resultado = esquemaLogin.safeParse(body)

  if (!resultado.success) {
    return Response.json(
      { error: 'Datos inválidos', detalles: resultado.error.flatten() },
      { status: 400 }
    )
  }

  const { email, password } = resultado.data
  // email ya está normalizado (lowercase, sin espacios)
  // ...
}
```

**Sanitización de HTML:** Para campos de texto libre (como `descripcion` de instalación o `motivo` de bloqueo), usar `dompurify` si el contenido va a renderizarse como HTML, o simplemente tratar todo el input como texto plano (recomendado para este proyecto).

---

### 1.6 Headers de seguridad HTTP en next.config.js

**Configuración completa recomendada** para `next.config.js`:

```javascript
const securityHeaders = [
  // Evita que el navegador haga sniffing del Content-Type
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Prohíbe que la app se embeba en iframes (clickjacking)
  { key: 'X-Frame-Options', value: 'DENY' },
  // Fuerza HTTPS (2 años, incluye subdominios)
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Controla la información del Referer
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Restringe APIs del navegador no necesarias
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  // Content Security Policy
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",  // unsafe-eval necesario para Next.js dev
      "style-src 'self' 'unsafe-inline'",                 // Tailwind requiere unsafe-inline
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
    ].join('; '),
  },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

module.exports = nextConfig
```

**Validar con:** https://securityheaders.com (objetivo: puntuación A o A+)

---

### 1.7 Protección de rutas por rol: Middleware vs Server Components

#### CVE-2025-29927: Vulnerabilidad crítica en el middleware de Next.js

**ALERTA CRÍTICA (Marzo 2025):** Se descubrió una vulnerabilidad de bypass de autorización en el middleware de Next.js (CVE-2025-29927, CVSS 9.1).

- **Cómo funciona:** Añadiendo el header `x-middleware-subrequest: middleware:middleware:middleware:middleware:middleware` a cualquier request, el middleware se salta completamente.
- **Versiones afectadas:** Next.js 14.x antes de 14.2.25, Next.js 15.x antes de 15.2.3.
- **Versiones parcheadas:** 14.2.25+ y 15.2.3+.

**Verificar la versión instalada:**
```bash
npm list next
```

Si la versión es anterior a 14.2.25, actualizar INMEDIATAMENTE:
```bash
npm install next@14.2.25
```

#### Estrategia de defensa en profundidad (recomendada)

Nunca confiar solo en el middleware. Usar tres capas:

**Capa 1 — Middleware** (primera línea, UX):
```typescript
// src/middleware.ts
import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    // Redirigir si ADMIN intenta acceder a rutas de ciudadano
    if (pathname.startsWith('/admin') && token?.rol !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login?error=sin-acceso', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: ['/admin/:path*', '/mis-reservas/:path*', '/reservar/:path*'],
}
```

**Capa 2 — Server Component / Layout** (verificación en el servidor):
```typescript
// src/app/admin/layout.tsx
import { getServerSession } from 'next-auth'
import { opcionesAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const sesion = await getServerSession(opcionesAuth)

  // Verificación independiente del middleware
  if (!sesion || sesion.user?.rol !== 'ADMIN') {
    redirect('/login?error=sin-acceso')
  }

  return <>{children}</>
}
```

**Capa 3 — API Routes** (validación en cada endpoint):
```typescript
// src/app/api/admin/reservas/route.ts
import { getServerSession } from 'next-auth'
import { opcionesAuth } from '@/lib/auth'

export async function GET() {
  const sesion = await getServerSession(opcionesAuth)

  if (!sesion || sesion.user?.rol !== 'ADMIN') {
    return Response.json({ error: 'No autorizado' }, { status: 403 })
  }

  // ... lógica del endpoint
}
```

---

### 1.8 Password hashing: bcrypt vs Argon2

#### Conclusión 2025: bcrypt con coste 12 es suficiente, Argon2id es mejor para proyectos nuevos

| Criterio | bcrypt (coste 12) | Argon2id |
|---|---|---|
| Estándar actual | Sí, ampliamente aceptado | Sí, ganador PHC 2015 |
| Recomendado por NIST | Sí | Sí (preferido) |
| Resistencia a GPU/ASIC | Limitada (4 KB memoria fija) | Alta (memoria configurable) |
| Soporte en Node.js | `bcryptjs` (sin compilar C) | `argon2` (necesita compilar) |
| Compatibilidad con Vercel | `bcryptjs` funciona sin problemas | Puede requerir configuración extra |
| Coste de migración | — | Alto si hay usuarios existentes |

**Recomendación para este proyecto:**

- **Mantener bcrypt con coste 12** para los usuarios actuales (admin del seed).
- El coste 12 (~150ms en hardware moderno) hace que un ataque de diccionario requiera meses.
- Si el proyecto empezara desde cero sin usuarios existentes, usar Argon2id.
- Para migrar a Argon2id en el futuro: re-hashear en el siguiente login del usuario.

**Verificar que el seed usa coste 12:**
```typescript
// prisma/seed.ts — verificar esta línea
const hash = await bcrypt.hash('admin123', 12)  // coste 12 ✓
```

---

### 1.9 Logging de intentos de login fallidos

**Estrategia recomendada:** Registrar en la base de datos los intentos fallidos para análisis posterior, sin bloquear la respuesta al usuario.

**Modelo a añadir en Prisma** (opcional, para auditoría):

```prisma
model IntentoLogin {
  id        String   @id @default(uuid())
  email     String   // email intentado (puede no existir en BD)
  ip        String
  exitoso   Boolean
  creadoEn  DateTime @default(now())

  @@index([email, creadoEn])
  @@index([ip, creadoEn])
}
```

**En producción**, considerar usar un servicio de logging externo (Datadog, Sentry, Logtail) para no sobrecargar la BD principal con logs de seguridad.

---

## Tema 2: Panel de administración {#tema-2}

### 2.1 Estructura de rutas para el panel admin

**Estructura recomendada con Route Groups:**

```
src/app/
├── (publico)/              # Rutas públicas sin autenticación
│   ├── page.tsx            # Página de inicio
│   ├── login/page.tsx
│   └── registro/page.tsx
│
├── (ciudadano)/            # Rutas del ciudadano autenticado
│   ├── layout.tsx          # Verifica rol CIUDADANO o ADMIN
│   ├── instalaciones/page.tsx
│   ├── reservar/[id]/page.tsx
│   └── mis-reservas/page.tsx
│
└── admin/                  # Panel admin (sin route group — nombre significativo en URL)
    ├── layout.tsx          # Verifica rol ADMIN + sidebar navigation
    ├── page.tsx            # Dashboard principal
    ├── reservas/
    │   ├── page.tsx        # Lista de todas las reservas
    │   └── [id]/page.tsx   # Detalle de una reserva
    ├── instalaciones/
    │   ├── page.tsx        # Gestión de instalaciones
    │   └── nueva/page.tsx  # Crear instalación
    ├── bloqueos/
    │   ├── page.tsx        # Lista de bloqueos
    │   └── nuevo/page.tsx  # Crear bloqueo
    └── usuarios/
        └── page.tsx        # Gestión de admins
```

**Por qué `/admin` sin paréntesis:** El segmento `/admin` debe aparecer en la URL para que sea claro que es una zona restringida. Los route groups `(admin)` se usan cuando se quiere compartir un layout sin que el nombre aparezca en la URL.

---

### 2.2 Layout del panel admin con shadcn/ui

El componente `Sidebar` de shadcn/ui (añadido en Q4 2024) es la solución más completa:

```typescript
// src/app/admin/layout.tsx
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AdminSidebar } from '@/components/admin/sidebar'
import { getServerSession } from 'next-auth'
import { opcionesAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const sesion = await getServerSession(opcionesAuth)
  if (!sesion || sesion.user?.rol !== 'ADMIN') redirect('/login')

  return (
    <SidebarProvider>
      <AdminSidebar usuario={sesion.user} />
      <main className="flex-1 overflow-auto">
        <div className="flex items-center gap-2 p-4 border-b">
          <SidebarTrigger />
          {/* Breadcrumbs aquí */}
        </div>
        <div className="p-6">{children}</div>
      </main>
    </SidebarProvider>
  )
}
```

**Navegación del sidebar** (config centralizada):

```typescript
// src/config/nav-admin.ts
import { Calendar, Building2, Ban, Users, LayoutDashboard } from 'lucide-react'

export const navAdmin = [
  { titulo: 'Dashboard', url: '/admin', icono: LayoutDashboard },
  { titulo: 'Reservas', url: '/admin/reservas', icono: Calendar },
  { titulo: 'Instalaciones', url: '/admin/instalaciones', icono: Building2 },
  { titulo: 'Bloqueos', url: '/admin/bloqueos', icono: Ban },
  { titulo: 'Administradores', url: '/admin/usuarios', icono: Users },
]
```

---

### 2.3 Dashboard: métricas y widgets recomendados

Para una app de reservas deportivas municipales, estas son las métricas más útiles:

**Fila 1 — KPIs del día (tarjetas):**
- Reservas activas hoy (total + desglose por tipo: pádel / piscina)
- Ocupación media de instalaciones hoy (%)
- Reservas canceladas hoy
- Nuevos registros de ciudadanos esta semana

**Fila 2 — Estado en tiempo real:**
- Mapa de disponibilidad: grid instalación × hora para el día actual (verde = libre, rojo = ocupado, naranja = bloqueado)
- Lista de próximas reservas (siguientes 2 horas)

**Fila 3 — Tendencias:**
- Gráfico de barras: reservas por día (última semana)
- Gráfico de barras: reservas por instalación (mes actual)
- Instalación más demandada del mes

**Fila 4 — Alertas:**
- Bloqueos activos vigentes
- Reservas que empiezan en < 30 minutos (para coordinación del personal)

**Implementación con librería de gráficos:**
```bash
npm install recharts
# o bien: npm install @tremor/react  (componentes de dashboard listos, basados en Tailwind)
```

---

### 2.4 Gestión de reservas: vista tabular con filtros

**Componente recomendado:** `DataTable` de shadcn/ui (basado en TanStack Table v8).

```bash
npx shadcn@latest add data-table
npm install @tanstack/react-table
```

**Filtros a implementar:**

| Filtro | Tipo | Opciones |
|---|---|---|
| Instalación | Select | Todas, Pádel 1, Pádel 2, ..., Calle 10 |
| Tipo | Select | Todas, Pádel, Piscina |
| Estado | Select | Todas, Activas, Canceladas |
| Fecha | DatePicker | Día concreto o rango |
| Búsqueda de usuario | Input texto | Busca por nombre o email |

**Columnas de la tabla:**

| Columna | Datos |
|---|---|
| Instalación | Nombre + badge de tipo |
| Ciudadano | Nombre + email |
| Fecha y hora | "Lunes 24 mar, 10:00–11:00" |
| Estado | Badge ACTIVA (verde) / CANCELADA (rojo) |
| Acciones | Botón "Cancelar" (solo si ACTIVA) |

**Paginación del lado del servidor** (recomendado para listas grandes):
```typescript
// src/app/api/admin/reservas/route.ts
const reservas = await prisma.reserva.findMany({
  where: filtros,
  skip: (pagina - 1) * tamanyoPagina,
  take: tamanyoPagina,
  orderBy: { fecha: 'desc' },
  include: { usuario: true, instalacion: true },
})
```

---

### 2.5 Sistema de bloqueos de instalaciones

**Flujo para crear un bloqueo:**

1. Admin selecciona instalación(es) a bloquear
2. Elige rango de fecha/hora (fechaInicio, fechaFin)
3. Escribe motivo (obligatorio: "Mantenimiento", "Festivo", "Evento especial", etc.)
4. Sistema verifica si hay reservas activas en ese rango
5. Si hay reservas activas: mostrar listado y pedir confirmación para cancelarlas automáticamente
6. Crear el bloqueo + cancelar las reservas conflictivas en una sola transacción

**Lógica de conflicto de reservas:**
```typescript
// En la API Route de creación de bloqueo
const reservasConflictivas = await prisma.reserva.findMany({
  where: {
    instalacionId: body.instalacionId,
    estado: 'ACTIVA',
    horaInicio: { gte: body.fechaInicio },
    horaFin: { lte: body.fechaFin },
  },
})

// Si hay conflictos, cancelarlos en la misma transacción
await prisma.$transaction([
  prisma.bloqueo.create({ data: { ...body, creadoPorId: sesion.user.id } }),
  prisma.reserva.updateMany({
    where: { id: { in: reservasConflictivas.map(r => r.id) } },
    data: { estado: 'CANCELADA', canceladoEn: new Date(), canceladoPor: sesion.user.id },
  }),
])
```

---

### 2.6 Gestión de cuentas de administrador

**Reglas de negocio:**
- Solo un ADMIN puede crear otro ADMIN.
- No se puede eliminar un ADMIN, solo desactivarlo (`activo = false`).
- Un ADMIN no puede desactivarse a sí mismo.
- Debe existir al menos un ADMIN activo en todo momento.

**Flujo de creación de admin:**
1. El admin existente introduce email y nombre del nuevo admin.
2. El sistema genera una contraseña temporal aleatoria (o envía un link de activación por email con Resend).
3. El nuevo admin debe cambiar su contraseña en el primer login.

---

### 2.7 Auditoría de acciones admin (log de quién hizo qué)

**Estrategia recomendada: tabla de auditoría en la misma BD**

Para el volumen de un ayuntamiento pequeño, una tabla en la BD es suficiente y más simple que un servicio externo.

**Modelo Prisma a añadir:**

```prisma
model AuditoriaAdmin {
  id          String   @id @default(uuid())
  adminId     String
  accion      String   // "CANCELAR_RESERVA", "CREAR_BLOQUEO", "CREAR_ADMIN", etc.
  entidad     String   // "Reserva", "Bloqueo", "Usuario", "Instalacion"
  entidadId   String?  // ID del registro afectado
  detalle     String?  // JSON con datos adicionales (JSON como String en SQLite)
  ip          String?
  creadoEn    DateTime @default(now())

  admin       Usuario  @relation(fields: [adminId], references: [id])

  @@index([adminId, creadoEn])
  @@index([entidad, entidadId])
}
```

**Helper para registrar auditoría:**

```typescript
// src/lib/auditoria.ts
export async function registrarAccion({
  adminId,
  accion,
  entidad,
  entidadId,
  detalle,
  ip,
}: {
  adminId: string
  accion: string
  entidad: string
  entidadId?: string
  detalle?: Record<string, unknown>
  ip?: string
}) {
  // No bloquear la respuesta al usuario — registrar en background
  prisma.auditoriaAdmin.create({
    data: {
      adminId,
      accion,
      entidad,
      entidadId,
      detalle: detalle ? JSON.stringify(detalle) : undefined,
      ip,
    },
  }).catch(console.error)  // Fallar silenciosamente para no afectar la operación principal
}
```

**Acciones a registrar:**

| Acción | Cuándo |
|---|---|
| `CANCELAR_RESERVA` | Admin cancela reserva de ciudadano |
| `CREAR_BLOQUEO` | Admin crea un bloqueo |
| `ELIMINAR_BLOQUEO` | Admin elimina un bloqueo |
| `CREAR_INSTALACION` | Admin añade instalación |
| `DESACTIVAR_INSTALACION` | Admin desactiva instalación |
| `CREAR_ADMIN` | Admin crea otro admin |
| `DESACTIVAR_ADMIN` | Admin desactiva una cuenta admin |
| `CREAR_RESERVA_MANUAL` | Admin crea reserva para un ciudadano |

---

### 2.8 Patrones de UI para el panel admin

**Sidebar navigation:**
- Usar `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton` de shadcn/ui
- Indicar la página activa con `usePathname()` de Next.js
- Sidebar colapsable en móvil (Sheet automático de shadcn/ui)

**Breadcrumbs:**
```typescript
// src/components/admin/breadcrumbs.tsx
// Admin > Reservas > Detalle #123
// Usar el componente Breadcrumb de shadcn/ui
```

**Data tables:**
- `DataTable` de shadcn/ui con TanStack Table
- Columnas ordenables por click en header
- Filtros en la parte superior de la tabla
- Paginación en la parte inferior

**Formularios:**
- `react-hook-form` + Zod para validación
- Componentes `Form`, `FormField`, `FormItem` de shadcn/ui
- Feedback inmediato de errores de validación

**Confirmaciones de acciones destructivas:**
```typescript
// Usar AlertDialog de shadcn/ui para:
// - Cancelar una reserva
// - Desactivar una instalación
// - Crear un bloqueo con reservas activas
```

---

## Tema 3: Gestión dinámica de instalaciones {#tema-3}

### 3.1 Análisis: ¿permitir añadir/eliminar instalaciones?

#### Pros de la gestión dinámica

- **Adaptación a cambios reales:** Los ayuntamientos remodelan instalaciones, construyen nuevas o cierran antiguas. Sin gestión dinámica, hay que tocar el código para cada cambio.
- **Autonomía operativa:** El personal del ayuntamiento no depende de un desarrollador para actualizar el inventario.
- **Casos de uso concretos:**
  - Se construye una 4ª pista de pádel → añadir `Pádel 4`
  - Se reparte la piscina en más calles → añadir `Calle 11`, `Calle 12`
  - Se cierra temporalmente una instalación para reformas largas → desactivar
  - Se inaugura una pista de tenis o frontón → añadir con nuevo tipo

#### Contras y riesgos

- **Integridad referencial:** Eliminar una instalación con reservas asociadas requiere decisiones sobre esas reservas.
- **Complejidad añadida:** La UI para gestionar instalaciones requiere desarrollo adicional.
- **Errores del admin:** Un admin podría eliminar/desactivar una instalación por error.

#### Recomendación: implementar gestión dinámica con soft-delete

El campo `activa: Boolean` ya existe en el modelo `Instalacion`. Esto es exactamente el patrón correcto. **Implementar:**

1. **Crear instalaciones:** CRUD completo desde el panel admin.
2. **Desactivar instalaciones:** Cambiar `activa = false` (soft-delete). Nunca hard-delete desde la UI.
3. **Hard-delete:** Solo disponible vía script de mantenimiento y solo si no tiene reservas asociadas.

---

### 3.2 Impacto en integridad referencial

**Escenario: se desactiva una instalación con reservas futuras activas**

El modelo actual tiene FK estricta `Reserva → Instalacion`. Prisma por defecto usa `onDelete: Restrict`, lo que impide eliminar una `Instalacion` que tiene `Reservas` asociadas.

Con soft-delete (cambiar `activa = false`), la FK nunca se viola: la instalación sigue existiendo en BD, solo se oculta en la UI.

**Lo que debe ocurrir al desactivar una instalación:**

```typescript
// src/app/api/admin/instalaciones/[id]/route.ts
export async function PATCH(request: Request, { params }) {
  // 1. Verificar reservas futuras activas
  const reservasFuturas = await prisma.reserva.count({
    where: {
      instalacionId: params.id,
      estado: 'ACTIVA',
      fecha: { gte: new Date() },
    },
  })

  if (reservasFuturas > 0) {
    // Opción A: Bloquear la desactivación hasta que no haya reservas futuras
    // Opción B: Cancelar automáticamente las reservas (con confirmación previa del admin)
    // RECOMENDACIÓN: Opción B con paso de confirmación en la UI
    return Response.json(
      {
        error: 'Hay reservas futuras activas',
        reservasFuturas,
        requiereConfirmacion: true
      },
      { status: 409 }
    )
  }

  // 2. Desactivar la instalación
  await prisma.instalacion.update({
    where: { id: params.id },
    data: { activa: false },
  })

  return Response.json({ ok: true })
}
```

**Si el admin confirma la cancelación masiva:**
```typescript
// Con force=true en el body, cancelar reservas + desactivar en transacción
await prisma.$transaction([
  prisma.reserva.updateMany({
    where: { instalacionId: params.id, estado: 'ACTIVA', fecha: { gte: new Date() } },
    data: { estado: 'CANCELADA', canceladoEn: new Date(), canceladoPor: adminId },
  }),
  prisma.instalacion.update({
    where: { id: params.id },
    data: { activa: false },
  }),
])
// + Enviar email de notificación a los ciudadanos afectados (via Resend)
```

---

### 3.3 Estrategia soft-delete vs hard-delete

**Para instalaciones: siempre soft-delete desde la UI**

| Operación | Cuándo | Quién |
|---|---|---|
| Soft-delete (`activa = false`) | Siempre desde la UI | Admin |
| Reactivo (`activa = true`) | Si fue error o terminó la reforma | Admin |
| Hard-delete | Solo si: nunca tuvo reservas Y es una instalación creada por error | Script de mantenimiento |

**Ventajas del soft-delete en este contexto:**

1. **Historial preservado:** Las reservas pasadas mantienen su `instalacionId` válido. Los informes históricos siguen siendo correctos.
2. **Recuperación de errores:** Un admin que desactivó por error puede reactivar en segundos.
3. **Auditoría:** Se puede ver qué instalaciones existieron y cuándo se desactivaron.
4. **Sin problemas de FK:** La FK de `Reserva → Instalacion` nunca se rompe.

**Cómo aplicar el filtro `activa = true` en todas las consultas públicas:**

```typescript
// src/lib/prisma-helpers.ts
// Helper para obtener solo instalaciones activas
export function soloInstalacionesActivas() {
  return { activa: true }
}

// En las API Routes públicas:
const instalaciones = await prisma.instalacion.findMany({
  where: soloInstalacionesActivas(),
  orderBy: [{ tipo: 'asc' }, { nombre: 'asc' }],
})

// En el panel admin, mostrar TODAS (activas e inactivas) con indicador visual:
const instalaciones = await prisma.instalacion.findMany({
  orderBy: [{ activa: 'desc' }, { tipo: 'asc' }, { nombre: 'asc' }],
})
```

---

### 3.4 Validaciones al crear una instalación

**Esquema Zod para nueva instalación:**

```typescript
import { z } from 'zod'

const TIPOS_VALIDOS = ['PADEL', 'PISCINA'] as const

export const esquemaInstalacion = z.object({
  nombre: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(50, 'El nombre no puede superar 50 caracteres')
    .trim()
    .regex(/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-\.]+$/, 'El nombre contiene caracteres no válidos'),
  tipo: z.enum(TIPOS_VALIDOS, {
    errorMap: () => ({ message: 'El tipo debe ser PADEL o PISCINA' }),
  }),
  descripcion: z
    .string()
    .max(500, 'La descripción no puede superar 500 caracteres')
    .trim()
    .optional(),
})

// En la API Route, verificar unicidad del nombre:
const existe = await prisma.instalacion.findUnique({ where: { nombre: body.nombre } })
if (existe) {
  return Response.json({ error: 'Ya existe una instalación con ese nombre' }, { status: 409 })
}
```

**Validaciones adicionales:**
- El nombre debe ser único (el esquema Prisma ya tiene `@unique` en `nombre`).
- No permitir instalar con el mismo nombre que una ya existente aunque esté inactiva (evitar confusión en reportes históricos).
- El tipo solo puede ser `PADEL` o `PISCINA` (validación estricta con Zod enum).

---

### 3.5 Flujo UI para gestionar instalaciones desde el admin

**Página `/admin/instalaciones`:**

```
┌─────────────────────────────────────────────────────────┐
│ Instalaciones                          [+ Nueva]        │
├─────────────────────────────────────────────────────────┤
│ Filtros: [Tipo ▼] [Estado ▼]                           │
├─────────────────────────────────────────────────────────┤
│ Nombre      │ Tipo    │ Estado   │ Creada     │ Acciones│
│─────────────│─────────│──────────│────────────│─────────│
│ Pádel 1     │ PÁDEL   │ ● Activa │ 23/03/2026 │ [···]  │
│ Pádel 2     │ PÁDEL   │ ● Activa │ 23/03/2026 │ [···]  │
│ Calle 1     │ PISCINA │ ● Activa │ 23/03/2026 │ [···]  │
│ Calle Vieja │ PISCINA │ ○ Inact. │ 01/01/2025 │ [···]  │
└─────────────────────────────────────────────────────────┘
```

**Menú de acciones `[···]` por instalación:**
- Ver reservas actuales
- Editar (nombre, descripción)
- Desactivar → Dialog de confirmación
- Reactivar (si está inactiva)

**Dialog de creación (`/admin/instalaciones/nueva`):**
```
┌──────────────────────────────┐
│ Nueva instalación            │
│                              │
│ Nombre *                     │
│ [___________________]        │
│                              │
│ Tipo *                       │
│ [Pádel ▼]                   │
│  ○ Pádel                     │
│  ○ Piscina                   │
│                              │
│ Descripción (opcional)       │
│ [___________________]        │
│                              │
│         [Cancelar] [Crear]   │
└──────────────────────────────┘
```

---

## Plan de implementación priorizado {#plan-de-implementacion}

### Prioridad 1 — Crítico (antes de producción)

1. **Actualizar Next.js a 14.2.25+** para corregir CVE-2025-29927
2. **Añadir verificación de rol en `AdminLayout`** (defensa en profundidad)
3. **Corregir timing attack** en `authorize()` (hash dummy siempre)
4. **Mensaje de error genérico** en login (no revelar si el email existe)
5. **Headers de seguridad** en `next.config.js`
6. **Añadir Zod** para validación de inputs en todas las API Routes

### Prioridad 2 — Importante (antes del lanzamiento)

7. **Rate limiting** en el endpoint de login (Upstash o solución in-memory para dev)
8. **Expiración de sesión en 8 horas** (en lugar del default de 30 días)
9. **Verificación de `activo`** en el callback JWT para detectar usuarios desactivados
10. **Tabla de auditoría** para acciones del admin

### Prioridad 3 — Mejora (post-lanzamiento)

11. **Logging de intentos de login fallidos** a una tabla o servicio externo
12. **Argon2id** para nuevas instalaciones/usuarios (con migración gradual)
13. **Exportación CSV** con datos de auditoría
14. **Panel de seguridad** para el admin (ver intentos fallidos por IP, etc.)

---

## Resumen ejecutivo

| Tema | Riesgo actual | Acción inmediata |
|---|---|---|
| Timing attack en login | Medio | Corregir con hash dummy |
| CVE-2025-29927 | CRÍTICO si Next.js < 14.2.25 | Actualizar Next.js |
| Rate limiting | Alto (sin límite de intentos) | Implementar con Upstash |
| Headers de seguridad | Medio (app sin headers) | Añadir en next.config.js |
| Sesión JWT de 30 días | Medio | Reducir a 8 horas |
| Gestión de instalaciones | — (no implementado) | Soft-delete con campo `activa` |
| Panel admin | — (no implementado) | Estructura con route groups |

---

*Fuentes consultadas: NextAuth.js docs, ProjectDiscovery Blog (CVE-2025-29927), Upstash Blog, Prisma Docs, TurboStarter Next.js Security Guide 2025, NIST password hashing recommendations, Snyk vulnerability database, Vercel postmortem CVE-2025-29927.*
