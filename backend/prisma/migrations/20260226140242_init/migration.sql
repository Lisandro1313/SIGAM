-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'LOGISTICA', 'OPERADOR_PROGRAMA', 'VISOR');

-- CreateEnum
CREATE TYPE "MovimientoTipo" AS ENUM ('INGRESO', 'EGRESO', 'AJUSTE', 'TRANSFERENCIA');

-- CreateEnum
CREATE TYPE "EntregaEstado" AS ENUM ('PENDIENTE', 'GENERADA', 'ENTREGADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "RemitoEstado" AS ENUM ('BORRADOR', 'CONFIRMADO', 'ENVIADO', 'PENDIENTE_STOCK');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "rol" "Role" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "programaId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Programa" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "tipo" TEXT NOT NULL,
    "usaCronograma" BOOLEAN NOT NULL DEFAULT false,
    "usaPlantilla" BOOLEAN NOT NULL DEFAULT true,
    "descuentaStock" BOOLEAN NOT NULL DEFAULT true,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Programa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Beneficiario" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "direccion" TEXT,
    "localidad" TEXT,
    "telefono" TEXT,
    "responsableNombre" TEXT,
    "responsableDNI" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "frecuenciaEntrega" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "observaciones" TEXT,
    "programaId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Beneficiario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deposito" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,
    "telefono" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deposito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Articulo" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "categoria" TEXT,
    "pesoUnitarioKg" DOUBLE PRECISION,
    "stockMinimo" DOUBLE PRECISION,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Articulo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stock" (
    "id" SERIAL NOT NULL,
    "articuloId" INTEGER NOT NULL,
    "depositoId" INTEGER NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Movimiento" (
    "id" SERIAL NOT NULL,
    "tipo" "MovimientoTipo" NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "observaciones" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "articuloId" INTEGER NOT NULL,
    "usuarioId" INTEGER,
    "programaId" INTEGER,
    "beneficiarioId" INTEGER,
    "remitoId" INTEGER,
    "depositoDesdeId" INTEGER,
    "depositoHaciaId" INTEGER,

    CONSTRAINT "Movimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plantilla" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "programaId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plantilla_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlantillaItem" (
    "id" SERIAL NOT NULL,
    "plantillaId" INTEGER NOT NULL,
    "articuloId" INTEGER NOT NULL,
    "cantidadBase" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PlantillaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntregaProgramada" (
    "id" SERIAL NOT NULL,
    "beneficiarioId" INTEGER NOT NULL,
    "programaId" INTEGER NOT NULL,
    "fechaProgramada" TIMESTAMP(3) NOT NULL,
    "estado" "EntregaEstado" NOT NULL DEFAULT 'PENDIENTE',
    "observaciones" TEXT,
    "remitoId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EntregaProgramada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Remito" (
    "id" SERIAL NOT NULL,
    "numero" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" "RemitoEstado" NOT NULL DEFAULT 'BORRADOR',
    "totalKg" DOUBLE PRECISION,
    "observaciones" TEXT,
    "programaId" INTEGER,
    "beneficiarioId" INTEGER,
    "depositoId" INTEGER NOT NULL,
    "emailEnviado" BOOLEAN NOT NULL DEFAULT false,
    "fechaEnvio" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Remito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RemitoItem" (
    "id" SERIAL NOT NULL,
    "remitoId" INTEGER NOT NULL,
    "articuloId" INTEGER NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "pesoKg" DOUBLE PRECISION,

    CONSTRAINT "RemitoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Correlativo" (
    "id" SERIAL NOT NULL,
    "clave" TEXT NOT NULL,
    "ultimo" INTEGER NOT NULL DEFAULT 1001648,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Correlativo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_email_idx" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Programa_nombre_key" ON "Programa"("nombre");

-- CreateIndex
CREATE INDEX "Programa_activo_idx" ON "Programa"("activo");

-- CreateIndex
CREATE INDEX "Beneficiario_activo_idx" ON "Beneficiario"("activo");

-- CreateIndex
CREATE INDEX "Beneficiario_programaId_idx" ON "Beneficiario"("programaId");

-- CreateIndex
CREATE INDEX "Beneficiario_localidad_idx" ON "Beneficiario"("localidad");

-- CreateIndex
CREATE UNIQUE INDEX "Deposito_codigo_key" ON "Deposito"("codigo");

-- CreateIndex
CREATE INDEX "Deposito_codigo_idx" ON "Deposito"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Articulo_nombre_key" ON "Articulo"("nombre");

-- CreateIndex
CREATE INDEX "Articulo_activo_idx" ON "Articulo"("activo");

-- CreateIndex
CREATE INDEX "Articulo_categoria_idx" ON "Articulo"("categoria");

-- CreateIndex
CREATE INDEX "Stock_depositoId_idx" ON "Stock"("depositoId");

-- CreateIndex
CREATE INDEX "Stock_articuloId_idx" ON "Stock"("articuloId");

-- CreateIndex
CREATE UNIQUE INDEX "Stock_articuloId_depositoId_key" ON "Stock"("articuloId", "depositoId");

-- CreateIndex
CREATE INDEX "Movimiento_fecha_idx" ON "Movimiento"("fecha");

-- CreateIndex
CREATE INDEX "Movimiento_tipo_idx" ON "Movimiento"("tipo");

-- CreateIndex
CREATE INDEX "Movimiento_articuloId_idx" ON "Movimiento"("articuloId");

-- CreateIndex
CREATE INDEX "Movimiento_remitoId_idx" ON "Movimiento"("remitoId");

-- CreateIndex
CREATE INDEX "Movimiento_programaId_idx" ON "Movimiento"("programaId");

-- CreateIndex
CREATE INDEX "Plantilla_programaId_idx" ON "Plantilla"("programaId");

-- CreateIndex
CREATE INDEX "Plantilla_activo_idx" ON "Plantilla"("activo");

-- CreateIndex
CREATE INDEX "PlantillaItem_plantillaId_idx" ON "PlantillaItem"("plantillaId");

-- CreateIndex
CREATE INDEX "PlantillaItem_articuloId_idx" ON "PlantillaItem"("articuloId");

-- CreateIndex
CREATE UNIQUE INDEX "EntregaProgramada_remitoId_key" ON "EntregaProgramada"("remitoId");

-- CreateIndex
CREATE INDEX "EntregaProgramada_estado_idx" ON "EntregaProgramada"("estado");

-- CreateIndex
CREATE INDEX "EntregaProgramada_fechaProgramada_idx" ON "EntregaProgramada"("fechaProgramada");

-- CreateIndex
CREATE INDEX "EntregaProgramada_beneficiarioId_idx" ON "EntregaProgramada"("beneficiarioId");

-- CreateIndex
CREATE INDEX "EntregaProgramada_programaId_idx" ON "EntregaProgramada"("programaId");

-- CreateIndex
CREATE UNIQUE INDEX "Remito_numero_key" ON "Remito"("numero");

-- CreateIndex
CREATE INDEX "Remito_estado_idx" ON "Remito"("estado");

-- CreateIndex
CREATE INDEX "Remito_fecha_idx" ON "Remito"("fecha");

-- CreateIndex
CREATE INDEX "Remito_numero_idx" ON "Remito"("numero");

-- CreateIndex
CREATE INDEX "Remito_beneficiarioId_idx" ON "Remito"("beneficiarioId");

-- CreateIndex
CREATE INDEX "Remito_programaId_idx" ON "Remito"("programaId");

-- CreateIndex
CREATE INDEX "Remito_depositoId_idx" ON "Remito"("depositoId");

-- CreateIndex
CREATE INDEX "RemitoItem_remitoId_idx" ON "RemitoItem"("remitoId");

-- CreateIndex
CREATE INDEX "RemitoItem_articuloId_idx" ON "RemitoItem"("articuloId");

-- CreateIndex
CREATE UNIQUE INDEX "Correlativo_clave_key" ON "Correlativo"("clave");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_programaId_fkey" FOREIGN KEY ("programaId") REFERENCES "Programa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Beneficiario" ADD CONSTRAINT "Beneficiario_programaId_fkey" FOREIGN KEY ("programaId") REFERENCES "Programa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_articuloId_fkey" FOREIGN KEY ("articuloId") REFERENCES "Articulo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_depositoId_fkey" FOREIGN KEY ("depositoId") REFERENCES "Deposito"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_articuloId_fkey" FOREIGN KEY ("articuloId") REFERENCES "Articulo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_programaId_fkey" FOREIGN KEY ("programaId") REFERENCES "Programa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_beneficiarioId_fkey" FOREIGN KEY ("beneficiarioId") REFERENCES "Beneficiario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_remitoId_fkey" FOREIGN KEY ("remitoId") REFERENCES "Remito"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_depositoDesdeId_fkey" FOREIGN KEY ("depositoDesdeId") REFERENCES "Deposito"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimiento" ADD CONSTRAINT "Movimiento_depositoHaciaId_fkey" FOREIGN KEY ("depositoHaciaId") REFERENCES "Deposito"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plantilla" ADD CONSTRAINT "Plantilla_programaId_fkey" FOREIGN KEY ("programaId") REFERENCES "Programa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantillaItem" ADD CONSTRAINT "PlantillaItem_plantillaId_fkey" FOREIGN KEY ("plantillaId") REFERENCES "Plantilla"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantillaItem" ADD CONSTRAINT "PlantillaItem_articuloId_fkey" FOREIGN KEY ("articuloId") REFERENCES "Articulo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntregaProgramada" ADD CONSTRAINT "EntregaProgramada_beneficiarioId_fkey" FOREIGN KEY ("beneficiarioId") REFERENCES "Beneficiario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntregaProgramada" ADD CONSTRAINT "EntregaProgramada_programaId_fkey" FOREIGN KEY ("programaId") REFERENCES "Programa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntregaProgramada" ADD CONSTRAINT "EntregaProgramada_remitoId_fkey" FOREIGN KEY ("remitoId") REFERENCES "Remito"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Remito" ADD CONSTRAINT "Remito_programaId_fkey" FOREIGN KEY ("programaId") REFERENCES "Programa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Remito" ADD CONSTRAINT "Remito_beneficiarioId_fkey" FOREIGN KEY ("beneficiarioId") REFERENCES "Beneficiario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Remito" ADD CONSTRAINT "Remito_depositoId_fkey" FOREIGN KEY ("depositoId") REFERENCES "Deposito"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RemitoItem" ADD CONSTRAINT "RemitoItem_remitoId_fkey" FOREIGN KEY ("remitoId") REFERENCES "Remito"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RemitoItem" ADD CONSTRAINT "RemitoItem_articuloId_fkey" FOREIGN KEY ("articuloId") REFERENCES "Articulo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
