import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRemitoDto } from './dto/create-remito.dto';
import { ConfirmarRemitoDto } from './dto/confirmar-remito.dto';
import { MovimientoTipo, RemitoEstado } from '@prisma/client';
import { PdfService } from './services/pdf.service';
import { EmailService } from './services/email.service';

@Injectable()
export class RemitosService {
  constructor(
    private prisma: PrismaService,
    private pdfService: PdfService,
    private emailService: EmailService,
  ) {}

  // Generar número correlativo único
  async generarNumeroRemito(): Promise<string> {
    return await this.prisma.$transaction(async (tx) => {
      // Obtener correlativo con lock
      let correlativo = await tx.correlativo.findUnique({
        where: { clave: 'remito_pa' },
      });

      if (!correlativo) {
        correlativo = await tx.correlativo.create({
          data: { clave: 'remito_pa', ultimo: 1001648 },
        });
      }

      const siguiente = correlativo.ultimo + 1;

      await tx.correlativo.update({
        where: { clave: 'remito_pa' },
        data: { ultimo: siguiente },
      });

      return `PA ${siguiente}`;
    });
  }

  // Crear remito borrador
  async create(createRemitoDto: CreateRemitoDto, usuarioId: number) {
    const numero = await this.generarNumeroRemito();

    // Calcular peso total
    let totalKg = 0;
    for (const item of createRemitoDto.items) {
      const articulo = await this.prisma.articulo.findUnique({
        where: { id: item.articuloId },
      });
      if (articulo?.pesoUnitarioKg) {
        totalKg += item.cantidad * articulo.pesoUnitarioKg;
      }
    }

    const remito = await this.prisma.remito.create({
      data: {
        numero,
        programaId: createRemitoDto.programaId,
        beneficiarioId: createRemitoDto.beneficiarioId,
        depositoId: createRemitoDto.depositoId,
        estado: RemitoEstado.BORRADOR,
        totalKg,
        observaciones: createRemitoDto.observaciones,
        items: {
          create: createRemitoDto.items.map((item) => ({
            articuloId: item.articuloId,
            cantidad: item.cantidad,
            pesoKg: item.pesoKg,
          })),
        },
      },
      include: {
        items: {
          include: {
            articulo: true,
          },
        },
        beneficiario: true,
        programa: true,
        deposito: true,
      },
    });

    return remito;
  }

  // Confirmar remito (ACCIÓN CRÍTICA)
  async confirmar(id: number, dto: ConfirmarRemitoDto, usuarioId: number) {
    return await this.prisma.$transaction(async (tx) => {
      // Obtener remito con items
      const remito = await tx.remito.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              articulo: true,
            },
          },
          beneficiario: true,
          programa: true,
          deposito: true,
        },
      });

      if (!remito) {
        throw new NotFoundException('Remito no encontrado');
      }

      if (remito.estado !== RemitoEstado.BORRADOR) {
        throw new BadRequestException('El remito ya fue confirmado');
      }

      const depositoId = dto.depositoId || remito.depositoId;

      // Verificar y descontar stock por cada item
      for (const item of remito.items) {
        const stock = await tx.stock.findUnique({
          where: {
            articuloId_depositoId: {
              articuloId: item.articuloId,
              depositoId,
            },
          },
        });

        if (!stock || stock.cantidad < item.cantidad) {
          throw new BadRequestException(
            `Stock insuficiente para ${item.articulo.nombre}. ` +
              `Disponible: ${stock?.cantidad || 0}, Requerido: ${item.cantidad}`,
          );
        }

        // Crear movimiento de EGRESO
        await tx.movimiento.create({
          data: {
            tipo: MovimientoTipo.EGRESO,
            cantidad: item.cantidad,
            articuloId: item.articuloId,
            usuarioId,
            programaId: remito.programaId,
            beneficiarioId: remito.beneficiarioId,
            remitoId: remito.id,
            depositoDesdeId: depositoId,
          },
        });

        // Actualizar stock
        await tx.stock.update({
          where: {
            articuloId_depositoId: {
              articuloId: item.articuloId,
              depositoId,
            },
          },
          data: {
            cantidad: {
              decrement: item.cantidad,
            },
          },
        });
      }

      // Actualizar estado del remito
      const remitoConfirmado = await tx.remito.update({
        where: { id },
        data: {
          estado: RemitoEstado.CONFIRMADO,
          depositoId,
        },
        include: {
          items: {
            include: {
              articulo: true,
            },
          },
          beneficiario: true,
          programa: true,
          deposito: true,
        },
      });

      // Si está asociado a una entrega programada, marcarla como ENTREGADA
      await tx.entregaProgramada.updateMany({
        where: { remitoId: id },
        data: { estado: 'ENTREGADA' },
      });

      return remitoConfirmado;
    });
  }

  // Generar PDF del remito
  async generarPdf(id: number): Promise<Buffer> {
    const remito = await this.prisma.remito.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            articulo: true,
          },
        },
        beneficiario: true,
        programa: true,
        deposito: true,
      },
    });

    if (!remito) {
      throw new NotFoundException('Remito no encontrado');
    }

    return await this.pdfService.generarRemitoPdf(remito);
  }

  // Enviar remito por email
  async enviarPorEmail(id: number) {
    const remito = await this.prisma.remito.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            articulo: true,
          },
        },
        beneficiario: true,
        programa: true,
        deposito: true,
      },
    });

    if (!remito) {
      throw new NotFoundException('Remito no encontrado');
    }

    if (remito.estado !== RemitoEstado.CONFIRMADO) {
      throw new BadRequestException('Solo se pueden enviar remitos confirmados');
    }

    // Generar PDF
    const pdfBuffer = await this.pdfService.generarRemitoPdf(remito);

    // Enviar por email
    await this.emailService.enviarRemito(remito, pdfBuffer);

    // Marcar como enviado
    await this.prisma.remito.update({
      where: { id },
      data: {
        emailEnviado: true,
        fechaEnvio: new Date(),
        estado: RemitoEstado.ENVIADO,
      },
    });

    return { success: true, message: 'Remito enviado correctamente' };
  }

  // Listar remitos con filtros
  async findAll(filtros: any) {
    const where: any = {};

    if (filtros.estado) where.estado = filtros.estado;
    if (filtros.programaId) where.programaId = parseInt(filtros.programaId);
    if (filtros.beneficiarioId) where.beneficiarioId = parseInt(filtros.beneficiarioId);
    if (filtros.depositoId) where.depositoId = parseInt(filtros.depositoId);
    
    if (filtros.fechaDesde || filtros.fechaHasta) {
      where.fecha = {};
      if (filtros.fechaDesde) where.fecha.gte = new Date(filtros.fechaDesde);
      if (filtros.fechaHasta) where.fecha.lte = new Date(filtros.fechaHasta);
    }

    return await this.prisma.remito.findMany({
      where,
      include: {
        beneficiario: true,
        programa: true,
        deposito: true,
        items: {
          include: {
            articulo: true,
          },
        },
      },
      orderBy: {
        fecha: 'desc',
      },
    });
  }

  // Obtener remito por ID
  async findOne(id: number) {
    const remito = await this.prisma.remito.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            articulo: true,
          },
        },
        beneficiario: true,
        programa: true,
        deposito: true,
        movimientos: {
          include: {
            articulo: true,
            usuario: true,
          },
        },
      },
    });

    if (!remito) {
      throw new NotFoundException('Remito no encontrado');
    }

    return remito;
  }

  // Eliminar remito (solo si está en BORRADOR)
  async remove(id: number) {
    const remito = await this.prisma.remito.findUnique({
      where: { id },
    });

    if (!remito) {
      throw new NotFoundException('Remito no encontrado');
    }

    if (remito.estado !== RemitoEstado.BORRADOR) {
      throw new BadRequestException('Solo se pueden eliminar remitos en borrador');
    }

    await this.prisma.remito.delete({
      where: { id },
    });

    return { success: true, message: 'Remito eliminado' };
  }
}
