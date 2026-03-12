/**
 * seed-produccion.ts
 *
 * Crea el usuario admin inicial en producción.
 * Uso: npx ts-node prisma/seed-produccion.ts
 *
 * IMPORTANTE: Este script NO borra datos existentes.
 * Si el admin ya existe, lo omite con upsert.
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as readline from 'readline';

const prisma = new PrismaClient();

function pregunta(texto: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(texto, (respuesta) => {
      rl.close();
      resolve(respuesta.trim());
    });
  });
}

async function main() {
  console.log('🚀 Seed de producción - SIGAM');
  console.log('Este script crea el usuario administrador inicial.');
  console.log('');

  const email = process.env.ADMIN_EMAIL || await pregunta('Email del admin: ');
  const nombre = process.env.ADMIN_NOMBRE || await pregunta('Nombre del admin: ');
  const password = process.env.ADMIN_PASSWORD || await pregunta('Contraseña del admin (mínimo 8 caracteres): ');

  if (!email || !nombre || !password) {
    throw new Error('Email, nombre y contraseña son requeridos');
  }

  if (password.length < 8) {
    throw new Error('La contraseña debe tener al menos 8 caracteres');
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const admin = await prisma.usuario.upsert({
    where: { email },
    update: {},
    create: {
      email,
      nombre,
      password: hashedPassword,
      rol: 'ADMIN',
      activo: true,
    },
  });

  console.log(`✅ Usuario admin creado/verificado: ${admin.email} (ID: ${admin.id})`);
  console.log('');
  console.log('⚠️  Guardá la contraseña en un lugar seguro — no se puede recuperar.');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed de producción:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
