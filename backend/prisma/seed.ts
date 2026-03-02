import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...');

  // Limpiar datos existentes (solo en desarrollo)
  if (process.env.NODE_ENV === 'development') {
    console.log('⚠️  Limpiando datos existentes...');
    await prisma.movimiento.deleteMany();
    await prisma.remitoItem.deleteMany();
    await prisma.remito.deleteMany();
    await prisma.entregaProgramada.deleteMany();
    await prisma.plantillaItem.deleteMany();
    await prisma.plantilla.deleteMany();
    await prisma.stock.deleteMany();
    await prisma.beneficiario.deleteMany();
    await prisma.articulo.deleteMany();
    await prisma.programa.deleteMany();
    await prisma.usuario.deleteMany();
    await prisma.deposito.deleteMany();
    await prisma.correlativo.deleteMany();
  }

  // 1. Crear Depósitos
  console.log('📦 Creando depósitos...');
  const depositoLogistica = await prisma.deposito.create({
    data: {
      codigo: 'LOGISTICA',
      nombre: 'Depósito Logística',
      direccion: '139 y 514 número 1808',
      telefono: '221-XXX-XXXX',
    },
  });

  const depositoCita = await prisma.deposito.create({
    data: {
      codigo: 'CITA',
      nombre: 'Depósito CITA (Centro)',
      direccion: 'Ubicación céntrica',
      telefono: '221-XXX-XXXX',
    },
  });

  // 2. Crear Programas
  console.log('🎯 Creando programas...');
  const programaEspacios = await prisma.programa.create({
    data: {
      nombre: 'Espacios',
      descripcion: 'Comedores, organizaciones y espacios sociales',
      tipo: 'REGULAR',
      usaCronograma: true,
      usaPlantilla: true,
      descuentaStock: true,
    },
  });

  const programaCeliquia = await prisma.programa.create({
    data: {
      nombre: 'Celiaquía',
      descripcion: 'Programa especial para celíacos',
      tipo: 'PARTICULAR',
      usaCronograma: false,
      usaPlantilla: true,
      descuentaStock: true,
    },
  });

  const programaVasoLeche = await prisma.programa.create({
    data: {
      nombre: 'Vaso de Leche',
      descripcion: 'Entrega diaria de leche',
      tipo: 'DIARIO',
      usaCronograma: false,
      usaPlantilla: true,
      descuentaStock: true,
    },
  });

  const programaCasosParticulares = await prisma.programa.create({
    data: {
      nombre: 'Casos Particulares',
      descripcion: 'Casos individuales',
      tipo: 'PARTICULAR',
      usaCronograma: false,
      usaPlantilla: false,
      descuentaStock: true,
    },
  });

  // 3. Crear Usuarios
  console.log('👥 Creando usuarios...');
  const hashedPassword = await bcrypt.hash('admin123', 10);

  const adminUser = await prisma.usuario.create({
    data: {
      nombre: 'Administrador',
      email: 'admin@municipalidad.gob.ar',
      password: hashedPassword,
      rol: 'ADMIN',
    },
  });

  await prisma.usuario.create({
    data: {
      nombre: 'Logística Municipal',
      email: 'logistica@municipalidad.gob.ar',
      password: hashedPassword,
      rol: 'LOGISTICA',
    },
  });

  await prisma.usuario.create({
    data: {
      nombre: 'Operador Espacios',
      email: 'espacios@municipalidad.gob.ar',
      password: hashedPassword,
      rol: 'OPERADOR_PROGRAMA',
      programa: {
        connect: { id: programaEspacios.id }
      },
    },
  });

  // 4. Crear Artículos (basados en tu imagen)
  console.log('📦 Creando artículos...');
  const articulos = [
    { nombre: 'ACEITE', categoria: 'ENVASADOS', pesoUnitarioKg: 0.9, stockMinimo: 100 },
    { nombre: 'HARINA', categoria: 'ENVASADOS', pesoUnitarioKg: 1.0, stockMinimo: 200 },
    { nombre: 'PURE DE TOMATE', categoria: 'ENVASADOS', pesoUnitarioKg: 0.52, stockMinimo: 150 },
    { nombre: 'DULCE DE BATATA', categoria: 'ENVASADOS', pesoUnitarioKg: 0.7, stockMinimo: 100 },
    { nombre: 'ARVEJAS', categoria: 'ENVASADOS', pesoUnitarioKg: 0.3, stockMinimo: 150 },
    { nombre: 'YERBA X 500 GRS', categoria: 'ENVASADOS', pesoUnitarioKg: 0.5, stockMinimo: 200 },
    { nombre: 'FIDEOS', categoria: 'ENVASADOS', pesoUnitarioKg: 0.5, stockMinimo: 300 },
    { nombre: 'POLENTA X 500 GRS', categoria: 'ENVASADOS', pesoUnitarioKg: 0.5, stockMinimo: 150 },
    { nombre: 'GALLETITAS', categoria: 'ENVASADOS', pesoUnitarioKg: 0.2, stockMinimo: 200 },
    { nombre: 'ARROZ', categoria: 'GRANOS', pesoUnitarioKg: 1.0, stockMinimo: 200 },
    { nombre: 'AZUCAR', categoria: 'ENVASADOS', pesoUnitarioKg: 1.0, stockMinimo: 150 },
    { nombre: 'LENTEJAS', categoria: 'GRANOS', pesoUnitarioKg: 1.0, stockMinimo: 100 },
    { nombre: 'MERMELADA', categoria: 'ENVASADOS', pesoUnitarioKg: 0.45, stockMinimo: 80 },
    { nombre: 'DULCE DE LECHE', categoria: 'ENVASADOS', pesoUnitarioKg: 0.4, stockMinimo: 80 },
  ];

  const articulosCreados = [];
  for (const art of articulos) {
    const articulo = await prisma.articulo.create({ data: art });
    articulosCreados.push(articulo);

    // Crear stock inicial en ambos depósitos
    await prisma.stock.create({
      data: {
        articuloId: articulo.id,
        depositoId: depositoLogistica.id,
        cantidad: Math.floor(Math.random() * 500) + 200, // Stock aleatorio 200-700
      },
    });

    await prisma.stock.create({
      data: {
        articuloId: articulo.id,
        depositoId: depositoCita.id,
        cantidad: Math.floor(Math.random() * 200) + 50, // Stock aleatorio 50-250
      },
    });
  }

  // 5. Crear Beneficiarios de ejemplo
  console.log('🏘️  Creando beneficiarios...');
  await prisma.beneficiario.create({
    data: {
      nombre: 'LOS DUENDES DEL PARQUE',
      tipo: 'ESPACIO',
      direccion: '166 e/ 42 y 43',
      telefono: '2215708198',
      responsableNombre: 'María González',
      responsableDNI: '25678901',
      lat: -34.9214,
      lng: -57.9544,
      frecuenciaEntrega: 'MENSUAL',
      programaId: programaEspacios.id,
    },
  });

  await prisma.beneficiario.create({
    data: {
      nombre: 'COMEDOR SOLIDARIO',
      tipo: 'COMEDOR',
      direccion: '50 y 120',
      telefono: '2215123456',
      responsableNombre: 'Juan Pérez',
      responsableDNI: '30123456',
      lat: -34.9100,
      lng: -57.9500,
      frecuenciaEntrega: 'MENSUAL',
      programaId: programaEspacios.id,
    },
  });

  // 6. Crear Plantilla para Espacios
  console.log('📋 Creando plantilla de entrega...');
  await prisma.plantilla.create({
    data: {
      nombre: 'Plantilla Estándar Espacios',
      descripcion: 'Entrega mensual estándar para comedores',
      programaId: programaEspacios.id,
      items: {
        create: [
          { articuloId: articulosCreados[0].id, cantidadBase: 24 }, // ACEITE
          { articuloId: articulosCreados[1].id, cantidadBase: 50 }, // HARINA
          { articuloId: articulosCreados[2].id, cantidadBase: 96 }, // PURE
          { articuloId: articulosCreados[3].id, cantidadBase: 48 }, // DULCE BATATA
          { articuloId: articulosCreados[4].id, cantidadBase: 120 }, // ARVEJAS
          { articuloId: articulosCreados[5].id, cantidadBase: 50 }, // YERBA
          { articuloId: articulosCreados[6].id, cantidadBase: 120 }, // FIDEOS
          { articuloId: articulosCreados[9].id, cantidadBase: 50 }, // ARROZ
          { articuloId: articulosCreados[10].id, cantidadBase: 20 }, // AZUCAR
        ],
      },
    },
  });

  // 7. Inicializar correlativo de remitos
  console.log('🔢 Inicializando correlativo...');
  await prisma.correlativo.create({
    data: {
      clave: 'remito_pa',
      ultimo: 1006987,
    },
  });

  console.log('✅ Seed completado exitosamente!');
  console.log('');
  console.log('📧 Usuario admin creado:');
  console.log('   Email: admin@municipalidad.gob.ar');
  console.log('   Password: admin123');
  console.log('');
  console.log('📦 Depósitos creados: LOGISTICA, CITA');
  console.log(`🎯 Programas creados: ${await prisma.programa.count()}`);
  console.log(`📦 Artículos creados: ${await prisma.articulo.count()}`);
  console.log(`🏘️  Beneficiarios creados: ${await prisma.beneficiario.count()}`);
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
