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
import { EventsService } from '../events/events.service';
import { StorageService } from '../../shared/storage/storage.service';

@Injectable()
export class RemitosService {
  constructor(
    private prisma: PrismaService,
    private pdfService: PdfService,
    private emailService: EmailService,
    private eventsService: EventsService,
    private storageService: StorageService,
  ) {}

  // Generar número correlativo único — upsert atómico evita race condition en primer remito
  async generarNumeroRemito(secretaria: string = 'PA'): Promise<string> {
    const esCita = secretaria === 'AC';
    const clave   = esCita ? 'remito_cita' : 'remito_pa';
    const inicial = esCita ? 0 : 1001648;
    const prefijo = esCita ? 'AC' : 'PA';

    return await this.prisma.$transaction(async (tx) => {
      // upsert garantiza que el registro exista; luego increment atómico
      await tx.correlativo.upsert({
        where:  { clave },
        update: {},
        create: { clave, ultimo: inicial },
      });

      const updated = await tx.correlativo.update({
        where: { clave },
        data:  { ultimo: { increment: 1 } },
      });

      return `${prefijo} ${updated.ultimo}`;
    });
  }

  // Crear remito borrador
  async create(createRemitoDto: CreateRemitoDto, usuario: { id: number; rol?: string }) {
    const secretaria = usuario.rol === 'ASISTENCIA_CRITICA' ? 'AC' : 'PA';
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

    this.eventsService.broadcast('remito:nuevo', {
      id: remito.id,
      numero: remito.numero,
      beneficiario: remito.beneficiario?.nombre,
      programa: remito.programa?.nombre,
    }, secretaria);

    // Si viene de cronograma, vincular la entrega programada
    if (createRemitoDto.cronogramaEntregaId) {
      await this.prisma.entregaProgramada.update({
        where: { id: createRemitoDto.cronogramaEntregaId },
        data: { estado: 'GENERADA' as any, remitoId: remito.id },
      });
    }

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

      // Verificar lotes vencidos (advertencia, no bloquea)
      const hoy = new Date();
      const alertasVencimiento: string[] = [];
      for (const item of remito.items) {
        const lotesVencidos = await tx.loteArticulo.findMany({
          where: {
            articuloId: item.articuloId,
            depositoId,
            fechaVencimiento: { lte: hoy },
            cantidad: { gt: 0 },
          },
        });
        if (lotesVencidos.length > 0) {
          alertasVencimiento.push(
            `${item.articulo.nombre}: ${lotesVencidos.length} lote(s) vencido(s) (${lotesVencidos.map(l => l.lote ?? 'sin número').join(', ')})`
          );
        }
      }

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
      const entregasExistentes = await tx.entregaProgramada.updateMany({
        where: { remitoId: id },
        data: { estado: 'GENERADA' },
      });

      // Cronograma inverso: si el remito NO venía del cronograma, crear la fila automáticamente
      if (entregasExistentes.count === 0) {
        await tx.entregaProgramada.create({
          data: {
            beneficiarioId: remito.beneficiarioId,
            programaId: remito.programaId,
            fechaProgramada: remito.fecha || new Date(),
            estado: 'GENERADA',
            kilos: remitoConfirmado.totalKg || undefined,
            remitoId: id,
            secretaria: remitoConfirmado.secretaria || 'PA',
          },
        });
      }

      this.eventsService.broadcast('remito:confirmado', {
        id: remitoConfirmado.id,
        numero: remitoConfirmado.numero,
        depositoId: remitoConfirmado.depositoId,
      }, remitoConfirmado.secretaria as string | null);

      return { ...remitoConfirmado, alertasVencimiento };
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

  async historialPdf(
    filtros: any,
    usuarioDepositoId?: number,
    depositoCodigo?: string,
    secretaria?: string | null,
  ): Promise<Buffer> {
    const remitos = await this.findAll(
      { ...filtros, estado: 'ENTREGADO', page: undefined },
      usuarioDepositoId,
      depositoCodigo,
      secretaria,
    ) as any[];
    const programa = filtros.programaId
      ? (await this.prisma.programa.findUnique({ where: { id: parseInt(filtros.programaId) } }))?.nombre
      : undefined;
    const deposito = filtros.depositoId
      ? (await this.prisma.deposito.findUnique({ where: { id: parseInt(filtros.depositoId) } }))?.nombre
      : undefined;
    return this.pdfService.generarHistorialPdf(remitos, {
      desde: filtros.entregadoDesde,
      hasta: filtros.entregadoHasta,
      programa,
      deposito,
    });
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
    if (filtros.buscar) {
      where.OR = [
        { beneficiario: { nombre: { contains: filtros.buscar, mode: 'insensitive' } } },
        { beneficiario: { responsableDNI: { contains: filtros.buscar } } },
        { caso: { nombreSolicitante: { contains: filtros.buscar, mode: 'insensitive' } } },
        { caso: { dni: { contains: filtros.buscar } } },
      ];
    }
    if (filtros.depositoId && !usuarioDepositoId) where.depositoId = parseInt(filtros.depositoId);
    
    if (filtros.busqueda) {
      const q = String(filtros.busqueda).trim();
      where.OR = [
        { numero: { contains: q, mode: 'insensitive' } },
        { beneficiario: { nombre: { contains: q, mode: 'insensitive' } } },
        { beneficiario: { responsableDNI: { contains: q } } },
        { caso: { nombreSolicitante: { contains: q, mode: 'insensitive' } } },
        { caso: { dni: { contains: q } } },
      ];
    }

    if (filtros.fechaDesde || filtros.fechaHasta) {
      where.fecha = {};
      if (filtros.fechaDesde) where.fecha.gte = new Date(filtros.fechaDesde);
      if (filtros.fechaHasta) {
        const hasta = new Date(filtros.fechaHasta);
        hasta.setHours(23, 59, 59, 999);
        where.fecha.lte = hasta;
      }
    }

    // Filtro por fecha de entrega (entregadoAt)
    if (filtros.entregadoDesde || filtros.entregadoHasta) {
      where.entregadoAt = {};
      if (filtros.entregadoDesde) where.entregadoAt.gte = new Date(filtros.entregadoDesde);
      if (filtros.entregadoHasta) {
        const hasta = new Date(filtros.entregadoHasta);
        hasta.setHours(23, 59, 59, 999);
        where.entregadoAt.lte = hasta;
      }
    }

    // Por defecto excluir ENTREGADO (historial), a menos que se filtre explícitamente
    if (!filtros.estado && !filtros.busqueda) {
      where.estado = { not: 'ENTREGADO' };
    }

    // Paginación: si viene page/limit, paginar; si no, legacy (máximo 200)
    const page = filtros.page ? Math.max(1, +filtros.page) : null;
    const limit = filtros.limit ? Math.min(100, Math.max(1, +filtros.limit)) : 50;

    const include = {
      beneficiario: true,
      programa: true,
      deposito: true,
      caso: { select: { id: true, nombreSolicitante: true, dni: true } },
      items: { include: { articulo: true } },
    };

    if (page) {
      const [data, total] = await Promise.all([
        this.prisma.remito.findMany({
          where,
          include,
          orderBy: { fecha: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.remito.count({ where }),
      ]);
      return { data, total, page, limit };
    }

    // Legacy: sin paginación (máx 200)
    return await this.prisma.remito.findMany({
      where,
      include,
      orderBy: { fecha: 'desc' },
      take: filtros.busqueda ? 500 : 200,
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
        caso: { select: { id: true, nombreSolicitante: true, dni: true } },
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

      this.eventsService.broadcast('remito:entregado', {
        id: remitoActualizado.id,
        numero: remitoActualizado.numero,
        depositoId: remitoActualizado.depositoId,
      }, remitoActualizado.secretaria as string | null);

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

  // ── Entrega a domicilio ─────────────────────────────────────────────────

  /** Marcar remito como entrega a domicilio y asignar chofer */
  async asignarDomicilio(id: number, choferId: number) {
    const remito = await this.prisma.remito.findUnique({ where: { id } });
    if (!remito) throw new NotFoundException('Remito no encontrado');
    if (remito.estado === 'BORRADOR') throw new BadRequestException('El remito debe estar confirmado');
    return this.prisma.remito.update({
      where: { id },
      data: { esEntregaDomicilio: true, choferId },
      include: { beneficiario: true, programa: true, deposito: true, chofer: { select: { id: true, nombre: true } } },
    });
  }

  /** Quitar asignación a domicilio */
  async quitarDomicilio(id: number) {
    const remito = await this.prisma.remito.findUnique({ where: { id } });
    if (!remito) throw new NotFoundException('Remito no encontrado');
    return this.prisma.remito.update({
      where: { id },
      data: { esEntregaDomicilio: false, choferId: null },
      include: { beneficiario: true, programa: true, deposito: true },
    });
  }

  /** Registrar retiro del depósito (chofer firma que retiró los productos) */
  async registrarRetiroDeposito(id: number, nota?: string) {
    const remito = await this.prisma.remito.findUnique({ where: { id } });
    if (!remito) throw new NotFoundException('Remito no encontrado');
    if (!remito.esEntregaDomicilio) throw new BadRequestException('Este remito no es de entrega a domicilio');
    if (remito.estado !== 'CONFIRMADO' && remito.estado !== 'ENVIADO') {
      throw new BadRequestException('El remito debe estar confirmado para retirarlo');
    }
    return this.prisma.remito.update({
      where: { id },
      data: { retiroDepositoAt: new Date(), retiroDepositoNota: nota || null },
      include: { beneficiario: true, programa: true, deposito: true, items: { include: { articulo: true } } },
    });
  }

  /** Registrar firma del destinatario (entrega en domicilio) */
  async firmaEntregaDomicilio(id: number, data: {
    nombreDestinatario: string;
    dniDestinatario: string;
    firmaDestinatario: string; // base64
    nota?: string;
  }) {
    const remito = await this.prisma.remito.findUnique({ where: { id } });
    if (!remito) throw new NotFoundException('Remito no encontrado');
    if (!remito.esEntregaDomicilio) throw new BadRequestException('Este remito no es de entrega a domicilio');
    if (remito.estado !== 'CONFIRMADO' && remito.estado !== 'ENVIADO') {
      throw new BadRequestException('El remito debe estar confirmado para registrar la entrega');
    }

    // Subir firma base64 como imagen a Storage
    let firmaUrl = data.firmaDestinatario;
    try {
      const base64Match = data.firmaDestinatario.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
      if (base64Match) {
        const ext = base64Match[1] === 'jpeg' ? 'jpg' : base64Match[1];
        const buffer = Buffer.from(base64Match[2], 'base64');
        const filename = `firmas/firma-${id}-${Date.now()}.${ext}`;
        firmaUrl = await this.storageService.upload(buffer, filename, `image/${base64Match[1]}`);
      }
    } catch (e) {
      // Si falla el upload, guardar el base64 como fallback
      console.warn('[firmaEntrega] No se pudo subir firma a storage, guardando base64:', e);
    }

    return this.prisma.$transaction(async (tx) => {
      const remitoActualizado = await tx.remito.update({
        where: { id },
        data: {
          estado: RemitoEstado.ENTREGADO,
          entregadoAt: new Date(),
          entregadoNota: data.nota || null,
          nombreDestinatario: data.nombreDestinatario,
          dniDestinatario: data.dniDestinatario,
          firmaDestinatario: firmaUrl,
          firmaDestinatarioAt: new Date(),
        },
        include: {
          beneficiario: true,
          programa: true,
          deposito: true,
          items: { include: { articulo: true } },
        },
      });

      await tx.entregaProgramada.updateMany({
        where: { remitoId: id },
        data: { estado: 'ENTREGADA' },
      });

      this.eventsService.broadcast('remito:entregado', {
        id: remitoActualizado.id,
        numero: remitoActualizado.numero,
        depositoId: remitoActualizado.depositoId,
      }, remitoActualizado.secretaria as string | null);

      return remitoActualizado;
    });
  }

  /** Listar remitos asignados a un chofer */
  async findByChofer(choferId: number) {
    return this.prisma.remito.findMany({
      where: {
        choferId,
        esEntregaDomicilio: true,
        estado: { in: ['CONFIRMADO', 'ENVIADO', 'ENTREGADO'] },
      },
      include: {
        beneficiario: true,
        programa: true,
        deposito: true,
        items: { include: { articulo: true } },
      },
      orderBy: [{ estado: 'asc' }, { fecha: 'asc' }],
    });
  }

  /** Listar choferes activos */
  async getChoferes() {
    return this.prisma.usuario.findMany({
      where: { rol: 'CHOFER', activo: true },
      select: { id: true, nombre: true, email: true },
      orderBy: { nombre: 'asc' },
    });
  }
}
