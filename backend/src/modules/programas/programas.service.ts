import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProgramaDto } from './dto/create-programa.dto';

@Injectable()
export class ProgramasService {
  constructor(private prisma: PrismaService) {}

  async create(createProgramaDto: CreateProgramaDto) {
    return await this.prisma.programa.create({
      data: createProgramaDto,
    });
  }

  async findAll() {
    return await this.prisma.programa.findMany({
      where: { activo: true },
      include: {
        _count: {
          select: { beneficiarios: true, remitos: true },
        },
      },
    });
  }

  async findOne(id: number) {
    const programa = await this.prisma.programa.findUnique({
      where: { id },
      include: {
        beneficiarios: true,
        plantillas: true,
      },
    });

    if (!programa) {
      throw new NotFoundException('Programa no encontrado');
    }

    return programa;
  }

  async update(id: number, updateData: any) {
    return await this.prisma.programa.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: number) {
    await this.prisma.programa.update({
      where: { id },
      data: { activo: false },
    });

    return { success: true, message: 'Programa desactivado' };
  }
}
