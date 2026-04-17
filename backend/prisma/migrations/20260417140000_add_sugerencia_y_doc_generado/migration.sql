-- CreateTable: SugerenciaEstado (acciones del usuario sobre sugerencias)
CREATE TABLE "SugerenciaEstado" (
    "id" SERIAL NOT NULL,
    "clave" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "usuarioId" INTEGER,
    "usuarioNombre" TEXT,
    "secretaria" TEXT NOT NULL DEFAULT 'PA',
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SugerenciaEstado_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SugerenciaEstado_clave_expiraEn_idx" ON "SugerenciaEstado"("clave", "expiraEn");
CREATE INDEX "SugerenciaEstado_secretaria_idx" ON "SugerenciaEstado"("secretaria");

-- CreateTable: DocumentoGenerado (historial de impresiones)
CREATE TABLE "DocumentoGenerado" (
    "id" SERIAL NOT NULL,
    "plantillaId" INTEGER,
    "plantillaTitulo" TEXT NOT NULL,
    "usuarioId" INTEGER,
    "usuarioNombre" TEXT,
    "secretaria" TEXT NOT NULL DEFAULT 'PA',
    "cantidadEspacios" INTEGER NOT NULL DEFAULT 0,
    "contexto" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentoGenerado_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DocumentoGenerado_createdAt_idx" ON "DocumentoGenerado"("createdAt");
CREATE INDEX "DocumentoGenerado_secretaria_idx" ON "DocumentoGenerado"("secretaria");
CREATE INDEX "DocumentoGenerado_plantillaId_idx" ON "DocumentoGenerado"("plantillaId");
