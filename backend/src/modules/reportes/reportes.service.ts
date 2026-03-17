import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { startOfMonth, endOfMonth } from 'date-fns';

@Injectable()
export class ReportesService {
  constructor(private prisma: PrismaService) {}

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

    // Sin parámetros: últimos 6 meses
    const resultados = [];
    const hoy = new Date();
    for (let i = 5; i >= 0; i--) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const inicio = startOfMonth(fecha);
      const fin = endOfMonth(fecha);
      const mesWhere: any = { fecha: { gte: inicio, lte: fin }, estado: { in: ['CONFIRMADO', 'ENVIADO'] } };
      if (secretaria) mesWhere.secretaria = secretaria;
      const remitos = await this.prisma.remito.findMany({
        where: mesWhere,
        select: { totalKg: true },
      });
      const totalKilos = remitos.reduce((sum, r) => sum + (r.totalKg || 0), 0);
      const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
      resultados.push({
        mes: fecha.getMonth() + 1,
        mesNombre: MESES[fecha.getMonth()],
        anio: fecha.getFullYear(),
        totalKilos,
        cantidadRemitos: remitos.length,
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
  async articulosMasDistribuidos(mes?: number, anio?: number, secretaria?: string | null) {
    const where: any = {};

    if (mes && anio) {
      const fecha = new Date(anio, mes - 1, 1);
      where.fecha = {
        gte: startOfMonth(fecha),
        lte: endOfMonth(fecha),
      };
    }
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
  async entregasPorPrograma(mes?: number, anio?: number, secretaria?: string | null) {
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

  // Reporte: Remitos con detalle para exportación personalizada
  async remitosDetalle(mes?: number, anio?: number, programaId?: number, estado?: string, secretaria?: string | null) {
    const where: any = {};
    if (mes && anio) {
      const fecha = new Date(anio, mes - 1, 1);
      where.fecha = { gte: startOfMonth(fecha), lte: endOfMonth(fecha) };
    }
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
  async resumenEntregasMes(mes: number, anio: number, secretaria?: string | null) {
    const fecha = new Date(anio, mes - 1, 1);
    const inicio = startOfMonth(fecha);
    const fin = endOfMonth(fecha);

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

  // Dashboard: Resumen operativo
  async dashboard(secretaria?: string | null) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);
    const en7dias = new Date(hoy);
    en7dias.setDate(en7dias.getDate() + 7);
    const inicioMes = startOfMonth(new Date());
    const finMes = endOfMonth(new Date());

    const secFilter = secretaria ? { secretaria } : {};

    const [remitosDelDia, remitosRecientes, proximasEntregas, remitosDelMes, kgDelMes] =
      await Promise.all([
        this.prisma.remito.findMany({
          where: { fecha: { gte: hoy, lt: manana }, ...secFilter },
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
      ]);

    return {
      resumenMes: {
        remitos: remitosDelMes,
        kg: kgDelMes._sum.totalKg || 0,
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
