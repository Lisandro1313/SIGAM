-- Nuevos campos clínicos en RelevamientoNutricional
ALTER TABLE "RelevamientoNutricional"
  ADD COLUMN IF NOT EXISTS "enfermedadesCronicas"        TEXT,
  ADD COLUMN IF NOT EXISTS "asistenciasEspeciales"       TEXT,
  ADD COLUMN IF NOT EXISTS "asistenciasEspecialesDetalle" TEXT,
  ADD COLUMN IF NOT EXISTS "recibeOtraRed"               BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "otraRedDetalle"              TEXT,
  ADD COLUMN IF NOT EXISTS "aguaCorriente"               BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "alimentosIntegrar"           TEXT,
  ADD COLUMN IF NOT EXISTS "alimentosModificar"          TEXT;

-- Documentos en ActividadTerreno
ALTER TABLE "ActividadTerreno"
  ADD COLUMN IF NOT EXISTS "documentos" TEXT;
