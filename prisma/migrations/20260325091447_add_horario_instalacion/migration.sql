-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Instalacion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT,
    "horario" TEXT NOT NULL DEFAULT 'Lun-Dom: 8:00-13:00 y 16:45-20:30',
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Instalacion" ("activa", "creadoEn", "descripcion", "id", "nombre", "tipo") SELECT "activa", "creadoEn", "descripcion", "id", "nombre", "tipo" FROM "Instalacion";
DROP TABLE "Instalacion";
ALTER TABLE "new_Instalacion" RENAME TO "Instalacion";
CREATE UNIQUE INDEX "Instalacion_nombre_key" ON "Instalacion"("nombre");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
