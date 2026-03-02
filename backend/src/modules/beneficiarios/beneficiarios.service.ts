import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBeneficiarioDto } from './dto/create-beneficiario.dto';

@Injectable()
export class BeneficiariosService {
  constructor(private prisma: PrismaService) {}

  async create(createBeneficiarioDto: CreateBeneficiarioDto) {
    return await this.prisma.beneficiario.create({
      data: createBeneficiarioDto,
      include: { programa: true },
    });
  }

  async findAll(filtros?: any) {
    const where: any = { activo: true };

    if (filtros?.programaId) where.programaId = parseInt(filtros.programaId);
    if (filtros?.localidad) where.localidad = { contains: filtros.localidad, mode: 'insensitive' };
    if (filtros?.tipo) where.tipo = filtros.tipo;

    return await this.prisma.beneficiario.findMany({
      where,
      include: { programa: true },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: number) {
    const beneficiario = await this.prisma.beneficiario.findUnique({
      where: { id },
      include: {
        programa: true,
        remitos: {
          take: 10,
          orderBy: { fecha: 'desc' },
        },
      },
    });

    if (!beneficiario) {
      throw new NotFoundException('Beneficiario no encontrado');
    }

    return beneficiario;
  }

  async update(id: number, updateData: any) {
    return await this.prisma.beneficiario.update({
      where: { id },
      data: updateData,
      include: { programa: true },
    });
  }

  async remove(id: number) {
    await this.prisma.beneficiario.update({
      where: { id },
      data: { activo: false },
    });

    return { success: true, message: 'Beneficiario desactivado' };
  }
}
