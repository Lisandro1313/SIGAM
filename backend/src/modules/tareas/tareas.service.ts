import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../shared/storage/storage.service';

@Injectable()
export class TareasService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  findAll(filtros?: { estado?: string; programaId?: number; prioridad?: string; secretaria?: string | null }) {
    const where: any = {};
    if (filtros?.estado) {
      const estados = filtros.estado.split(',').map((s) => s.trim()).filter(Boolean);
      where.estado = estados.length === 1 ? estados[0] : { in: estados };
    }
    if (filtros?.programaId) where.programaId = filtros.programaId;
    if (filtros?.prioridad) where.prioridad = filtros.prioridad;
    if (filtros?.secretaria) where.secretaria = filtros.secretaria;
    return this.prisma.tarea.findMany({
      where,
      include: {
        programa: { select: { id: true, nombre: true } },
        documentos: { orderBy: { createdAt: 'asc' } },
      },
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
      include: {
        programa: { select: { id: true, nombre: true } },
        documentos: true,
      },
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
      include: {
        programa: { select: { id: true, nombre: true } },
        documentos: true,
      },
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
      include: {
        programa: { select: { id: true, nombre: true } },
        documentos: true,
      },
    });
  }

  async remove(id: number) {
    const tarea = await this.prisma.tarea.findUnique({
      where: { id },
      include: { documentos: true },
    });
    if (!tarea) throw new NotFoundException('Tarea no encontrada');
    // Eliminar archivos del storage
    for (const doc of tarea.documentos) {
      await this.storage.delete(doc.archivo).catch(() => {});
    }
    return this.prisma.tarea.delete({ where: { id } });
  }

  // ── Documentos ──────────────────────────────────────────────────────────────

  getDocumentos(tareaId: number) {
    return this.prisma.documentoTarea.findMany({
      where: { tareaId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async uploadDocumento(
    tareaId: number,
    file: Express.Multer.File,
    nombre: string,
    tipo?: string,
  ) {
    const tarea = await this.prisma.tarea.findUnique({ where: { id: tareaId } });
    if (!tarea) throw new NotFoundException('Tarea no encontrada');

    const ext = file.originalname.split('.').pop() || 'bin';
    const archivo = `tareas/${tareaId}/${Date.now()}.${ext}`;
    const url = await this.storage.upload(file.buffer, archivo, file.mimetype);

    return this.prisma.documentoTarea.create({
      data: { tareaId, nombre, archivo, url, tipo },
    });
  }

  async deleteDocumento(docId: number) {
    const doc = await this.prisma.documentoTarea.findUnique({ where: { id: docId } });
    if (!doc) throw new NotFoundException('Documento no encontrado');
    await this.storage.delete(doc.archivo).catch(() => {});
    return this.prisma.documentoTarea.delete({ where: { id: docId } });
  }
}
