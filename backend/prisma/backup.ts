import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  console.log('💾 Haciendo backup de Supabase...');
  const backup: Record<string, any> = {
    timestamp:      new Date().toISOString(),
    depositos:      await prisma.deposito.findMany(),
    programas:      await prisma.programa.findMany(),
    usuarios:       await prisma.usuario.findMany(),
    articulos:      await prisma.articulo.findMany(),
    stock:          await prisma.stock.findMany(),
    beneficiarios:  await prisma.beneficiario.findMany(),
    plantillas:     await prisma.plantilla.findMany(),
    plantillaItems: await prisma.plantillaItem.findMany(),
    correlativos:   await prisma.correlativo.findMany(),
    entregas:       await prisma.entregaProgramada.findMany(),
    remitos:        await prisma.remito.findMany(),
    remitoItems:    await prisma.remitoItem.findMany(),
    movimientos:    await prisma.movimiento.findMany(),
  };

  const filename = `C:/Users/Usuario/Downloads/sigam_backup_${
    new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16)
  }.json`;

  fs.writeFileSync(filename, JSON.stringify(backup, null, 2));
  console.log(`\n✅ Backup guardado en: ${filename}`);
  console.log('\nRegistros por tabla:');
  Object.entries(backup).forEach(([k, v]) => {
    if (Array.isArray(v)) console.log(`   ${k.padEnd(16)}: ${v.length}`);
  });
}

main()
  .catch(e => { console.error('❌', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
