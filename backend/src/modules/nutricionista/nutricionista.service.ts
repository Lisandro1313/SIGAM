import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../shared/storage/storage.service';

@Injectable()
export class NutricionistaService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // RELEVAMIENTOS
  // ═══════════════════════════════════════════════════════════════════════════

  async crearRelevamiento(dto: any, nutricionistaId: number) {
    return this.prisma.relevamientoNutricional.create({
      data: {
        beneficiarioId: dto.beneficiarioId,
        nutricionistaId,
        fecha: dto.fecha ? new Date(dto.fecha) : new Date(),
        poblacionInfantil05: dto.poblacionInfantil05 ?? null,
        poblacionInfantil612: dto.poblacionInfantil612 ?? null,
        poblacionAdolescente: dto.poblacionAdolescente ?? null,
        poblacionAdulta: dto.poblacionAdulta ?? null,
        modalidad: dto.modalidad ?? null,
        tieneCocina: dto.tieneCocina ?? false,
        aguaPotable: dto.aguaPotable ?? false,
        tieneHeladera: dto.tieneHeladera ?? false,
        estadoGeneral: dto.estadoGeneral ?? null,
        necesidades: dto.necesidades ?? null,
        observaciones: dto.observaciones ?? null,
        fotos: dto.fotos ? JSON.stringify(dto.fotos) : null,
      },
      include: {
        beneficiario: { select: { id: true, nombre: true, direccion: true } },
        nutricionista: { select: { id: true, nombre: true } },
      },
    });
  }

  async actualizarRelevamiento(id: number, dto: any, nutricionistaId: number, rol: string) {
    const rel = await this.prisma.relevamientoNutricional.findUnique({ where: { id } });
    if (!rel) throw new NotFoundException('Relevamiento no encontrado');
    if (rol !== 'ADMIN' && rol !== 'OPERADOR_PROGRAMA' && rel.nutricionistaId !== nutricionistaId) {
      throw new ForbiddenException('Solo podés editar tus propios relevamientos');
    }

    const data: any = {};
    if (dto.poblacionInfantil05 !== undefined) data.poblacionInfantil05 = dto.poblacionInfantil05;
    if (dto.poblacionInfantil612 !== undefined) data.poblacionInfantil612 = dto.poblacionInfantil612;
    if (dto.poblacionAdolescente !== undefined) data.poblacionAdolescente = dto.poblacionAdolescente;
    if (dto.poblacionAdulta !== undefined) data.poblacionAdulta = dto.poblacionAdulta;
    if (dto.modalidad !== undefined) data.modalidad = dto.modalidad;
    if (dto.tieneCocina !== undefined) data.tieneCocina = dto.tieneCocina;
    if (dto.aguaPotable !== undefined) data.aguaPotable = dto.aguaPotable;
    if (dto.tieneHeladera !== undefined) data.tieneHeladera = dto.tieneHeladera;
    if (dto.estadoGeneral !== undefined) data.estadoGeneral = dto.estadoGeneral;
    if (dto.necesidades !== undefined) data.necesidades = dto.necesidades;
    if (dto.observaciones !== undefined) data.observaciones = dto.observaciones;
    if (dto.fotos !== undefined) data.fotos = JSON.stringify(dto.fotos);

    return this.prisma.relevamientoNutricional.update({
      where: { id },
      data,
      include: {
        beneficiario: { select: { id: true, nombre: true, direccion: true } },
        nutricionista: { select: { id: true, nombre: true } },
      },
    });
  }

  async obtenerRelevamiento(id: number) {
    const rel = await this.prisma.relevamientoNutricional.findUnique({
      where: { id },
      include: {
        beneficiario: { select: { id: true, nombre: true, direccion: true, localidad: true, telefono: true } },
        nutricionista: { select: { id: true, nombre: true } },
      },
    });
    if (!rel) throw new NotFoundException('Relevamiento no encontrado');
    return { ...rel, fotos: rel.fotos ? JSON.parse(rel.fotos) : [] };
  }

  async listarRelevamientos(filtros: any, nutricionistaId: number, rol: string) {
    const where: any = {};

    // Todos los nutricionistas ven todos los relevamientos; ADMIN y OPERADOR_PROGRAMA también

    if (filtros.beneficiarioId) where.beneficiarioId = +filtros.beneficiarioId;

    const page = Math.max(1, +(filtros.page || 1));
    const limit = Math.min(50, +(filtros.limit || 20));

    const [data, total] = await Promise.all([
      this.prisma.relevamientoNutricional.findMany({
        where,
        include: {
          beneficiario: { select: { id: true, nombre: true, direccion: true } },
          nutricionista: { select: { id: true, nombre: true } },
        },
        orderBy: { fecha: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.relevamientoNutricional.count({ where }),
    ]);

    return { data: data.map(r => ({ ...r, fotos: r.fotos ? JSON.parse(r.fotos) : [] })), total, page, limit };
  }

  async eliminarRelevamiento(id: number, nutricionistaId: number, rol: string) {
    const rel = await this.prisma.relevamientoNutricional.findUnique({ where: { id } });
    if (!rel) throw new NotFoundException('Relevamiento no encontrado');
    if (rol !== 'ADMIN' && rol !== 'OPERADOR_PROGRAMA' && rel.nutricionistaId !== nutricionistaId) {
      throw new ForbiddenException('Solo podés eliminar tus propios relevamientos');
    }
    await this.prisma.relevamientoNutricional.delete({ where: { id } });
    return { deleted: true };
  }

  // Por beneficiario (para la pestaña Nutrición)
  async relevamientosPorBeneficiario(beneficiarioId: number) {
    const data = await this.prisma.relevamientoNutricional.findMany({
      where: { beneficiarioId },
      include: { nutricionista: { select: { id: true, nombre: true } } },
      orderBy: { fecha: 'desc' },
    });
    return data.map(r => ({ ...r, fotos: r.fotos ? JSON.parse(r.fotos) : [] }));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PROGRAMAS DE TERRENO
  // ═══════════════════════════════════════════════════════════════════════════

  async crearProgramaTerreno(dto: any, nutricionistaId: number) {
    return this.prisma.programaTerreno.create({
      data: {
        tipo: dto.tipo,
        nombre: dto.nombre ?? null,
        descripcion: dto.descripcion ?? null,
        beneficiarioId: dto.beneficiarioId,
        nutricionistaId,
        fechaInicio: new Date(dto.fechaInicio),
        fechaFin: dto.fechaFin ? new Date(dto.fechaFin) : null,
        duracionSemanas: dto.duracionSemanas ?? null,
        estado: 'PLANIFICADO',
      },
      include: {
        beneficiario: { select: { id: true, nombre: true, direccion: true } },
        nutricionista: { select: { id: true, nombre: true } },
        actividades: true,
      },
    });
  }

  async actualizarProgramaTerreno(id: number, dto: any, nutricionistaId: number, rol: string) {
    const prog = await this.prisma.programaTerreno.findUnique({ where: { id } });
    if (!prog) throw new NotFoundException('Programa de terreno no encontrado');
    if (rol !== 'ADMIN' && rol !== 'OPERADOR_PROGRAMA' && prog.nutricionistaId !== nutricionistaId) {
      throw new ForbiddenException('Solo podés editar tus propios programas');
    }

    const data: any = {};
    if (dto.tipo !== undefined) data.tipo = dto.tipo;
    if (dto.nombre !== undefined) data.nombre = dto.nombre;
    if (dto.descripcion !== undefined) data.descripcion = dto.descripcion;
    if (dto.fechaInicio !== undefined) data.fechaInicio = new Date(dto.fechaInicio);
    if (dto.fechaFin !== undefined) data.fechaFin = dto.fechaFin ? new Date(dto.fechaFin) : null;
    if (dto.duracionSemanas !== undefined) data.duracionSemanas = dto.duracionSemanas;
    if (dto.estado !== undefined) data.estado = dto.estado;

    return this.prisma.programaTerreno.update({
      where: { id },
      data,
      include: {
        beneficiario: { select: { id: true, nombre: true, direccion: true } },
        nutricionista: { select: { id: true, nombre: true } },
        actividades: { orderBy: { fecha: 'desc' } },
      },
    });
  }

  async obtenerProgramaTerreno(id: number) {
    const prog = await this.prisma.programaTerreno.findUnique({
      where: { id },
      include: {
        beneficiario: { select: { id: true, nombre: true, direccion: true, localidad: true } },
        nutricionista: { select: { id: true, nombre: true } },
        actividades: { orderBy: { fecha: 'desc' } },
      },
    });
    if (!prog) throw new NotFoundException('Programa de terreno no encontrado');
    return {
      ...prog,
      actividades: prog.actividades.map(a => ({ ...a, fotos: a.fotos ? JSON.parse(a.fotos) : [] })),
    };
  }

  async listarProgramasTerreno(filtros: any, nutricionistaId: number, rol: string) {
    const where: any = {};
    // Todos los nutricionistas ven todos los programas
    if (filtros.beneficiarioId) where.beneficiarioId = +filtros.beneficiarioId;
    if (filtros.estado) where.estado = filtros.estado;
    if (filtros.tipo) where.tipo = filtros.tipo;

    const page = Math.max(1, +(filtros.page || 1));
    const limit = Math.min(50, +(filtros.limit || 20));

    const [data, total] = await Promise.all([
      this.prisma.programaTerreno.findMany({
        where,
        include: {
          beneficiario: { select: { id: true, nombre: true, direccion: true } },
          nutricionista: { select: { id: true, nombre: true } },
          _count: { select: { actividades: true } },
        },
        orderBy: { fechaInicio: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.programaTerreno.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async eliminarProgramaTerreno(id: number, nutricionistaId: number, rol: string) {
    const prog = await this.prisma.programaTerreno.findUnique({ where: { id } });
    if (!prog) throw new NotFoundException('Programa de terreno no encontrado');
    if (rol !== 'ADMIN' && rol !== 'OPERADOR_PROGRAMA' && prog.nutricionistaId !== nutricionistaId) {
      throw new ForbiddenException('Solo podés eliminar tus propios programas');
    }
    // Eliminar actividades asociadas primero, luego el programa
    await this.prisma.actividadTerreno.deleteMany({ where: { programaTerrenoId: id } });
    await this.prisma.programaTerreno.delete({ where: { id } });
    return { deleted: true };
  }

  // Por beneficiario (para la pestaña Nutrición)
  async programasTerrenoPorBeneficiario(beneficiarioId: number) {
    const data = await this.prisma.programaTerreno.findMany({
      where: { beneficiarioId },
      include: {
        nutricionista: { select: { id: true, nombre: true } },
        _count: { select: { actividades: true } },
        actividades: { orderBy: { fecha: 'desc' }, take: 3 },
      },
      orderBy: { fechaInicio: 'desc' },
    });
    return data.map(p => ({
      ...p,
      actividades: p.actividades.map(a => ({ ...a, fotos: a.fotos ? JSON.parse(a.fotos) : [] })),
    }));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIVIDADES DE TERRENO
  // ═══════════════════════════════════════════════════════════════════════════

  async crearActividad(programaTerrenoId: number, dto: any, nutricionistaId: number, rol: string) {
    const prog = await this.prisma.programaTerreno.findUnique({ where: { id: programaTerrenoId } });
    if (!prog) throw new NotFoundException('Programa de terreno no encontrado');
    if (rol !== 'ADMIN' && rol !== 'OPERADOR_PROGRAMA' && prog.nutricionistaId !== nutricionistaId) {
      throw new ForbiddenException('Solo podés agregar actividades a tus programas');
    }

    // Si el programa estaba PLANIFICADO, pasarlo a EN_CURSO
    if (prog.estado === 'PLANIFICADO') {
      await this.prisma.programaTerreno.update({
        where: { id: programaTerrenoId },
        data: { estado: 'EN_CURSO' },
      });
    }

    return this.prisma.actividadTerreno.create({
      data: {
        programaTerrenoId,
        fecha: dto.fecha ? new Date(dto.fecha) : new Date(),
        descripcion: dto.descripcion,
        asistentes: dto.asistentes ?? null,
        observaciones: dto.observaciones ?? null,
        fotos: dto.fotos ? JSON.stringify(dto.fotos) : null,
      },
    });
  }

  async actualizarActividad(id: number, dto: any, nutricionistaId: number, rol: string) {
    const act = await this.prisma.actividadTerreno.findUnique({
      where: { id },
      include: { programaTerreno: { select: { nutricionistaId: true } } },
    });
    if (!act) throw new NotFoundException('Actividad no encontrada');
    if (rol !== 'ADMIN' && rol !== 'OPERADOR_PROGRAMA' && act.programaTerreno.nutricionistaId !== nutricionistaId) {
      throw new ForbiddenException('Solo podés editar actividades de tus programas');
    }

    const data: any = {};
    if (dto.descripcion !== undefined) data.descripcion = dto.descripcion;
    if (dto.asistentes !== undefined) data.asistentes = dto.asistentes;
    if (dto.observaciones !== undefined) data.observaciones = dto.observaciones;
    if (dto.fotos !== undefined) data.fotos = JSON.stringify(dto.fotos);
    if (dto.fecha !== undefined) data.fecha = new Date(dto.fecha);

    return this.prisma.actividadTerreno.update({ where: { id }, data });
  }

  async eliminarActividad(id: number, nutricionistaId: number, rol: string) {
    const act = await this.prisma.actividadTerreno.findUnique({
      where: { id },
      include: { programaTerreno: { select: { nutricionistaId: true } } },
    });
    if (!act) throw new NotFoundException('Actividad no encontrada');
    if (rol !== 'ADMIN' && rol !== 'OPERADOR_PROGRAMA' && act.programaTerreno.nutricionistaId !== nutricionistaId) {
      throw new ForbiddenException('Solo podés eliminar actividades de tus programas');
    }
    return this.prisma.actividadTerreno.delete({ where: { id } });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UPLOAD FOTOS
  // ═══════════════════════════════════════════════════════════════════════════

  async subirFoto(file: Express.Multer.File): Promise<string> {
    const filename = `nutricion/${Date.now()}_${file.originalname}`;
    return this.storage.upload(file.buffer, filename, file.mimetype);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DASHBOARD / ESTADÍSTICAS
  // ═══════════════════════════════════════════════════════════════════════════

  async dashboard(nutricionistaId: number, rol: string) {
    // Todas las nutricionistas ven las estadísticas globales
    const where: any = {};

    const [relevamientos, programasActivos, programasTotal, actividadesMes] = await Promise.all([
      this.prisma.relevamientoNutricional.count({ where }),
      this.prisma.programaTerreno.count({ where: { ...where, estado: 'EN_CURSO' } }),
      this.prisma.programaTerreno.count({ where }),
      this.prisma.actividadTerreno.count({
        where: {
          programaTerreno: where,
          fecha: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
      }),
    ]);

    // Últimos 5 relevamientos
    const ultimosRelevamientos = await this.prisma.relevamientoNutricional.findMany({
      where,
      include: { beneficiario: { select: { id: true, nombre: true } } },
      orderBy: { fecha: 'desc' },
      take: 5,
    });

    // Próximas actividades
    const proximasActividades = await this.prisma.actividadTerreno.findMany({
      where: {
        programaTerreno: { ...where, estado: 'EN_CURSO' },
      },
      include: {
        programaTerreno: {
          select: { nombre: true, tipo: true, beneficiario: { select: { nombre: true } } },
        },
      },
      orderBy: { fecha: 'desc' },
      take: 5,
    });

    return {
      relevamientos,
      programasActivos,
      programasTotal,
      actividadesMes,
      ultimosRelevamientos,
      proximasActividades,
    };
  }
}
