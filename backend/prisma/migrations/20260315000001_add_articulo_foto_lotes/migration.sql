-- AlterTable: add fotoUrl to Articulo
ALTER TABLE "Articulo" ADD COLUMN "fotoUrl" TEXT;

-- CreateTable: LoteArticulo
CREATE TABLE "LoteArticulo" (
    "id" SERIAL NOT NULL,
    "articuloId" INTEGER NOT NULL,
    "depositoId" INTEGER NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "lote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoteArticulo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoteArticulo_articuloId_idx" ON "LoteArticulo"("articuloId");
CREATE INDEX "LoteArticulo_depositoId_idx" ON "LoteArticulo"("depositoId");
CREATE INDEX "LoteArticulo_fechaVencimiento_idx" ON "LoteArticulo"("fechaVencimiento");

-- AddForeignKey
ALTER TABLE "LoteArticulo" ADD CONSTRAINT "LoteArticulo_articuloId_fkey" FOREIGN KEY ("articuloId") REFERENCES "Articulo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoteArticulo" ADD CONSTRAINT "LoteArticulo_depositoId_fkey" FOREIGN KEY ("depositoId") REFERENCES "Deposito"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
