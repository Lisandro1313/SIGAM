import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { RemitosService } from '../remitos/remitos.service';
import { EntregaEstado } from '@prisma/client';

@Injectable()
export class CronogramaService {
  constructor(
    private prisma: PrismaService,
    private remitosService: RemitosService,
  ) {}

  // Generar cronograma automático para un mes
  async generarCronogramaMensual(mes: number, anio: number) {
    const fecha = new Date(anio, mes - 1, 15); // Día 15 del mes
    const inicioMes = startOfMonth(fecha);
    const finMes = endOfMonth(fecha);

    // Buscar beneficiarios activos con frecuencia mensual
    const beneficiarios = await this.prisma.beneficiario.findMany({
      where: {
        activo: true,
        frecuenciaEntrega: {
          in: ['MENSUAL', 'BIMESTRAL'],
        },
      },
      include: {
        programa: true,
      },
    });

    const entregasCreadas = [];

    for (const beneficiario of beneficiarios) {
      // Verificar si ya tiene entrega programada para ese mes
      const entregaExistente = await this.prisma.entregaProgramada.findFirst({
        where: {
          beneficiarioId: beneficiario.id,
          fechaProgramada: {
            gte: inicioMes,
            lte: finMes,
          },
        },
      });

      if (!entregaExistente) {
        // Verificar frecuencia bimestral
        if (beneficiario.frecuenciaEntrega === 'BIMESTRAL') {
          // Verificar si tuvo entrega el mes anterior
          const mesAnterior = addMonths(fecha, -1);
          const entregaMesAnterior = await this.prisma.entregaProgramada.findFirst({
            where: {
              beneficiarioId: beneficiario.id,
              fechaProgramada: {
                gte: startOfMonth(mesAnterior),
                lte: endOfMonth(mesAnterior),
              },
            },
          });

          if (entregaMesAnterior) {
            continue; // Saltar este mes
          }
        }

        // Crear entrega programada
        const entrega = await this.prisma.entregaProgramada.create({
          data: {
            beneficiarioId: beneficiario.id,
            programaId: beneficiario.programaId,
            fechaProgramada: new Date(anio, mes - 1, 15), // Día 15 por defecto
            estado: EntregaEstado.PENDIENTE,
          },
          include: {
            beneficiario: true,
            programa: true,
          },
        });

        entregasCreadas.push(entrega);
      }
    }

    return {
      success: true,
      entregasCreadas: entregasCreadas.length,
      entregas: entregasCreadas,
    };
  }

  // Obtener entregas programadas
  async obtenerEntregas(filtros?: any) {
    const where: any = {};

    if (filtros?.estado) where.estado = filtros.estado;
    if (filtros?.programaId) where.programaId = parseInt(filtros.programaId);
    if (filtros?.mes && filtros?.anio) {
      const fecha = new Date(filtros.anio, filtros.mes - 1, 15);
      where.fechaProgramada = {
        gte: startOfMonth(fecha),
        lte: endOfMonth(fecha),
      };
    }

    return await this.prisma.entregaProgramada.findMany({
      where,
      include: {
        beneficiario: true,
        programa: true,
        remito: true,
      },
      orderBy: {
        fechaProgramada: 'asc',
      },
    });
  }

  // Generar remitos masivamente a partir del cronograma
  async generarRemitosMasivos(mes: number, anio: number, depositoId: number, usuarioId: number) {
    const fecha = new Date(anio, mes - 1, 15);
    const inicioMes = startOfMonth(fecha);
    const finMes = endOfMonth(fecha);

    // Obtener entregas pendientes
    const entregas = await this.prisma.entregaProgramada.findMany({
      where: {
        fechaProgramada: {
          gte: inicioMes,
          lte: finMes,
        },
        estado: EntregaEstado.PENDIENTE,
      },
      include: {
        beneficiario: true,
        programa: {
          include: {
            plantillas: {
              where: { activo: true },
              include: {
                items: {
                  include: {
                    articulo: true,
                  },
                },
              },
              take: 1,
            },
          },
        },
      },
    });

    if (entregas.length === 0) {
      throw new BadRequestException('No hay entregas pendientes para el mes seleccionado');
    }

    const remitosGenerados = [];
    const errores = [];

    for (const entrega of entregas) {
      try {
        // Obtener plantilla del programa
        const plantilla = entrega.programa.plantillas[0];

        if (!plantilla || !plantilla.items || plantilla.items.length === 0) {
          errores.push({
            beneficiario: entrega.beneficiario.nombre,
            error: 'No hay plantilla definida para este programa',
          });
          continue;
        }

        // Crear remito a partir de la plantilla
        const remito = await this.remitosService.create(
          {
            programaId: entrega.programaId,
            beneficiarioId: entrega.beneficiarioId,
            depositoId: depositoId,
            items: plantilla.items.map((item) => ({
              articuloId: item.articuloId,
              cantidad: item.cantidadBase,
              pesoKg: item.articulo.pesoUnitarioKg
                ? item.cantidadBase * item.articulo.pesoUnitarioKg
                : undefined,
            })),
          },
          usuarioId,
        );

        // Actualizar entrega programada
        await this.prisma.entregaProgramada.update({
          where: { id: entrega.id },
          data: {
            estado: EntregaEstado.GENERADA,
            remitoId: remito.id,
          },
        });

        remitosGenerados.push(remito);
      } catch (error) {
        errores.push({
          beneficiario: entrega.beneficiario.nombre,
          error: error.message,
        });
      }
    }

    return {
      success: true,
      remitosGenerados: remitosGenerados.length,
      errores: errores.length,
      detalleErrores: errores,
      remitos: remitosGenerados,
    };
  }

  // Actualizar fecha de entrega
  async actualizarFecha(id: number, nuevaFecha: Date) {
    return await this.prisma.entregaProgramada.update({
      where: { id },
      data: { fechaProgramada: nuevaFecha },
      include: {
        beneficiario: true,
        programa: true,
      },
    });
  }

  // Cancelar entrega
  async cancelarEntrega(id: number) {
    return await this.prisma.entregaProgramada.update({
      where: { id },
      data: { estado: EntregaEstado.CANCELADA },
    });
  }
}
