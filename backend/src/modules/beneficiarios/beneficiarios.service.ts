import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBeneficiarioDto } from './dto/create-beneficiario.dto';
import { StorageService } from '../../shared/storage/storage.service';

@Injectable()
export class BeneficiariosService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
  ) {}

  private static readonly LOCALIDADES_LA_PLATA = [
    'La Plata', 'Los Hornos', 'Gonnet', 'City Bell', 'Villa Elisa',
    'Tolosa', 'Ringuelet', 'Villa Elvira', 'Altos de San Lorenzo',
    'Lisandro Olmos', 'Melchor Romero', 'Arana', 'Abasto', 'Arturo Seguí',
    'Etcheverry', 'El Pato', 'El Peligro', 'Joaquín Gorina', 'José Hernández',
    'La Cumbre', 'Malvinas Argentinas', 'Parque Sicardi', 'Romero',
    'Hernández', 'San Carlos',
  ];

  async getLocalidades(): Promise<string[]> {
    const fromDb = await this.prisma.beneficiario.findMany({
      where: { localidad: { not: null } },
      select: { localidad: true },
      distinct: ['localidad'],
    });
    const dbLocalidades = fromDb.map((b) => b.localidad as string).filter(Boolean);
    return [...new Set([...BeneficiariosService.LOCALIDADES_LA_PLATA, ...dbLocalidades])].sort();
  }

  async checkDni(dni: string) {
    const encontrados = await this.prisma.beneficiario.findMany({
      where: { responsableDNI: dni, activo: true },
      include: { programa: { select: { nombre: true } } },
    });
    if (encontrados.length === 0) return { encontrado: false, detalle: null };
    const detalle = encontrados
      .map(b => `"${b.nombre}" en ${b.programa?.nombre ?? 'sin programa'}`)
      .join(', ');
    return { encontrado: true, detalle };
  }

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

  // ── Documentos ──────────────────────────────────────────────────────────────

  async getDocumentos(beneficiarioId: number) {
    return this.prisma.documentoBeneficiario.findMany({
      where: { beneficiarioId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async uploadDocumento(
    beneficiarioId: number,
    file: Express.Multer.File,
    nombre: string,
    tipo?: string,
  ) {
    const ext = file.originalname.split('.').pop();
    const filename = `docs/${beneficiarioId}/${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const url = await this.storageService.upload(file.buffer, filename, file.mimetype);

    return this.prisma.documentoBeneficiario.create({
      data: {
        beneficiarioId,
        nombre: nombre || file.originalname,
        archivo: file.originalname,
        url,
        tipo: tipo || null,
        estado: 'PENDIENTE',
      },
    });
  }

  async updateDocumento(id: number, data: { nombre?: string; estado?: string }) {
    return this.prisma.documentoBeneficiario.update({
      where: { id },
      data,
    });
  }

  async deleteDocumento(id: number) {
    const doc = await this.prisma.documentoBeneficiario.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Documento no encontrado');

    // Intentar borrar del storage (ignorar error si no existe)
    try {
      const path = doc.url.includes('uploads/') ? doc.url.split('uploads/')[1] : null;
      if (path) await this.storageService.delete(path);
    } catch { /* ignorar */ }

    await this.prisma.documentoBeneficiario.delete({ where: { id } });
    return { success: true };
  }
}
