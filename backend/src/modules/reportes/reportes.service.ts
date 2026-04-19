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
  async kilosPorMes(mes?: number, anio?: number, secretaria?: string | null, programaId?: number) {
    // Si se pasan parámetros válidos, retorna un solo mes
    if (mes && anio && !isNaN(mes) && !isNaN(anio)) {
      const fecha = new Date(anio, mes - 1, 1);
      const inicio = startOfMonth(fecha);
      const fin = endOfMonth(fecha);
      const where: any = { fecha: { gte: inicio, lte: fin }, estado: { in: ['CONFIRMADO', 'ENVIADO', 'ENTREGADO'] } };
      if (secretaria) where.secretaria = secretaria;
      if (programaId) where.programaId = programaId;
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
    const where6: any = { fecha: { gte: inicio6, lte: fin6 }, estado: { in: ['CONFIRMADO', 'ENVIADO', 'ENTREGADO'] } };
    if (secretaria) where6.secretaria = secretaria;
    if (programaId) where6.programaId = programaId;
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
  async entregasPorLocalidad(mes?: number, anio?: number, secretaria?: string | null, fechaDesde?: string, fechaHasta?: string, programaId?: number) {
    const where: any = {
      estado: {
        in: ['CONFIRMADO', 'ENVIADO', 'ENTREGADO'],
      },
    };

    const rango = this.resolverRango(mes, anio, fechaDesde, fechaHasta);
    if (rango) {
      where.fecha = { gte: rango.inicio, lte: rango.fin };
    } else if (mes && anio) {
      const fecha = new Date(anio, mes - 1, 1);
      where.fecha = {
        gte: startOfMonth(fecha),
        lte: endOfMonth(fecha),
      };
    }
    if (secretaria) where.secretaria = secretaria;
    if (programaId) where.programaId = programaId;

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
  async articulosMasDistribuidos(mes?: number, anio?: number, secretaria?: string | null, fechaDesde?: string, fechaHasta?: string, programaId?: number) {
    const where: any = {};
    const rango = this.resolverRango(mes, anio, fechaDesde, fechaHasta);
    if (rango) where.fecha = { gte: rango.inicio, lte: rango.fin };
    if (secretaria) where.secretaria = secretaria;
    if (programaId) where.programaId = programaId;

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
            pesoUnitarioKg: true,
          },
        },
      },
    });

    const porArticulo = items.reduce((acc, item) => {
      const articuloId = item.articulo.id;
      if (!acc[articuloId]) {
        acc[articuloId] = {
          articuloId,
          articulo: item.articulo.nombre,
          categoria: item.articulo.categoria,
          cantidadTotal: 0,
          pesoTotal: 0,
        };
      }
      acc[articuloId].cantidadTotal += item.cantidad;
      // pesoKg puede venir null si se cargo sin calcular; usar pesoUnitario del articulo como fallback
      const peso = item.pesoKg ?? ((item.articulo.pesoUnitarioKg ?? 0) * item.cantidad);
      acc[articuloId].pesoTotal += peso;
      return acc;
    }, {});

    return Object.values(porArticulo).sort((a: any, b: any) => b.cantidadTotal - a.cantidadTotal);
  }

  // Reporte: Entregas por programa
  async entregasPorPrograma(mes?: number, anio?: number, secretaria?: string | null, fechaDesde?: string, fechaHasta?: string, programaId?: number) {
    const where: any = { estado: { in: ['CONFIRMADO', 'ENVIADO', 'ENTREGADO'] } };
    const rango = this.resolverRango(mes, anio, fechaDesde, fechaHasta);
    if (rango) where.fecha = { gte: rango.inicio, lte: rango.fin };
    if (secretaria) where.secretaria = secretaria;
    if (programaId) where.programaId = programaId;

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

  // Reporte: Remitos con detalle para exportación personalizada.
  // Por defecto incluye solo remitos válidos (CONFIRMADO/ENVIADO/ENTREGADO) — los otros
  // (BORRADOR/CANCELADA) NO representan distribución real y rompen los totales.
  async remitosDetalle(mes?: number, anio?: number, programaId?: number, estado?: string, secretaria?: string | null, fechaDesde?: string, fechaHasta?: string) {
    const where: any = {};
    const rango = this.resolverRango(mes, anio, fechaDesde, fechaHasta);
    if (rango) where.fecha = { gte: rango.inicio, lte: rango.fin };
    if (programaId) where.programaId = programaId;
    if (estado) {
      where.estado = estado;
    } else {
      where.estado = { in: ['CONFIRMADO', 'ENVIADO', 'ENTREGADO'] };
    }
    if (secretaria) where.secretaria = secretaria;

    const remitos = await this.prisma.remito.findMany({
      where,
      include: {
        beneficiario: { select: { nombre: true, tipo: true, localidad: true } },
        caso:         { select: { nombreSolicitante: true, dni: true } },
        programa: { select: { nombre: true } },
        deposito: { select: { nombre: true } },
        items: { include: { articulo: { select: { nombre: true, categoria: true } } } },
      },
      orderBy: { fecha: 'desc' },
      take: 2000,
    });

    return remitos.map(r => ({
      id: r.id,
      numero: r.numero,
      fecha: r.fecha.toISOString().slice(0, 10),
      estado: r.estado,
      beneficiario: r.beneficiario?.nombre ?? r.caso?.nombreSolicitante ?? '',
      tipoBeneficiario: r.caso ? 'CASO_PARTICULAR' : (r.beneficiario?.tipo ?? ''),
      localidad: r.beneficiario?.localidad ?? '',
      programa: r.programa?.nombre ?? (r.caso ? 'Casos Particulares' : 'Sin programa'),
      deposito: r.deposito?.nombre ?? '',
      totalKg: r.totalKg ?? 0,
      items: r.items.map(i => `${i.articulo.nombre} x${i.cantidad}`).join(' | '),
      cantidadItems: r.items.length,
    }));
  }

  // Reporte: TOTALES agregados del período (no truncados por take).
  // Estos son los KPIs autoritativos — el frontend NO debe sumar la lista de remitos
  // porque está limitada a 2000 por performance.
  async totalesPeriodo(
    mes?: number, anio?: number,
    fechaDesde?: string, fechaHasta?: string,
    programaId?: number, secretaria?: string | null,
  ) {
    const where: any = { estado: { in: ['CONFIRMADO', 'ENVIADO', 'ENTREGADO'] } };
    const rango = this.resolverRango(mes, anio, fechaDesde, fechaHasta);
    if (rango) where.fecha = { gte: rango.inicio, lte: rango.fin };
    if (programaId) where.programaId = programaId;
    if (secretaria) where.secretaria = secretaria;

    const [agg, distinctBenef, distinctCaso] = await Promise.all([
      this.prisma.remito.aggregate({
        where,
        _sum:   { totalKg: true },
        _count: { _all: true },
      }),
      this.prisma.remito.findMany({
        where: { ...where, beneficiarioId: { not: null } },
        select: { beneficiarioId: true },
        distinct: ['beneficiarioId'],
      }),
      this.prisma.remito.count({
        where: { ...where, caso: { isNot: null } },
      }),
    ]);

    return {
      totalRemitos: agg._count._all,
      totalKg: parseFloat((agg._sum.totalKg ?? 0).toFixed(2)),
      familiasUnicas: distinctBenef.length + distinctCaso,
      familiasBeneficiarios: distinctBenef.length,
      familiasCasos: distinctCaso,
    };
  }

  // Reporte: Resumen de entregas del mes (entregadas vs no entregadas)
  async resumenEntregasMes(mes: number, anio: number, secretaria?: string | null, fechaDesde?: string, fechaHasta?: string, programaId?: number) {
    const rango = this.resolverRango(mes, anio, fechaDesde, fechaHasta)!;
    const { inicio, fin } = rango;

    const where: any = { fechaProgramada: { gte: inicio, lte: fin } };
    if (secretaria) where.secretaria = secretaria;
    if (programaId) where.programaId = programaId;

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

  // Reporte: Entregas a domicilio — resumen por día con estimación de combustible
  async entregasDomicilio(
    mes?: number, anio?: number,
    fechaDesde?: string, fechaHasta?: string,
    secretaria?: string | null,
  ) {
    const rango = this.resolverRango(mes, anio, fechaDesde, fechaHasta);

    const where: any = { estado: 'ENTREGADO' };
    if (rango) where.entregadoAt = { gte: rango.inicio, lte: rango.fin };
    if (secretaria) where.secretaria = secretaria;

    const remitos = await this.prisma.remito.findMany({
      where,
      include: {
        beneficiario: { select: { nombre: true, localidad: true } },
        programa: { select: { nombre: true } },
        deposito: { select: { nombre: true } },
      },
      orderBy: { entregadoAt: 'desc' },
    });

    // Agrupar por día de entrega
    const porDia = new Map<string, {
      fecha: string;
      cantidadEntregas: number;
      totalKg: number;
      choferes: string[];
      remitos: { numero: string; beneficiario: string; localidad: string; kg: number; nota: string }[];
    }>();

    for (const r of remitos) {
      const fechaKey = (r.entregadoAt ?? r.fecha).toISOString().slice(0, 10);
      if (!porDia.has(fechaKey)) {
        porDia.set(fechaKey, { fecha: fechaKey, cantidadEntregas: 0, totalKg: 0, choferes: [], remitos: [] });
      }
      const dia = porDia.get(fechaKey)!;
      dia.cantidadEntregas++;
      dia.totalKg += r.totalKg ?? 0;
      if (r.entregadoNota && !dia.choferes.includes(r.entregadoNota)) {
        dia.choferes.push(r.entregadoNota);
      }
      dia.remitos.push({
        numero: r.numero,
        beneficiario: r.beneficiario?.nombre ?? '—',
        localidad: r.beneficiario?.localidad ?? '—',
        kg: r.totalKg ?? 0,
        nota: r.entregadoNota ?? '',
      });
    }

    const diasOrdenados = Array.from(porDia.values()).sort((a, b) => b.fecha.localeCompare(a.fecha));

    return {
      totalEntregas: remitos.length,
      totalKg: parseFloat(remitos.reduce((s, r) => s + (r.totalKg ?? 0), 0).toFixed(2)),
      diasActivos: diasOrdenados.length,
      porDia: diasOrdenados.map(d => ({
        ...d,
        totalKg: parseFloat(d.totalKg.toFixed(2)),
      })),
    };
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

  // Entregas recientes: notificaciones efímeras cuando un depósito marca entrega
  async entregasRecientes(horas = 72, secretaria?: string | null) {
    const desde = new Date(Date.now() - horas * 60 * 60 * 1000);
    const remitos = await this.prisma.remito.findMany({
      where: {
        entregadoAt: { gte: desde },
        ...(secretaria ? { secretaria } : {}),
      },
      include: {
        beneficiario: { select: { nombre: true } },
        deposito:     { select: { nombre: true } },
        programa:     { select: { nombre: true } },
      },
      orderBy: { entregadoAt: 'desc' },
      take: 100,
    });

    return remitos.map(r => ({
      id:          r.id,
      tipo:        'ENTREGA',
      titulo:      `${r.deposito?.nombre ?? 'Depósito'} entregó el pedido de ${r.beneficiario?.nombre ?? 'Beneficiario'}`,
      descripcion: r.entregadoNota ?? (r.totalKg ? `${r.totalKg} kg` : null),
      programa:    r.programa?.nombre ?? null,
      link:        `/remitos`,
      fecha:       r.entregadoAt,
      remitoId:    r.id,
      numero:      r.numero,
    }));
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
  // ── Rendición ANEXO VI ────────────────────────────────────────────────────
  async rendicionAnexoVI(desde: string, hasta: string, programaId?: number, secretaria?: string | null) {
    const inicio = new Date(desde); inicio.setHours(0, 0, 0, 0);
    const fin    = new Date(hasta);  fin.setHours(23, 59, 59, 999);

    // ENTREGADO también cuenta como rendido — antes quedaba afuera.
    const whereRemito: any = {
      estado: { in: ['CONFIRMADO', 'ENVIADO', 'ENTREGADO'] },
      fecha:  { gte: inicio, lte: fin },
    };
    if (programaId) whereRemito.programaId = programaId;
    if (secretaria) whereRemito.secretaria  = secretaria;

    const remitos = await this.prisma.remito.findMany({
      where: whereRemito,
      select: {
        beneficiarioId: true,
        totalKg:        true,
        beneficiario: {
          select: {
            nombre:            true,
            responsableNombre: true,
            responsableDNI:    true,
            direccion:         true,
            localidad:         true,
            _count:            { select: { integrantes: true } },
          },
        },
        caso: {
          select: {
            nombreSolicitante: true,
            dni:               true,
            direccion:         true,
            barrio:            true,
          },
        },
      },
    });

    // Totales globales (no deduplicados — son distribución real de mercadería)
    const totalKg      = remitos.reduce((s, r) => s + (r.totalKg ?? 0), 0);
    const totalRemitos = remitos.length;

    // Deduplicar por beneficiarioId; los remitos de casos van como filas individuales
    // (un caso particular = una familia diferente cada vez, no se deduplican).
    const seen = new Set<number>();
    const filas: any[] = [];
    let kgFamiliasBenef = 0;
    let kgCasosParticulares = 0;
    let cantCasos = 0;

    for (const r of remitos) {
      // Caso particular: cada remito = una familia
      if (r.caso) {
        const fullName = (r.caso.nombreSolicitante || '').trim();
        const parts = fullName.split(/\s+/);
        const apellido = parts.length > 1 ? parts.slice(Math.ceil(parts.length / 2)).join(' ') : fullName;
        const nombre   = parts.length > 1 ? parts.slice(0, Math.ceil(parts.length / 2)).join(' ')  : '';

        filas.push({
          apellido,
          nombre,
          dni:       r.caso.dni || '',
          grupo:     1,
          direccion: [r.caso.direccion, r.caso.barrio].filter(Boolean).join(' - '),
          tipo:      'CASO',
          kg:        r.totalKg ?? 0,
        });
        kgCasosParticulares += r.totalKg ?? 0;
        cantCasos++;
        continue;
      }

      // Beneficiario regular: deduplicar
      if (!r.beneficiarioId || seen.has(r.beneficiarioId)) {
        kgFamiliasBenef += r.totalKg ?? 0; // segundo retiro del mismo beneficiario también suma kg
        continue;
      }
      seen.add(r.beneficiarioId);
      const b = r.beneficiario;
      if (!b) continue;

      // Apellido/nombre del responsable (último bloque = apellido)
      const fullName = (b.responsableNombre || b.nombre || '').trim();
      const parts = fullName.split(/\s+/);
      const apellido = parts.length > 1 ? parts.slice(Math.ceil(parts.length / 2)).join(' ') : fullName;
      const nombre   = parts.length > 1 ? parts.slice(0, Math.ceil(parts.length / 2)).join(' ')  : '';

      // Grupo = integrantes + responsable, mínimo 1
      const grupo = (b._count?.integrantes ?? 0) + 1;

      filas.push({
        apellido,
        nombre,
        dni:       b.responsableDNI || '',
        grupo,
        direccion: [b.direccion, b.localidad].filter(Boolean).join(' - '),
        tipo:      'BENEFICIARIO',
        kg:        r.totalKg ?? 0,
      });
      kgFamiliasBenef += r.totalKg ?? 0;
    }

    // Ordenar alfabéticamente por apellido
    filas.sort((a, b) => a.apellido.localeCompare(b.apellido, 'es'));

    // Ingresos de mercadería del período para el mismo programa
    const whereIngreso: any = { tipo: 'INGRESO', fecha: { gte: inicio, lte: fin } };
    if (programaId) whereIngreso.programaId = programaId;
    if (secretaria) whereIngreso.programa    = { secretaria };

    const ingresos = await this.prisma.movimiento.findMany({
      where: whereIngreso,
      include: { articulo: { select: { nombre: true, categoria: true } }, depositoHacia: { select: { nombre: true } } },
      orderBy: { fecha: 'asc' },
    });

    return {
      totalBeneficiarios: filas.length,
      // Resumen cuantitativo del bimestre — antes faltaba.
      totalKg:            parseFloat(totalKg.toFixed(2)),
      totalRemitos,
      totalCasos:         cantCasos,
      totalFamiliasUnicas: seen.size + cantCasos,
      kgFamiliasBeneficiarios: parseFloat(kgFamiliasBenef.toFixed(2)),
      kgCasosParticulares:     parseFloat(kgCasosParticulares.toFixed(2)),
      desde,
      hasta,
      filas,
      ingresos: ingresos.map(m => ({
        fecha:    m.fecha,
        articulo: m.articulo.nombre,
        categoria: m.articulo.categoria || '',
        cantidad: m.cantidad,
        deposito: m.depositoHacia?.nombre || '',
        obs:      m.observaciones || '',
      })),
    };
  }

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
    const hace14dias = new Date(hoy);
    hace14dias.setDate(hace14dias.getDate() - 14);
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
            beneficiario: { select: { nombre: true, responsableDNI: true, localidad: true } },
            programa: { select: { nombre: true } },
            deposito: { select: { nombre: true } },
          },
          orderBy: { fecha: 'desc' },
          take: 50,
        }),
        this.prisma.entregaProgramada.findMany({
          where: {
            estado: { in: ['PENDIENTE', 'GENERADA'] },
            // Incluye hasta 14 días atrás (entregas pendientes que no se entregaron)
            // y hasta 7 días adelante
            fechaProgramada: { gte: hace14dias, lte: en7dias },
            ...(secretaria ? { secretaria } : {}),
          },
          include: {
            beneficiario: { select: { nombre: true, localidad: true } },
            programa: { select: { nombre: true } },
          },
          orderBy: { fechaProgramada: 'asc' },
          take: 50,
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

    // Kg por localidad del mes actual
    const remitosLocalidad = await this.prisma.remito.findMany({
      where: {
        fecha: { gte: inicioMes, lte: finMes },
        estado: { in: ['CONFIRMADO', 'ENVIADO', 'ENTREGADO'] },
        ...secFilter,
      },
      select: { totalKg: true, beneficiario: { select: { localidad: true } } },
    });
    const mapaLocalidad: Record<string, { localidad: string; totalKilos: number; cantidadRemitos: number }> = {};
    for (const r of remitosLocalidad) {
      const loc = r.beneficiario?.localidad || 'Sin localidad';
      if (!mapaLocalidad[loc]) mapaLocalidad[loc] = { localidad: loc, totalKilos: 0, cantidadRemitos: 0 };
      mapaLocalidad[loc].totalKilos += r.totalKg || 0;
      mapaLocalidad[loc].cantidadRemitos++;
    }
    const kgPorLocalidad = Object.values(mapaLocalidad).sort((a, b) => b.totalKilos - a.totalKilos);

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
      kgPorLocalidad,
      remitosRecientes: remitosRecientes.map(r => ({
        id: r.id,
        numero: r.numero,
        fecha: r.fecha,
        beneficiario: r.beneficiario?.nombre || 'N/A',
        beneficiarioDNI: r.beneficiario?.responsableDNI || '',
        localidad: r.beneficiario?.localidad || '',
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

  /**
   * Distribución de artículos: dado uno o varios artículos y un rango, devuelve todas
   * las entregas (espacios + casos particulares) con cantidades/fechas, y agregados.
   */
  async distribucionPorArticulo(
    articuloIds: number[],
    fechaDesde?: string,
    fechaHasta?: string,
    secretaria?: string | null,
    programaId?: number,
    mes?: number,
    anio?: number,
  ) {
    if (!articuloIds?.length) return { articulos: [], porDestinatario: [], entregas: [], totales: { cantidadTotal: 0, pesoTotal: 0, entregas: 0 } };

    const remitoWhere: any = { estado: { in: ['CONFIRMADO', 'ENVIADO', 'ENTREGADO', 'PREPARADO'] } };
    const rango = this.resolverRango(mes, anio, fechaDesde, fechaHasta);
    if (rango) remitoWhere.fecha = { gte: rango.inicio, lte: rango.fin };
    if (secretaria) remitoWhere.secretaria = secretaria;
    if (programaId) remitoWhere.programaId = programaId;

    const items = await this.prisma.remitoItem.findMany({
      where: {
        articuloId: { in: articuloIds },
        remito: remitoWhere,
      },
      include: {
        articulo: {
          select: { id: true, nombre: true, categoria: true, pesoUnitarioKg: true },
        },
        remito: {
          select: {
            id: true, numero: true, fecha: true, estado: true,
            beneficiario: { select: { id: true, nombre: true, localidad: true, tipo: true } },
            caso: { select: { id: true, nombreSolicitante: true, dni: true, tipo: true } },
            deposito: { select: { codigo: true, nombre: true } },
            programa: { select: { id: true, nombre: true } },
          },
        },
      },
      orderBy: { remito: { fecha: 'desc' } },
    });

    const pesoDe = (it: any) => it.pesoKg ?? ((it.articulo.pesoUnitarioKg ?? 0) * it.cantidad);

    // Detalle plano de entregas
    const entregas = items.map((it: any) => {
      const r = it.remito;
      const ben = r.beneficiario;
      const caso = r.caso;
      const destino =
        ben ? { tipo: 'ESPACIO' as const, id: ben.id, nombre: ben.nombre, extra: ben.localidad || '' }
        : caso ? { tipo: 'CASO' as const, id: caso.id, nombre: caso.nombreSolicitante, extra: caso.dni || '' }
        : { tipo: 'SIN_DESTINATARIO' as const, id: null, nombre: 'Sin destinatario', extra: '' };
      return {
        remitoId: r.id,
        remitoNumero: r.numero,
        fecha: r.fecha,
        estado: r.estado,
        destinatarioTipo: destino.tipo,
        destinatarioId: destino.id,
        destinatarioNombre: destino.nombre,
        destinatarioExtra: destino.extra,
        articuloId: it.articulo.id,
        articuloNombre: it.articulo.nombre,
        cantidad: it.cantidad,
        pesoKg: pesoDe(it),
        depositoCodigo: r.deposito?.codigo || '',
        programaId: r.programa?.id || null,
        programaNombre: r.programa?.nombre || null,
      };
    });

    // Agregado por artículo
    const porArticuloMap: Record<number, any> = {};
    for (const it of items) {
      const a = it.articulo;
      if (!porArticuloMap[a.id]) {
        porArticuloMap[a.id] = { id: a.id, nombre: a.nombre, categoria: a.categoria, cantidadTotal: 0, pesoTotal: 0, entregas: 0 };
      }
      porArticuloMap[a.id].cantidadTotal += it.cantidad;
      porArticuloMap[a.id].pesoTotal += pesoDe(it);
      porArticuloMap[a.id].entregas += 1;
    }

    // Agregado por destinatario (espacio o caso)
    const porDestinatarioMap: Record<string, any> = {};
    for (const e of entregas) {
      const key = `${e.destinatarioTipo}:${e.destinatarioId ?? 0}`;
      if (!porDestinatarioMap[key]) {
        porDestinatarioMap[key] = {
          tipo: e.destinatarioTipo,
          id: e.destinatarioId,
          nombre: e.destinatarioNombre,
          extra: e.destinatarioExtra,
          cantidadTotal: 0,
          pesoTotal: 0,
          entregas: 0,
          ultimaFecha: e.fecha,
        };
      }
      const d = porDestinatarioMap[key];
      d.cantidadTotal += e.cantidad;
      d.pesoTotal += e.pesoKg;
      d.entregas += 1;
      if (e.fecha > d.ultimaFecha) d.ultimaFecha = e.fecha;
    }

    const totales = entregas.reduce(
      (acc, e) => ({ cantidadTotal: acc.cantidadTotal + e.cantidad, pesoTotal: acc.pesoTotal + e.pesoKg, entregas: acc.entregas + 1 }),
      { cantidadTotal: 0, pesoTotal: 0, entregas: 0 },
    );

    return {
      articulos: Object.values(porArticuloMap).sort((a: any, b: any) => b.cantidadTotal - a.cantidadTotal),
      porDestinatario: Object.values(porDestinatarioMap).sort((a: any, b: any) => b.cantidadTotal - a.cantidadTotal),
      entregas,
      totales,
    };
  }
}
