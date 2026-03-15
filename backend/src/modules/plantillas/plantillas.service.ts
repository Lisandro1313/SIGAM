import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePlantillaDto } from './dto/create-plantilla.dto';

@Injectable()
export class PlantillasService {
  constructor(private prisma: PrismaService) {}

  async create(createPlantillaDto: CreatePlantillaDto) {
    return await this.prisma.plantilla.create({
      data: {
        nombre: createPlantillaDto.nombre,
        descripcion: createPlantillaDto.descripcion,
        kilogramos: createPlantillaDto.kilogramos ?? null,
        programaId: createPlantillaDto.programaId,
        items: {
          create: createPlantillaDto.items.map((item) => ({
            articuloId: item.articuloId,
            cantidadBase: item.cantidadBase,
          })),
        },
      },
      include: {
        items: {
          include: {
            articulo: true,
          },
        },
        programa: true,
      },
    });
  }

  async findAll(programaId?: number) {
    const where: any = { activo: true };
    if (programaId) where.programaId = programaId;

    return await this.prisma.plantilla.findMany({
      where,
      include: {
        items: {
          include: {
            articulo: true,
          },
        },
        programa: true,
      },
    });
  }

  async findOne(id: number) {
    const plantilla = await this.prisma.plantilla.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            articulo: true,
          },
        },
        programa: true,
      },
    });

    if (!plantilla) {
      throw new NotFoundException('Plantilla no encontrada');
    }

    return plantilla;
  }

  async update(id: number, updateData: any) {
    // Si se actualizan items, eliminar los viejos y crear nuevos dentro de una transacción
    if (updateData.items) {
      return await this.prisma.$transaction(async (tx) => {
        await tx.plantillaItem.deleteMany({ where: { plantillaId: id } });

        return await tx.plantilla.update({
          where: { id },
          data: {
            nombre: updateData.nombre,
            descripcion: updateData.descripcion,
            kilogramos: updateData.kilogramos ?? null,
            programaId: updateData.programaId ?? undefined,
            items: {
              create: updateData.items.map((item: any) => ({
                articuloId: item.articuloId,
                cantidadBase: item.cantidadBase,
              })),
            },
          },
          include: {
            items: { include: { articulo: true } },
            programa: true,
          },
        });
      });
    }

    return await this.prisma.plantilla.update({
      where: { id },
      data: updateData,
      include: {
        items: {
          include: {
            articulo: true,
          },
        },
        programa: true,
      },
    });
  }

  async remove(id: number) {
    await this.prisma.plantilla.update({
      where: { id },
      data: { activo: false },
    });

    return { success: true, message: 'Plantilla desactivada' };
  }
}
