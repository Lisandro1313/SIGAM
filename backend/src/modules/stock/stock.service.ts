import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MovimientoTipo } from '@prisma/client';
import { StorageService } from '../../shared/storage/storage.service';

@Injectable()
export class StockService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
  ) {}

  // Obtener stock por depósito
  async obtenerStockPorDeposito(depositoId: number, secretaria?: string | null) {
    const where: any = { depositoId };
    if (secretaria) where.articulo = { secretaria };
    return await this.prisma.stock.findMany({
      where,
      include: {
        articulo: true,
        deposito: true,
      },
      orderBy: {
        articulo: { nombre: 'asc' },
      },
    });
  }

  // Obtener todo el stock
  async obtenerTodoElStock(secretaria?: string | null) {
    const where: any = secretaria ? { articulo: { secretaria } } : {};
    return await this.prisma.stock.findMany({
      where,
      include: {
        articulo: true,
        deposito: true,
      },
    });
  }

  // Registrar ingreso de mercadería
  async registrarIngreso(
    articuloId: number,
    depositoId: number,
    cantidad: number,
    usuarioId: number,
    observaciones?: string,
    documento?: Express.Multer.File,
  ) {
    let documentoUrl: string | undefined;
    if (documento) {
      const path = `stock/ingresos/${Date.now()}_${documento.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      documentoUrl = await this.storageService.upload(documento.buffer, path, documento.mimetype);
    }

    return await this.prisma.$transaction(async (tx) => {
      // Crear movimiento de INGRESO
      await tx.movimiento.create({
        data: {
          tipo: MovimientoTipo.INGRESO,
          cantidad,
          articuloId,
          depositoHaciaId: depositoId,
          usuarioId,
          observaciones,
          documentoUrl: documentoUrl ?? null,
        },
      });

      // Actualizar stock
      const stock = await tx.stock.findUnique({
        where: {
          articuloId_depositoId: { articuloId, depositoId },
        },
      });

      if (!stock) {
        return await tx.stock.create({
          data: {
            articuloId,
            depositoId,
            cantidad,
          },
          include: {
            articulo: true,
            deposito: true,
          },
        });
      }

      return await tx.stock.update({
        where: {
          articuloId_depositoId: { articuloId, depositoId },
        },
        data: {
          cantidad: {
            increment: cantidad,
          },
        },
        include: {
          articulo: true,
          deposito: true,
        },
      });
    });
  }

  // Transferir entre depósitos
  async transferir(
    articuloId: number,
    depositoOrigenId: number,
    depositoDestinoId: number,
    cantidad: number,
    usuarioId: number,
  ) {
    return await this.prisma.$transaction(async (tx) => {
      // Verificar stock origen
      const stockOrigen = await tx.stock.findUnique({
        where: {
          articuloId_depositoId: { articuloId, depositoId: depositoOrigenId },
        },
      });

      if (!stockOrigen || stockOrigen.cantidad < cantidad) {
        throw new BadRequestException(
          `Stock insuficiente en depósito origen. Disponible: ${stockOrigen?.cantidad || 0}, Requerido: ${cantidad}`,
        );
      }

      // Crear movimiento de TRANSFERENCIA
      await tx.movimiento.create({
        data: {
          tipo: MovimientoTipo.TRANSFERENCIA,
          cantidad,
          articuloId,
          depositoDesdeId: depositoOrigenId,
          depositoHaciaId: depositoDestinoId,
          usuarioId,
          observaciones: `Transferencia de ${stockOrigen.cantidad} unidades`,
        },
      });

      // Descontar de origen
      await tx.stock.update({
        where: {
          articuloId_depositoId: { articuloId, depositoId: depositoOrigenId },
        },
        data: {
          cantidad: { decrement: cantidad },
        },
      });

      // Incrementar en destino
      await tx.stock.update({
        where: {
          articuloId_depositoId: { articuloId, depositoId: depositoDestinoId },
        },
        data: {
          cantidad: { increment: cantidad },
        },
      });

      return { success: true, message: 'Transferencia realizada' };
    });
  }

  // Alertas de stock mínimo
  async obtenerAlertas() {
    const stocks = await this.prisma.stock.findMany({
      include: {
        articulo: { select: { id: true, nombre: true, categoria: true, stockMinimo: true } },
        deposito: { select: { id: true, nombre: true } },
      },
    });
    return stocks
      .filter(s => s.articulo.stockMinimo != null && s.cantidad < s.articulo.stockMinimo)
      .map(s => ({
        articuloId: s.articuloId,
        nombre: s.articulo.nombre,
        categoria: s.articulo.categoria,
        depositoId: s.depositoId,
        deposito: s.deposito.nombre,
        stockActual: s.cantidad,
        stockMinimo: s.articulo.stockMinimo!,
        deficit: s.articulo.stockMinimo! - s.cantidad,
      }))
      .sort((a, b) => b.deficit - a.deficit);
  }

  // ── CRUD de Lotes ──────────────────────────────────────────────────────────

  async getLotes(depositoId?: number, articuloId?: number) {
    const where: any = {};
    if (depositoId) where.depositoId = depositoId;
    if (articuloId) where.articuloId = articuloId;
    return this.prisma.loteArticulo.findMany({
      where,
      include: {
        articulo: { select: { id: true, nombre: true, categoria: true } },
        deposito: { select: { id: true, nombre: true } },
      },
      orderBy: [{ fechaVencimiento: 'asc' }, { articuloId: 'asc' }],
    });
  }

  async createLote(data: {
    articuloId: number;
    depositoId: number;
    cantidad: number;
    fechaVencimiento: string;
    lote?: string;
  }) {
    return this.prisma.loteArticulo.create({
      data: {
        articuloId: data.articuloId,
        depositoId: data.depositoId,
        cantidad: data.cantidad,
        fechaVencimiento: new Date(data.fechaVencimiento),
        lote: data.lote || null,
      },
      include: {
        articulo: { select: { id: true, nombre: true, categoria: true } },
        deposito: { select: { id: true, nombre: true } },
      },
    });
  }

  async updateLote(id: number, data: { cantidad?: number; fechaVencimiento?: string; lote?: string }) {
    const found = await this.prisma.loteArticulo.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('Lote no encontrado');
    return this.prisma.loteArticulo.update({
      where: { id },
      data: {
        ...(data.cantidad !== undefined && { cantidad: data.cantidad }),
        ...(data.fechaVencimiento && { fechaVencimiento: new Date(data.fechaVencimiento) }),
        ...(data.lote !== undefined && { lote: data.lote || null }),
      },
      include: {
        articulo: { select: { id: true, nombre: true, categoria: true } },
        deposito: { select: { id: true, nombre: true } },
      },
    });
  }

  async deleteLote(id: number) {
    const found = await this.prisma.loteArticulo.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('Lote no encontrado');
    await this.prisma.loteArticulo.delete({ where: { id } });
    return { success: true };
  }

  // Ajuste / reconciliación de stock
  async ajustarStock(
    articuloId: number,
    depositoId: number,
    cantidadReal: number,
    usuarioId: number,
    observaciones?: string,
  ) {
    if (cantidadReal < 0) throw new BadRequestException('La cantidad real no puede ser negativa');

    return await this.prisma.$transaction(async (tx) => {
      const stock = await tx.stock.findUnique({
        where: { articuloId_depositoId: { articuloId, depositoId } },
      });

      const cantidadActual = stock?.cantidad ?? 0;
      const delta = cantidadReal - cantidadActual;

      // Crear movimiento de AJUSTE con el delta (puede ser negativo)
      await tx.movimiento.create({
        data: {
          tipo: MovimientoTipo.AJUSTE,
          cantidad: delta,
          articuloId,
          depositoDesdeId: depositoId,
          depositoHaciaId: depositoId,
          usuarioId,
          observaciones: observaciones ?? `Ajuste: ${cantidadActual} → ${cantidadReal}`,
        },
      });

      if (stock) {
        return await tx.stock.update({
          where: { articuloId_depositoId: { articuloId, depositoId } },
          data: { cantidad: cantidadReal },
          include: { articulo: true, deposito: true },
        });
      } else {
        return await tx.stock.create({
          data: { articuloId, depositoId, cantidad: cantidadReal },
          include: { articulo: true, deposito: true },
        });
      }
    });
  }

  // Obtener movimientos
  async obtenerMovimientos(filtros?: any) {
    const where: any = {};

    if (filtros?.tipo) where.tipo = filtros.tipo;
    if (filtros?.articuloId) where.articuloId = parseInt(filtros.articuloId);
    if (filtros?.depositoDesdeId) where.depositoDesdeId = parseInt(filtros.depositoDesdeId);

    return await this.prisma.movimiento.findMany({
      where,
      include: {
        articulo: true,
        usuario: { select: { id: true, nombre: true } },
        depositoDesde: true,
        depositoHacia: true,
        programa: true,
        beneficiario: true,
      },
      orderBy: { fecha: 'desc' },
      take: 100,
    });
  }
}
