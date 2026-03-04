-- DropForeignKey
ALTER TABLE "EntregaProgramada" DROP CONSTRAINT "EntregaProgramada_programaId_fkey";

-- AddForeignKey
ALTER TABLE "EntregaProgramada" ADD CONSTRAINT "EntregaProgramada_programaId_fkey" FOREIGN KEY ("programaId") REFERENCES "Programa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
