import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PLANTILLAS_DEFAULT } from './defaults';

@Injectable()
export class PlantillasDocService {
  constructor(private prisma: PrismaService) {}

  async listar(secretaria: string | null) {
    // Seed automático la primera vez
    const count = await this.prisma.plantillaDocumento.count();
    if (count === 0) {
      for (const p of PLANTILLAS_DEFAULT) {
        await this.prisma.plantillaDocumento.create({ data: { ...p, esBuiltIn: true, secretaria: 'PA' } });
      }
    }

    const where: any = {};
    if (secretaria) where.OR = [{ secretaria }, { esBuiltIn: true }];
    return this.prisma.plantillaDocumento.findMany({
      where,
      orderBy: [{ esBuiltIn: 'desc' }, { titulo: 'asc' }],
    });
  }

  async obtener(id: number) {
    const p = await this.prisma.plantillaDocumento.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Plantilla no encontrada');
    return p;
  }

  async crear(data: any, user: { id: number; nombre: string; rol: string }) {
    if (!data.titulo?.trim()) throw new BadRequestException('Título requerido');
    if (!data.contenido?.trim()) throw new BadRequestException('Contenido requerido');
    return this.prisma.plantillaDocumento.create({
      data: {
        titulo: data.titulo.trim(),
        descripcion: (data.descripcion ?? '').trim(),
        categoria: data.categoria || 'Operativo',
        contenido: data.contenido,
        icono: data.icono || 'description',
        color: data.color || '#1976d2',
        esBuiltIn: false,
        secretaria: user.rol === 'ASISTENCIA_CRITICA' ? 'AC' : 'PA',
        creadoPorId: user.id,
        creadoPorNombre: user.nombre,
      },
    });
  }

  async actualizar(id: number, data: any) {
    const actual = await this.obtener(id);
    return this.prisma.plantillaDocumento.update({
      where: { id },
      data: {
        titulo: data.titulo?.trim() ?? actual.titulo,
        descripcion: data.descripcion?.trim() ?? actual.descripcion,
        categoria: data.categoria ?? actual.categoria,
        contenido: data.contenido ?? actual.contenido,
        icono: data.icono ?? actual.icono,
        color: data.color ?? actual.color,
      },
    });
  }

  async duplicar(id: number, user: { id: number; nombre: string; rol: string }) {
    const orig = await this.obtener(id);
    return this.prisma.plantillaDocumento.create({
      data: {
        titulo: `${orig.titulo} (copia)`,
        descripcion: orig.descripcion,
        categoria: orig.categoria,
        contenido: orig.contenido,
        icono: orig.icono,
        color: orig.color,
        esBuiltIn: false,
        secretaria: user.rol === 'ASISTENCIA_CRITICA' ? 'AC' : 'PA',
        creadoPorId: user.id,
        creadoPorNombre: user.nombre,
      },
    });
  }

  async eliminar(id: number) {
    const p = await this.obtener(id);
    if (p.esBuiltIn) throw new BadRequestException('No se puede eliminar una plantilla predefinida. Podés duplicarla y editar la copia.');
    await this.prisma.plantillaDocumento.delete({ where: { id } });
    return { ok: true };
  }

  // ─────────────────────────────────────────────────────────────
  // Historial de documentos generados (auditoría de impresiones)
  // ─────────────────────────────────────────────────────────────
  async registrarGeneracion(
    data: { plantillaId?: number | null; plantillaTitulo: string; cantidadEspacios?: number; contexto?: any },
    user: { id: number; nombre: string; rol: string },
  ) {
    const secretaria = user.rol === 'ASISTENCIA_CRITICA' ? 'AC' : 'PA';
    return this.prisma.documentoGenerado.create({
      data: {
        plantillaId: data.plantillaId ?? null,
        plantillaTitulo: data.plantillaTitulo,
        cantidadEspacios: data.cantidadEspacios ?? 0,
        contexto: data.contexto ? JSON.stringify(data.contexto).slice(0, 4000) : null,
        usuarioId: user.id,
        usuarioNombre: user.nombre,
        secretaria,
      },
    });
  }

  async historialGeneraciones(secretaria: string | null, limite = 200) {
    const where: any = {};
    if (secretaria) where.secretaria = secretaria;
    return this.prisma.documentoGenerado.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(limite, 500),
    });
  }

  async resetDefaults() {
    // Reinicia las plantillas built-in a su contenido original (mantiene las custom)
    for (const p of PLANTILLAS_DEFAULT) {
      const existing = await this.prisma.plantillaDocumento.findFirst({
        where: { titulo: p.titulo, esBuiltIn: true },
      });
      if (existing) {
        await this.prisma.plantillaDocumento.update({
          where: { id: existing.id },
          data: { contenido: p.contenido, descripcion: p.descripcion, categoria: p.categoria, icono: p.icono, color: p.color },
        });
      } else {
        await this.prisma.plantillaDocumento.create({ data: { ...p, esBuiltIn: true, secretaria: 'PA' } });
      }
    }
    return { ok: true };
  }
}
