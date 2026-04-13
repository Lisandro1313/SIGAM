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
      direccion: '115 E/62 y 63',
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
      depositoId: depositoLogistica.id,
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

  // 5. Crear Beneficiarios
  console.log('🏘️  Creando beneficiarios...');
  const beneficiarios = [
    // Espacios - La Plata
    { nombre: 'LOS DUENDES DEL PARQUE', tipo: 'ESPACIO', direccion: '166 e/ 42 y 43', localidad: 'La Plata', telefono: '2215708198', responsableNombre: 'María González', responsableDNI: '25678901', lat: -34.9214, lng: -57.9544, frecuenciaEntrega: 'MENSUAL', kilosHabitual: 320, programaId: programaEspacios.id },
    { nombre: 'COMEDOR MADRES UNIDAS', tipo: 'COMEDOR', direccion: '50 e/ 120 y 121', localidad: 'La Plata', telefono: '2215123456', responsableNombre: 'Ana Rodríguez', responsableDNI: '27345678', lat: -34.9100, lng: -57.9500, frecuenciaEntrega: 'MENSUAL', kilosHabitual: 500, programaId: programaEspacios.id },
    { nombre: 'CLUB ATLÉTICO EL FORTÍN', tipo: 'ESPACIO', direccion: '143 e/ 44 y 45', localidad: 'La Plata', telefono: '2216001234', responsableNombre: 'Roberto Sánchez', responsableDNI: '22111222', lat: -34.9310, lng: -57.9580, frecuenciaEntrega: 'MENSUAL', kilosHabitual: 280, programaId: programaEspacios.id },
    { nombre: 'ORGANIZACIÓN NUEVA ESPERANZA', tipo: 'ORGANIZACION', direccion: '80 e/ 13 y 14', localidad: 'La Plata', telefono: '2214987654', responsableNombre: 'Lucía Fernández', responsableDNI: '31222333', lat: -34.9050, lng: -57.9620, frecuenciaEntrega: 'MENSUAL', kilosHabitual: 420, programaId: programaEspacios.id },
    { nombre: 'ESPACIO EL SOLAR', tipo: 'ESPACIO', direccion: '25 e/ 68 y 69', localidad: 'La Plata', telefono: '2217654321', responsableNombre: 'Carlos Méndez', responsableDNI: '28444555', lat: -34.9180, lng: -57.9700, frecuenciaEntrega: 'MENSUAL', kilosHabitual: 350, programaId: programaEspacios.id },
    { nombre: 'COMEDOR LOS PIBES DEL BARRIO', tipo: 'COMEDOR', direccion: '90 e/ 25 y 26', localidad: 'Berisso', telefono: '2214123789', responsableNombre: 'Patricia López', responsableDNI: '26555666', lat: -34.8750, lng: -57.8900, frecuenciaEntrega: 'MENSUAL', kilosHabitual: 600, programaId: programaEspacios.id },
    { nombre: 'ASOCIACIÓN SOL NACIENTE', tipo: 'ORGANIZACION', direccion: '118 e/ 64 y 65', localidad: 'La Plata', telefono: '2219876543', responsableNombre: 'Diego Torres', responsableDNI: '33666777', lat: -34.9420, lng: -57.9650, frecuenciaEntrega: 'BIMESTRAL', kilosHabitual: 200, programaId: programaEspacios.id },
    { nombre: 'MERENDERO CORAZÓN VALIENTE', tipo: 'ESPACIO', direccion: '137 e/ 521 y 522', localidad: 'Ensenada', telefono: '2213456789', responsableNombre: 'Silvia Castro', responsableDNI: '24777888', lat: -34.8600, lng: -57.9100, frecuenciaEntrega: 'MENSUAL', kilosHabitual: 180, programaId: programaEspacios.id },
    { nombre: 'CENTRO COMUNITARIO LA UNIÓN', tipo: 'ESPACIO', direccion: '7 e/ 62 y 63', localidad: 'La Plata', telefono: '2218765432', responsableNombre: 'Fernando Giménez', responsableDNI: '29888999', lat: -34.9260, lng: -57.9820, frecuenciaEntrega: 'MENSUAL', kilosHabitual: 450, programaId: programaEspacios.id },
    { nombre: 'HOGAR AMIGAS PLATENSES UNIDAS', tipo: 'ESPACIO', direccion: '33 e/ 115 y 116', localidad: 'La Plata', telefono: '2215432198', responsableNombre: 'Graciela Morales', responsableDNI: '21999000', lat: -34.9330, lng: -57.9460, frecuenciaEntrega: 'MENSUAL', kilosHabitual: 380, programaId: programaEspacios.id },
    // Casos particulares
    { nombre: 'FAMILIA ROMERO', tipo: 'CASO_PARTICULAR', direccion: '71 nro 1250', localidad: 'La Plata', telefono: '2216543210', responsableNombre: 'Jorge Romero', responsableDNI: '32123456', frecuenciaEntrega: 'MENSUAL', kilosHabitual: 30, programaId: programaCasosParticulares.id },
    { nombre: 'FAMILIA BENZAQUÉN', tipo: 'CASO_PARTICULAR', direccion: '44 nro 870', localidad: 'La Plata', telefono: '2217890123', responsableNombre: 'Rosa Benzaquén', responsableDNI: '18234567', frecuenciaEntrega: 'MENSUAL', kilosHabitual: 25, programaId: programaCeliquia.id },
  ];

  const beneficiariosCreados = [];
  for (const b of beneficiarios) {
    const ben = await prisma.beneficiario.create({ data: b });
    beneficiariosCreados.push(ben);
  }

  // 6. Crear Plantillas
  console.log('📋 Creando plantillas de entrega...');
  await prisma.plantilla.create({
    data: {
      nombre: 'Plantilla Estándar 300kg',
      descripcion: 'Entrega mensual estándar para comedores medianos',
      kilogramos: 300,
      programaId: programaEspacios.id,
      items: {
        create: [
          { articuloId: articulosCreados[0].id, cantidadBase: 12 },  // ACEITE
          { articuloId: articulosCreados[1].id, cantidadBase: 30 },  // HARINA
          { articuloId: articulosCreados[2].id, cantidadBase: 48 },  // PURE DE TOMATE
          { articuloId: articulosCreados[4].id, cantidadBase: 60 },  // ARVEJAS
          { articuloId: articulosCreados[5].id, cantidadBase: 24 },  // YERBA
          { articuloId: articulosCreados[6].id, cantidadBase: 60 },  // FIDEOS
          { articuloId: articulosCreados[7].id, cantidadBase: 30 },  // POLENTA
          { articuloId: articulosCreados[9].id, cantidadBase: 25 },  // ARROZ
          { articuloId: articulosCreados[10].id, cantidadBase: 12 }, // AZUCAR
        ],
      },
    },
  });

  await prisma.plantilla.create({
    data: {
      nombre: 'Plantilla Grande 500kg',
      descripcion: 'Entrega mensual para comedores grandes (+100 personas)',
      kilogramos: 500,
      programaId: programaEspacios.id,
      items: {
        create: [
          { articuloId: articulosCreados[0].id, cantidadBase: 24 },  // ACEITE
          { articuloId: articulosCreados[1].id, cantidadBase: 50 },  // HARINA
          { articuloId: articulosCreados[2].id, cantidadBase: 96 },  // PURE DE TOMATE
          { articuloId: articulosCreados[3].id, cantidadBase: 48 },  // DULCE DE BATATA
          { articuloId: articulosCreados[4].id, cantidadBase: 120 }, // ARVEJAS
          { articuloId: articulosCreados[5].id, cantidadBase: 50 },  // YERBA
          { articuloId: articulosCreados[6].id, cantidadBase: 120 }, // FIDEOS
          { articuloId: articulosCreados[7].id, cantidadBase: 50 },  // POLENTA
          { articuloId: articulosCreados[9].id, cantidadBase: 50 },  // ARROZ
          { articuloId: articulosCreados[10].id, cantidadBase: 20 }, // AZUCAR
          { articuloId: articulosCreados[12].id, cantidadBase: 24 }, // MERMELADA
        ],
      },
    },
  });

  await prisma.plantilla.create({
    data: {
      nombre: 'Plantilla Celiaquía',
      descripcion: 'Alimentos sin TACC para celíacos',
      kilogramos: 30,
      programaId: programaCeliquia.id,
      items: {
        create: [
          { articuloId: articulosCreados[0].id, cantidadBase: 2 },  // ACEITE
          { articuloId: articulosCreados[9].id, cantidadBase: 5 },  // ARROZ
          { articuloId: articulosCreados[10].id, cantidadBase: 2 }, // AZUCAR
          { articuloId: articulosCreados[13].id, cantidadBase: 3 }, // DULCE DE LECHE
        ],
      },
    },
  });

  // 7. Crear algunas entregas en el cronograma de este mes
  console.log('📅 Creando cronograma del mes...');
  const hoy = new Date();
  const diasEntrega = [10, 12, 15, 17, 19, 22, 24];
  for (let i = 0; i < Math.min(beneficiariosCreados.length, 7); i++) {
    const b = beneficiariosCreados[i];
    if (!b.programaId) continue;
    await prisma.entregaProgramada.create({
      data: {
        beneficiarioId: b.id,
        programaId: b.programaId,
        fechaProgramada: new Date(hoy.getFullYear(), hoy.getMonth(), diasEntrega[i]),
        estado: 'PENDIENTE',
        kilos: b.kilosHabitual,
        hora: `${9 + i}:00`,
      },
    });
  }

  // 8. Inicializar correlativo de remitos
  console.log('🔢 Inicializando correlativo...');
  await prisma.correlativo.create({
    data: {
      clave: 'remito_pa',
      ultimo: 1006987,
    },
  });

  console.log('✅ Seed completado exitosamente!');
  console.log('');
  console.log('📧 Usuario admin:   admin@municipalidad.gob.ar  /  admin123');
  console.log('📧 Usuario logíst:  logistica@municipalidad.gob.ar  /  admin123');
  console.log('📧 Usuario operadr: espacios@municipalidad.gob.ar  /  admin123');
  console.log('');
  console.log(`📦 Depósitos: LOGISTICA, CITA`);
  console.log(`🎯 Programas: ${await prisma.programa.count()}`);
  console.log(`📦 Artículos: ${await prisma.articulo.count()}`);
  console.log(`🏘️  Beneficiarios: ${await prisma.beneficiario.count()}`);
  console.log(`📋 Plantillas: ${await prisma.plantilla.count()}`);
  console.log(`📅 Cronograma (este mes): ${await prisma.entregaProgramada.count()}`);
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
