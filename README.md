# Reserva de Instalaciones Deportivas

Plataforma SaaS multi-tenant para gestionar reservas de instalaciones deportivas municipales. Cada ayuntamiento tiene su propio subdominio, datos aislados y configuración visual. El servicio es gratuito para los ciudadanos.

## Stack

- **Framework:** Next.js 14 (App Router) + TypeScript
- **UI:** Tailwind CSS + shadcn/ui
- **Base de datos:** PostgreSQL (Supabase) con Prisma ORM
- **Auth:** NextAuth.js (roles: CIUDADANO / ADMIN / INSTRUCTOR / SUPERADMIN)
- **Emails:** Resend
- **Push notifications:** Web Push API
- **Deploy:** Cloudflare Workers (opennextjs-cloudflare) + Supabase

## Roles

| Rol | Acceso |
|-----|--------|
| CIUDADANO | Reservas, perfil, notificaciones |
| ADMIN | Panel completo del ayuntamiento |
| INSTRUCTOR | Panel `/instructor`, reservas recurrentes |
| SUPERADMIN | Panel global de todos los tenants |

## Instalación local

```bash
npm install
cp .env.example .env.local   # rellenar variables de entorno
npx prisma migrate dev
npx prisma db seed
npm run dev
```

## Tests

```bash
npm test              # Jest — API routes y lógica de servidor (291 tests)
npx vitest run        # Vitest — componentes y páginas React (155 tests)
npx playwright test   # E2E con Playwright
```

## Variables de entorno requeridas

```
DATABASE_URL=           # PostgreSQL (Supabase)
NEXTAUTH_SECRET=        # Secreto para JWT
NEXTAUTH_URL=           # URL base de la app
RESEND_API_KEY=         # API key de Resend (emails)
VAPID_PUBLIC_KEY=       # Clave pública VAPID (push)
VAPID_PRIVATE_KEY=      # Clave privada VAPID (push)
VAPID_SUBJECT=          # mailto:... para VAPID
CRON_SECRET=            # Secreto para el endpoint /api/cron/recordatorios
R2_ACCOUNT_ID=          # Cloudflare R2 (avatares)
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=
```

## Estructura del proyecto

```
src/
├── app/                    # Páginas y API routes (Next.js App Router)
│   ├── api/                # Endpoints REST
│   ├── admin/(panel)/      # Panel de administración
│   ├── instructor/         # Panel del instructor
│   ├── superadmin/(panel)/ # Panel superadmin
│   └── ...                 # Páginas públicas y de ciudadano
├── components/             # Componentes React reutilizables
├── lib/                    # Utilidades: auth, email, push, tenant, prisma
├── types/                  # Tipos TypeScript (next-auth.d.ts)
└── __tests__/              # Tests organizados por tipo
    ├── api/                # Tests Jest de API routes
    ├── backend/            # Tests Jest de lógica de servidor
    ├── components/         # Tests Vitest de componentes
    └── frontend/           # Tests Vitest de páginas
prisma/
├── schema.prisma           # Esquema de base de datos
└── migrations/             # Historial de migraciones
docs/                       # Documentación del proyecto
tasks/                      # Historial de tareas y lecciones aprendidas
e2e/                        # Tests E2E con Playwright
public/                     # Assets estáticos (iconos PWA, service worker)
```

## Documentación

- `docs/PRD.md` — Qué construimos y para quién
- `docs/USER-STORIES.md` — Historias de usuario por rol
- `docs/DATA-MODEL.md` — Modelo de datos y relaciones
- `docs/UI-FLOWS.md` — Pantallas y navegación
- `docs/TECH-DECISIONS.md` — Decisiones técnicas
- `docs/ROADMAP.md` — Fases completadas y backlog
- `tasks/lessons.md` — Lecciones aprendidas durante el desarrollo
