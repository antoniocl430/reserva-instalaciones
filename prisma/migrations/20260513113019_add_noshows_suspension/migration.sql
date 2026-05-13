-- AlterTable
ALTER TABLE "Reserva" ADD COLUMN     "noShow" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "motivoSuspension" TEXT,
ADD COLUMN     "noShows" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "suspendidoHasta" TIMESTAMP(3);
