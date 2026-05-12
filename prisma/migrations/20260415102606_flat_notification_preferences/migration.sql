-- First, delete all existing rows to avoid unique constraint violations
DELETE FROM "PreferenciaNotificacion";

-- Drop the old unique constraint on tipoAlerta
ALTER TABLE "PreferenciaNotificacion" DROP CONSTRAINT IF EXISTS "PreferenciaNotificacion_usuarioId_tenantId_tipoAlerta_key";

-- Remove old columns
ALTER TABLE "PreferenciaNotificacion" DROP COLUMN "tipoAlerta";
ALTER TABLE "PreferenciaNotificacion" DROP COLUMN "activa";

-- Add new flat boolean columns with defaults
ALTER TABLE "PreferenciaNotificacion" ADD COLUMN "notificacionesEmail" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "PreferenciaNotificacion" ADD COLUMN "notificacionesPush" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "PreferenciaNotificacion" ADD COLUMN "recordatorioReserva" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "PreferenciaNotificacion" ADD COLUMN "recordatorioCancel" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "PreferenciaNotificacion" ADD COLUMN "notificacionesAviso" BOOLEAN NOT NULL DEFAULT true;

-- Add unique constraint for the new schema (one row per user per tenant)
ALTER TABLE "PreferenciaNotificacion" ADD CONSTRAINT "PreferenciaNotificacion_usuarioId_tenantId_key" UNIQUE("usuarioId", "tenantId");
