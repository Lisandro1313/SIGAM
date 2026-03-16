import { Injectable, BadRequestException } from '@nestjs/common';
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
  async obtenerStockPorDeposito(depositoId: number) {
    return await this.prisma.stock.findMany({
      where: { depositoId },
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
  async obtenerTodoElStock() {
    return await this.prisma.stock.findMany({
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
