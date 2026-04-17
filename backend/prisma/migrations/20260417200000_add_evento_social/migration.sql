-- CreateTable
CREATE TABLE "EventoSocial" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "fecha" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'EVENTO',
    "descripcion" TEXT,
    "color" TEXT NOT NULL DEFAULT '#1976d2',
    "recurrente" BOOLEAN NOT NULL DEFAULT false,
    "creadoPorId" INTEGER,
    "creadoPorNombre" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventoSocial_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EventoSocial_tipo_idx" ON "EventoSocial"("tipo");
CREATE INDEX "EventoSocial_fecha_idx" ON "EventoSocial"("fecha");
