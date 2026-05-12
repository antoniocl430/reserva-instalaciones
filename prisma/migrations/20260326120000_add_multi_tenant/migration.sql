-- Migración: añadir soporte multi-tenant
-- Crea la tabla Tenant y añade tenantId a todas las entidades existentes.
-- Estrategia para datos existentes:
--   1. Crear tabla Tenant
--   2. Insertar el tenant de desarrollo inicial
--   3. Añadir columna tenantId con default temporal al tenant de desarrollo
--   4. Eliminar el default temporal (la columna queda NOT NULL)
--   5. Añadir las restricciones de FK e índices

-- ─── 1. Crear tabla Tenant ────────────────────────────────────────────────────
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "municipio" TEXT NOT NULL,
    "logoUrl" TEXT,
    "configuracion" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- Índice único en slug
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- ─── 2. Insertar el tenant de desarrollo ──────────────────────────────────────
-- Este tenant recibe todos los registros existentes antes de la migración.
INSERT INTO "Tenant" ("id", "slug", "nombre", "municipio", "estado", "creadoEn", "actualizadoEn")
VALUES (
    'tenant-desarrollo-0000-0000-000000000001',
    'desarrollo',
    'Ayuntamiento de Desarrollo',
    'Desarrollo',
    'ACTIVO',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- ─── 3. Añadir tenantId a cada tabla con default temporal ─────────────────────

-- Usuario
ALTER TABLE "Usuario" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'tenant-desarrollo-0000-0000-000000000001';
ALTER TABLE "Usuario" ALTER COLUMN "tenantId" DROP DEFAULT;

-- Instalacion
ALTER TABLE "Instalacion" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'tenant-desarrollo-0000-0000-000000000001';
ALTER TABLE "Instalacion" ALTER COLUMN "tenantId" DROP DEFAULT;

-- Reserva
ALTER TABLE "Reserva" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'tenant-desarrollo-0000-0000-000000000001';
ALTER TABLE "Reserva" ALTER COLUMN "tenantId" DROP DEFAULT;

-- TokenRecuperacion
ALTER TABLE "TokenRecuperacion" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'tenant-desarrollo-0000-0000-000000000001';
ALTER TABLE "TokenRecuperacion" ALTER COLUMN "tenantId" DROP DEFAULT;

-- Aviso
ALTER TABLE "Aviso" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'tenant-desarrollo-0000-0000-000000000001';
ALTER TABLE "Aviso" ALTER COLUMN "tenantId" DROP DEFAULT;

-- Bloqueo
ALTER TABLE "Bloqueo" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'tenant-desarrollo-0000-0000-000000000001';
ALTER TABLE "Bloqueo" ALTER COLUMN "tenantId" DROP DEFAULT;

-- ─── 4. Eliminar el unique global de email en Usuario ─────────────────────────
-- El email ahora es único por tenant, no globalmente
DROP INDEX IF EXISTS "Usuario_email_key";

-- ─── 5. Eliminar el unique global de nombre en Instalacion ───────────────────
-- El nombre ahora es único por tenant
DROP INDEX IF EXISTS "Instalacion_nombre_key";

-- ─── 6. Añadir FKs ───────────────────────────────────────────────────────────
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Instalacion" ADD CONSTRAINT "Instalacion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TokenRecuperacion" ADD CONSTRAINT "TokenRecuperacion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Aviso" ADD CONSTRAINT "Aviso_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Bloqueo" ADD CONSTRAINT "Bloqueo_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── 7. Añadir índices ────────────────────────────────────────────────────────
CREATE UNIQUE INDEX "Usuario_tenantId_email_key" ON "Usuario"("tenantId", "email");
CREATE INDEX "Usuario_tenantId_idx" ON "Usuario"("tenantId");
CREATE INDEX "Instalacion_tenantId_idx" ON "Instalacion"("tenantId");
CREATE INDEX "Reserva_tenantId_idx" ON "Reserva"("tenantId");
CREATE INDEX "TokenRecuperacion_tenantId_idx" ON "TokenRecuperacion"("tenantId");
CREATE INDEX "Aviso_tenantId_idx" ON "Aviso"("tenantId");
CREATE INDEX "Bloqueo_tenantId_idx" ON "Bloqueo"("tenantId");
