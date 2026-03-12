import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateArticuloDto } from './dto/create-articulo.dto';

@Injectable()
export class ArticulosService {
  constructor(private prisma: PrismaService) {}

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

  async findAll() {
    return await this.prisma.articulo.findMany({
      where: { activo: true },
      include: {
        stockItems: {
          include: {
            deposito: true,
          },
        },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: number) {
    const articulo = await this.prisma.articulo.findUnique({
      where: { id },
      include: {
        stockItems: {
          include: {
            deposito: true,
          },
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
}
