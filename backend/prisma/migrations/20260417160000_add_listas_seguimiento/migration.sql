-- CreateTable: ListaSeguimiento
CREATE TABLE "ListaSeguimiento" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "color" TEXT NOT NULL DEFAULT '#1976d2',
    "icono" TEXT NOT NULL DEFAULT 'folder',
    "columnas" TEXT NOT NULL DEFAULT '[]',
    "orden" INTEGER NOT NULL DEFAULT 0,
    "secretaria" TEXT NOT NULL DEFAULT 'PA',
    "creadoPorId" INTEGER,
    "creadoPorNombre" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListaSeguimiento_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ListaSeguimiento_secretaria_idx" ON "ListaSeguimiento"("secretaria");
CREATE INDEX "ListaSeguimiento_orden_idx" ON "ListaSeguimiento"("orden");

-- CreateTable: ListaSeguimientoItem
CREATE TABLE "ListaSeguimientoItem" (
    "id" SERIAL NOT NULL,
    "listaId" INTEGER NOT NULL,
    "beneficiarioId" INTEGER NOT NULL,
    "valores" TEXT NOT NULL DEFAULT '{}',
    "notas" TEXT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListaSeguimientoItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ListaSeguimientoItem_listaId_beneficiarioId_key" ON "ListaSeguimientoItem"("listaId", "beneficiarioId");
CREATE INDEX "ListaSeguimientoItem_listaId_idx" ON "ListaSeguimientoItem"("listaId");
CREATE INDEX "ListaSeguimientoItem_beneficiarioId_idx" ON "ListaSeguimientoItem"("beneficiarioId");

-- AddForeignKey
ALTER TABLE "ListaSeguimientoItem" ADD CONSTRAINT "ListaSeguimientoItem_listaId_fkey"
    FOREIGN KEY ("listaId") REFERENCES "ListaSeguimiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
