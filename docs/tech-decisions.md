# Decisiones Técnicas — Sistema de Reservas Deportivas

## Stack elegido

| Capa | Tecnología | Razón |
|---|---|---|
| Framework | Next.js 14 (App Router) | Full-stack en un solo repo, SSR para rendimiento, fácil deploy |
| Lenguaje | TypeScript | Tipos seguros, menos bugs, mejor autocompletado |
| Estilos | Tailwind CSS | Desarrollo rápido, consistencia visual |
| Componentes | shadcn/ui | Componentes accesibles y personalizables sin librería pesada |
| Base de datos | PostgreSQL via Supabase | Robusto, relacional, transacciones con bloqueo a nivel de fila |
| ORM | Prisma | Tipado automático, migraciones simples |
| Autenticación | NextAuth.js | Integración nativa con Next.js, gestión de sesiones y roles |
| Validación | Zod | Estándar de facto en el ecosistema Next.js + TypeScript, validación en todas las API Routes |
| Emails | Resend | API simple, buena entregabilidad, 3.000 emails/mes gratis |
| Deploy | Vercel + Supabase | Deploy automático desde GitHub, SSL gratis, plan gratuito suficiente |

---

## Estrategia de base de datos

PostgreSQL (Supabase) se usa en todos los entornos, tanto en desarrollo local como en producción.
No se usa SQLite en ningún entorno.

| Entorno | Base de datos | Dónde corre |
|---|---|---|
| Desarrollo local | PostgreSQL | Supabase (plan gratuito, 500MB) |
| Producción | PostgreSQL | Supabase o servidor del ayuntamiento |

---

## Estrategia de testing

| Tipo de test | Herramienta | Qué cubre |
|---|---|---|
| Tests de API (backend) | Jest | API Routes: lógica, validaciones Zod, rate limiting, reglas de negocio |
| Tests de frontend | Vitest + Testing Library | Componentes React: renderizado, interacciones, formularios |

Los tests de API se ubican en `src/__tests__/api/` y los de frontend en `src/__tests__/components/`.

---

## Decisiones importantes

### Por qué PostgreSQL en todos los entornos
PostgreSQL gestiona múltiples usuarios simultáneos con transacciones y bloqueos a nivel de fila,
lo que evita reservas duplicadas. Al usar Supabase desde el principio (desarrollo y producción),
se elimina la fricción de la migración y se garantiza paridad entre entornos.

### Por qué Next.js y no React puro
Next.js permite tener frontend y backend (API Routes) en el mismo proyecto.
No necesitamos un servidor backend separado, lo que simplifica el deploy y el mantenimiento.

### Por qué shadcn/ui
No es una librería de componentes tradicional — copia el código en el proyecto,
por lo que no hay dependencias externas que puedan romperse.
Los componentes son accesibles (WCAG) por defecto, importante para una app municipal.

### Por qué Zod para validación
Zod permite definir esquemas de validación con tipos TypeScript inferidos automáticamente.
Todas las API Routes del proyecto validan los datos de entrada con Zod antes de procesarlos.
Esto garantiza que los datos que llegan a la base de datos siempre tienen el formato correcto.

### Por qué rate limiting en memoria (Map) y no Upstash/Redis
Para una instancia única de Vercel (plan gratuito), el rate limiter en memoria con `Map`
es suficiente y no requiere infraestructura adicional. Se implementa en `src/lib/rate-limit.ts`:
- Máximo 5 intentos fallidos por IP en ventana de 15 minutos
- Reset automático tras login exitoso
- Reset automático cuando expira la ventana de tiempo

Si en el futuro se escalan a múltiples instancias, se puede migrar a `@upstash/ratelimit` + Redis
sin cambiar la interfaz de uso.

### Zona horaria: Europe/Madrid
Todos los cálculos de slots horarios se realizan en la zona horaria `Europe/Madrid`.
Las API Routes de disponibilidad y reservas usan el helper `crearHoraEnMadrid()` para
construir objetos `Date` correctos independientemente del servidor donde corra la aplicación.

### Por qué Resend para emails
Alternativa más moderna a Nodemailer. API REST simple, buen plan gratuito (3.000 emails/mes),
no requiere configurar un servidor SMTP propio.

---

## Preparación para móvil (Fase 2)

El proyecto se construye con móvil en mente desde el principio:
- Diseño mobile-first con Tailwind
- Sin dependencias que impidan la conversión a Capacitor
- Las API Routes de Next.js seguirán siendo el backend cuando la app sea móvil

Para convertir a app móvil en Fase 2:
1. Instalar Capacitor en el proyecto Next.js existente
2. Exportar la app como web estática
3. Compilar para iOS (Xcode) y Android (Android Studio)
4. El backend Next.js permanece en Vercel

---

## Lo que NO usamos y por qué

| Tecnología | Por qué no |
|---|---|
| Redux / Zustand | Overkill para este proyecto, useState + React Query es suficiente |
| GraphQL | Innecesario, REST con Next.js API Routes es más simple |
| Docker (por ahora) | Vercel y Supabase gestionan la infraestructura, no necesitamos contenedores |
| Stripe / pagos | El servicio es gratuito |
| MongoDB | NoSQL complica las relaciones entre entidades (Usuario → Reserva → Instalacion) |
| SQLite | No está diseñado para múltiples usuarios simultáneos escribiendo a la vez |
| @upstash/ratelimit | Innecesario para una sola instancia; el Map en memoria es suficiente |
