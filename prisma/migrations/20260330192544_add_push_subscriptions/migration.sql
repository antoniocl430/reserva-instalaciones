-- AlterTable
ALTER TABLE "Reserva" ADD COLUMN     "recordatorioEnviado" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "SuscripcionPush" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuscripcionPush_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SuscripcionPush_tenantId_idx" ON "SuscripcionPush"("tenantId");

-- CreateIndex
CREATE INDEX "SuscripcionPush_usuarioId_idx" ON "SuscripcionPush"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "SuscripcionPush_usuarioId_endpoint_key" ON "SuscripcionPush"("usuarioId", "endpoint");

-- AddForeignKey
ALTER TABLE "SuscripcionPush" ADD CONSTRAINT "SuscripcionPush_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuscripcionPush" ADD CONSTRAINT "SuscripcionPush_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
