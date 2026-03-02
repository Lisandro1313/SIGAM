import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateArticuloDto } from './dto/create-articulo.dto';

@Injectable()
export class ArticulosService {
  constructor(private prisma: PrismaService) {}

  async create(createArticuloDto: CreateArticuloDto) {
    // Crear artículo
    const articulo = await this.prisma.articulo.create({
      data: createArticuloDto,
    });

    // Crear stock en ambos depósitos
    const depositos = await this.prisma.deposito.findMany();
    
    for (const deposito of depositos) {
      await this.prisma.stock.create({
        data: {
          articuloId: articulo.id,
          depositoId: deposito.id,
          cantidad: 0,
        },
      });
    }

    return articulo;
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
