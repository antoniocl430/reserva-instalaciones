-- CreateTable
CREATE TABLE "Festivo" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "nombre" TEXT NOT NULL,
    "repetirAnual" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Festivo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Festivo_tenantId_idx" ON "Festivo"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Festivo_tenantId_fecha_key" ON "Festivo"("tenantId", "fecha");

-- AddForeignKey
ALTER TABLE "Festivo" ADD CONSTRAINT "Festivo_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
