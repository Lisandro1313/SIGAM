import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../shared/storage/storage.service';

const CATEGORIAS = ['REMITOS', 'BENEFICIARIOS', 'RENDICIONES', 'NORMATIVA', 'MODELOS', 'OTRO'] as const;

@Injectable()
export class DocumentosService {
  constructor(private prisma: PrismaService, private storage: StorageService) {}

  async listar(filtros: { categoria?: string; q?: string; secretaria?: string | null }) {
    const where: any = {};
    if (filtros.categoria && filtros.categoria !== 'TODAS') where.categoria = filtros.categoria;
    if (filtros.secretaria) where.secretaria = filtros.secretaria;
    if (filtros.q && filtros.q.trim()) {
      const q = filtros.q.trim();
      where.OR = [
        { nombre: { contains: q, mode: 'insensitive' } },
        { descripcion: { contains: q, mode: 'insensitive' } },
        { archivo: { contains: q, mode: 'insensitive' } },
      ];
    }
    const [items, totalGeneral] = await Promise.all([
      this.prisma.documento.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200 }),
      this.prisma.documento.count(),
    ]);

    const porCategoria: Record<string, number> = {};
    const conteo = await this.prisma.documento.groupBy({
      by: ['categoria'],
      _count: { _all: true },
      where: filtros.secretaria ? { secretaria: filtros.secretaria } : {},
    });
    for (const c of conteo) porCategoria[c.categoria] = c._count._all;

    return { items, totalGeneral, porCategoria };
  }

  async upload(
    file: Express.Multer.File,
    body: { nombre?: string; categoria?: string; descripcion?: string; secretaria?: string },
    user: { id: number; nombre: string; rol: string },
  ) {
    if (!file) throw new BadRequestException('No se recibió archivo');
    const categoria = (body.categoria || 'OTRO').toUpperCase();
    if (!CATEGORIAS.includes(categoria as any)) {
      throw new BadRequestException(`Categoría inválida. Permitidas: ${CATEGORIAS.join(', ')}`);
    }
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `documentos/${categoria.toLowerCase()}/${Date.now()}_${safeName}`;
    const url = await this.storage.upload(file.buffer, path, file.mimetype);

    return this.prisma.documento.create({
      data: {
        nombre: body.nombre?.trim() || file.originalname,
        archivo: file.originalname,
        url,
        categoria,
        descripcion: body.descripcion?.trim() || null,
        tipo: file.mimetype,
        tamanioBytes: file.size,
        secretaria: this.resolverSecretaria(user.rol, body.secretaria),
        subidoPorId: user.id,
        subidoPorNombre: user.nombre,
      },
    });
  }

  async eliminar(id: number) {
    const doc = await this.prisma.documento.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Documento no encontrado');
    // Si el URL es local (uploads/...) o un path conocido, intentar borrar del storage
    try {
      const path = this.extraerPath(doc.url);
      if (path) await this.storage.delete(path);
    } catch { /* mejor esfuerzo */ }
    await this.prisma.documento.delete({ where: { id } });
    return { ok: true };
  }

  private extraerPath(url: string): string | null {
    if (!url) return null;
    if (url.startsWith('uploads/')) return url.replace(/^uploads\//, '');
    const idx = url.indexOf('/documentos/');
    if (idx >= 0) return url.slice(idx + 1);
    return null;
  }

  private resolverSecretaria(rol: string, body?: string): string {
    if (body && (body === 'PA' || body === 'AC')) return body;
    if (rol === 'ASISTENCIA_CRITICA') return 'AC';
    return 'PA';
  }
}
