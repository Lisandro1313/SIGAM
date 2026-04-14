/**
 * Restaura la base de datos a un backup JSON generado por backup.ts
 * Uso: npx ts-node prisma/restore-backup.ts <archivo-backup.json>
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

// Usar conexión directa (puerto 5432) para soportar TRUNCATE y DDL
const DIRECT = process.env.DIRECT_URL || process.env.DATABASE_URL || '';
const prisma = new PrismaClient({
  datasources: { db: { url: DIRECT } },
});

// Inserta filas con ids explícitos usando SQL crudo para evitar conflictos de secuencia
async function upsertAll(tabla: string, filas: any[]) {
  if (!filas.length) return;
  for (const fila of filas) {
    const cols = Object.keys(fila).map(k => `"${k}"`).join(', ');
    const vals = Object.values(fila).map(v =>
      v === null ? 'NULL' :
      v instanceof Date ? `'${(v as Date).toISOString()}'` :
      typeof v === 'string' ? `'${(v as string).replace(/'/g, "''")}'` :
      String(v)
    ).join(', ');
    await prisma.$executeRawUnsafe(
      `INSERT INTO "${tabla}" (${cols}) VALUES (${vals}) ON CONFLICT (id) DO NOTHING`
    );
  }
}

async function resetSecuencia(tabla: string, filas: any[]) {
  if (!filas.length) return;
  const maxId = Math.max(...filas.map((f: any) => f.id ?? 0));
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"${tabla}"', 'id'), ${maxId}, true)`
  );
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('❌ Uso: npx ts-node prisma/restore-backup.ts <backup.json>');
    process.exit(1);
  }

  const backup = JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf-8'));
  console.log(`\n📂 Restaurando backup del: ${backup.timestamp}\n`);

  // 1. Limpiar de hoja a raíz para respetar FK, sin CASCADE
  console.log('🗑️  Limpiando tablas...');
  const tablasBorrar = [
    'Movimiento', 'RemitoItem', 'Remito', 'EntregaProgramada',
    'PlantillaItem', 'Plantilla', 'Stock', 'Correlativo',
    'Beneficiario', 'Usuario', 'Articulo', 'Programa', 'Deposito',
  ];
  for (const t of tablasBorrar) {
    process.stdout.write(`  DELETE ${t}... `);
    await prisma.$executeRawUnsafe(`DELETE FROM "${t}"`);
    console.log('ok');
  }

  // 2. Reinsertar en orden respetando FK (sin tocar el id auto-generado)
  console.log('📥 Restaurando datos...');

  await upsertAll('Deposito',           backup.depositos);
  await upsertAll('Programa',           backup.programas);
  await upsertAll('Usuario',            backup.usuarios);
  await upsertAll('Articulo',           backup.articulos);
  await upsertAll('Beneficiario',       backup.beneficiarios);
  await upsertAll('Stock',              backup.stock);
  await upsertAll('Plantilla',          backup.plantillas);
  await upsertAll('PlantillaItem',      backup.plantillaItems);
  await upsertAll('Correlativo',        backup.correlativos);
  await upsertAll('Remito',             backup.remitos);
  await upsertAll('RemitoItem',         backup.remitoItems);
  await upsertAll('Movimiento',         backup.movimientos);
  await upsertAll('EntregaProgramada',  backup.entregas);

  // 3. Resetear secuencias para que los próximos inserts no colisionen
  console.log('🔢 Reseteando secuencias...');
  await resetSecuencia('Deposito',          backup.depositos);
  await resetSecuencia('Programa',          backup.programas);
  await resetSecuencia('Usuario',           backup.usuarios);
  await resetSecuencia('Articulo',          backup.articulos);
  await resetSecuencia('Beneficiario',      backup.beneficiarios);
  await resetSecuencia('Plantilla',         backup.plantillas);
  await resetSecuencia('PlantillaItem',     backup.plantillaItems);
  await resetSecuencia('Correlativo',       backup.correlativos);
  await resetSecuencia('EntregaProgramada', backup.entregas);
  await resetSecuencia('Remito',            backup.remitos);
  await resetSecuencia('RemitoItem',        backup.remitoItems);
  await resetSecuencia('Movimiento',        backup.movimientos);

  // Verificar
  const counts = {
    depositos:     await prisma.deposito.count(),
    programas:     await prisma.programa.count(),
    usuarios:      await prisma.usuario.count(),
    articulos:     await prisma.articulo.count(),
    beneficiarios: await prisma.beneficiario.count(),
    remitos:       await prisma.remito.count(),
    remitoItems:   await prisma.remitoItem.count(),
    movimientos:   await prisma.movimiento.count(),
  };

  console.log('\n✅ Restauración completa:');
  Object.entries(counts).forEach(([k, v]) => console.log(`   ${k.padEnd(16)}: ${v}`));
  console.log('');
}

main()
  .catch(e => { console.error('❌', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
