-- AlterTable: agregar programaId a Articulo (nullable, sin romper datos existentes)
ALTER TABLE "Articulo" ADD COLUMN "programaId" INTEGER;

-- CreateIndex
CREATE INDEX "Articulo_programaId_idx" ON "Articulo"("programaId");

-- AddForeignKey
ALTER TABLE "Articulo" ADD CONSTRAINT "Articulo_programaId_fkey" FOREIGN KEY ("programaId") REFERENCES "Programa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
