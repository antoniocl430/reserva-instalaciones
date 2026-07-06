-- CreateTable
CREATE TABLE "ListaEspera" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "instalacionId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ESPERANDO',
    "expiraEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListaEspera_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ListaEspera_tenantId_idx" ON "ListaEspera"("tenantId");

-- CreateIndex
CREATE INDEX "ListaEspera_instalacionId_fecha_horaInicio_idx" ON "ListaEspera"("instalacionId", "fecha", "horaInicio");

-- CreateIndex
CREATE UNIQUE INDEX "ListaEspera_usuarioId_instalacionId_fecha_horaInicio_key" ON "ListaEspera"("usuarioId", "instalacionId", "fecha", "horaInicio");

-- AddForeignKey
ALTER TABLE "ListaEspera" ADD CONSTRAINT "ListaEspera_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaEspera" ADD CONSTRAINT "ListaEspera_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaEspera" ADD CONSTRAINT "ListaEspera_instalacionId_fkey" FOREIGN KEY ("instalacionId") REFERENCES "Instalacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
