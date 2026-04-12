import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../shared/storage/storage.service';

@Injectable()
export class TareasService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  private readonly includeArchivos = {
    programa: { select: { id: true, nombre: true } },
    archivos: { select: { id: true, nombre: true, url: true, tipo: true, createdAt: true } },
  };

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
      include: this.includeArchivos,
      orderBy: [
        { estado: 'asc' },
        { prioridad: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async create(
    data: {
      titulo: string;
      descripcion?: string;
      prioridad?: string;
      asignadoA?: string;
      programaId?: number;
      vencimiento?: string;
    },
    archivos?: Express.Multer.File[],
  ) {
    const tarea = await this.prisma.tarea.create({
      data: {
        titulo: data.titulo,
        descripcion: data.descripcion,
        prioridad: data.prioridad ?? 'MEDIA',
        asignadoA: data.asignadoA,
        programaId: data.programaId,
        vencimiento: data.vencimiento ? new Date(data.vencimiento) : undefined,
      },
      include: this.includeArchivos,
    });

    if (archivos?.length) {
      await this.subirArchivos(tarea.id, archivos);
      return this.prisma.tarea.findUnique({ where: { id: tarea.id }, include: this.includeArchivos });
    }

    return tarea;
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
      include: this.includeArchivos,
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
      include: this.includeArchivos,
    });
  }

  async remove(id: number) {
    const tarea = await this.prisma.tarea.findUnique({
      where: { id },
      include: { archivos: true },
    });
    if (!tarea) throw new NotFoundException('Tarea no encontrada');
    // Borrar archivos del storage
    for (const arch of tarea.archivos) {
      await this.storage.delete(arch.url.replace(/^uploads\//, '')).catch(() => {});
    }
    return this.prisma.tarea.delete({ where: { id } });
  }

  // ── Archivos adjuntos ───────────────────────────────────────────────────

  async subirArchivos(tareaId: number, files: Express.Multer.File[]) {
    const results: any[] = [];
    for (const file of files) {
      const ext = file.originalname.split('.').pop() || 'bin';
      const filename = `${tareaId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const url = await this.storage.upload(file.buffer, `tareas/${filename}`, file.mimetype);
      const arch = await this.prisma.archivoTarea.create({
        data: {
          tareaId,
          nombre: file.originalname,
          url,
          tipo: file.mimetype,
        },
      });
      results.push(arch);
    }
    return results;
  }

  async agregarArchivos(tareaId: number, files: Express.Multer.File[]) {
    const tarea = await this.prisma.tarea.findUnique({ where: { id: tareaId } });
    if (!tarea) throw new NotFoundException('Tarea no encontrada');
    await this.subirArchivos(tareaId, files);
    return this.prisma.tarea.findUnique({ where: { id: tareaId }, include: this.includeArchivos });
  }

  async eliminarArchivo(tareaId: number, archivoId: number) {
    const archivo = await this.prisma.archivoTarea.findFirst({
      where: { id: archivoId, tareaId },
    });
    if (!archivo) throw new NotFoundException('Archivo no encontrado');
    await this.storage.delete(archivo.url.replace(/^uploads\//, '')).catch(() => {});
    await this.prisma.archivoTarea.delete({ where: { id: archivoId } });
    return { ok: true };
  }
}
