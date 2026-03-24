-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'CIUDADANO',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Instalacion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Reserva" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usuarioId" TEXT NOT NULL,
    "instalacionId" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL,
    "horaInicio" DATETIME NOT NULL,
    "horaFin" DATETIME NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVA',
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "canceladoEn" DATETIME,
    "canceladoPor" TEXT,
    CONSTRAINT "Reserva_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Reserva_instalacionId_fkey" FOREIGN KEY ("instalacionId") REFERENCES "Instalacion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Reserva_canceladoPor_fkey" FOREIGN KEY ("canceladoPor") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Bloqueo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "instalacionId" TEXT NOT NULL,
    "fechaInicio" DATETIME NOT NULL,
    "fechaFin" DATETIME NOT NULL,
    "motivo" TEXT NOT NULL,
    "creadoPorId" TEXT NOT NULL,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Bloqueo_instalacionId_fkey" FOREIGN KEY ("instalacionId") REFERENCES "Instalacion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Bloqueo_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Instalacion_nombre_key" ON "Instalacion"("nombre");

-- CreateIndex
CREATE INDEX "Reserva_instalacionId_fecha_horaInicio_idx" ON "Reserva"("instalacionId", "fecha", "horaInicio");

-- CreateIndex
CREATE INDEX "Reserva_usuarioId_estado_idx" ON "Reserva"("usuarioId", "estado");

-- CreateIndex
CREATE INDEX "Bloqueo_instalacionId_fechaInicio_fechaFin_idx" ON "Bloqueo"("instalacionId", "fechaInicio", "fechaFin");
