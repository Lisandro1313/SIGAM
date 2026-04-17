-- CreateTable: PlantillaDocumento (modelos imprimibles editables)
CREATE TABLE "PlantillaDocumento" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "categoria" TEXT NOT NULL DEFAULT 'Operativo',
    "contenido" TEXT NOT NULL,
    "icono" TEXT,
    "color" TEXT,
    "esBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "secretaria" TEXT NOT NULL DEFAULT 'PA',
    "creadoPorId" INTEGER,
    "creadoPorNombre" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlantillaDocumento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlantillaDocumento_categoria_idx" ON "PlantillaDocumento"("categoria");
CREATE INDEX "PlantillaDocumento_secretaria_idx" ON "PlantillaDocumento"("secretaria");
