# Reserva de Pistas Deportivas — Ayuntamiento

## Descripción del proyecto
Aplicación web para gestionar reservas de instalaciones deportivas municipales.
Fase actual: app web responsive. Fase futura: app móvil iOS/Android con Capacitor.

## Stack tecnológico
- Framework: Next.js 14 (App Router) + TypeScript
- Estilos: Tailwind CSS + shadcn/ui
- Base de datos: PostgreSQL + Prisma ORM
- Autenticación: NextAuth.js
- Emails: Resend
- Deploy: Vercel

## Instalaciones deportivas
- 3 pistas de pádel (Pádel 1, Pádel 2)
- 10 calles de piscina

## Tipos de usuario
1. **Ciudadano**: registro, login, ver disponibilidad, reservar, cancelar, recibir email
2. **Administrador**: ver todas las reservas, bloquear horarios, gestionar instalaciones

## Reglas de negocio
- Horario disponible: 8:00 a 22:00, slots de 1 hora
- Máximo 2 reservas activas por ciudadano a la vez
- Cancelación permitida hasta 2 horas antes
- El admin puede reservar sin restricciones

## Idioma
Todo en español. Textos de UI, mensajes de error, emails — todo en español.

## Lo que NO se construye ahora
- Pagos online
- App nativa iOS/Android
- Integración con sede electrónica del ayuntamiento