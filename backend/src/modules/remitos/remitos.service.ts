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
import { EmailService, OpcionesEnvio } from './services/email.service';

@Injectable()
export class RemitosService {
  constructor(
    private prisma: PrismaService,
    private pdfService: PdfService,
    private emailService: EmailService,
  ) {}

  // Generar número correlativo único
  async generarNumeroRemito(secretaria: string = 'PA'): Promise<string> {
    if (secretaria === 'CITA') {
      return await this.prisma.$transaction(async (tx) => {
        let correlativo = await tx.correlativo.findUnique({
          where: { clave: 'remito_cita' },
        });

        if (!correlativo) {
          correlativo = await tx.correlativo.create({
            data: { clave: 'remito_cita', ultimo: 0 },
          });
        }

        const siguiente = correlativo.ultimo + 1;

        await tx.correlativo.update({
          where: { clave: 'remito_cita' },
          data: { ultimo: siguiente },
        });

        return `CITA ${siguiente}`;
      });
    }

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
  async create(createRemitoDto: CreateRemitoDto, usuario: { id: number; rol?: string }) {
    const secretaria = usuario.rol === 'ASISTENCIA_CRITICA' ? 'CITA' : 'PA';
    const numero = await this.generarNumeroRemito(secretaria);

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

    let fechaRemito: Date | undefined;
    if (createRemitoDto.fecha) {
      const hora = createRemitoDto.horaRetiro || '11:00';
      fechaRemito = new Date(`${createRemitoDto.fecha}T${hora}:00`);
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
        secretaria,
        ...(fechaRemito ? { fecha: fechaRemito } : {}),
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
  async confirmar(id: number, dto: ConfirmarRemitoDto, usuarioId: number | { id: number; rol?: string }) {
    const uid = typeof usuarioId === 'object' ? usuarioId.id : usuarioId;
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
            usuarioId: uid,
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

      // Si está asociado a una entrega programada, marcarla como GENERADA
      // (ENTREGADA se actualiza cuando se confirma la entrega física)
      await tx.entregaProgramada.updateMany({
        where: { remitoId: id },
        data: { estado: 'GENERADA' },
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
  async enviarPorEmail(id: number, opciones: OpcionesEnvio = {}) {
    const remito = await this.prisma.remito.findUnique({
      where: { id },
      include: {
        items: { include: { articulo: true } },
        beneficiario: true,
        programa: true,
        deposito: true,
      },
    });

    if (!remito) throw new NotFoundException('Remito no encontrado');

    if (remito.estado !== RemitoEstado.CONFIRMADO && remito.estado !== RemitoEstado.ENVIADO) {
      throw new BadRequestException('Solo se pueden enviar remitos confirmados');
    }

    const pdfBuffer = await this.pdfService.generarRemitoPdf(remito);
    await this.emailService.enviarRemito(remito, pdfBuffer, opciones);

    await this.prisma.remito.update({
      where: { id },
      data: { emailEnviado: true, fechaEnvio: new Date(), estado: RemitoEstado.ENVIADO },
    });

    return { success: true, message: 'Remito enviado correctamente' };
  }

  // Listar remitos con filtros
  async findAll(filtros: any, usuarioDepositoId?: number, depositoCodigo?: string, secretaria?: string | null) {
    const where: any = {};

    // LOGISTICA con depósito: solo ve los remitos de su depósito
    if (usuarioDepositoId) {
      where.depositoId = usuarioDepositoId;
    }
    // ASISTENCIA_CRITICA: solo ve remitos del depósito CITA
    if (depositoCodigo) {
      where.deposito = { codigo: depositoCodigo };
    }
    // Filtrar por secretaría (null = LOGISTICA/VISOR, ve todo)
    if (secretaria) {
      where.secretaria = secretaria;
    }

    if (filtros.estado) {
      // Soporta multi-estado: ?estado=CONFIRMADO,ENVIADO o ?estado=CONFIRMADO&estado=ENVIADO
      const estados = Array.isArray(filtros.estado)
        ? filtros.estado
        : String(filtros.estado).includes(',')
          ? String(filtros.estado).split(',').map((s: string) => s.trim())
          : null;
      if (estados) {
        where.estado = { in: estados };
      } else {
        where.estado = filtros.estado;
      }
    }
    if (filtros.programaId) where.programaId = parseInt(filtros.programaId);
    if (filtros.beneficiarioId) where.beneficiarioId = parseInt(filtros.beneficiarioId);
    if (filtros.buscar) where.beneficiario = { nombre: { contains: filtros.buscar, mode: 'insensitive' } };
    if (filtros.depositoId && !usuarioDepositoId) where.depositoId = parseInt(filtros.depositoId);
    
    if (filtros.busqueda) {
      const q = String(filtros.busqueda).trim();
      where.OR = [
        { numero: { contains: q, mode: 'insensitive' } },
        { beneficiario: { nombre: { contains: q, mode: 'insensitive' } } },
        { beneficiario: { responsableDNI: { contains: q } } },
      ];
    }

    if (filtros.fechaDesde || filtros.fechaHasta) {
      where.fecha = {};
      if (filtros.fechaDesde) where.fecha.gte = new Date(filtros.fechaDesde);
      if (filtros.fechaHasta) where.fecha.lte = new Date(filtros.fechaHasta);
    }

    // Filtro por fecha de entrega (entregadoAt)
    if (filtros.entregadoDesde || filtros.entregadoHasta) {
      where.entregadoAt = {};
      if (filtros.entregadoDesde) where.entregadoAt.gte = new Date(filtros.entregadoDesde);
      if (filtros.entregadoHasta) where.entregadoAt.lte = new Date(filtros.entregadoHasta);
    }

    // Por defecto excluir ENTREGADO (historial), a menos que se filtre explícitamente
    if (!filtros.estado && !filtros.busqueda) {
      where.estado = { not: 'ENTREGADO' };
    }

    const limite = filtros.busqueda ? 500 : 200;

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
      take: limite,
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

  // Editar datos de entrega ya registrada (nota, foto, fecha)
  async actualizarEntrega(id: number, nota?: string, fotoPath?: string, fecha?: string) {
    const remito = await this.prisma.remito.findUnique({ where: { id } });
    if (!remito) throw new NotFoundException('Remito no encontrado');
    if (remito.estado !== RemitoEstado.ENTREGADO) {
      throw new BadRequestException('Solo se puede editar la entrega de remitos ya entregados');
    }

    const data: any = {};
    if (nota !== undefined) data.entregadoNota = nota;
    if (fotoPath !== undefined) data.entregadoFoto = fotoPath;
    if (fecha) data.entregadoAt = new Date(fecha);

    return this.prisma.remito.update({
      where: { id },
      data,
      include: { beneficiario: true, programa: true, deposito: true, items: { include: { articulo: true } } },
    });
  }

  // Marcar remito como entregado (con nota y foto opcional)
  async marcarEntregado(id: number, nota?: string, fotoPath?: string) {
    const remito = await this.prisma.remito.findUnique({ where: { id } });

    if (!remito) throw new NotFoundException('Remito no encontrado');

    if (remito.estado !== RemitoEstado.CONFIRMADO && remito.estado !== RemitoEstado.ENVIADO) {
      throw new BadRequestException(
        'Solo se pueden marcar como entregados remitos confirmados o enviados',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const remitoActualizado = await tx.remito.update({
        where: { id },
        data: {
          estado: RemitoEstado.ENTREGADO,
          entregadoAt: new Date(),
          entregadoNota: nota || null,
          entregadoFoto: fotoPath || null,
        },
        include: {
          beneficiario: true,
          programa: true,
          deposito: true,
          items: { include: { articulo: true } },
        },
      });

      // Marcar la entrega programada asociada como ENTREGADA
      await tx.entregaProgramada.updateMany({
        where: { remitoId: id },
        data: { estado: 'ENTREGADA' },
      });

      return remitoActualizado;
    });
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

  async reprogramar(id: number, fecha: string, horaRetiro?: string) {
    const remito = await this.prisma.remito.findUnique({ where: { id } });
    if (!remito) throw new NotFoundException('Remito no encontrado');
    const hora = horaRetiro || '11:00';
    const nuevaFecha = new Date(`${fecha}T${hora}:00`);
    return this.prisma.remito.update({
      where: { id },
      data: { fecha: nuevaFecha },
      include: { beneficiario: true, programa: true, deposito: true },
    });
  }

  async anular(id: number) {
    const remito = await this.prisma.remito.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!remito) throw new NotFoundException('Remito no encontrado');
    if (remito.estado === RemitoEstado.ENTREGADO) {
      throw new BadRequestException('No se puede anular un remito ya entregado');
    }

    await this.prisma.$transaction(async (tx) => {
      // Si estaba confirmado/enviado, devolver el stock
      if (remito.estado === RemitoEstado.CONFIRMADO || remito.estado === RemitoEstado.ENVIADO) {
        for (const item of remito.items) {
          if (remito.depositoId) {
            await tx.stock.update({
              where: { articuloId_depositoId: { articuloId: item.articuloId, depositoId: remito.depositoId } },
              data: { cantidad: { increment: item.cantidad } },
            });
          }
        }
      }
      await tx.remito.delete({ where: { id } });
    });

    return { success: true, message: 'Remito anulado y stock restaurado' };
  }
}
