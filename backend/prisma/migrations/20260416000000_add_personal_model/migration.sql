-- CreateTable
CREATE TABLE "Personal" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "cargo" TEXT,
    "email" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "pushSubscription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Personal_pkey" PRIMARY KEY ("id")
);

-- AlterTable: add personalId to Tarea
ALTER TABLE "Tarea" ADD COLUMN "personalId" INTEGER;

-- CreateIndex
CREATE INDEX "Tarea_personalId_idx" ON "Tarea"("personalId");

-- AddForeignKey
ALTER TABLE "Tarea" ADD CONSTRAINT "Tarea_personalId_fkey" FOREIGN KEY ("personalId") REFERENCES "Personal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
