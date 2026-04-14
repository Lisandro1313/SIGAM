CREATE TABLE "NotaBorrador" (
  "id" SERIAL NOT NULL,
  "clave" TEXT NOT NULL,
  "contenido" TEXT NOT NULL DEFAULT '',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotaBorrador_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotaBorrador_clave_key" ON "NotaBorrador"("clave");

-- Insertar fila inicial para el cronograma
INSERT INTO "NotaBorrador" ("clave", "contenido", "updatedAt") VALUES ('cronograma', '', NOW());
