-- CreateTable: AuditoriaLog
CREATE TABLE "AuditoriaLog" (
  "id"            SERIAL PRIMARY KEY,
  "usuarioId"     INTEGER,
  "usuarioNombre" TEXT,
  "metodo"        TEXT NOT NULL,
  "ruta"          TEXT NOT NULL,
  "descripcion"   TEXT,
  "datos"         TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "AuditoriaLog_usuarioId_idx"  ON "AuditoriaLog"("usuarioId");
CREATE INDEX "AuditoriaLog_createdAt_idx"  ON "AuditoriaLog"("createdAt");
CREATE INDEX "AuditoriaLog_ruta_idx"       ON "AuditoriaLog"("ruta");

-- CreateTable: Tarea
CREATE TABLE "Tarea" (
  "id"                  SERIAL PRIMARY KEY,
  "titulo"              TEXT NOT NULL,
  "descripcion"         TEXT,
  "estado"              TEXT NOT NULL DEFAULT 'PENDIENTE',
  "prioridad"           TEXT NOT NULL DEFAULT 'MEDIA',
  "asignadoA"           TEXT,
  "programaId"          INTEGER,
  "vencimiento"         TIMESTAMP(3),
  "completadoAt"        TIMESTAMP(3),
  "completadoPorNombre" TEXT,
  "completadoNota"      TEXT,
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "Tarea_estado_idx"      ON "Tarea"("estado");
CREATE INDEX "Tarea_programaId_idx"  ON "Tarea"("programaId");
CREATE INDEX "Tarea_createdAt_idx"   ON "Tarea"("createdAt");

ALTER TABLE "Tarea" ADD CONSTRAINT "Tarea_programaId_fkey"
  FOREIGN KEY ("programaId") REFERENCES "Programa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
