-- Habilitar Row Level Security en todas las tablas públicas
-- Prisma conecta vía DATABASE_URL (rol postgres/service_role) que bypasea RLS,
-- por lo que la app sigue funcionando. Sin políticas definidas, PostgREST
-- (rol anon/authenticated) no puede acceder directamente a ninguna tabla.

ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Instalacion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Reserva" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Usuario" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Bloqueo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TokenRecuperacion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PreferenciaNotificacion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Aviso" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Festivo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."GrupoRecurrencia" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ListaEspera" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Comunicado" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SuscripcionPush" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Valoracion" ENABLE ROW LEVEL SECURITY;
