-- CreateTable: Documento (repositorio central de documentación)
CREATE TABLE "Documento" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "archivo" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "categoria" TEXT NOT NULL DEFAULT 'OTRO',
    "descripcion" TEXT,
    "tipo" TEXT,
    "tamanioBytes" INTEGER,
    "secretaria" TEXT NOT NULL DEFAULT 'PA',
    "subidoPorId" INTEGER,
    "subidoPorNombre" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Documento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Documento_categoria_idx" ON "Documento"("categoria");
CREATE INDEX "Documento_secretaria_idx" ON "Documento"("secretaria");
CREATE INDEX "Documento_createdAt_idx" ON "Documento"("createdAt");
