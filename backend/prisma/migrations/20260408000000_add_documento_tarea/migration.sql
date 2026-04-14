-- CreateTable: DocumentoTarea
CREATE TABLE IF NOT EXISTS "DocumentoTarea" (
    "id" SERIAL NOT NULL,
    "tareaId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "archivo" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "tipo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentoTarea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DocumentoTarea_tareaId_idx" ON "DocumentoTarea"("tareaId");

-- AddForeignKey
ALTER TABLE "DocumentoTarea" ADD CONSTRAINT "DocumentoTarea_tareaId_fkey"
    FOREIGN KEY ("tareaId") REFERENCES "Tarea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
