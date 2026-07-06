-- Confirmación de asistencia mediante escaneo del QR de la pista
ALTER TABLE "Reserva" ADD COLUMN IF NOT EXISTS "asistenciaConfirmada" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Reserva" ADD COLUMN IF NOT EXISTS "confirmadaEn" TIMESTAMP(3);
