-- CreateEnum
CREATE TYPE "CasoEstado" AS ENUM ('PENDIENTE', 'EN_REVISION', 'APROBADO', 'RECHAZADO', 'RESUELTO');

-- CreateEnum
CREATE TYPE "CasoPrioridad" AS ENUM ('NORMAL', 'ALTA', 'URGENTE');

-- CreateEnum
CREATE TYPE "CasoTipo" AS ENUM ('ALIMENTARIO', 'MERCADERIA', 'MIXTO');

-- CreateTable
CREATE TABLE "Caso" (
    "id"                  SERIAL NOT NULL,
    "nombreSolicitante"   TEXT NOT NULL,
    "dni"                 TEXT,
    "direccion"           TEXT,
    "barrio"              TEXT,
    "telefono"            TEXT,
    "descripcion"         TEXT NOT NULL,
    "prioridad"           "CasoPrioridad" NOT NULL DEFAULT 'NORMAL',
    "tipo"                "CasoTipo" NOT NULL,
    "estado"              "CasoEstado" NOT NULL DEFAULT 'PENDIENTE',
    "notaRevision"        TEXT,
    "revisadoAt"          TIMESTAMP(3),
    "creadoPorId"         INTEGER NOT NULL,
    "creadoPorNombre"     TEXT NOT NULL,
    "revisadoPorId"       INTEGER,
    "revisadoPorNombre"   TEXT,
    "beneficiarioId"      INTEGER,
    "remitoId"            INTEGER,
    "alertaCruce"         BOOLEAN NOT NULL DEFAULT false,
    "detalleCruce"        TEXT,
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Caso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentoCaso" (
    "id"        SERIAL NOT NULL,
    "casoId"    INTEGER NOT NULL,
    "nombre"    TEXT NOT NULL,
    "archivo"   TEXT NOT NULL,
    "url"       TEXT NOT NULL,
    "tipo"      TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentoCaso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Caso_remitoId_key" ON "Caso"("remitoId");
CREATE INDEX "Caso_estado_idx"      ON "Caso"("estado");
CREATE INDEX "Caso_prioridad_idx"   ON "Caso"("prioridad");
CREATE INDEX "Caso_creadoPorId_idx" ON "Caso"("creadoPorId");
CREATE INDEX "Caso_dni_idx"         ON "Caso"("dni");
CREATE INDEX "Caso_createdAt_idx"   ON "Caso"("createdAt");
CREATE INDEX "DocumentoCaso_casoId_idx" ON "DocumentoCaso"("casoId");

-- AddForeignKey
ALTER TABLE "Caso" ADD CONSTRAINT "Caso_beneficiarioId_fkey"
    FOREIGN KEY ("beneficiarioId") REFERENCES "Beneficiario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Caso" ADD CONSTRAINT "Caso_remitoId_fkey"
    FOREIGN KEY ("remitoId") REFERENCES "Remito"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DocumentoCaso" ADD CONSTRAINT "DocumentoCaso_casoId_fkey"
    FOREIGN KEY ("casoId") REFERENCES "Caso"("id") ON DELETE CASCADE ON UPDATE CASCADE;
