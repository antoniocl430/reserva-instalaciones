-- AlterTable
ALTER TABLE "Reserva" ADD COLUMN     "grupoRecurrenciaId" TEXT;

-- CreateTable
CREATE TABLE "GrupoRecurrencia" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "instalacionId" TEXT NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "frecuencia" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrupoRecurrencia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GrupoRecurrencia_tenantId_idx" ON "GrupoRecurrencia"("tenantId");

-- CreateIndex
CREATE INDEX "GrupoRecurrencia_usuarioId_idx" ON "GrupoRecurrencia"("usuarioId");

-- CreateIndex
CREATE INDEX "GrupoRecurrencia_instalacionId_idx" ON "GrupoRecurrencia"("instalacionId");

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_grupoRecurrenciaId_fkey" FOREIGN KEY ("grupoRecurrenciaId") REFERENCES "GrupoRecurrencia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrupoRecurrencia" ADD CONSTRAINT "GrupoRecurrencia_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrupoRecurrencia" ADD CONSTRAINT "GrupoRecurrencia_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrupoRecurrencia" ADD CONSTRAINT "GrupoRecurrencia_instalacionId_fkey" FOREIGN KEY ("instalacionId") REFERENCES "Instalacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
