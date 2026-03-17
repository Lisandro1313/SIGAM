/**
 * seed-demo.ts
 *
 * Crea los usuarios de demostración con contraseñas predefinidas.
 * SEGURO: usa upsert por email — no borra usuarios existentes.
 *
 * Uso: npx ts-node prisma/seed-demo.ts
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const ROUNDS = 10;

async function main() {
  console.log('👤 Creando usuarios de demo — SIGAM');
  console.log('');

  // ── Obtener depósitos para asignar a LOGISTICA ─────────────────────────
  const depLogistica = await prisma.deposito.findUnique({ where: { codigo: 'LOGISTICA' } });
  const depCita      = await prisma.deposito.findUnique({ where: { codigo: 'CITA' } });

  if (!depLogistica || !depCita) {
    console.error('❌ Depósitos no encontrados. Ejecutá primero: npx ts-node prisma/seed-produccion.ts');
    process.exit(1);
  }

  // ── Lista de usuarios demo ────────────────────────────────────────────
  const usuarios = [
    {
      email:      'admin@sigam.com',
      nombre:     'Administrador SIGAM',
      password:   'Admin2026',
      rol:        'ADMIN',
      depositoId: null,
      programaId: null,
      info:       'Acceso total al sistema',
    },
    {
      email:      'pa@sigam.com',
      nombre:     'Política Alimentaria',
      password:   'PA2026',
      rol:        'ADMIN',          // ve todo el sistema operativo
      depositoId: null,
      programaId: null,
      info:       'Coordinación de Política Alimentaria — acceso completo',
    },
    {
      email:      'asistenciacritica@sigam.com',
      nombre:     'Asistencia Crítica',
      password:   'AsistenciaCritica2026',
      rol:        'ASISTENCIA_CRITICA',
      depositoId: null,
      programaId: null,
      info:       'Operador del programa Asistencia Crítica',
    },
    {
      email:      'deposito.cita@sigam.com',
      nombre:     'Depósito CITA',
      password:   'DepCITA2026',
      rol:        'LOGISTICA',
      depositoId: depCita.id,
      programaId: null,
      info:       'Operador físico del depósito CITA',
    },
    {
      email:      'deposito.logistica@sigam.com',
      nombre:     'Depósito Logística',
      password:   'DepLog2026',
      rol:        'LOGISTICA',
      depositoId: depLogistica.id,
      programaId: null,
      info:       'Operador físico del depósito Logística',
    },
    {
      email:      'social@sigam.com',
      nombre:     'Trabajadora Social',
      password:   'Social2026',
      rol:        'TRABAJADORA_SOCIAL',
      depositoId: null,
      programaId: null,
      info:       'Relevamiento y observaciones de beneficiarios',
    },
    {
      email:      'visor@sigam.com',
      nombre:     'Visor Directivo',
      password:   'Visor2026',
      rol:        'VISOR',
      depositoId: null,
      programaId: null,
      info:       'Solo lectura: dashboard y reportes',
    },
  ];

  // ── Crear / actualizar ────────────────────────────────────────────────
  for (const u of usuarios) {
    const hash = await bcrypt.hash(u.password, ROUNDS);
    await prisma.usuario.upsert({
      where:  { email: u.email },
      update: {
        nombre:     u.nombre,
        password:   hash,
        rol:        u.rol as any,
        depositoId: u.depositoId,
        programaId: u.programaId,
        activo:     true,
      },
      create: {
        email:      u.email,
        nombre:     u.nombre,
        password:   hash,
        rol:        u.rol as any,
        depositoId: u.depositoId,
        programaId: u.programaId,
        activo:     true,
      },
    });
    console.log(`  ✓ [${u.rol.padEnd(20)}]  ${u.email.padEnd(38)}  →  ${u.password}`);
  }

  // ── Resumen ───────────────────────────────────────────────────────────
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('✅ Usuarios de demo creados');
  console.log('');
  console.log('┌─────────────────────────────────┬──────────────────────────┬────────────────┐');
  console.log('│ Usuario                         │ Email                    │ Contraseña     │');
  console.log('├─────────────────────────────────┼──────────────────────────┼────────────────┤');
  for (const u of usuarios) {
    const nombre  = u.nombre.padEnd(31);
    const email   = u.email.padEnd(24);
    const pass    = u.password.padEnd(14);
    console.log(`│ ${nombre} │ ${email} │ ${pass} │`);
  }
  console.log('└─────────────────────────────────┴──────────────────────────┴────────────────┘');
  console.log('');
  console.log('  ⚠  Cambiá las contraseñas después de la presentación.');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
