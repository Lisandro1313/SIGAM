import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../shared/storage/storage.service';
import { EventsService } from '../events/events.service';

const INCLUDE_CASO = {
  documentos: { orderBy: { createdAt: 'asc' as const } },
  beneficiario: { select: { id: true, nombre: true, programa: { select: { nombre: true } } } },
  remito: { select: { id: true, numero: true, estado: true } },
};

@Injectable()
export class CasosService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private eventsService: EventsService,
  ) {}

  // ── Check cruce por DNI ───────────────────────────────────────────────────
  async checkDni(dni: string) {
    const beneficiarios = await this.prisma.beneficiario.findMany({
      where: { responsableDNI: dni, activo: true },
      include: { programa: { select: { nombre: true } } },
    });
    const casosActivos = await this.prisma.caso.findMany({
      where: {
        dni,
        estado: { notIn: ['RECHAZADO', 'RESUELTO'] },
      },
      select: { id: true, estado: true, tipo: true, createdAt: true },
    });

    const alertas: string[] = [];
    for (const b of beneficiarios) {
      alertas.push(`Registrado como beneficiario en "${b.programa?.nombre ?? 'sin programa'}" (${b.nombre})`);
    }
    for (const c of casosActivos) {
      alertas.push(`Ya tiene un caso ${c.estado} (ID #${c.id})`);
    }

    return { alerta: alertas.length > 0, detalle: alertas.join(' · ') || null };
  }

  // ── Crear caso ────────────────────────────────────────────────────────────
  async create(dto: any, usuarioId: number, usuarioNombre: string) {
    // Cruce automático si hay DNI
    let alertaCruce = false;
    let detalleCruce: string | null = null;
    if (dto.dni) {
      const cruce = await this.checkDni(dto.dni);
      alertaCruce = cruce.alerta;
      detalleCruce = cruce.detalle;
    }

    const nuevo = await this.prisma.caso.create({
      data: {
        nombreSolicitante: dto.nombreSolicitante,
        dni: dto.dni ?? null,
        direccion: dto.direccion ?? null,
        barrio: dto.barrio ?? null,
        telefono: dto.telefono ?? null,
        descripcion: dto.descripcion,
        prioridad: dto.prioridad ?? 'NORMAL',
        tipo: dto.tipo,
        estado: 'PENDIENTE',
        creadoPorId: usuarioId,
        creadoPorNombre: usuarioNombre,
        beneficiarioId: dto.beneficiarioId ?? null,
        alertaCruce,
        detalleCruce,
      },
      include: INCLUDE_CASO,
    });
    this.eventsService.broadcast('caso:nuevo', {
      id: nuevo.id,
      nombre: nuevo.nombreSolicitante,
      prioridad: nuevo.prioridad,
    });
    return nuevo;
  }

  // ── Listar casos ──────────────────────────────────────────────────────────
  async findAll(filtros: any, usuarioId: number, usuarioRol: string) {
    const where: any = {};

    // TS y AC solo ven sus propios casos
    if (usuarioRol === 'TRABAJADORA_SOCIAL' || usuarioRol === 'ASISTENCIA_CRITICA') {
      where.creadoPorId = usuarioId;
    }

    if (filtros.estado) where.estado = filtros.estado;
    if (filtros.prioridad) where.prioridad = filtros.prioridad;
    if (filtros.tipo) where.tipo = filtros.tipo;
    if (filtros.buscar) {
      where.OR = [
        { nombreSolicitante: { contains: filtros.buscar, mode: 'insensitive' } },
        { dni: { contains: filtros.buscar, mode: 'insensitive' } },
        { barrio: { contains: filtros.buscar, mode: 'insensitive' } },
        { descripcion: { contains: filtros.buscar, mode: 'insensitive' } },
      ];
    }
    if (filtros.fechaDesde || filtros.fechaHasta) {
      where.createdAt = {};
      if (filtros.fechaDesde) where.createdAt.gte = new Date(filtros.fechaDesde);
      if (filtros.fechaHasta) {
        const hasta = new Date(filtros.fechaHasta);
        hasta.setHours(23, 59, 59, 999);
        where.createdAt.lte = hasta;
      }
    }

    return this.prisma.caso.findMany({
      where,
      include: INCLUDE_CASO,
      orderBy: [
        { prioridad: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  // ── Obtener uno ───────────────────────────────────────────────────────────
  async findOne(id: number) {
    const caso = await this.prisma.caso.findUnique({
      where: { id },
      include: INCLUDE_CASO,
    });
    if (!caso) throw new NotFoundException(`Caso #${id} no encontrado`);
    return caso;
  }

  // ── Revisar (EN_REVISION / APROBADO / RECHAZADO) ──────────────────────────
  async revisar(id: number, dto: any, revisorId: number, revisorNombre: string) {
    const caso = await this.findOne(id);
    const estadosValidos = ['PENDIENTE', 'EN_REVISION'];
    if (!estadosValidos.includes(caso.estado)) {
      throw new BadRequestException(`No se puede revisar un caso en estado ${caso.estado}`);
    }

    const actualizado = await this.prisma.caso.update({
      where: { id },
      data: {
        estado: dto.estado,
        notaRevision: dto.notaRevision ?? null,
        revisadoAt: new Date(),
        revisadoPorId: revisorId,
        revisadoPorNombre: revisorNombre,
      },
      include: INCLUDE_CASO,
    });
    this.eventsService.broadcast('caso:actualizado', {
      id: actualizado.id,
      estado: actualizado.estado,
      creadoPorId: actualizado.creadoPorId,
    });
    return actualizado;
  }

  // ── Generar remito desde caso ─────────────────────────────────────────────
  async generarRemito(casoId: number, remitoData: any, usuarioId: number, usuarioNombre: string) {
    const caso = await this.findOne(casoId);
    if (caso.estado !== 'APROBADO') {
      throw new BadRequestException('Solo se puede generar un remito desde un caso APROBADO');
    }

    // Obtener correlativo
    const correlativo = await this.prisma.$transaction(async (tx) => {
      const corr = await tx.correlativo.findUnique({ where: { clave: 'remito_pa' } });
      const siguiente = (corr?.ultimo ?? 1001648) + 1;
      await tx.correlativo.upsert({
        where: { clave: 'remito_pa' },
        update: { ultimo: siguiente },
        create: { clave: 'remito_pa', ultimo: siguiente },
      });
      return siguiente;
    });

    const numero = `CP ${correlativo}`;

    // Calcular totalKg
    const articulos = await this.prisma.articulo.findMany({
      where: { id: { in: remitoData.items.map((i: any) => i.articuloId) } },
    });
    let totalKg = 0;
    const itemsConPeso = remitoData.items.map((item: any) => {
      const art = articulos.find((a) => a.id === item.articuloId);
      const pesoKg = (art?.pesoUnitarioKg ?? 0) * item.cantidad;
      totalKg += pesoKg;
      return { articuloId: item.articuloId, cantidad: item.cantidad, pesoKg };
    });

    // Crear remito + descontar stock en una transacción
    const remito = await this.prisma.$transaction(async (tx) => {
      const r = await tx.remito.create({
        data: {
          numero,
          fecha: new Date(),
          estado: 'CONFIRMADO',
          totalKg,
          depositoId: remitoData.depositoId,
          programaId: remitoData.programaId ?? null,
          beneficiarioId: caso.beneficiarioId ?? null,
          observaciones: `Generado desde Caso Particular #${casoId} — ${caso.nombreSolicitante}`,
          items: { create: itemsConPeso },
        },
        include: { items: true, deposito: true, beneficiario: true },
      });

      // Descontar stock y registrar movimientos
      for (const item of itemsConPeso) {
        await tx.stock.update({
          where: { articuloId_depositoId: { articuloId: item.articuloId, depositoId: remitoData.depositoId } },
          data: { cantidad: { decrement: item.cantidad } },
        });
        await tx.movimiento.create({
          data: {
            tipo: 'EGRESO',
            cantidad: item.cantidad,
            articuloId: item.articuloId,
            depositoDesdeId: remitoData.depositoId,
            remitoId: r.id,
            usuarioId,
            observaciones: `Remito ${numero} — Caso #${casoId}`,
          },
        });
      }

      return r;
    });

    // Vincular remito al caso y marcar RESUELTO
    await this.prisma.caso.update({
      where: { id: casoId },
      data: {
        remitoId: remito.id,
        estado: 'RESUELTO',
        revisadoAt: new Date(),
        revisadoPorId: usuarioId,
        revisadoPorNombre: usuarioNombre,
      },
    });

    return { caso: await this.findOne(casoId), remito };
  }

  // ── Subir documento ───────────────────────────────────────────────────────
  async uploadDocumento(casoId: number, file: Express.Multer.File, nombre: string, tipo?: string) {
    await this.findOne(casoId); // verifica que existe
    const filename = `casos/${casoId}/${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const url = await this.storage.upload(file.buffer, filename, file.mimetype);

    return this.prisma.documentoCaso.create({
      data: {
        casoId,
        nombre: nombre || file.originalname,
        archivo: file.originalname,
        url,
        tipo: tipo ?? null,
      },
    });
  }

  // ── Eliminar documento ────────────────────────────────────────────────────
  async deleteDocumento(casoId: number, docId: number) {
    const doc = await this.prisma.documentoCaso.findFirst({ where: { id: docId, casoId } });
    if (!doc) throw new NotFoundException('Documento no encontrado');
    await this.prisma.documentoCaso.delete({ where: { id: docId } });
    return { ok: true };
  }
}
