-- AlterEnum: agregar CHOFER al enum Role
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'CHOFER';

-- AlterTable: campos de entrega a domicilio en Remito
ALTER TABLE "Remito" ADD COLUMN IF NOT EXISTS "esEntregaDomicilio" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Remito" ADD COLUMN IF NOT EXISTS "choferId" INTEGER;
ALTER TABLE "Remito" ADD COLUMN IF NOT EXISTS "retiroDepositoAt" TIMESTAMP(3);
ALTER TABLE "Remito" ADD COLUMN IF NOT EXISTS "retiroDepositoNota" TEXT;
ALTER TABLE "Remito" ADD COLUMN IF NOT EXISTS "firmaDestinatario" TEXT;
ALTER TABLE "Remito" ADD COLUMN IF NOT EXISTS "nombreDestinatario" TEXT;
ALTER TABLE "Remito" ADD COLUMN IF NOT EXISTS "dniDestinatario" TEXT;
ALTER TABLE "Remito" ADD COLUMN IF NOT EXISTS "firmaDestinatarioAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Remito_choferId_idx" ON "Remito"("choferId");
CREATE INDEX IF NOT EXISTS "Remito_esEntregaDomicilio_idx" ON "Remito"("esEntregaDomicilio");

-- AddForeignKey
ALTER TABLE "Remito" ADD CONSTRAINT "Remito_choferId_fkey" FOREIGN KEY ("choferId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
