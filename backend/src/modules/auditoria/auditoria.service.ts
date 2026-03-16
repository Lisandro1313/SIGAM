import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditoriaService {
  constructor(private prisma: PrismaService) {}

  async log(data: {
    usuarioId?: number;
    usuarioNombre?: string;
    metodo: string;
    ruta: string;
    descripcion?: string;
    datos?: string;
  }) {
    return this.prisma.auditoriaLog.create({ data });
  }

  async findAll(filtros: {
    usuarioId?: number;
    desde?: string;
    hasta?: string;
    metodo?: string;
    buscar?: string;
  }) {
    const where: any = {};
    if (filtros.usuarioId) where.usuarioId = filtros.usuarioId;
    if (filtros.metodo) where.metodo = filtros.metodo;
    if (filtros.buscar) {
      where.OR = [
        { descripcion: { contains: filtros.buscar, mode: 'insensitive' } },
        { ruta: { contains: filtros.buscar, mode: 'insensitive' } },
        { usuarioNombre: { contains: filtros.buscar, mode: 'insensitive' } },
      ];
    }
    if (filtros.desde || filtros.hasta) {
      where.createdAt = {};
      if (filtros.desde) where.createdAt.gte = new Date(filtros.desde);
      if (filtros.hasta) {
        const h = new Date(filtros.hasta);
        h.setHours(23, 59, 59, 999);
        where.createdAt.lte = h;
      }
    }

    return this.prisma.auditoriaLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async getUsuarios() {
    const logs = await this.prisma.auditoriaLog.findMany({
      select: { usuarioId: true, usuarioNombre: true },
      distinct: ['usuarioId'],
      where: { usuarioId: { not: null } },
      orderBy: { usuarioNombre: 'asc' },
    });
    return logs;
  }
}
