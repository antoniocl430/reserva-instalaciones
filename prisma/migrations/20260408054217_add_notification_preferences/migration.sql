-- CreateTable
CREATE TABLE "PreferenciaNotificacion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tipoAlerta" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreferenciaNotificacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PreferenciaNotificacion_tenantId_idx" ON "PreferenciaNotificacion"("tenantId");

-- CreateIndex
CREATE INDEX "PreferenciaNotificacion_usuarioId_idx" ON "PreferenciaNotificacion"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "PreferenciaNotificacion_usuarioId_tenantId_tipoAlerta_key" ON "PreferenciaNotificacion"("usuarioId", "tenantId", "tipoAlerta");

-- AddForeignKey
ALTER TABLE "PreferenciaNotificacion" ADD CONSTRAINT "PreferenciaNotificacion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreferenciaNotificacion" ADD CONSTRAINT "PreferenciaNotificacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
