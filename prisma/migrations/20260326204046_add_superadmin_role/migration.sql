-- DropForeignKey
ALTER TABLE "Usuario" DROP CONSTRAINT "Usuario_tenantId_fkey";

-- AlterTable
ALTER TABLE "Usuario" ALTER COLUMN "tenantId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
