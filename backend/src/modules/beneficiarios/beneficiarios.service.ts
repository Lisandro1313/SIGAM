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

  async checkDni(dni: string, excludeId?: number) {
    const where: any = { responsableDNI: dni, activo: true };
    if (excludeId) where.id = { not: excludeId };
    const encontrados = await this.prisma.beneficiario.findMany({
      where,
      include: { programa: { select: { nombre: true } } },
    });
    if (encontrados.length === 0) return { encontrado: false, detalle: null };
    const detalle = encontrados
      .map(b => `"${b.nombre}" en ${b.programa?.nombre ?? 'sin programa'}`)
      .join(', ');
    return { encontrado: true, detalle, ids: encontrados.map(b => b.id) };
  }

  async create(createBeneficiarioDto: CreateBeneficiarioDto) {
    return await this.prisma.beneficiario.create({
      data: createBeneficiarioDto,
      include: { programa: true },
    });
  }

  async findAll(filtros?: any, secretaria?: string | null) {
    const where: any = { activo: true };

    if (filtros?.programaId) where.programaId = parseInt(filtros.programaId);
    if (filtros?.localidad) where.localidad = { contains: filtros.localidad, mode: 'insensitive' };
    if (filtros?.tipo) where.tipo = filtros.tipo;
    if (filtros?.buscar) {
      where.OR = [
        { nombre: { contains: filtros.buscar, mode: 'insensitive' } },
        { responsableNombre: { contains: filtros.buscar, mode: 'insensitive' } },
        { responsableDNI: { contains: filtros.buscar, mode: 'insensitive' } },
      ];
    }
    // Filtrar por secretaría del programa (null = LOGISTICA/VISOR, ve todo)
    if (secretaria) where.programa = { secretaria };

    const page = filtros?.page ? parseInt(filtros.page) : 1;
    const limit = filtros?.limit ? parseInt(filtros.limit) : 50;
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.beneficiario.findMany({
        where,
        include: { programa: true },
        orderBy: { nombre: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.beneficiario.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number) {
    const beneficiario = await this.prisma.beneficiario.findUnique({
      where: { id },
      include: {
        programa: true,
        remitos: {
          orderBy: { fecha: 'desc' },
          include: {
            deposito: { select: { nombre: true } },
            programa: { select: { nombre: true } },
            items: { include: { articulo: { select: { nombre: true } } } },
          },
        },
      },
    });

    if (!beneficiario) {
      throw new NotFoundException('Beneficiario no encontrado');
    }

    return beneficiario;
  }

  async getCruceProgramas(id: number) {
    // 1. Obtener el beneficiario y su DNI responsable
    const bene = await this.prisma.beneficiario.findUnique({
      where: { id },
      select: { responsableDNI: true, programaId: true },
    });
    if (!bene?.responsableDNI) return { dni: null, beneficiarios: [], casos: [] };

    const dni = bene.responsableDNI;

    // 2. Otros beneficiarios con el mismo DNI (excluyendo este mismo registro)
    const otrosBeneficiarios = await this.prisma.beneficiario.findMany({
      where: { responsableDNI: dni, id: { not: id } },
      include: {
        programa: { select: { nombre: true, secretaria: true } },
        remitos: {
          where: { estado: 'ENTREGADO' },
          select: { totalKg: true, entregadoAt: true, fecha: true },
          orderBy: { fecha: 'desc' },
        },
      },
    });

    const beneficiarios = otrosBeneficiarios.map((b) => {
      const entregas = b.remitos;
      const totalKg = entregas.reduce((s, r) => s + (r.totalKg || 0), 0);
      const ultimaEntrega = entregas[0]?.entregadoAt ?? entregas[0]?.fecha ?? null;
      return {
        id: b.id,
        nombre: b.nombre,
        tipo: b.tipo,
        activo: b.activo,
        programa: b.programa,
        cantidadEntregas: entregas.length,
        totalKg,
        ultimaEntrega,
      };
    });

    // 3. Casos particulares con el mismo DNI
    const casos = await this.prisma.caso.findMany({
      where: { dni },
      select: {
        id: true,
        nombreSolicitante: true,
        tipo: true,
        estado: true,
        prioridad: true,
        descripcion: true,
        creadoPorNombre: true,
        createdAt: true,
        revisadoAt: true,
        remito: { select: { numero: true, totalKg: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { dni, beneficiarios, casos };
  }

  // ── Búsqueda global por DNI ──────────────────────────────────────────────
  async searchByDni(dni: string) {
    const [beneficiarios, casos, integrantes] = await Promise.all([
      this.prisma.beneficiario.findMany({
        where: { responsableDNI: dni },
        include: { programa: { select: { nombre: true, secretaria: true } } },
        orderBy: { nombre: 'asc' },
      }),
      this.prisma.caso.findMany({
        where: { dni },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, nombreSolicitante: true, tipo: true, estado: true,
          prioridad: true, createdAt: true, creadoPorNombre: true,
          remito: { select: { numero: true, totalKg: true } },
        },
      }),
      this.prisma.integranteEspacio.findMany({
        where: { dni, activo: true },
        include: {
          beneficiario: {
            select: { id: true, nombre: true, programa: { select: { nombre: true } } },
          },
        },
      }),
    ]);
    return { dni, beneficiarios, casos, integrantes };
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

  // ── Integrantes de espacio/comedor ──────────────────────────────────────────

  async getIntegrantes(beneficiarioId: number) {
    return this.prisma.integranteEspacio.findMany({
      where: { beneficiarioId, activo: true },
      orderBy: { nombre: 'asc' },
    });
  }

  async addIntegrante(beneficiarioId: number, data: { nombre: string; dni?: string; direccion?: string }) {
    return this.prisma.integranteEspacio.create({
      data: { beneficiarioId, nombre: data.nombre, dni: data.dni || null, direccion: data.direccion || null },
    });
  }

  async bulkIntegrantes(beneficiarioId: number, integrantes: { nombre: string; dni?: string; direccion?: string }[]) {
    const created = await this.prisma.$transaction(
      integrantes.map((i) =>
        this.prisma.integranteEspacio.create({
          data: { beneficiarioId, nombre: i.nombre, dni: i.dni || null, direccion: i.direccion || null },
        }),
      ),
    );
    return { count: created.length, integrantes: created };
  }

  async removeIntegrante(beneficiarioId: number, integranteId: number) {
    const found = await this.prisma.integranteEspacio.findFirst({
      where: { id: integranteId, beneficiarioId },
    });
    if (!found) throw new NotFoundException('Integrante no encontrado');
    await this.prisma.integranteEspacio.update({
      where: { id: integranteId },
      data: { activo: false },
    });
    return { success: true };
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
