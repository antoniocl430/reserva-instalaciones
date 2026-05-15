-- Añade el campo qrToken al modelo Reserva para verificación QR
-- Campo opcional (null en reservas anteriores a esta feature)
ALTER TABLE "Reserva" ADD COLUMN "qrToken" TEXT;

-- Índice único para búsqueda eficiente por token
CREATE UNIQUE INDEX "Reserva_qrToken_key" ON "Reserva"("qrToken");
