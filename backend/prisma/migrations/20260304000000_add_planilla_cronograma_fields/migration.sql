-- AlterTable: Beneficiario - agregar kilosHabitual
ALTER TABLE "Beneficiario" ADD COLUMN "kilosHabitual" DOUBLE PRECISION;

-- AlterTable: Plantilla - agregar kilogramos de referencia
ALTER TABLE "Plantilla" ADD COLUMN "kilogramos" DOUBLE PRECISION;

-- AlterTable: EntregaProgramada - campos para planilla manual
ALTER TABLE "EntregaProgramada"
  ADD COLUMN "hora" TEXT,
  ADD COLUMN "responsableRetiro" TEXT,
  ADD COLUMN "kilos" DOUBLE PRECISION,
  ALTER COLUMN "programaId" DROP NOT NULL;
