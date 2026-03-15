-- CreateTable
CREATE TABLE "DocumentoBeneficiario" (
    "id" SERIAL NOT NULL,
    "beneficiarioId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "archivo" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "tipo" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentoBeneficiario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentoBeneficiario_beneficiarioId_idx" ON "DocumentoBeneficiario"("beneficiarioId");

-- AddForeignKey
ALTER TABLE "DocumentoBeneficiario" ADD CONSTRAINT "DocumentoBeneficiario_beneficiarioId_fkey" FOREIGN KEY ("beneficiarioId") REFERENCES "Beneficiario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
