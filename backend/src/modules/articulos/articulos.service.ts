import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateArticuloDto } from './dto/create-articulo.dto';
import { StorageService } from '../../shared/storage/storage.service';

@Injectable()
export class ArticulosService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
  ) {}

  async create(createArticuloDto: CreateArticuloDto) {
    return await this.prisma.$transaction(async (tx) => {
      const articulo = await tx.articulo.create({ data: createArticuloDto });

      const depositos = await tx.deposito.findMany({ where: { activo: true } });
      await Promise.all(
        depositos.map((deposito) =>
          tx.stock.create({
            data: { articuloId: articulo.id, depositoId: deposito.id, cantidad: 0 },
          }),
        ),
      );

      return articulo;
    });
  }

  async findAll(secretaria?: string | null) {
    const hoy = new Date();
    const en30dias = new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000);

    const where: any = { activo: true };
    if (secretaria) where.secretaria = secretaria;

    return await this.prisma.articulo.findMany({
      where,
      include: {
        stockItems: { include: { deposito: true } },
        lotes: {
          where: { fechaVencimiento: { lte: en30dias } },
          orderBy: { fechaVencimiento: 'asc' },
        },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: number) {
    const articulo = await this.prisma.articulo.findUnique({
      where: { id },
      include: {
        stockItems: { include: { deposito: true } },
        lotes: {
          include: { deposito: true },
          orderBy: { fechaVencimiento: 'asc' },
        },
      },
    });

    if (!articulo) {
      throw new NotFoundException('Artículo no encontrado');
    }

    return articulo;
  }

  async update(id: number, updateData: any) {
    return await this.prisma.articulo.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: number) {
    await this.prisma.articulo.update({
      where: { id },
      data: { activo: false },
    });

    return { success: true, message: 'Artículo desactivado' };
  }

  // ── Foto ─────────────────────────────────────────────────────────────────

  async uploadFoto(id: number, file: Express.Multer.File): Promise<string> {
    const ext = file.originalname.split('.').pop();
    const path = `articulos/${id}_${Date.now()}.${ext}`;
    const url = await this.storageService.upload(file.buffer, path, file.mimetype);
    await this.prisma.articulo.update({ where: { id }, data: { fotoUrl: url } });
    return url;
  }

  // ── Lotes / Vencimientos ─────────────────────────────────────────────────

  async getLotes(articuloId: number) {
    return this.prisma.loteArticulo.findMany({
      where: { articuloId },
      include: { deposito: true },
      orderBy: { fechaVencimiento: 'asc' },
    });
  }

  async createLote(articuloId: number, data: { depositoId: number; cantidad: number; fechaVencimiento: string; lote?: string }) {
    return this.prisma.loteArticulo.create({
      data: {
        articuloId,
        depositoId: data.depositoId,
        cantidad: data.cantidad,
        fechaVencimiento: new Date(data.fechaVencimiento),
        lote: data.lote || null,
      },
      include: { deposito: true },
    });
  }

  async deleteLote(id: number) {
    await this.prisma.loteArticulo.delete({ where: { id } });
    return { success: true };
  }

  async getLotesProximos(dias = 30) {
    const limite = new Date(Date.now() + dias * 24 * 60 * 60 * 1000);
    return this.prisma.loteArticulo.findMany({
      where: { fechaVencimiento: { lte: limite } },
      include: { articulo: true, deposito: true },
      orderBy: { fechaVencimiento: 'asc' },
    });
  }
}
