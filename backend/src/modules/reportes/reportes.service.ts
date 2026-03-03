import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { startOfMonth, endOfMonth } from 'date-fns';

@Injectable()
export class ReportesService {
  constructor(private prisma: PrismaService) {}

  // Reporte: Kilos entregados por mes (retorna los últimos N meses si no se especifica)
  async kilosPorMes(mes?: number, anio?: number) {
    // Si se pasan parámetros válidos, retorna un solo mes
    if (mes && anio && !isNaN(mes) && !isNaN(anio)) {
      const fecha = new Date(anio, mes - 1, 1);
      const inicio = startOfMonth(fecha);
      const fin = endOfMonth(fecha);
      const remitos = await this.prisma.remito.findMany({
        where: { fecha: { gte: inicio, lte: fin }, estado: { in: ['CONFIRMADO', 'ENVIADO'] } },
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
      const remitos = await this.prisma.remito.findMany({
        where: { fecha: { gte: inicio, lte: fin }, estado: { in: ['CONFIRMADO', 'ENVIADO'] } },
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
  async entregasPorLocalidad(mes?: number, anio?: number) {
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
  async articulosMasDistribuidos(mes?: number, anio?: number) {
    const where: any = {};

    if (mes && anio) {
      const fecha = new Date(anio, mes - 1, 1);
      where.fecha = {
        gte: startOfMonth(fecha),
        lte: endOfMonth(fecha),
      };
    }

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
  async entregasPorPrograma(mes?: number, anio?: number) {
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

  // Dashboard: Resumen general
  async dashboard() {
    const beneficiariosActivos = await this.prisma.beneficiario.count({
      where: { activo: true },
    });

    const programasActivos = await this.prisma.programa.count({
      where: { activo: true },
    });

    const depositosCount = await this.prisma.deposito.count({
      where: { activo: true },
    });

    const remitosDelMes = await this.prisma.remito.count({
      where: {
        fecha: {
          gte: startOfMonth(new Date()),
          lte: endOfMonth(new Date()),
        },
      },
    });

    // Obtener remitos del día actual
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);

    const remitosDelDia = await this.prisma.remito.findMany({
      where: {
        fecha: {
          gte: hoy,
          lt: manana,
        },
      },
      include: {
        beneficiario: {
          select: {
            nombre: true,
          },
        },
        programa: {
          select: {
            nombre: true,
          },
        },
      },
      orderBy: {
        fecha: 'desc',
      },
    });

    // Obtener lista de programas con beneficiarios
    const programas = await this.prisma.programa.findMany({
      where: { activo: true },
      include: {
        _count: {
          select: {
            beneficiarios: true,
            remitos: true,
          },
        },
      },
      orderBy: {
        nombre: 'asc',
      },
    });

    return {
      beneficiariosActivos,
      programasActivos,
      depositos: depositosCount,
      remitosDelMes,
      remitosDelDia: remitosDelDia.map(r => ({
        id: r.id,
        numero: r.numero,
        beneficiario: r.beneficiario?.nombre || 'N/A',
        programa: r.programa?.nombre || 'Sin programa',
        totalKg: r.totalKg,
        estado: r.estado,
      })),
      programas: programas.map(p => ({
        id: p.id,
        nombre: p.nombre,
        beneficiarios: p._count.beneficiarios,
        remitos: p._count.remitos,
      })),
    };
  }
}
