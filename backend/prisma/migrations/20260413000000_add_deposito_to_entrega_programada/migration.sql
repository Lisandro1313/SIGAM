-- AlterTable: add depositoId to EntregaProgramada
ALTER TABLE "EntregaProgramada" ADD COLUMN "depositoId" INTEGER;

-- AddForeignKey
ALTER TABLE "EntregaProgramada" ADD CONSTRAINT "EntregaProgramada_depositoId_fkey" FOREIGN KEY ("depositoId") REFERENCES "Deposito"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "EntregaProgramada_depositoId_idx" ON "EntregaProgramada"("depositoId");
