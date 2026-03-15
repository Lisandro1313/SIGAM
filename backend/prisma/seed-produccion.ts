/**
 * seed-produccion.ts
 *
 * Crea los datos base en producción:
 *   - 2 depósitos (LOGISTICA y CITA)
 *   - 4 programas
 *   - 14 artículos + stock inicial en 0
 *   - Correlativo de remitos
 *
 * SEGURO: usa upsert — no borra datos existentes.
 * Los usuarios se crean desde la UI de administración.
 *
 * Uso: npx ts-node prisma/seed-produccion.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Setup de producción — SIGAM');
  console.log('');

  // ──────────────────────────────────────────────────────────
  // 1. DEPÓSITOS
  // ──────────────────────────────────────────────────────────
  console.log('📦 Creando/verificando depósitos...');

  const depositoLogistica = await prisma.deposito.upsert({
    where: { codigo: 'LOGISTICA' },
    update: {},
    create: {
      codigo: 'LOGISTICA',
      nombre: 'Depósito Logística',
      direccion: '139 y 514 número 1808',
      telefono: '',
    },
  });

  const depositoCita = await prisma.deposito.upsert({
    where: { codigo: 'CITA' },
    update: {},
    create: {
      codigo: 'CITA',
      nombre: 'Depósito CITA (Centro)',
      direccion: 'Centro',
      telefono: '',
    },
  });

  console.log(`  ✓ LOGISTICA (id: ${depositoLogistica.id})`);
  console.log(`  ✓ CITA      (id: ${depositoCita.id})`);

  // ──────────────────────────────────────────────────────────
  // 2. PROGRAMAS
  // ──────────────────────────────────────────────────────────
  console.log('');
  console.log('🎯 Creando/verificando programas...');

  const programasData = [
    { nombre: 'Espacios',           descripcion: 'Comedores, organizaciones y espacios sociales', tipo: 'REGULAR',    usaCronograma: true,  usaPlantilla: true,  descuentaStock: true },
    { nombre: 'Celiaquía',          descripcion: 'Programa especial para celíacos',               tipo: 'PARTICULAR', usaCronograma: false, usaPlantilla: true,  descuentaStock: true },
    { nombre: 'Vaso de Leche',      descripcion: 'Entrega diaria de leche',                       tipo: 'DIARIO',     usaCronograma: false, usaPlantilla: true,  descuentaStock: true },
    { nombre: 'Casos Particulares', descripcion: 'Casos individuales',                            tipo: 'PARTICULAR', usaCronograma: false, usaPlantilla: false, descuentaStock: true },
  ];

  for (const p of programasData) {
    await prisma.programa.upsert({ where: { nombre: p.nombre }, update: {}, create: p });
    console.log(`  ✓ ${p.nombre}`);
  }

  // ──────────────────────────────────────────────────────────
  // 3. ARTÍCULOS + STOCK INICIAL EN 0
  // ──────────────────────────────────────────────────────────
  console.log('');
  console.log('📋 Creando/verificando artículos...');

  const articulosData = [
    { nombre: 'ACEITE',            categoria: 'ENVASADOS', pesoUnitarioKg: 0.9,  stockMinimo: 100 },
    { nombre: 'HARINA',            categoria: 'ENVASADOS', pesoUnitarioKg: 1.0,  stockMinimo: 200 },
    { nombre: 'PURE DE TOMATE',    categoria: 'ENVASADOS', pesoUnitarioKg: 0.52, stockMinimo: 150 },
    { nombre: 'DULCE DE BATATA',   categoria: 'ENVASADOS', pesoUnitarioKg: 0.7,  stockMinimo: 100 },
    { nombre: 'ARVEJAS',           categoria: 'ENVASADOS', pesoUnitarioKg: 0.3,  stockMinimo: 150 },
    { nombre: 'YERBA X 500 GRS',   categoria: 'ENVASADOS', pesoUnitarioKg: 0.5,  stockMinimo: 200 },
    { nombre: 'FIDEOS',            categoria: 'ENVASADOS', pesoUnitarioKg: 0.5,  stockMinimo: 300 },
    { nombre: 'POLENTA X 500 GRS', categoria: 'ENVASADOS', pesoUnitarioKg: 0.5,  stockMinimo: 150 },
    { nombre: 'GALLETITAS',        categoria: 'ENVASADOS', pesoUnitarioKg: 0.2,  stockMinimo: 200 },
    { nombre: 'ARROZ',             categoria: 'GRANOS',    pesoUnitarioKg: 1.0,  stockMinimo: 200 },
    { nombre: 'AZUCAR',            categoria: 'ENVASADOS', pesoUnitarioKg: 1.0,  stockMinimo: 150 },
    { nombre: 'LENTEJAS',          categoria: 'GRANOS',    pesoUnitarioKg: 1.0,  stockMinimo: 100 },
    { nombre: 'MERMELADA',         categoria: 'ENVASADOS', pesoUnitarioKg: 0.45, stockMinimo: 80  },
    { nombre: 'DULCE DE LECHE',    categoria: 'ENVASADOS', pesoUnitarioKg: 0.4,  stockMinimo: 80  },
  ];

  for (const art of articulosData) {
    const articulo = await prisma.articulo.upsert({
      where: { nombre: art.nombre },
      update: {},
      create: art,
    });

    for (const dep of [depositoLogistica, depositoCita]) {
      await prisma.stock.upsert({
        where: { articuloId_depositoId: { articuloId: articulo.id, depositoId: dep.id } },
        update: {},
        create: { articuloId: articulo.id, depositoId: dep.id, cantidad: 0 },
      });
    }
    console.log(`  ✓ ${art.nombre}`);
  }

  // ──────────────────────────────────────────────────────────
  // 4. CORRELATIVO DE REMITOS
  // ──────────────────────────────────────────────────────────
  const corrExistente = await prisma.correlativo.findUnique({ where: { clave: 'remito_pa' } });
  if (!corrExistente) {
    await prisma.correlativo.create({ data: { clave: 'remito_pa', ultimo: 1006987 } });
    console.log('');
    console.log('🔢 Correlativo inicializado (PA 1006988 en adelante)');
  }

  // ──────────────────────────────────────────────────────────
  // RESUMEN
  // ──────────────────────────────────────────────────────────
  console.log('');
  console.log('═════════════════════════════════════');
  console.log('✅ Setup completado!');
  console.log('');
  console.log(`  📦 Depósitos : ${await prisma.deposito.count()}`);
  console.log(`  🎯 Programas : ${await prisma.programa.count()}`);
  console.log(`  📋 Artículos : ${await prisma.articulo.count()}`);
  console.log('');
  console.log('Ahora creá los usuarios desde la UI de administración (/usuarios).');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
