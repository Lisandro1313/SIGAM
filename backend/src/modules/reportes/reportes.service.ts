import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { startOfMonth, endOfMonth } from 'date-fns';

@Injectable()
export class ReportesService {
  constructor(private prisma: PrismaService) {}

  /** Resuelve un rango {inicio, fin} desde mes+anio OR fechaDesde+fechaHasta */
  private resolverRango(
    mes?: number, anio?: number,
    fechaDesde?: string, fechaHasta?: string,
  ): { inicio: Date; fin: Date } | null {
    if (fechaDesde && fechaHasta) {
      const inicio = new Date(fechaDesde); inicio.setHours(0, 0, 0, 0);
      const fin = new Date(fechaHasta);    fin.setHours(23, 59, 59, 999);
      return { inicio, fin };
    }
    if (mes && anio) {
      const fecha = new Date(anio, mes - 1, 1);
      return { inicio: startOfMonth(fecha), fin: endOfMonth(fecha) };
    }
    return null;
  }

  // Reporte: Kilos entregados por mes (retorna los últimos N meses si no se especifica)
  async kilosPorMes(mes?: number, anio?: number, secretaria?: string | null) {
    // Si se pasan parámetros válidos, retorna un solo mes
    if (mes && anio && !isNaN(mes) && !isNaN(anio)) {
      const fecha = new Date(anio, mes - 1, 1);
      const inicio = startOfMonth(fecha);
      const fin = endOfMonth(fecha);
      const where: any = { fecha: { gte: inicio, lte: fin }, estado: { in: ['CONFIRMADO', 'ENVIADO'] } };
      if (secretaria) where.secretaria = secretaria;
      const remitos = await this.prisma.remito.findMany({
        where,
        select: { totalKg: true },
      });
      const totalKilos = remitos.reduce((sum, r) => sum + (r.totalKg || 0), 0);
      return [{ mes, anio, totalKilos, cantidadRemitos: remitos.length }];
    }

    // Sin parámetros: últimos 6 meses — una sola query, agrupación en JS
    const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const hoy = new Date();
    const inicio6 = startOfMonth(new Date(hoy.getFullYear(), hoy.getMonth() - 5, 1));
    const fin6    = endOfMonth(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
    const where6: any = { fecha: { gte: inicio6, lte: fin6 }, estado: { in: ['CONFIRMADO', 'ENVIADO'] } };
    if (secretaria) where6.secretaria = secretaria;
    const todosRemitos = await this.prisma.remito.findMany({ where: where6, select: { fecha: true, totalKg: true } });

    // Construir mapa mes->año -> acumulado
    const mapaKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;
    const mapa: Record<string, { totalKilos: number; cantidadRemitos: number }> = {};
    for (const r of todosRemitos) {
      const k = mapaKey(new Date(r.fecha));
      if (!mapa[k]) mapa[k] = { totalKilos: 0, cantidadRemitos: 0 };
      mapa[k].totalKilos += r.totalKg || 0;
      mapa[k].cantidadRemitos++;
    }

    const resultados = [];
    for (let i = 5; i >= 0; i--) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const k = mapaKey(fecha);
      resultados.push({
        mes: fecha.getMonth() + 1,
        mesNombre: MESES[fecha.getMonth()],
        anio: fecha.getFullYear(),
        totalKilos: mapa[k]?.totalKilos ?? 0,
        cantidadRemitos: mapa[k]?.cantidadRemitos ?? 0,
      });
    }
    return resultados;
  }

  // Reporte: Entregas por localidad
  async entregasPorLocalidad(mes?: number, anio?: number, secretaria?: string | null) {
    const where: any = {
      estado: {
        in: ['CONFIRMADO', 'ENVIADO'],
      },
    };

    if (mes && anio) {
      const fecha = new Date(anio, mes - 1, 1);
      where.fecha = {
        gte: startOfMonth(fecha),
        lte: endOfMonth(fecha),
      };
    }
    if (secretaria) where.secretaria = secretaria;

    const remitos = await this.prisma.remito.findMany({
      where,
      include: {
        beneficiario: {
          select: {
            localidad: true,
            lat: true,
            lng: true,
          },
        },
      },
    });

    const porLocalidad = remitos.reduce((acc, remito) => {
      const localidad = remito.beneficiario?.localidad || 'Sin localidad';
      if (!acc[localidad]) {
        acc[localidad] = {
          localidad,
          cantidadRemitos: 0,
          totalKilos: 0,
          ubicaciones: [],
        };
      }
      acc[localidad].cantidadRemitos++;
      acc[localidad].totalKilos += remito.totalKg || 0;
      
      if (remito.beneficiario?.lat && remito.beneficiario?.lng) {
        acc[localidad].ubicaciones.push({
          lat: remito.beneficiario.lat,
          lng: remito.beneficiario.lng,
        });
      }
      
      return acc;
    }, {});

    return Object.values(porLocalidad);
  }

  // Reporte: Artículos más distribuidos
  async articulosMasDistribuidos(mes?: number, anio?: number, secretaria?: string | null, fechaDesde?: string, fechaHasta?: string) {
    const where: any = {};
    const rango = this.resolverRango(mes, anio, fechaDesde, fechaHasta);
    if (rango) where.fecha = { gte: rango.inicio, lte: rango.fin };
    if (secretaria) where.secretaria = secretaria;

    const items = await this.prisma.remitoItem.findMany({
      where: {
        remito: where,
      },
      include: {
        articulo: {
          select: {
            id: true,
            nombre: true,
            categoria: true,
          },
        },
      },
    });

    const porArticulo = items.reduce((acc, item) => {
      const articuloId = item.articulo.id;
      if (!acc[articuloId]) {
        acc[articuloId] = {
          articulo: item.articulo.nombre,
          categoria: item.articulo.categoria,
          cantidadTotal: 0,
          pesoTotal: 0,
        };
      }
      acc[articuloId].cantidadTotal += item.cantidad;
      acc[articuloId].pesoTotal += item.pesoKg || 0;
      return acc;
    }, {});

    return Object.values(porArticulo).sort((a: any, b: any) => b.cantidadTotal - a.cantidadTotal);
  }

  // Reporte: Entregas por programa
  async entregasPorPrograma(mes?: number, anio?: number, secretaria?: string | null, fechaDesde?: string, fechaHasta?: string) {
    const where: any = { estado: { in: ['CONFIRMADO', 'ENVIADO'] } };
    const rango = this.resolverRango(mes, anio, fechaDesde, fechaHasta);
    if (rango) where.fecha = { gte: rango.inicio, lte: rango.fin };
    if (secretaria) where.secretaria = secretaria;

    const remitos = await this.prisma.remito.findMany({
      where,
      include: {
        programa: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });

    const porPrograma = remitos.reduce((acc, remito) => {
      const programaId = remito.programa?.id || 0;
      const programaNombre = remito.programa?.nombre || 'Sin programa';
      
      if (!acc[programaId]) {
        acc[programaId] = {
          programa: programaNombre,
          cantidadRemitos: 0,
          totalKilos: 0,
        };
      }
      acc[programaId].cantidadRemitos++;
      acc[programaId].totalKilos += remito.totalKg || 0;
      return acc;
    }, {});

    return Object.values(porPrograma);
  }

  // Reporte: Stock actual alertas
  async stockBajo() {
    const articulos = await this.prisma.articulo.findMany({
      where: {
        activo: true,
        stockMinimo: {
          not: null,
        },
      },
      include: {
        stockItems: {
          include: {
            deposito: true,
          },
        },
      },
    });

    const alertas = [];

    for (const articulo of articulos) {
      for (const stock of articulo.stockItems) {
        if (articulo.stockMinimo && stock.cantidad < articulo.stockMinimo) {
          alertas.push({
            articulo: articulo.nombre,
            deposito: stock.deposito.nombre,
            stockActual: stock.cantidad,
            stockMinimo: articulo.stockMinimo,
            diferencia: articulo.stockMinimo - stock.cantidad,
          });
        }
      }
    }

    return alertas;
  }

  // Reporte: Beneficiarios por programa (con totales de kg habitual)
  async beneficiariosPorPrograma() {
    const programas = await this.prisma.programa.findMany({
      where: { activo: true },
      include: {
        beneficiarios: {
          where: { activo: true },
          select: { id: true, tipo: true, kilosHabitual: true, frecuenciaEntrega: true },
        },
      },
    });
    return programas.map(p => ({
      programa: p.nombre,
      programaId: p.id,
      tipo: p.tipo,
      total: p.beneficiarios.length,
      kgHabitualTotal: p.beneficiarios.reduce((s, b) => s + (b.kilosHabitual ?? 0), 0),
      porTipo: p.beneficiarios.reduce((acc: any, b) => {
        acc[b.tipo] = (acc[b.tipo] ?? 0) + 1; return acc;
      }, {}),
      porFrecuencia: p.beneficiarios.reduce((acc: any, b) => {
        if (b.frecuenciaEntrega) acc[b.frecuenciaEntrega] = (acc[b.frecuenciaEntrega] ?? 0) + 1; return acc;
      }, {}),
    }));
  }

  // Reporte: Cruces masivos — beneficiarios que aparecen en más de un programa
  async crucesMasivos() {
    const todos = await this.prisma.beneficiario.findMany({
      where: { responsableDNI: { not: null } },
      select: {
        id: true,
        nombre: true,
        tipo: true,
        activo: true,
        responsableDNI: true,
        programa: { select: { id: true, nombre: true, secretaria: true } },
      },
      orderBy: { responsableDNI: 'asc' },
    });

    // Agrupar por DNI
    const porDni = new Map<string, typeof todos>();
    for (const b of todos) {
      const dni = b.responsableDNI!;
      if (!porDni.has(dni)) porDni.set(dni, []);
      porDni.get(dni)!.push(b);
    }

    // Solo los DNIs que aparecen en más de un registro
    const cruces: { dni: string; registros: typeof todos }[] = [];
    for (const [dni, registros] of porDni) {
      if (registros.length > 1) cruces.push({ dni, registros });
    }

    return cruces.sort((a, b) => b.registros.length - a.registros.length);
  }

  // Reporte: Beneficiarios sin entrega reciente (vencidos según frecuencia)
  async beneficiariosSinEntregaDetalle(secretaria?: string | null) {
    const hoy = new Date();
    const MESES_FREQ: Record<string, number> = { MENSUAL: 1, BIMESTRAL: 2 };

    const whereB: any = { activo: true, frecuenciaEntrega: { in: ['MENSUAL', 'BIMESTRAL'] } };
    if (secretaria) whereB.programa = { secretaria };

    const beneficiarios = await this.prisma.beneficiario.findMany({
      where: whereB,
      include: {
        programa: { select: { nombre: true, secretaria: true } },
        remitos: {
          where: { estado: 'ENTREGADO' },
          orderBy: { entregadoAt: 'desc' },
          take: 1,
          select: { entregadoAt: true, fecha: true, totalKg: true },
        },
      },
      orderBy: { nombre: 'asc' },
    });

    const resultado: any[] = [];
    for (const b of beneficiarios) {
      const meses = MESES_FREQ[b.frecuenciaEntrega!] ?? 1;
      const ultimaEntrega = b.remitos[0]?.entregadoAt ?? b.remitos[0]?.fecha ?? null;
      const proximaEntrega = ultimaEntrega
        ? new Date(new Date(ultimaEntrega).setMonth(new Date(ultimaEntrega).getMonth() + meses))
        : null;
      const vencida = proximaEntrega ? proximaEntrega < hoy : true;
      const diasAtraso = vencida && proximaEntrega
        ? Math.floor((hoy.getTime() - proximaEntrega.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      if (vencida) {
        resultado.push({
          id: b.id,
          nombre: b.nombre,
          localidad: b.localidad,
          programa: b.programa?.nombre ?? '',
          frecuencia: b.frecuenciaEntrega,
          ultimaEntrega: ultimaEntrega ? new Date(ultimaEntrega).toISOString().slice(0, 10) : null,
          proximaEntrega: proximaEntrega ? proximaEntrega.toISOString().slice(0, 10) : null,
          diasAtraso,
          sinEntregaNunca: !ultimaEntrega,
        });
      }
    }

    // Ordenar: primero los que nunca recibieron, luego por días de atraso desc
    resultado.sort((a, b) => {
      if (a.sinEntregaNunca && !b.sinEntregaNunca) return -1;
      if (!a.sinEntregaNunca && b.sinEntregaNunca) return 1;
      return b.diasAtraso - a.diasAtraso;
    });

    return {
      total: resultado.length,
      sinEntregaNunca: resultado.filter(r => r.sinEntregaNunca).length,
      detalle: resultado,
    };
  }

  // Reporte: Remitos con detalle para exportación personalizada
  async remitosDetalle(mes?: number, anio?: number, programaId?: number, estado?: string, secretaria?: string | null, fechaDesde?: string, fechaHasta?: string) {
    const where: any = {};
    const rango = this.resolverRango(mes, anio, fechaDesde, fechaHasta);
    if (rango) where.fecha = { gte: rango.inicio, lte: rango.fin };
    if (programaId) where.programaId = programaId;
    if (estado) where.estado = estado;
    if (secretaria) where.secretaria = secretaria;

    const remitos = await this.prisma.remito.findMany({
      where,
      include: {
        beneficiario: { select: { nombre: true, tipo: true, localidad: true } },
        programa: { select: { nombre: true } },
        deposito: { select: { nombre: true } },
        items: { include: { articulo: { select: { nombre: true, categoria: true } } } },
      },
      orderBy: { fecha: 'desc' },
      take: 500,
    });

    return remitos.map(r => ({
      id: r.id,
      numero: r.numero,
      fecha: r.fecha.toISOString().slice(0, 10),
      estado: r.estado,
      beneficiario: r.beneficiario?.nombre ?? '',
      tipoBeneficiario: r.beneficiario?.tipo ?? '',
      localidad: r.beneficiario?.localidad ?? '',
      programa: r.programa?.nombre ?? '',
      deposito: r.deposito?.nombre ?? '',
      totalKg: r.totalKg ?? 0,
      items: r.items.map(i => `${i.articulo.nombre} x${i.cantidad}`).join(' | '),
      cantidadItems: r.items.length,
    }));
  }

  // Reporte: Resumen de entregas del mes (entregadas vs no entregadas)
  async resumenEntregasMes(mes: number, anio: number, secretaria?: string | null, fechaDesde?: string, fechaHasta?: string) {
    const rango = this.resolverRango(mes, anio, fechaDesde, fechaHasta)!;
    const { inicio, fin } = rango;

    const where: any = { fechaProgramada: { gte: inicio, lte: fin } };
    if (secretaria) where.secretaria = secretaria;

    const entregas = await this.prisma.entregaProgramada.findMany({
      where,
      include: {
        beneficiario: { select: { nombre: true, tipo: true, localidad: true, kilosHabitual: true } },
        programa: { select: { nombre: true } },
      },
      orderBy: [{ estado: 'asc' }, { fechaProgramada: 'asc' }],
    });

    const resumen = {
      total: entregas.length,
      pendientes: entregas.filter(e => e.estado === 'PENDIENTE').length,
      generadas: entregas.filter(e => e.estado === 'GENERADA').length,
      entregadas: entregas.filter(e => e.estado === 'ENTREGADA').length,
      canceladas: entregas.filter(e => e.estado === 'CANCELADA').length,
      kgProgramado: entregas.reduce((s, e) => s + (e.kilos ?? e.beneficiario?.kilosHabitual ?? 0), 0),
      detalle: entregas.map(e => ({
        id: e.id,
        beneficiario: e.beneficiario?.nombre ?? '',
        tipo: e.beneficiario?.tipo ?? '',
        localidad: e.beneficiario?.localidad ?? '',
        programa: e.programa?.nombre ?? '',
        fechaProgramada: e.fechaProgramada.toISOString().slice(0, 10),
        kilos: e.kilos ?? e.beneficiario?.kilosHabitual ?? 0,
        estado: e.estado,
      })),
    };
    return resumen;
  }

  // Búsqueda global: beneficiarios, casos y remitos
  async busquedaGlobal(q: string, secretaria?: string | null) {
    if (!q || q.trim().length < 2) return { beneficiarios: [], casos: [], remitos: [] };
    const term = q.trim();

    const benWhere: any = {
      activo: true,
      OR: [
        { nombre: { contains: term, mode: 'insensitive' } },
        { responsableDNI: { contains: term } },
        { responsableNombre: { contains: term, mode: 'insensitive' } },
      ],
    };
    if (secretaria) benWhere.programa = { secretaria };

    const casosWhere: any = {
      OR: [
        { nombreSolicitante: { contains: term, mode: 'insensitive' } },
        { dni: { contains: term } },
      ],
    };

    const remitosWhere: any = {
      OR: [
        { numero: { contains: term, mode: 'insensitive' } },
        { beneficiario: { nombre: { contains: term, mode: 'insensitive' } } },
      ],
    };
    if (secretaria) remitosWhere.secretaria = secretaria;

    const [beneficiarios, casos, remitos] = await Promise.all([
      this.prisma.beneficiario.findMany({
        where: benWhere,
        select: { id: true, nombre: true, tipo: true, localidad: true, responsableDNI: true, programa: { select: { nombre: true } } },
        take: 8, orderBy: { nombre: 'asc' },
      }),
      this.prisma.caso.findMany({
        where: casosWhere,
        select: { id: true, nombreSolicitante: true, tipo: true, estado: true, prioridad: true, dni: true, createdAt: true },
        take: 8, orderBy: { createdAt: 'desc' },
      }),
      this.prisma.remito.findMany({
        where: remitosWhere,
        select: { id: true, numero: true, estado: true, fecha: true, totalKg: true, beneficiario: { select: { nombre: true } } },
        take: 8, orderBy: { fecha: 'desc' },
      }),
    ]);

    return { beneficiarios, casos, remitos };
  }

  // Notificaciones: alertas operativas para el top bar
  async notificaciones(secretaria?: string | null) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const hace7dias = new Date(hoy);
    hace7dias.setDate(hace7dias.getDate() - 7);

    const secFilter = secretaria ? { secretaria } : {};

    const [casosUrgentes, casosAprobadosSinRemito, remitosDemorados, stockItems] =
      await Promise.all([
        this.prisma.caso.count({
          where: { prioridad: { in: ['URGENTE', 'ALTA'] }, estado: { in: ['PENDIENTE', 'EN_REVISION'] } },
        }),
        this.prisma.caso.count({
          where: { estado: 'APROBADO', remitoId: null },
        }),
        this.prisma.remito.count({
          where: { estado: { in: ['CONFIRMADO', 'ENVIADO'] }, fecha: { lte: hace7dias }, ...secFilter },
        }),
        this.stockBajo(),
      ]);

    const notificaciones: any[] = [];

    if (casosUrgentes > 0) {
      notificaciones.push({
        tipo: 'CASOS_URGENTES',
        nivel: 'error',
        titulo: `${casosUrgentes} caso${casosUrgentes > 1 ? 's' : ''} urgente${casosUrgentes > 1 ? 's' : ''} sin resolver`,
        descripcion: 'Prioridad URGENTE o ALTA pendientes de revisión',
        link: '/casos-particulares',
      });
    }

    if (casosAprobadosSinRemito > 0) {
      notificaciones.push({
        tipo: 'CASOS_APROBADOS',
        nivel: 'warning',
        titulo: `${casosAprobadosSinRemito} caso${casosAprobadosSinRemito > 1 ? 's' : ''} aprobado${casosAprobadosSinRemito > 1 ? 's' : ''} sin remito generado`,
        descripcion: 'Casos aprobados que aún no tienen remito generado',
        link: '/casos-particulares',
      });
    }

    if (remitosDemorados > 0) {
      notificaciones.push({
        tipo: 'REMITOS_DEMORADOS',
        nivel: 'warning',
        titulo: `${remitosDemorados} remito${remitosDemorados > 1 ? 's' : ''} sin entregar hace +7 días`,
        descripcion: 'Remitos confirmados o enviados que llevan más de 7 días sin entrega',
        link: '/remitos',
      });
    }

    if (stockItems.length > 0) {
      notificaciones.push({
        tipo: 'STOCK_BAJO',
        nivel: 'warning',
        titulo: `${stockItems.length} artículo${stockItems.length > 1 ? 's' : ''} con stock bajo mínimo`,
        descripcion: stockItems.slice(0, 3).map((a: any) => a.articulo).join(', ') + (stockItems.length > 3 ? '...' : ''),
        link: '/stock',
      });
    }

    return { notificaciones, total: notificaciones.length };
  }

  // Dashboard: Resumen operativo
  async dashboard(secretaria?: string | null) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);
    const pasadoManana = new Date(hoy);
    pasadoManana.setDate(pasadoManana.getDate() + 2);
    const en7dias = new Date(hoy);
    en7dias.setDate(en7dias.getDate() + 7);
    const hace30dias = new Date(hoy);
    hace30dias.setDate(hace30dias.getDate() - 30);
    const inicioMes = startOfMonth(new Date());
    const finMes = endOfMonth(new Date());
    const inicioMesAnterior = startOfMonth(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1));
    const finMesAnterior = endOfMonth(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1));

    const secFilter = secretaria ? { secretaria } : {};

    const [remitosDelDia, remitosRecientes, proximasEntregas, remitosDelMes, kgDelMes, kgMesAnterior, casosUrgentes] =
      await Promise.all([
        this.prisma.remito.findMany({
          where: { fecha: { gte: hoy, lt: pasadoManana }, ...secFilter },
          include: {
            beneficiario: { select: { nombre: true } },
            programa: { select: { nombre: true } },
            deposito: { select: { nombre: true } },
          },
          orderBy: { fecha: 'desc' },
        }),
        this.prisma.remito.findMany({
          where: { fecha: { lt: hoy }, ...secFilter },
          include: {
            beneficiario: { select: { nombre: true } },
            programa: { select: { nombre: true } },
            deposito: { select: { nombre: true } },
          },
          orderBy: { fecha: 'desc' },
          take: 10,
        }),
        this.prisma.entregaProgramada.findMany({
          where: {
            estado: { in: ['PENDIENTE', 'GENERADA'] },
            fechaProgramada: { gte: hoy, lte: en7dias },
            ...(secretaria ? { secretaria } : {}),
          },
          include: {
            beneficiario: { select: { nombre: true, localidad: true } },
            programa: { select: { nombre: true } },
          },
          orderBy: { fechaProgramada: 'asc' },
        }),
        this.prisma.remito.count({
          where: { fecha: { gte: inicioMes, lte: finMes }, ...secFilter },
        }),
        this.prisma.remito.aggregate({
          where: {
            fecha: { gte: inicioMes, lte: finMes },
            estado: { in: ['CONFIRMADO', 'ENVIADO', 'ENTREGADO'] },
            ...secFilter,
          },
          _sum: { totalKg: true },
        }),
        this.prisma.remito.aggregate({
          where: {
            fecha: { gte: inicioMesAnterior, lte: finMesAnterior },
            estado: { in: ['CONFIRMADO', 'ENVIADO', 'ENTREGADO'] },
            ...secFilter,
          },
          _sum: { totalKg: true },
        }),
        this.prisma.caso.findMany({
          where: {
            prioridad: { in: ['URGENTE', 'ALTA'] },
            estado: { in: ['PENDIENTE', 'EN_REVISION'] },
          },
          select: {
            id: true,
            nombreSolicitante: true,
            prioridad: true,
            tipo: true,
            estado: true,
            createdAt: true,
          },
          orderBy: [{ prioridad: 'desc' }, { createdAt: 'asc' }],
          take: 10,
        }),
      ]);

    // Evolución mensual: últimos 6 meses
    const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const evolucionMensual: any[] = [];
    for (let i = 5; i >= 0; i--) {
      const fecha = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1);
      const inicio = startOfMonth(fecha);
      const fin = endOfMonth(fecha);
      const mesWhere: any = {
        fecha: { gte: inicio, lte: fin },
        estado: { in: ['CONFIRMADO', 'ENVIADO', 'ENTREGADO'] },
        ...secFilter,
      };
      const agg = await this.prisma.remito.aggregate({ where: mesWhere, _sum: { totalKg: true }, _count: true });
      evolucionMensual.push({
        mes: fecha.getMonth() + 1,
        mesNombre: MESES[fecha.getMonth()],
        anio: fecha.getFullYear(),
        totalKilos: agg._sum.totalKg || 0,
        cantidadRemitos: agg._count,
      });
    }

    // Beneficiarios activos sin entrega en los últimos 30 días
    const beneficiariosConEntregaReciente = await this.prisma.remito.findMany({
      where: {
        entregadoAt: { gte: hace30dias },
        estado: 'ENTREGADO',
        beneficiarioId: { not: null },
        ...secFilter,
      },
      select: { beneficiarioId: true },
      distinct: ['beneficiarioId'],
    });
    const idsConEntrega = beneficiariosConEntregaReciente.map(r => r.beneficiarioId).filter(Boolean) as number[];

    const beneficiariosSinEntrega = await this.prisma.beneficiario.findMany({
      where: {
        activo: true,
        id: { notIn: idsConEntrega.length > 0 ? idsConEntrega : [-1] },
      },
      select: { id: true, nombre: true, localidad: true, programa: { select: { nombre: true } } },
      orderBy: { nombre: 'asc' },
      take: 10,
    });

    const totalBeneficiariosSinEntrega = await this.prisma.beneficiario.count({
      where: {
        activo: true,
        id: { notIn: idsConEntrega.length > 0 ? idsConEntrega : [-1] },
      },
    });

    return {
      resumenMes: {
        remitos: remitosDelMes,
        kg: kgDelMes._sum.totalKg || 0,
        kgMesAnterior: kgMesAnterior._sum.totalKg || 0,
      },
      evolucionMensual,
      casosUrgentes: casosUrgentes.map(c => ({
        id: c.id,
        nombreSolicitante: c.nombreSolicitante,
        prioridad: c.prioridad,
        tipo: c.tipo,
        estado: c.estado,
        createdAt: c.createdAt,
      })),
      beneficiariosSinEntrega: {
        total: totalBeneficiariosSinEntrega,
        muestra: beneficiariosSinEntrega,
      },
      remitosDelDia: remitosDelDia.map(r => ({
        id: r.id,
        numero: r.numero,
        beneficiario: r.beneficiario?.nombre || 'N/A',
        programa: r.programa?.nombre || 'Sin programa',
        deposito: r.deposito?.nombre || '',
        totalKg: r.totalKg || 0,
        estado: r.estado,
      })),
      remitosRecientes: remitosRecientes.map(r => ({
        id: r.id,
        numero: r.numero,
        fecha: r.fecha,
        beneficiario: r.beneficiario?.nombre || 'N/A',
        programa: r.programa?.nombre || 'Sin programa',
        deposito: r.deposito?.nombre || '',
        totalKg: r.totalKg || 0,
        estado: r.estado,
      })),
      proximasEntregas: proximasEntregas.map(e => ({
        id: e.id,
        fechaProgramada: e.fechaProgramada,
        hora: e.hora,
        beneficiario: e.beneficiario?.nombre || 'N/A',
        localidad: e.beneficiario?.localidad || '',
        programa: e.programa?.nombre || 'Sin programa',
        kilos: e.kilos,
        estado: e.estado,
      })),
    };
  }
}
