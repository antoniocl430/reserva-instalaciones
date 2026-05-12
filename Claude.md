# Sistema de Reservas Deportivas — Ayuntamiento

## Descripción
Aplicación web para gestionar reservas de instalaciones deportivas municipales.
Servicio gratuito para ciudadanos. Panel de administración para el personal del ayuntamiento.

---

## Documentación del proyecto
Antes de construir cualquier cosa, lee estos documentos en orden:

1. `docs/PRD.md` — Qué construimos y para quién
2. `docs/USER-STORIES.md` — Qué debe poder hacer cada usuario
3. `docs/DATA-MODEL.md` — Estructura de la base de datos
4. `docs/UI-FLOWS.md` — Pantallas y navegación
5. `docs/TECH-DECISIONS.md` — Stack elegido y por qué
6. `docs/ROADMAP.md` — Orden de construcción por bloques

Al inicio de cada sesión, lee también:
- `tasks/lessons.md` — Errores anteriores y patrones aprendidos
- `tasks/todo.md` — Estado actual de tareas pendientes

---

## Stack
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- SQLite (local) → PostgreSQL (producción) con Prisma ORM
- NextAuth.js (roles: CIUDADANO / ADMIN)
- Resend (emails)
- Deploy: Vercel + Supabase

---

## Orquestación del flujo de trabajo

### Modo de planificación
- Entra en modo planificación para CUALQUIER tarea no trivial (3+ pasos o decisiones arquitectónicas)
- Escribe el plan en `tasks/todo.md` con ítems verificables ANTES de tocar código
- Confirma el plan antes de comenzar la implementación
- Si algo sale mal, PARA y re-planifica — no sigas forzando
- Usa el modo planificación también para pasos de verificación, no solo para construir

### Estrategia de subagentes
- Usa subagentes liberalmente para mantener limpia la ventana de contexto principal
- Delega investigación, exploración y análisis paralelo a subagentes
- Una tarea por subagente para ejecución enfocada
- Para problemas complejos, asigna más cómputo mediante subagentes

### Bucle de auto-mejora
- Después de CUALQUIER corrección del usuario: actualiza `tasks/lessons.md` con el patrón aprendido
- Escribe reglas para ti mismo que prevengan el mismo error en el futuro
- Revisa `tasks/lessons.md` al inicio de cada sesión
- Reitera sobre estas lecciones hasta que la tasa de errores baje

### Verificación antes de terminar
- Nunca marques una tarea como completada sin probar que funciona
- Pregúntate: "¿Aprobaría esto un ingeniero de nivel staff?"
- Ejecuta pruebas, revisa logs, demuestra que funciona
- Compara el comportamiento antes y después de tus cambios cuando sea relevante

### Elegancia (equilibrada)
- Para cambios no triviales: pausa y pregunta "¿hay una manera más elegante?"
- Si una solución se siente hacky: "Sabiendo todo lo que sé ahora, implementa la solución elegante"
- Omite esto para correcciones simples y obvias
- No sobre-diseñes — simplicidad primero
- Desafía tu propio trabajo antes de presentarlo

### Corrección de errores autónoma
- Cuando recibas un informe de error: arréglalo directamente, sin pedir que te guíen paso a paso
- Señala los logs, errores y tests fallidos, luego resuélvelos
- Cero cambio de contexto requerido por parte del usuario
- Arregla los tests de CI fallidos sin que se te indique cómo

---

## Gestión de tareas

Para cada tarea sigue este flujo estrictamente:

1. **Planificar primero** — escribe el plan en `tasks/todo.md` con ítems verificables
2. **Verificar plan** — confirma con el usuario antes de implementar
3. **Seguimiento del progreso** — marca los ítems completados a medida que avanzas
4. **Explicar cambios** — resumen de alto nivel en cada paso
5. **Documentar resultados** — añade una sección de revisión a `tasks/todo.md`
6. **Capturar lecciones** — actualiza `tasks/lessons.md` después de cualquier corrección

---

## Principios fundamentales

- **Simplicidad primero** — haz cada cambio lo más simple posible, impacta el mínimo de código
- **No a la pereza** — encuentra las causas raíz, nada de correcciones temporales, estándares de desarrollador senior
- **Impacto mínimo** — los cambios solo deben tocar lo necesario, evita introducir errores colaterales
- **Todo en español** — código comentado, textos de UI, mensajes de error, todo en español

---

## Reglas técnicas que siempre debes respetar
- Validar siempre los permisos por rol en cada API Route
- Usar transacciones de base de datos para crear/cancelar reservas
- Nunca permitir doble reserva en el mismo slot de la misma instalación
- Un ciudadano no puede tener más de 2 reservas activas simultáneas
- Diseño mobile-first en todos los componentes

---

## Subagentes a usar

Usa EXCLUSIVAMENTE estos subagentes del proyecto para todas las tareas:
- Para código de UI, páginas y estilos → subagente "frontend"
- Para API, base de datos y lógica → subagente "backend"
- Para verificación de calidad y reporte de tests → subagente "tester"
- Para revisión de código → subagente "revisor"

NO uses los agentes built-in (Explore, Plan, general-purpose)
salvo que yo lo pida explícitamente.

## TDD — responsabilidad de frontend y backend

Los agentes **frontend** y **backend** aplican TDD en todo desarrollo:
1. Escriben el test antes del código (RED)
2. Implementan hasta que pase (GREEN)
3. Refactorizan con los tests en verde (REFACTOR)
4. No dan una tarea por finalizada hasta que `npx vitest run` pase

El agente **tester** no aplica TDD. Su rol es ejecutar la suite completa, detectar regresiones y reportar estado de cobertura.