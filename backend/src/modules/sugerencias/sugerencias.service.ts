import { Injectable } from '@nestjs/common';
import { RemitoEstado } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { startOfMonth, endOfMonth, subMonths, subDays } from 'date-fns';

export type Nivel = 'alta' | 'media' | 'baja';
export type Categoria = 'Logística' | 'Cobertura' | 'Stock' | 'Anomalía' | 'Operativo' | 'Estacional' | 'Calidad de datos';

export interface Sugerencia {
  id: string;
  titulo: string;
  nivel: Nivel;
  categoria: Categoria;
  descripcion: string;
  detalle?: string;
  datos?: any;
  accion?: { label: string; link: string };
  icono: string;
}

const ESTADOS_VALIDOS: RemitoEstado[] = [RemitoEstado.CONFIRMADO, RemitoEstado.ENVIADO, RemitoEstado.ENTREGADO];

@Injectable()
export class SugerenciasService {
  constructor(private prisma: PrismaService) {}

  async generar(secretaria: string | null): Promise<{ generadoEn: string; total: number; sugerencias: Sugerencia[] }> {
    const reglas = [
      this.reglaTendenciaBajista(secretaria),
      this.reglaEstacionalidadInvierno(secretaria),
      this.reglaCoberturaPorLocalidad(secretaria),
      this.reglaStockPorAgotarse(),
      this.reglaStockMuerto(),
      this.reglaArticulosPorVencer(),
      this.reglaBeneficiariosVencidos(secretaria),
      this.reglaCasosUrgentesPendientes(),
      this.reglaCrucesDniDuplicados(secretaria),
      this.reglaConcentracionPareto(secretaria),
      this.reglaCalidadDatos(secretaria),
      this.reglaRemitosBorrador(secretaria),
    ];

    const resultados = await Promise.allSettled(reglas);
    const sugerencias: Sugerencia[] = [];
    for (const r of resultados) {
      if (r.status === 'fulfilled' && r.value) {
        if (Array.isArray(r.value)) sugerencias.push(...r.value);
        else sugerencias.push(r.value);
      }
    }

    const orden: Record<Nivel, number> = { alta: 0, media: 1, baja: 2 };
    sugerencias.sort((a, b) => orden[a.nivel] - orden[b.nivel]);

    return {
      generadoEn: new Date().toISOString(),
      total: sugerencias.length,
      sugerencias,
    };
  }

  // ──────────────────────────────────────────────────────────────────────
  // 1) Tendencia bajista mensual: kg del mes < 80% del promedio últimos 3
  // ──────────────────────────────────────────────────────────────────────
  private async reglaTendenciaBajista(secretaria: string | null): Promise<Sugerencia | null> {
    const hoy = new Date();
    const mesActualInicio = startOfMonth(hoy);
    const mesActualFin = endOfMonth(hoy);
    const tresMesesAtrasInicio = startOfMonth(subMonths(hoy, 3));
    const mesAnteriorFin = endOfMonth(subMonths(hoy, 1));

    const where = (gte: Date, lte: Date): any => {
      const w: any = { fecha: { gte, lte }, estado: { in: ESTADOS_VALIDOS } };
      if (secretaria) w.secretaria = secretaria;
      return w;
    };

    const [actual, prev] = await Promise.all([
      this.prisma.remito.aggregate({ where: where(mesActualInicio, mesActualFin), _sum: { totalKg: true }, _count: { _all: true } }),
      this.prisma.remito.findMany({ where: where(tresMesesAtrasInicio, mesAnteriorFin), select: { fecha: true, totalKg: true } }),
    ]);

    const kgActual = actual._sum.totalKg || 0;
    const remitosActual = actual._count._all || 0;

    const grupos: Record<string, number> = {};
    for (const r of prev) {
      const d = new Date(r.fecha);
      const k = `${d.getFullYear()}-${d.getMonth()}`;
      grupos[k] = (grupos[k] || 0) + (r.totalKg || 0);
    }
    const meses = Object.values(grupos);
    if (meses.length < 2) return null;
    const promedio = meses.reduce((s, v) => s + v, 0) / meses.length;
    if (promedio <= 0) return null;
    const ratio = kgActual / promedio;
    if (ratio >= 0.8) return null;

    const caida = Math.round((1 - ratio) * 100);
    return {
      id: 'tendencia-bajista',
      titulo: `Caída del ${caida}% en kg distribuidos este mes`,
      nivel: caida >= 40 ? 'alta' : 'media',
      categoria: 'Anomalía',
      descripcion: `Este mes lleva ${kgActual.toFixed(0)} kg en ${remitosActual} remitos, contra un promedio de ${promedio.toFixed(0)} kg/mes en el trimestre anterior.`,
      detalle: 'Revisar si hubo demoras en ingresos, cambios de cronograma o problemas de stock que estén frenando la operación.',
      datos: { kgActual, promedio, ratio, remitosActual },
      accion: { label: 'Ver reportes', link: '/reportes' },
      icono: 'trending_down',
    };
  }

  // ──────────────────────────────────────────────────────────────────────
  // 2) Estacionalidad: en invierno (mayo-agosto) priorizar calóricos
  // ──────────────────────────────────────────────────────────────────────
  private async reglaEstacionalidadInvierno(secretaria: string | null): Promise<Sugerencia | null> {
    const hoy = new Date();
    const mesActual = hoy.getMonth() + 1;
    if (mesActual < 5 || mesActual > 8) return null;

    const inicio = startOfMonth(subMonths(hoy, 2));
    const fin = endOfMonth(hoy);
    const where: any = { fecha: { gte: inicio, lte: fin }, estado: { in: ESTADOS_VALIDOS } };
    if (secretaria) where.secretaria = secretaria;

    const items = await this.prisma.remitoItem.findMany({
      where: { remito: where },
      select: { cantidad: true, articulo: { select: { nombre: true } } },
    });
    if (items.length === 0) return null;

    const acumulado: Record<string, number> = {};
    for (const it of items) {
      const n = (it.articulo?.nombre || '').toLowerCase();
      acumulado[n] = (acumulado[n] || 0) + it.cantidad;
    }

    const calorico = (n: string) =>
      /(polenta|fideo|arroz|harina|leche|aceite|azucar|legumbre|lenteja|garbanzo|poroto)/i.test(n);
    const liviano = (n: string) =>
      /(arveja|tomate|pure)/i.test(n);

    const totalCal = Object.entries(acumulado).filter(([n]) => calorico(n)).reduce((s, [, v]) => s + v, 0);
    const totalLiv = Object.entries(acumulado).filter(([n]) => liviano(n)).reduce((s, [, v]) => s + v, 0);

    if (totalLiv === 0 || totalCal === 0) return null;
    if (totalLiv <= totalCal) return null;

    const top = Object.entries(acumulado)
      .filter(([n]) => calorico(n))
      .sort((a, b) => a[1] - b[1])
      .slice(0, 3)
      .map(([n]) => n);

    return {
      id: 'estacional-invierno',
      titulo: 'Reforzar artículos calóricos para el invierno',
      nivel: 'media',
      categoria: 'Estacional',
      descripcion: `En los últimos 3 meses se distribuyeron más artículos livianos (${totalLiv.toFixed(0)}u) que calóricos (${totalCal.toFixed(0)}u). En invierno conviene priorizar polenta, fideos, harinas y legumbres.`,
      detalle: top.length ? `Artículos calóricos con baja salida: ${top.join(', ')}.` : undefined,
      datos: { totalCal, totalLiv },
      accion: { label: 'Ver stock', link: '/stock' },
      icono: 'ac_unit',
    };
  }

  // ──────────────────────────────────────────────────────────────────────
  // 3) Cobertura por localidad: localidades sin entregas en últimos 60 días
  // ──────────────────────────────────────────────────────────────────────
  private async reglaCoberturaPorLocalidad(secretaria: string | null): Promise<Sugerencia | null> {
    const hace60 = subDays(new Date(), 60);
    const beneWhere: any = { activo: true };
    if (secretaria) beneWhere.programa = { secretaria };

    const todasLocalidades = await this.prisma.beneficiario.groupBy({
      by: ['localidad'],
      where: beneWhere,
      _count: { _all: true },
    });

    const where: any = { fecha: { gte: hace60 }, estado: { in: ESTADOS_VALIDOS } };
    if (secretaria) where.secretaria = secretaria;
    const remitosRecientes = await this.prisma.remito.findMany({
      where,
      select: { beneficiario: { select: { localidad: true } } },
    });
    const localidadesActivas = new Set(
      remitosRecientes.map((r) => (r.beneficiario?.localidad || '').trim()).filter(Boolean),
    );

    const sinCobertura = todasLocalidades
      .filter((l) => l.localidad && l._count._all >= 3 && !localidadesActivas.has(l.localidad.trim()))
      .sort((a, b) => b._count._all - a._count._all)
      .slice(0, 5);

    if (sinCobertura.length === 0) return null;

    return {
      id: 'cobertura-localidad',
      titulo: `${sinCobertura.length} localidad(es) sin entregas en 60 días`,
      nivel: sinCobertura.length >= 3 ? 'alta' : 'media',
      categoria: 'Cobertura',
      descripcion: `Hay localidades con beneficiarios activos donde no se registraron entregas en los últimos 60 días. Revisar cobertura territorial.`,
      detalle: sinCobertura.map((l) => `${l.localidad} (${l._count._all} beneficiarios activos)`).join(' · '),
      datos: sinCobertura,
      accion: { label: 'Ver beneficiarios', link: '/beneficiarios' },
      icono: 'location_off',
    };
  }

  // ──────────────────────────────────────────────────────────────────────
  // 4) Stock por agotarse: stock total < demanda mensual estimada
  // ──────────────────────────────────────────────────────────────────────
  private async reglaStockPorAgotarse(): Promise<Sugerencia | null> {
    const hace30 = subDays(new Date(), 30);
    const items = await this.prisma.remitoItem.findMany({
      where: { remito: { fecha: { gte: hace30 }, estado: { in: ESTADOS_VALIDOS } } },
      select: { cantidad: true, articuloId: true },
    });
    const demanda: Record<number, number> = {};
    for (const it of items) demanda[it.articuloId] = (demanda[it.articuloId] || 0) + it.cantidad;

    const stocks = await this.prisma.stock.groupBy({
      by: ['articuloId'],
      _sum: { cantidad: true },
    });
    const stockMap: Record<number, number> = {};
    for (const s of stocks) stockMap[s.articuloId] = s._sum.cantidad || 0;

    const articulos = await this.prisma.articulo.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, stockMinimo: true },
    });

    const enRiesgo: Array<{ id: number; nombre: string; stock: number; demanda30d: number; cobertura: number }> = [];
    for (const a of articulos) {
      const dem = demanda[a.id] || 0;
      const stock = stockMap[a.id] || 0;
      if (dem <= 0) continue;
      const cobertura = stock / dem;
      if (cobertura < 0.5) {
        enRiesgo.push({ id: a.id, nombre: a.nombre, stock, demanda30d: dem, cobertura });
      }
    }
    enRiesgo.sort((a, b) => a.cobertura - b.cobertura);
    if (enRiesgo.length === 0) return null;
    const top = enRiesgo.slice(0, 5);

    return {
      id: 'stock-agotarse',
      titulo: `${enRiesgo.length} artículo(s) por agotarse`,
      nivel: enRiesgo.some((e) => e.cobertura < 0.2) ? 'alta' : 'media',
      categoria: 'Stock',
      descripcion: `Hay artículos con stock por debajo del 50% de la demanda mensual. Si no se reponen, se agotan en pocas semanas.`,
      detalle: top
        .map((e) => `${e.nombre}: ${e.stock.toFixed(0)} en stock vs ${e.demanda30d.toFixed(0)} consumidos en 30d (${Math.round(e.cobertura * 100)}% cobertura)`)
        .join(' · '),
      datos: top,
      accion: { label: 'Ver stock', link: '/stock' },
      icono: 'warning',
    };
  }

  // ──────────────────────────────────────────────────────────────────────
  // 5) Stock muerto: artículos con stock pero sin movimiento en +60 días
  // ──────────────────────────────────────────────────────────────────────
  private async reglaStockMuerto(): Promise<Sugerencia | null> {
    const hace60 = subDays(new Date(), 60);
    const articulos = await this.prisma.articulo.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, stockItems: { select: { cantidad: true } } },
    });

    const conMov = await this.prisma.movimiento.groupBy({
      by: ['articuloId'],
      where: { fecha: { gte: hace60 }, tipo: { in: ['EGRESO', 'TRANSFERENCIA'] } },
      _count: { _all: true },
    });
    const articulosConMov = new Set(conMov.map((m) => m.articuloId));

    const muertos: Array<{ id: number; nombre: string; stock: number }> = [];
    for (const a of articulos) {
      const stock = a.stockItems.reduce((s, x) => s + (x.cantidad || 0), 0);
      if (stock > 10 && !articulosConMov.has(a.id)) {
        muertos.push({ id: a.id, nombre: a.nombre, stock });
      }
    }
    if (muertos.length === 0) return null;
    muertos.sort((a, b) => b.stock - a.stock);
    const top = muertos.slice(0, 5);

    return {
      id: 'stock-muerto',
      titulo: `${muertos.length} artículo(s) sin movimiento en 60 días`,
      nivel: 'baja',
      categoria: 'Stock',
      descripcion: `Hay artículos con stock disponible que no se mueven hace más de 60 días. Considerar incluirlos en próximas entregas o transferir entre depósitos.`,
      detalle: top.map((m) => `${m.nombre}: ${m.stock.toFixed(0)}u en stock`).join(' · '),
      datos: top,
      accion: { label: 'Ver stock', link: '/stock' },
      icono: 'inventory_2',
    };
  }

  // ──────────────────────────────────────────────────────────────────────
  // 6) Lotes por vencer: vencimiento dentro de 60 días
  // ──────────────────────────────────────────────────────────────────────
  private async reglaArticulosPorVencer(): Promise<Sugerencia | null> {
    const hoy = new Date();
    const en60 = new Date(hoy.getTime() + 60 * 24 * 60 * 60 * 1000);
    const lotes = await this.prisma.loteArticulo.findMany({
      where: { fechaVencimiento: { gte: hoy, lte: en60 }, cantidad: { gt: 0 } },
      include: { articulo: { select: { nombre: true } }, deposito: { select: { nombre: true } } },
      orderBy: { fechaVencimiento: 'asc' },
      take: 10,
    });
    if (lotes.length === 0) return null;

    const proximos = lotes.slice(0, 5).map((l) => ({
      articulo: l.articulo?.nombre,
      deposito: l.deposito?.nombre,
      cantidad: l.cantidad,
      vence: l.fechaVencimiento.toISOString().slice(0, 10),
    }));
    const totalKg = lotes.reduce((s, l) => s + (l.cantidad || 0), 0);

    return {
      id: 'lotes-por-vencer',
      titulo: `${lotes.length} lote(s) por vencer en los próximos 60 días`,
      nivel: lotes.some((l) => (l.fechaVencimiento.getTime() - hoy.getTime()) / (24 * 3600 * 1000) < 15) ? 'alta' : 'media',
      categoria: 'Stock',
      descripcion: `Total comprometido: ${totalKg.toFixed(0)} unidades. Priorizar su distribución antes del vencimiento para evitar pérdidas.`,
      detalle: proximos
        .map((p) => `${p.articulo} (${p.deposito}) — vence ${p.vence}, ${p.cantidad}u`)
        .join(' · '),
      datos: proximos,
      accion: { label: 'Ver stock', link: '/stock' },
      icono: 'event_busy',
    };
  }

  // ──────────────────────────────────────────────────────────────────────
  // 7) Beneficiarios con entrega vencida según frecuencia declarada
  // ──────────────────────────────────────────────────────────────────────
  private async reglaBeneficiariosVencidos(secretaria: string | null): Promise<Sugerencia | null> {
    const where: any = { activo: true, frecuenciaEntrega: { in: ['MENSUAL', 'BIMESTRAL'] } };
    if (secretaria) where.programa = { secretaria };

    const beneficiarios = await this.prisma.beneficiario.findMany({
      where,
      select: {
        id: true, nombre: true, frecuenciaEntrega: true,
        remitos: {
          where: { estado: { in: ESTADOS_VALIDOS } },
          orderBy: { fecha: 'desc' },
          take: 1,
          select: { fecha: true },
        },
      },
    });

    const hoy = Date.now();
    const vencidos: Array<{ id: number; nombre: string; ultima: string | null; diasSinRetiro: number }> = [];
    for (const b of beneficiarios) {
      const ultima = b.remitos[0]?.fecha;
      const limite = b.frecuenciaEntrega === 'MENSUAL' ? 35 : 65;
      const dias = ultima ? Math.floor((hoy - ultima.getTime()) / (24 * 3600 * 1000)) : 999;
      if (dias > limite) {
        vencidos.push({ id: b.id, nombre: b.nombre, ultima: ultima?.toISOString().slice(0, 10) ?? null, diasSinRetiro: dias });
      }
    }
    if (vencidos.length === 0) return null;
    vencidos.sort((a, b) => b.diasSinRetiro - a.diasSinRetiro);
    const top = vencidos.slice(0, 5);

    return {
      id: 'beneficiarios-vencidos',
      titulo: `${vencidos.length} beneficiario(s) con retiro vencido`,
      nivel: vencidos.length >= 20 ? 'alta' : 'media',
      categoria: 'Operativo',
      descripcion: `Beneficiarios cuya última entrega supera la frecuencia declarada. Contactar para reactivar o dar de baja con motivo.`,
      detalle: top.map((v) => `${v.nombre}: ${v.diasSinRetiro}d sin retirar (última ${v.ultima ?? 'nunca'})`).join(' · '),
      datos: top,
      accion: { label: 'Ver listado completo', link: '/reportes?tab=sin-entrega' },
      icono: 'person_off',
    };
  }

  // ──────────────────────────────────────────────────────────────────────
  // 8) Casos urgentes pendientes de revisión hace +3 días
  // ──────────────────────────────────────────────────────────────────────
  private async reglaCasosUrgentesPendientes(): Promise<Sugerencia | null> {
    const hace3 = subDays(new Date(), 3);
    const casos = await this.prisma.caso.findMany({
      where: {
        estado: { in: ['PENDIENTE', 'EN_REVISION'] },
        prioridad: { in: ['ALTA', 'URGENTE'] },
        createdAt: { lte: hace3 },
      },
      select: { id: true, nombreSolicitante: true, prioridad: true, createdAt: true, barrio: true },
      orderBy: { createdAt: 'asc' },
      take: 10,
    });
    if (casos.length === 0) return null;
    const hoy = Date.now();
    const detalle = casos.slice(0, 5).map((c) => {
      const dias = Math.floor((hoy - c.createdAt.getTime()) / (24 * 3600 * 1000));
      return `${c.nombreSolicitante} (${c.prioridad}, ${dias}d, ${c.barrio || 's/barrio'})`;
    });
    return {
      id: 'casos-urgentes',
      titulo: `${casos.length} caso(s) urgente(s) sin resolver hace +3 días`,
      nivel: 'alta',
      categoria: 'Operativo',
      descripcion: `Hay casos clasificados como ALTA o URGENTE que llevan más de 3 días pendientes de resolución.`,
      detalle: detalle.join(' · '),
      datos: casos,
      accion: { label: 'Ver casos', link: '/casos' },
      icono: 'priority_high',
    };
  }

  // ──────────────────────────────────────────────────────────────────────
  // 9) Cruces: DNIs registrados en más de un programa o caso
  // ──────────────────────────────────────────────────────────────────────
  private async reglaCrucesDniDuplicados(secretaria: string | null): Promise<Sugerencia | null> {
    const beneWhere: any = { activo: true, responsableDNI: { not: null } };
    if (secretaria) beneWhere.programa = { secretaria };
    const benes = await this.prisma.beneficiario.findMany({
      where: beneWhere,
      select: { responsableDNI: true, programaId: true },
    });

    const grupo: Record<string, Set<number>> = {};
    for (const b of benes) {
      const dni = (b.responsableDNI || '').trim();
      if (!dni || !b.programaId) continue;
      if (!grupo[dni]) grupo[dni] = new Set();
      grupo[dni].add(b.programaId);
    }
    const cruces = Object.entries(grupo).filter(([, set]) => set.size > 1);
    if (cruces.length === 0) return null;

    return {
      id: 'cruces-dni',
      titulo: `${cruces.length} DNI(s) registrados en múltiples programas`,
      nivel: cruces.length >= 10 ? 'media' : 'baja',
      categoria: 'Calidad de datos',
      descripcion: `Detectados beneficiarios con el mismo DNI en más de un programa. Revisar si corresponde duplicación o si es un caso legítimo de doble cobertura.`,
      detalle: `Total cruces: ${cruces.length}. Ver el reporte "Cruces masivos" para el detalle.`,
      datos: { total: cruces.length, ejemplos: cruces.slice(0, 5).map(([dni, set]) => ({ dni, programas: set.size })) },
      accion: { label: 'Ver cruces', link: '/reportes' },
      icono: 'compare_arrows',
    };
  }

  // ──────────────────────────────────────────────────────────────────────
  // 10) Concentración Pareto: pocos beneficiarios reciben la mayoría del kg
  // ──────────────────────────────────────────────────────────────────────
  private async reglaConcentracionPareto(secretaria: string | null): Promise<Sugerencia | null> {
    const hace90 = subDays(new Date(), 90);
    const where: any = { fecha: { gte: hace90 }, estado: { in: ESTADOS_VALIDOS } };
    if (secretaria) where.secretaria = secretaria;

    const remitos = await this.prisma.remito.findMany({
      where,
      select: { totalKg: true, beneficiarioId: true },
    });
    if (remitos.length < 20) return null;

    const porBene: Record<number, number> = {};
    for (const r of remitos) {
      if (!r.beneficiarioId) continue;
      porBene[r.beneficiarioId] = (porBene[r.beneficiarioId] || 0) + (r.totalKg || 0);
    }
    const valores = Object.values(porBene).sort((a, b) => b - a);
    const total = valores.reduce((s, v) => s + v, 0);
    if (total <= 0) return null;
    const corte = Math.ceil(valores.length * 0.2);
    const top20 = valores.slice(0, corte).reduce((s, v) => s + v, 0);
    const ratio = top20 / total;
    if (ratio < 0.85) return null;
    return {
      id: 'concentracion-pareto',
      titulo: `${Math.round(ratio * 100)}% de los kg fueron al ${20}% de los beneficiarios`,
      nivel: 'baja',
      categoria: 'Cobertura',
      descripcion: `En los últimos 90 días la distribución está fuertemente concentrada. Considerar redistribuir entregas para ampliar cobertura efectiva.`,
      datos: { ratio, totalBeneficiarios: valores.length, totalKg: total },
      accion: { label: 'Ver beneficiarios', link: '/beneficiarios' },
      icono: 'donut_large',
    };
  }

  // ──────────────────────────────────────────────────────────────────────
  // 11) Calidad de datos: beneficiarios sin geolocalización / sin teléfono
  // ──────────────────────────────────────────────────────────────────────
  private async reglaCalidadDatos(secretaria: string | null): Promise<Sugerencia | null> {
    const where: any = { activo: true };
    if (secretaria) where.programa = { secretaria };
    const total = await this.prisma.beneficiario.count({ where });
    if (total === 0) return null;
    const sinGeo = await this.prisma.beneficiario.count({ where: { ...where, OR: [{ lat: null }, { lng: null }] } });
    const sinTel = await this.prisma.beneficiario.count({ where: { ...where, OR: [{ telefono: null }, { telefono: '' }] } });

    const ratioGeo = sinGeo / total;
    const ratioTel = sinTel / total;
    if (ratioGeo < 0.2 && ratioTel < 0.2) return null;

    const partes: string[] = [];
    if (ratioGeo >= 0.2) partes.push(`${sinGeo} sin geolocalización (${Math.round(ratioGeo * 100)}%)`);
    if (ratioTel >= 0.2) partes.push(`${sinTel} sin teléfono (${Math.round(ratioTel * 100)}%)`);

    return {
      id: 'calidad-datos',
      titulo: 'Datos incompletos en beneficiarios activos',
      nivel: 'baja',
      categoria: 'Calidad de datos',
      descripcion: `Detectamos campos faltantes que afectan reportes y avisos: ${partes.join(' · ')}. Completarlos mejora el mapa, los recordatorios por WhatsApp y la planificación.`,
      datos: { total, sinGeo, sinTel },
      accion: { label: 'Ir a beneficiarios', link: '/beneficiarios' },
      icono: 'fact_check',
    };
  }

  // ──────────────────────────────────────────────────────────────────────
  // 12) Remitos en BORRADOR sin confirmar hace +7 días
  // ──────────────────────────────────────────────────────────────────────
  private async reglaRemitosBorrador(secretaria: string | null): Promise<Sugerencia | null> {
    const hace7 = subDays(new Date(), 7);
    const where: any = { estado: 'BORRADOR', createdAt: { lte: hace7 } };
    if (secretaria) where.secretaria = secretaria;
    const cantidad = await this.prisma.remito.count({ where });
    if (cantidad === 0) return null;
    return {
      id: 'remitos-borrador',
      titulo: `${cantidad} remito(s) en borrador hace +7 días`,
      nivel: cantidad >= 10 ? 'media' : 'baja',
      categoria: 'Operativo',
      descripcion: `Hay remitos creados pero nunca confirmados. Si ya se entregaron, confirmarlos. Si no, eliminarlos para no inflar reportes.`,
      datos: { cantidad },
      accion: { label: 'Ver remitos', link: '/remitos' },
      icono: 'pending_actions',
    };
  }
}
