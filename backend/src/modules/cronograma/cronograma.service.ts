import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { RemitosService } from '../remitos/remitos.service';
import { PdfService } from '../remitos/services/pdf.service';
import { EmailService } from '../remitos/services/email.service';
import { EntregaEstado } from '@prisma/client';
import { getSecretariaForWrite } from '../../shared/auth/secretaria.util';

@Injectable()
export class CronogramaService {
  constructor(
    private prisma: PrismaService,
    private remitosService: RemitosService,
    private pdfService: PdfService,
    private emailService: EmailService,
  ) {}

  // Generar cronograma automático distribuido en días hábiles
  async generarCronogramaMensual(mes: number, anio: number, kgPorDia?: number) {
    const fecha = new Date(anio, mes - 1, 1);
    const inicioMes = startOfMonth(fecha);
    const finMes = endOfMonth(fecha);

    const beneficiarios = await this.prisma.beneficiario.findMany({
      where: { activo: true, frecuenciaEntrega: { in: ['MENSUAL', 'BIMESTRAL'] } },
      include: { programa: true },
    });

    const beneIds = beneficiarios.map((b) => b.id);
    const mesAnt = addMonths(fecha, -1);
    const [entregasMesActual, entregasMesAnterior] = await Promise.all([
      this.prisma.entregaProgramada.findMany({
        where: { beneficiarioId: { in: beneIds }, fechaProgramada: { gte: inicioMes, lte: finMes } },
        select: { beneficiarioId: true },
      }),
      this.prisma.entregaProgramada.findMany({
        where: { beneficiarioId: { in: beneIds }, fechaProgramada: { gte: startOfMonth(mesAnt), lte: endOfMonth(mesAnt) } },
        select: { beneficiarioId: true },
      }),
    ]);
    const conEntregaActual = new Set(entregasMesActual.map((e) => e.beneficiarioId));
    const conEntregaAnterior = new Set(entregasMesAnterior.map((e) => e.beneficiarioId));

    const aCrear: any[] = [];
    for (const b of beneficiarios) {
      if (conEntregaActual.has(b.id)) continue;
      if (b.frecuenciaEntrega === 'BIMESTRAL' && conEntregaAnterior.has(b.id)) continue;
      aCrear.push(b);
    }

    if (aCrear.length === 0) return { success: true, entregasCreadas: 0, entregas: [] };

    // Obtener días hábiles (lun-sáb) del mes
    const diasHabiles: Date[] = [];
    const cursor = new Date(inicioMes);
    while (cursor <= finMes) {
      if (cursor.getDay() !== 0) diasHabiles.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    // Distribuir con límite de kg por día
    const kgLimite = kgPorDia ?? 999999;
    const kgPorFecha: Record<string, number> = {};
    const entregasCreadas = [];

    for (const b of aCrear) {
      let fechaAsignada: Date = diasHabiles[0];
      for (const dia of diasHabiles) {
        const key = dia.toISOString().slice(0, 10);
        if ((kgPorFecha[key] ?? 0) + (b.kilosHabitual ?? 0) <= kgLimite) {
          fechaAsignada = dia;
          kgPorFecha[key] = (kgPorFecha[key] ?? 0) + (b.kilosHabitual ?? 0);
          break;
        }
      }
      // Si no cabe en ningún día, asignar al día con menos kg
      if (!kgPorFecha[fechaAsignada.toISOString().slice(0, 10)]) {
        fechaAsignada = diasHabiles.reduce((min, d) =>
          (kgPorFecha[d.toISOString().slice(0, 10)] ?? 0) < (kgPorFecha[min.toISOString().slice(0, 10)] ?? 0) ? d : min
        );
        const key = fechaAsignada.toISOString().slice(0, 10);
        kgPorFecha[key] = (kgPorFecha[key] ?? 0) + (b.kilosHabitual ?? 0);
      }

      const entrega = await this.prisma.entregaProgramada.create({
        data: {
          beneficiarioId: b.id,
          programaId: b.programaId,
          fechaProgramada: fechaAsignada,
          kilos: b.kilosHabitual ?? undefined,
          estado: EntregaEstado.PENDIENTE,
        },
        include: { beneficiario: true, programa: true },
      });
      entregasCreadas.push(entrega);
    }

    return { success: true, entregasCreadas: entregasCreadas.length, entregas: entregasCreadas };
  }

  // Preview y generación masiva de remitos para un rango de fechas (ej: semana actual)
  async previewRemitosRango(desde: string, hasta: string, secretaria?: string | null) {
    const desdeDate = new Date(desde); desdeDate.setHours(0, 0, 0, 0);
    const hastaDate = new Date(hasta); hastaDate.setHours(23, 59, 59, 999);
    const filtroSec = secretaria ? { programa: { secretaria } } : {};

    const [sinRemito, conRemito] = await Promise.all([
      this.prisma.entregaProgramada.count({
        where: { fechaProgramada: { gte: desdeDate, lte: hastaDate }, estado: { notIn: ['CANCELADA'] }, remitoId: null, ...filtroSec },
      }),
      this.prisma.entregaProgramada.count({
        where: { fechaProgramada: { gte: desdeDate, lte: hastaDate }, remitoId: { not: null }, ...filtroSec },
      }),
    ]);
    return { pendientes: sinRemito, yaGenerados: conRemito };
  }

  async generarRemitosRango(desde: string, hasta: string, depositoId: number, usuarioId: number, usuarioRol?: string) {
    const desdeDate = new Date(desde); desdeDate.setHours(0, 0, 0, 0);
    const hastaDate = new Date(hasta); hastaDate.setHours(23, 59, 59, 999);
    const secretaria = getSecretariaForWrite(usuarioRol);
    const filtroSec = { programa: { secretaria } };

    const entregas = await this.prisma.entregaProgramada.findMany({
      where: { fechaProgramada: { gte: desdeDate, lte: hastaDate }, estado: { notIn: ['CANCELADA'] }, remitoId: null, beneficiario: { activo: true }, ...filtroSec },
      include: {
        beneficiario: true,
        programa: {
          include: {
            plantillas: {
              where: { activo: true },
              include: { items: { include: { articulo: true } } },
              take: 1,
            },
          },
        },
      },
    });

    if (entregas.length === 0) {
      return { remitosGenerados: 0, errores: 0, detalleErrores: [] };
    }

    const generados = [];
    const errores: any[] = [];

    for (const entrega of entregas) {
      try {
        const plantilla = entrega.programa?.plantillas?.[0];
        const items = plantilla?.items ?? [];
        const remito = await this.remitosService.create(
          {
            programaId: entrega.programaId ?? undefined,
            beneficiarioId: entrega.beneficiarioId,
            depositoId,
            observaciones: entrega.observaciones,
            items: items.map((item) => ({
              articuloId: item.articuloId,
              cantidad: item.cantidadBase,
              pesoKg: item.articulo.pesoUnitarioKg ? item.cantidadBase * item.articulo.pesoUnitarioKg : undefined,
            })),
          },
          { id: usuarioId, rol: usuarioRol },
        );
        await this.prisma.entregaProgramada.update({
          where: { id: entrega.id },
          data: { estado: EntregaEstado.GENERADA, remitoId: remito.id },
        });
        generados.push({ id: entrega.id, numero: remito.numero });
      } catch (error) {
        errores.push({ beneficiario: entrega.beneficiario.nombre, error: error.message });
      }
    }

    return { remitosGenerados: generados.length, errores: errores.length, detalleErrores: errores };
  }

  // Obtener entregas programadas
  async obtenerEntregas(filtros?: any, secretaria?: string | null) {
    const where: any = {};

    if (filtros?.estado) where.estado = filtros.estado;
    if (filtros?.programaId) where.programaId = parseInt(filtros.programaId);
    if (filtros?.mes && filtros?.anio) {
      const fecha = new Date(filtros.anio, filtros.mes - 1, 15);
      where.fechaProgramada = {
        gte: startOfMonth(fecha),
        lte: endOfMonth(fecha),
      };
    }
    if (secretaria) where.secretaria = secretaria;

    return await this.prisma.entregaProgramada.findMany({
      where,
      include: {
        beneficiario: true,
        programa: true,
        remito: true,
      },
      orderBy: {
        fechaProgramada: 'asc',
      },
    });
  }

  // Generar remitos masivamente a partir del cronograma
  async generarRemitosMasivos(mes: number, anio: number, depositoId: number, usuarioId: number, usuarioRol?: string) {
    const fecha = new Date(anio, mes - 1, 15);
    const inicioMes = startOfMonth(fecha);
    const finMes = endOfMonth(fecha);

    // Obtener entregas pendientes
    const entregas = await this.prisma.entregaProgramada.findMany({
      where: {
        fechaProgramada: {
          gte: inicioMes,
          lte: finMes,
        },
        estado: EntregaEstado.PENDIENTE,
      },
      include: {
        beneficiario: true,
        programa: {
          include: {
            plantillas: {
              where: { activo: true },
              include: {
                items: {
                  include: {
                    articulo: true,
                  },
                },
              },
              take: 1,
            },
          },
        },
      },
    });

    if (entregas.length === 0) {
      throw new BadRequestException('No hay entregas pendientes para el mes seleccionado');
    }

    const remitosGenerados = [];
    const errores = [];

    for (const entrega of entregas) {
      try {
        // Obtener plantilla del programa
        const plantilla = entrega.programa.plantillas[0];

        if (!plantilla || !plantilla.items || plantilla.items.length === 0) {
          errores.push({
            beneficiario: entrega.beneficiario.nombre,
            error: 'No hay plantilla definida para este programa',
          });
          continue;
        }

        // Crear remito a partir de la plantilla
        const remito = await this.remitosService.create(
          {
            programaId: entrega.programaId,
            beneficiarioId: entrega.beneficiarioId,
            depositoId: depositoId,
            items: plantilla.items.map((item) => ({
              articuloId: item.articuloId,
              cantidad: item.cantidadBase,
              pesoKg: item.articulo.pesoUnitarioKg
                ? item.cantidadBase * item.articulo.pesoUnitarioKg
                : undefined,
            })),
          },
          { id: usuarioId, rol: usuarioRol },
        );

        // Actualizar entrega programada
        await this.prisma.entregaProgramada.update({
          where: { id: entrega.id },
          data: {
            estado: EntregaEstado.GENERADA,
            remitoId: remito.id,
          },
        });

        remitosGenerados.push(remito);
      } catch (error) {
        errores.push({
          beneficiario: entrega.beneficiario.nombre,
          error: error.message,
        });
      }
    }

    return {
      success: true,
      remitosGenerados: remitosGenerados.length,
      errores: errores.length,
      detalleErrores: errores,
      remitos: remitosGenerados,
    };
  }

  // Resumen de lo que generaría el mes (preview antes de confirmar)
  async resumenGeneracion(mes: number, anio: number) {
    const fecha = new Date(anio, mes - 1, 1);
    const inicioMes = startOfMonth(fecha);
    const finMes = endOfMonth(fecha);

    const beneficiarios = await this.prisma.beneficiario.findMany({
      where: { activo: true, frecuenciaEntrega: { in: ['MENSUAL', 'BIMESTRAL'] } },
      include: { programa: true },
    });

    const beneIds = beneficiarios.map((b) => b.id);
    const mesAnt = addMonths(fecha, -1);
    const [entregasMesActual, entregasMesAnterior] = await Promise.all([
      this.prisma.entregaProgramada.findMany({
        where: { beneficiarioId: { in: beneIds }, fechaProgramada: { gte: inicioMes, lte: finMes } },
        select: { beneficiarioId: true },
      }),
      this.prisma.entregaProgramada.findMany({
        where: { beneficiarioId: { in: beneIds }, fechaProgramada: { gte: startOfMonth(mesAnt), lte: endOfMonth(mesAnt) } },
        select: { beneficiarioId: true },
      }),
    ]);
    const conEntregaActual = new Set(entregasMesActual.map((e) => e.beneficiarioId));
    const conEntregaAnterior = new Set(entregasMesAnterior.map((e) => e.beneficiarioId));

    const pendientes: any[] = [];
    const yaExisten: any[] = [];

    for (const b of beneficiarios) {
      if (conEntregaActual.has(b.id)) { yaExisten.push(b); continue; }
      if (b.frecuenciaEntrega === 'BIMESTRAL' && conEntregaAnterior.has(b.id)) continue;
      pendientes.push(b);
    }

    const totalKg = pendientes.reduce((s: number, b: any) => s + (b.kilosHabitual ?? 0), 0);
    return { pendientes: pendientes.length, yaExisten: yaExisten.length, totalKg };
  }

  // ── Generacion por programa especifico (REMUCOM u otro) ──────────────────
  // Logica distinta al mensual general:
  //  - distribuye solo L-V (sin sabados)
  //  - decide por ultima entrega + frecuencia (MENSUAL ~30d, BIMESTRAL ~60d)
  //  - se matchea el programa por nombre (case-insensitive), default "REMUCOM"
  private async preparaGeneracionPrograma(mes: number, anio: number, programaNombre: string) {
    const programa = await this.prisma.programa.findFirst({
      where: { nombre: { contains: programaNombre, mode: 'insensitive' }, activo: true },
    });
    if (!programa) {
      throw new BadRequestException(`No se encontro programa que coincida con "${programaNombre}"`);
    }

    const fecha = new Date(anio, mes - 1, 1);
    const inicioMes = startOfMonth(fecha);
    const finMes = endOfMonth(fecha);

    const beneficiarios = await this.prisma.beneficiario.findMany({
      where: {
        activo: true,
        programaId: programa.id,
        frecuenciaEntrega: { in: ['MENSUAL', 'BIMESTRAL'] },
      },
    });

    const pendientes: typeof beneficiarios = [];
    const yaExisten: typeof beneficiarios = [];
    const noCorresponde: typeof beneficiarios = [];

    const beneIds = beneficiarios.map((b) => b.id);
    const [entregasMes, entregasPrevias] = await Promise.all([
      this.prisma.entregaProgramada.findMany({
        where: { beneficiarioId: { in: beneIds }, fechaProgramada: { gte: inicioMes, lte: finMes } },
        select: { beneficiarioId: true },
      }),
      this.prisma.entregaProgramada.findMany({
        where: { beneficiarioId: { in: beneIds }, estado: { in: ['ENTREGADA', 'GENERADA'] } },
        select: { beneficiarioId: true, fechaProgramada: true },
        orderBy: { fechaProgramada: 'desc' },
      }),
    ]);
    const conEntregaMes = new Set(entregasMes.map((e) => e.beneficiarioId));
    const ultimaPorBene = new Map<number, Date>();
    for (const e of entregasPrevias) {
      if (!ultimaPorBene.has(e.beneficiarioId)) {
        ultimaPorBene.set(e.beneficiarioId, e.fechaProgramada);
      }
    }

    for (const b of beneficiarios) {
      if (conEntregaMes.has(b.id)) { yaExisten.push(b); continue; }

      const ultima = ultimaPorBene.get(b.id);
      if (!ultima) { pendientes.push(b); continue; }

      const diasDesdeUltima = Math.floor((inicioMes.getTime() - ultima.getTime()) / 86400000);
      // Umbral con margen anti-drift (ej: si la anterior fue el dia 28, la proxima sigue siendo mensual)
      const umbral = b.frecuenciaEntrega === 'BIMESTRAL' ? 45 : 20;
      if (diasDesdeUltima >= umbral) pendientes.push(b);
      else noCorresponde.push(b);
    }

    return { programa, pendientes, yaExisten, noCorresponde, inicioMes, finMes };
  }

  async resumenGeneracionPrograma(mes: number, anio: number, programaNombre = 'REMUCOM') {
    const { programa, pendientes, yaExisten, noCorresponde } =
      await this.preparaGeneracionPrograma(mes, anio, programaNombre);
    const totalKg = pendientes.reduce((s, b) => s + (b.kilosHabitual ?? 0), 0);
    return {
      pendientes: pendientes.length,
      yaExisten: yaExisten.length,
      noCorresponde: noCorresponde.length,
      totalKg,
      programaId: programa.id,
      programaNombre: programa.nombre,
    };
  }

  async generarCronogramaPrograma(mes: number, anio: number, programaNombre = 'REMUCOM', kgPorDia?: number) {
    const { programa, pendientes, inicioMes, finMes } =
      await this.preparaGeneracionPrograma(mes, anio, programaNombre);

    if (pendientes.length === 0) return { success: true, entregasCreadas: 0, entregas: [], programaNombre: programa.nombre };

    // Dias habiles L-V (sin sabado ni domingo)
    const diasHabiles: Date[] = [];
    const cursor = new Date(inicioMes);
    while (cursor <= finMes) {
      const dow = cursor.getDay();
      if (dow !== 0 && dow !== 6) diasHabiles.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    const kgLimite = kgPorDia ?? 999999;
    const kgPorFecha: Record<string, number> = {};
    const entregasCreadas: any[] = [];

    for (const b of pendientes) {
      let fechaAsignada: Date = diasHabiles[0];
      let asignada = false;
      for (const dia of diasHabiles) {
        const key = dia.toISOString().slice(0, 10);
        if ((kgPorFecha[key] ?? 0) + (b.kilosHabitual ?? 0) <= kgLimite) {
          fechaAsignada = dia;
          kgPorFecha[key] = (kgPorFecha[key] ?? 0) + (b.kilosHabitual ?? 0);
          asignada = true;
          break;
        }
      }
      if (!asignada) {
        // Fallback: dia con menos kg acumulados
        fechaAsignada = diasHabiles.reduce(
          (min, d) => (kgPorFecha[d.toISOString().slice(0, 10)] ?? 0) < (kgPorFecha[min.toISOString().slice(0, 10)] ?? 0) ? d : min,
          diasHabiles[0],
        );
        const key = fechaAsignada.toISOString().slice(0, 10);
        kgPorFecha[key] = (kgPorFecha[key] ?? 0) + (b.kilosHabitual ?? 0);
      }

      const entrega = await this.prisma.entregaProgramada.create({
        data: {
          beneficiarioId: b.id,
          programaId: b.programaId,
          fechaProgramada: fechaAsignada,
          kilos: b.kilosHabitual ?? undefined,
          estado: EntregaEstado.PENDIENTE,
        },
        include: { beneficiario: true, programa: true },
      });
      entregasCreadas.push(entrega);
    }

    return {
      success: true,
      entregasCreadas: entregasCreadas.length,
      entregas: entregasCreadas,
      programaNombre: programa.nombre,
    };
  }

  // Últimas entregas por beneficiario (referencia en planilla)
  async getUltimasEntregas(): Promise<Record<number, { fecha: string; estado: string }>> {
    const entregas = await this.prisma.entregaProgramada.findMany({
      where: { estado: { in: ['ENTREGADA', 'GENERADA'] } },
      select: { beneficiarioId: true, fechaProgramada: true, estado: true },
      orderBy: { fechaProgramada: 'desc' },
    });
    const mapa: Record<number, { fecha: string; estado: string }> = {};
    for (const e of entregas) {
      if (!mapa[e.beneficiarioId]) {
        mapa[e.beneficiarioId] = {
          fecha: e.fechaProgramada.toISOString().slice(0, 10),
          estado: e.estado,
        };
      }
    }
    return mapa;
  }

  // Actualizar fecha de entrega
  async actualizarFecha(id: number, nuevaFecha: Date) {
    return await this.prisma.entregaProgramada.update({
      where: { id },
      data: { fechaProgramada: nuevaFecha },
      include: {
        beneficiario: true,
        programa: true,
      },
    });
  }

  // Cancelar entrega
  async cancelarEntrega(id: number) {
    return await this.prisma.entregaProgramada.update({
      where: { id },
      data: { estado: EntregaEstado.CANCELADA },
    });
  }

  // ============================================================================
  // PLANILLA MANUAL (nuevo cronograma tipo hoja de cálculo)
  // ============================================================================

  // Obtener planilla para un rango de fechas
  async obtenerPlanilla(desde: string, hasta: string, programaId?: number, secretaria?: string | null) {
    const desdeDate = new Date(desde);
    desdeDate.setHours(0, 0, 0, 0);
    const hastaDate = new Date(hasta);
    hastaDate.setHours(23, 59, 59, 999);

    const where: any = {
      fechaProgramada: { gte: desdeDate, lte: hastaDate },
      estado: { not: EntregaEstado.CANCELADA },
      beneficiario: { activo: true },
    };
    if (programaId) where.programaId = programaId;
    if (secretaria) where.secretaria = secretaria;

    const entregas = await this.prisma.entregaProgramada.findMany({
      where,
      include: {
        beneficiario: {
          include: { programa: true },
        },
        programa: true,
        remito: { select: { id: true, numero: true, estado: true, depositoId: true } },
      },
      orderBy: [{ fechaProgramada: 'asc' }, { id: 'asc' }],
    });

    return entregas;
  }

  // Agregar fila a la planilla manualmente
  async agregarFila(data: {
    beneficiarioId: number;
    fechaProgramada: string;
    programaId?: number;
    hora?: string;
    responsableRetiro?: string;
    kilos?: number;
    observaciones?: string;
    depositoId?: number;
  }) {
    const beneficiario = await this.prisma.beneficiario.findUnique({
      where: { id: data.beneficiarioId },
    });
    if (!beneficiario) throw new BadRequestException('Beneficiario no encontrado');

    const programaIdFinal = data.programaId ?? beneficiario.programaId ?? undefined;

    return await this.prisma.entregaProgramada.create({
      data: {
        beneficiarioId: data.beneficiarioId,
        programaId: programaIdFinal,
        fechaProgramada: new Date(data.fechaProgramada),
        hora: data.hora,
        responsableRetiro: data.responsableRetiro,
        kilos: data.kilos,
        observaciones: data.observaciones,
        depositoId: data.depositoId,
        estado: EntregaEstado.PENDIENTE,
      },
      include: {
        beneficiario: {
          include: { programa: true },
        },
        programa: true,
        remito: { select: { id: true, numero: true, estado: true, depositoId: true } },
      },
    });
  }

  // Actualizar fila de la planilla
  async actualizarFila(
    id: number,
    data: {
      hora?: string;
      responsableRetiro?: string;
      kilos?: number;
      observaciones?: string;
      fechaProgramada?: string;
      depositoId?: number;
    },
  ) {
    return await this.prisma.entregaProgramada.update({
      where: { id },
      data: {
        hora: data.hora,
        responsableRetiro: data.responsableRetiro,
        kilos: data.kilos !== undefined ? data.kilos : undefined,
        observaciones: data.observaciones,
        fechaProgramada: data.fechaProgramada ? new Date(data.fechaProgramada) : undefined,
        depositoId: data.depositoId !== undefined ? data.depositoId : undefined,
      },
      include: {
        beneficiario: {
          include: { programa: true },
        },
        programa: true,
        remito: { select: { id: true, numero: true, estado: true, depositoId: true } },
      },
    });
  }

  // Eliminar fila de la planilla
  async eliminarFila(id: number) {
    const entrega = await this.prisma.entregaProgramada.findUnique({ where: { id } });
    if (!entrega) throw new BadRequestException('Entrega no encontrada');
    if (entrega.remitoId) throw new BadRequestException('No se puede eliminar una fila con remito generado');

    return await this.prisma.entregaProgramada.delete({ where: { id } });
  }

  // ============================================================
  // EXPORTAR CRONOGRAMA PDF
  // ============================================================

  async exportarPlanillaPdf(
    desde: string,
    hasta: string,
    depositoId?: number,
    programaId?: number,
    secretaria?: string | null,
  ): Promise<{ buffer: Buffer; deposito?: any; programa?: any }> {
    const desdeDate = new Date(desde); desdeDate.setHours(0, 0, 0, 0);
    const hastaDate = new Date(hasta); hastaDate.setHours(23, 59, 59, 999);

    const where: any = {
      fechaProgramada: { gte: desdeDate, lte: hastaDate },
      estado: { not: EntregaEstado.CANCELADA },
      beneficiario: { activo: true },
    };
    if (programaId) where.programaId = programaId;
    if (depositoId) where.remito = { depositoId };
    if (secretaria) where.secretaria = secretaria;

    const entregas = await this.prisma.entregaProgramada.findMany({
      where,
      include: {
        beneficiario: { include: { programa: true } },
        programa: true,
        remito: {
          select: { id: true, numero: true, estado: true, depositoId: true,
            deposito: { select: { codigo: true, nombre: true } } },
        },
      },
      orderBy: [{ fechaProgramada: 'asc' }, { id: 'asc' }],
    });

    // Enriquecer filas con depositoCodigo del remito
    const filas = entregas.map(e => ({
      ...e,
      fechaProgramada: e.fechaProgramada.toISOString(),
      remito: e.remito ? {
        ...e.remito,
        depositoCodigo: e.remito.deposito?.codigo ?? null,
      } : null,
    }));

    // Resolver nombre depósito/programa para el header del PDF
    let depositoNombre: string | undefined;
    let programaNombre: string | undefined;
    if (depositoId) {
      const dep = await this.prisma.deposito.findUnique({ where: { id: depositoId } });
      depositoNombre = dep ? `${dep.nombre} (${dep.codigo})` : undefined;
    }
    if (programaId) {
      const prog = await this.prisma.programa.findUnique({ where: { id: programaId } });
      programaNombre = prog?.nombre;
    }

    const buffer = await this.pdfService.generarCronogramaPdf(filas, {
      desde,
      hasta,
      deposito: depositoNombre,
      programa: programaNombre,
    });

    return { buffer, deposito: depositoNombre, programa: programaNombre };
  }

  async enviarEmailCronograma(
    desde: string,
    hasta: string,
    depositoId?: number,
    programaId?: number,
    destinatarios?: string[],
    secretaria?: string | null,
  ): Promise<void> {
    const { buffer, deposito } = await this.exportarPlanillaPdf(desde, hasta, depositoId, programaId, secretaria);

    const asunto = `CRONOGRAMA ${desde}${desde !== hasta ? ' al ' + hasta : ''}${deposito ? ' — ' + deposito : ''}`;

    // Usar destinatarios explícitos o los del env según depósito
    let destinos: string[] = destinatarios ?? [];
    if (!destinos.length && depositoId) {
      const dep = await this.prisma.deposito.findUnique({ where: { id: depositoId } });
      if (dep) {
        const envKey = `DEPOSITO_EMAIL_${dep.codigo.toUpperCase().replace(/\s/g, '_')}`;
        const envEmail = process.env[envKey];
        if (envEmail) destinos = [envEmail];
      }
    }
    if (!destinos.length) {
      const fallback = [process.env.DEPOSITO_EMAIL_LOGISTICA, process.env.DEPOSITO_EMAIL_CITA].filter(Boolean) as string[];
      destinos = fallback.length ? fallback : ['deposito@municipalidad.gob.ar'];
    }

    // Reusar enviarRemito con un objeto mínimo adaptado
    await this.emailService.enviarCronograma(buffer, asunto, destinos, desde, hasta);
  }

  // Marcar/desmarcar aviso WhatsApp
  async toggleAvisadoWsp(id: number, avisadoWsp: boolean) {
    return this.prisma.entregaProgramada.update({
      where: { id },
      data: { avisadoWsp },
      include: {
        beneficiario: { include: { programa: true } },
        programa: true,
        remito: { select: { id: true, numero: true, estado: true, depositoId: true } },
      },
    });
  }

  // Generar remito desde una fila de la planilla
  async generarRemitoDesFila(id: number, depositoId: number, usuarioId: number, usuarioRol?: string) {
    const entrega = await this.prisma.entregaProgramada.findUnique({
      where: { id },
      include: {
        beneficiario: true,
        programa: {
          include: {
            plantillas: {
              where: { activo: true },
              include: {
                items: { include: { articulo: true } },
              },
              take: 1,
            },
          },
        },
      },
    });

    if (!entrega) throw new BadRequestException('Entrega no encontrada');
    if (entrega.remitoId) throw new BadRequestException('Esta entrega ya tiene un remito generado');

    const plantilla = entrega.programa?.plantillas?.[0];
    const items = plantilla?.items ?? [];

    const remito = await this.remitosService.create(
      {
        programaId: entrega.programaId ?? undefined,
        beneficiarioId: entrega.beneficiarioId,
        depositoId,
        observaciones: entrega.observaciones,
        items: items.map((item) => ({
          articuloId: item.articuloId,
          cantidad: item.cantidadBase,
          pesoKg: item.articulo.pesoUnitarioKg
            ? item.cantidadBase * item.articulo.pesoUnitarioKg
            : undefined,
        })),
      },
      { id: usuarioId, rol: usuarioRol },
    );

    await this.prisma.entregaProgramada.update({
      where: { id },
      data: { estado: EntregaEstado.GENERADA, remitoId: remito.id },
    });

    return remito;
  }

  // ── Bloc de notas ────────────────────────────────────────────────────────
  async getNotaBorrador(clave: string) {
    const nota = await this.prisma.notaBorrador.findUnique({ where: { clave } });
    return { contenido: nota?.contenido ?? '' };
  }

  async saveNotaBorrador(clave: string, contenido: string) {
    const nota = await this.prisma.notaBorrador.upsert({
      where: { clave },
      update: { contenido },
      create: { clave, contenido },
    });
    return { contenido: nota.contenido };
  }
}
