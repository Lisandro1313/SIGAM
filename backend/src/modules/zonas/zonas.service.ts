import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ZonasService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.zona.findMany({
      where: { activo: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  create(data: { nombre: string; color?: string; geojson: string }) {
    return this.prisma.zona.create({ data });
  }

  async update(id: number, data: { nombre?: string; color?: string; geojson?: string }) {
    const exists = await this.prisma.zona.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Zona no encontrada');
    return this.prisma.zona.update({ where: { id }, data });
  }

  async remove(id: number) {
    const exists = await this.prisma.zona.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Zona no encontrada');
    return this.prisma.zona.update({ where: { id }, data: { activo: false } });
  }
}
