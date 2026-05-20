-- AlterTable: añadir campos de verificación de email al modelo Usuario
ALTER TABLE "Usuario" ADD COLUMN "emailVerificado" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Usuario" ADD COLUMN "tokenVerificacion" TEXT;
ALTER TABLE "Usuario" ADD COLUMN "tokenVerificacionExpira" TIMESTAMP(3);

-- Los usuarios existentes (admins, instructores, datos de seed) se marcan como verificados
-- para no interrumpir el acceso de cuentas creadas antes de esta feature.
UPDATE "Usuario" SET "emailVerificado" = true WHERE "emailVerificado" = false;

-- CreateIndex: el token es único (un token activo por usuario)
CREATE UNIQUE INDEX "Usuario_tokenVerificacion_key" ON "Usuario"("tokenVerificacion");
