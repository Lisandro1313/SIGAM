import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL } },
});

async function main() {
  const seqs = await prisma.$queryRawUnsafe<{ sequence_name: string }[]>(
    `SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public'`
  );

  for (const { sequence_name } of seqs) {
    const table = sequence_name.replace('_id_seq', '');
    // Use double quotes for both sequence and table (case-sensitive in Postgres)
    const sql = `SELECT setval('"${sequence_name}"', COALESCE((SELECT MAX(id) FROM "${table}"), 1), true)`;
    try {
      const result = await prisma.$executeRawUnsafe(sql);
      console.log(`✓ ${table} → seq set`);
    } catch (e: any) {
      console.log(`✗ ${table}: ${e.message?.split('\n')[0] || JSON.stringify(e)}`);
    }
  }
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
