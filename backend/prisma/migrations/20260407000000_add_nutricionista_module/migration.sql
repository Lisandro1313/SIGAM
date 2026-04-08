-- Agregar rol NUTRICIONISTA
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'NUTRICIONISTA';

-- Enums del módulo Nutricionista
CREATE TYPE "ModalidadAlimentaria" AS ENUM ('RETIRAN_ALIMENTOS', 'COMEN_EN_LUGAR', 'MIXTO');
CREATE TYPE "EstadoGeneral" AS ENUM ('BUENO', 'REGULAR', 'MALO');
CREATE TYPE "TipoProgramaTerreno" AS ENUM ('HUERTA', 'MANIPULACION_ALIMENTOS', 'NUTRICION_INFANTIL', 'CAPACITACION', 'OTRO');
CREATE TYPE "EstadoProgramaTerreno" AS ENUM ('PLANIFICADO', 'EN_CURSO', 'FINALIZADO', 'CANCELADO');

-- RelevamientoNutricional
CREATE TABLE "RelevamientoNutricional" (
    "id" SERIAL NOT NULL,
    "beneficiarioId" INTEGER NOT NULL,
    "nutricionistaId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "poblacionInfantil05" INTEGER,
    "poblacionInfantil612" INTEGER,
    "poblacionAdolescente" INTEGER,
    "poblacionAdulta" INTEGER,
    "modalidad" "ModalidadAlimentaria",
    "tieneCocina" BOOLEAN NOT NULL DEFAULT false,
    "aguaPotable" BOOLEAN NOT NULL DEFAULT false,
    "tieneHeladera" BOOLEAN NOT NULL DEFAULT false,
    "estadoGeneral" "EstadoGeneral",
    "necesidades" TEXT,
    "observaciones" TEXT,
    "fotos" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RelevamientoNutricional_pkey" PRIMARY KEY ("id")
);

-- ProgramaTerreno
CREATE TABLE "ProgramaTerreno" (
    "id" SERIAL NOT NULL,
    "tipo" "TipoProgramaTerreno" NOT NULL,
    "nombre" TEXT,
    "descripcion" TEXT,
    "beneficiarioId" INTEGER NOT NULL,
    "nutricionistaId" INTEGER NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3),
    "duracionSemanas" INTEGER,
    "estado" "EstadoProgramaTerreno" NOT NULL DEFAULT 'PLANIFICADO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgramaTerreno_pkey" PRIMARY KEY ("id")
);

-- ActividadTerreno
CREATE TABLE "ActividadTerreno" (
    "id" SERIAL NOT NULL,
    "programaTerrenoId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "descripcion" TEXT NOT NULL,
    "asistentes" INTEGER,
    "observaciones" TEXT,
    "fotos" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActividadTerreno_pkey" PRIMARY KEY ("id")
);

-- Índices
CREATE INDEX "RelevamientoNutricional_beneficiarioId_idx" ON "RelevamientoNutricional"("beneficiarioId");
CREATE INDEX "RelevamientoNutricional_nutricionistaId_idx" ON "RelevamientoNutricional"("nutricionistaId");
CREATE INDEX "RelevamientoNutricional_fecha_idx" ON "RelevamientoNutricional"("fecha");

CREATE INDEX "ProgramaTerreno_beneficiarioId_idx" ON "ProgramaTerreno"("beneficiarioId");
CREATE INDEX "ProgramaTerreno_nutricionistaId_idx" ON "ProgramaTerreno"("nutricionistaId");
CREATE INDEX "ProgramaTerreno_estado_idx" ON "ProgramaTerreno"("estado");
CREATE INDEX "ProgramaTerreno_fechaInicio_idx" ON "ProgramaTerreno"("fechaInicio");

CREATE INDEX "ActividadTerreno_programaTerrenoId_idx" ON "ActividadTerreno"("programaTerrenoId");
CREATE INDEX "ActividadTerreno_fecha_idx" ON "ActividadTerreno"("fecha");

-- Foreign Keys
ALTER TABLE "RelevamientoNutricional" ADD CONSTRAINT "RelevamientoNutricional_beneficiarioId_fkey" FOREIGN KEY ("beneficiarioId") REFERENCES "Beneficiario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RelevamientoNutricional" ADD CONSTRAINT "RelevamientoNutricional_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProgramaTerreno" ADD CONSTRAINT "ProgramaTerreno_beneficiarioId_fkey" FOREIGN KEY ("beneficiarioId") REFERENCES "Beneficiario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProgramaTerreno" ADD CONSTRAINT "ProgramaTerreno_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ActividadTerreno" ADD CONSTRAINT "ActividadTerreno_programaTerrenoId_fkey" FOREIGN KEY ("programaTerrenoId") REFERENCES "ProgramaTerreno"("id") ON DELETE CASCADE ON UPDATE CASCADE;
