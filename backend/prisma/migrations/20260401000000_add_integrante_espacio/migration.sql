-- CreateTable
CREATE TABLE IF NOT EXISTS "IntegranteEspacio" (
    "id"             SERIAL NOT NULL,
    "beneficiarioId" INTEGER NOT NULL,
    "nombre"         TEXT NOT NULL,
    "dni"            TEXT,
    "direccion"      TEXT,
    "activo"         BOOLEAN NOT NULL DEFAULT true,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegranteEspacio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IntegranteEspacio_beneficiarioId_idx" ON "IntegranteEspacio"("beneficiarioId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IntegranteEspacio_dni_idx" ON "IntegranteEspacio"("dni");

-- AddForeignKey
ALTER TABLE "IntegranteEspacio"
    ADD CONSTRAINT "IntegranteEspacio_beneficiarioId_fkey"
    FOREIGN KEY ("beneficiarioId") REFERENCES "Beneficiario"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
