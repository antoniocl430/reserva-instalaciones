# Decisiones Técnicas — Sistema de Reservas Deportivas

## Stack elegido

| Capa | Tecnología | Razón |
|---|---|---|
| Framework | Next.js 14 (App Router) | Full-stack en un solo repo, SSR para rendimiento, fácil deploy |
| Lenguaje | TypeScript | Tipos seguros, menos bugs, mejor autocompletado |
| Estilos | Tailwind CSS | Desarrollo rápido, consistencia visual |
| Componentes | shadcn/ui | Componentes accesibles y personalizables sin librería pesada |
| Base de datos (local) | SQLite | Sin instalación, Prisma lo gestiona automáticamente, ideal para desarrollo |
| Base de datos (producción) | PostgreSQL via Supabase | Robusto, relacional, plan gratuito, migración trivial desde SQLite con Prisma |
| ORM | Prisma | Tipado automático, migraciones simples, compatible con SQLite y PostgreSQL |
| Autenticación | NextAuth.js | Integración nativa con Next.js, gestión de sesiones y roles |
| Emails | Resend | API simple, buena entregabilidad, 3.000 emails/mes gratis |
| Deploy | Vercel | Deploy automático desde GitHub, SSL gratis, plan gratuito suficiente |

---

## Estrategia de base de datos por entorno

| Entorno | Base de datos | Dónde corre |
|---|---|---|
| Desarrollo local | SQLite | PC del desarrollador, archivo local |
| Producción (pruebas) | PostgreSQL | Supabase (plan gratuito, 500MB) |
| Producción (definitivo) | PostgreSQL | Supabase o servidor del ayuntamiento |

La migración de SQLite a PostgreSQL cuando se suba a producción consiste en:
1. Cambiar `provider = "sqlite"` a `provider = "postgresql"` en `schema.prisma`
2. Actualizar `DATABASE_URL` en las variables de entorno de Vercel
3. Ejecutar `prisma migrate deploy`

El código de la aplicación no cambia en absoluto.

---

## Decisiones importantes

### Por qué SQLite en local y no PostgreSQL desde el principio
SQLite no requiere instalar ningún servidor. Prisma crea el archivo de base de datos
automáticamente al ejecutar las migraciones. Para un proyecto en fase de desarrollo
con un solo desarrollador, elimina completamente la fricción de configuración inicial.
Cuando el proyecto suba a producción, la migración a PostgreSQL es un cambio de dos líneas.

### Por qué PostgreSQL en producción y no SQLite
SQLite no está diseñado para múltiples usuarios simultáneos escribiendo a la vez.
En producción, varios ciudadanos podrían intentar reservar el mismo slot al mismo tiempo.
PostgreSQL gestiona esto con transacciones y bloqueos a nivel de fila, evitando reservas duplicadas.

### Por qué Next.js y no React puro
Next.js permite tener frontend y backend (API Routes) en el mismo proyecto.
No necesitamos un servidor backend separado, lo que simplifica el deploy y el mantenimiento.

### Por qué shadcn/ui
No es una librería de componentes tradicional — copia el código en el proyecto,
por lo que no hay dependencias externas que puedan romperse.
Los componentes son accesibles (WCAG) por defecto, importante para una app municipal.

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
| PostgreSQL local | Requiere instalación y configuración manual, SQLite es suficiente para desarrollo |