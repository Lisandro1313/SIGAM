-- AlterEnum
ALTER TYPE "RemitoEstado" ADD VALUE 'ENTREGADO';

-- AlterTable
ALTER TABLE "Remito" ADD COLUMN     "entregadoAt" TIMESTAMP(3),
ADD COLUMN     "entregadoFoto" TEXT,
ADD COLUMN     "entregadoNota" TEXT;

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "depositoId" INTEGER;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_depositoId_fkey" FOREIGN KEY ("depositoId") REFERENCES "Deposito"("id") ON DELETE SET NULL ON UPDATE CASCADE;
