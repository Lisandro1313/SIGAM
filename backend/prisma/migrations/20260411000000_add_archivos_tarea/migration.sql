-- ArchivoTarea: adjuntos en tareas (fotos, documentos, etc.)
CREATE TABLE "ArchivoTarea" (
    "id" SERIAL NOT NULL,
    "tareaId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "tipo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArchivoTarea_pkey" PRIMARY KEY ("id")
);

-- Índice
CREATE INDEX "ArchivoTarea_tareaId_idx" ON "ArchivoTarea"("tareaId");

-- Foreign Key (cascade delete: si se borra la tarea, se borran sus archivos)
ALTER TABLE "ArchivoTarea" ADD CONSTRAINT "ArchivoTarea_tareaId_fkey" FOREIGN KEY ("tareaId") REFERENCES "Tarea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
