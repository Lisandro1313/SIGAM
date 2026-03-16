import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TareasService {
  constructor(private prisma: PrismaService) {}

  findAll(filtros?: { estado?: string; programaId?: number; prioridad?: string }) {
    const where: any = {};
    if (filtros?.estado) {
      const estados = filtros.estado.split(',').map((s) => s.trim()).filter(Boolean);
      where.estado = estados.length === 1 ? estados[0] : { in: estados };
    }
    if (filtros?.programaId) where.programaId = filtros.programaId;
    if (filtros?.prioridad) where.prioridad = filtros.prioridad;
    return this.prisma.tarea.findMany({
      where,
      include: { programa: { select: { id: true, nombre: true } } },
      orderBy: [
        { estado: 'asc' },
        { prioridad: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }

  create(data: {
    titulo: string;
    descripcion?: string;
    prioridad?: string;
    asignadoA?: string;
    programaId?: number;
    vencimiento?: string;
  }) {
    return this.prisma.tarea.create({
      data: {
        titulo: data.titulo,
        descripcion: data.descripcion,
        prioridad: data.prioridad ?? 'MEDIA',
        asignadoA: data.asignadoA,
        programaId: data.programaId,
        vencimiento: data.vencimiento ? new Date(data.vencimiento) : undefined,
      },
      include: { programa: { select: { id: true, nombre: true } } },
    });
  }

  async update(id: number, data: {
    titulo?: string;
    descripcion?: string;
    prioridad?: string;
    asignadoA?: string;
    programaId?: number;
    vencimiento?: string;
    estado?: string;
  }) {
    const tarea = await this.prisma.tarea.findUnique({ where: { id } });
    if (!tarea) throw new NotFoundException('Tarea no encontrada');
    return this.prisma.tarea.update({
      where: { id },
      data: {
        ...data,
        vencimiento: data.vencimiento ? new Date(data.vencimiento) : undefined,
      },
      include: { programa: { select: { id: true, nombre: true } } },
    });
  }

  async completar(id: number, data: { completadoPorNombre?: string; completadoNota?: string }) {
    const tarea = await this.prisma.tarea.findUnique({ where: { id } });
    if (!tarea) throw new NotFoundException('Tarea no encontrada');
    if (tarea.estado === 'COMPLETADA') throw new BadRequestException('La tarea ya está completada');
    return this.prisma.tarea.update({
      where: { id },
      data: {
        estado: 'COMPLETADA',
        completadoAt: new Date(),
        completadoPorNombre: data.completadoPorNombre,
        completadoNota: data.completadoNota,
      },
      include: { programa: { select: { id: true, nombre: true } } },
    });
  }

  async remove(id: number) {
    const tarea = await this.prisma.tarea.findUnique({ where: { id } });
    if (!tarea) throw new NotFoundException('Tarea no encontrada');
    return this.prisma.tarea.delete({ where: { id } });
  }
}
