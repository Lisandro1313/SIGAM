import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { getSecretariaForWrite } from '../../shared/auth/secretaria.util';

export interface ColumnaDef {
  clave: string;
  etiqueta: string;
  color?: string;
}

function parseColumnas(raw: string): ColumnaDef[] {
  try {
    const arr = JSON.parse(raw || '[]');
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((c) => c && typeof c.clave === 'string' && typeof c.etiqueta === 'string')
      .map((c) => ({ clave: String(c.clave).slice(0, 60), etiqueta: String(c.etiqueta).slice(0, 80), color: c.color }));
  } catch { return []; }
}

function slugify(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || `col_${Date.now()}`;
}

@Injectable()
export class ListasSeguimientoService {
  constructor(private prisma: PrismaService) {}

  // ─── Listas ────────────────────────────────────────────────
  async listar(secretaria: string | null) {
    const where: any = {};
    if (secretaria) where.OR = [{ secretaria }, { secretaria: null }];
    const listas = await this.prisma.listaSeguimiento.findMany({
      where,
      orderBy: [{ orden: 'asc' }, { id: 'asc' }],
      include: { _count: { select: { items: true } } },
    });
    return listas.map((l) => ({
      ...l,
      columnas: parseColumnas(l.columnas),
      totalItems: l._count.items,
    }));
  }

  async obtener(id: number, secretaria: string | null) {
    const lista = await this.prisma.listaSeguimiento.findUnique({ where: { id } });
    if (!lista) throw new NotFoundException('Lista no encontrada');
    if (secretaria && lista.secretaria !== secretaria) throw new NotFoundException('Lista no accesible');

    const items = await this.prisma.listaSeguimientoItem.findMany({
      where: { listaId: id },
      orderBy: { createdAt: 'asc' },
    });
    const ids = items.map((i) => i.beneficiarioId);
    const benes = ids.length
      ? await this.prisma.beneficiario.findMany({
          where: { id: { in: ids } },
          select: {
            id: true, nombre: true, tipo: true, localidad: true, direccion: true,
            responsableNombre: true, responsableDNI: true, telefono: true, activo: true,
          },
        })
      : [];
    const beneMap = new Map(benes.map((b) => [b.id, b]));

    return {
      ...lista,
      columnas: parseColumnas(lista.columnas),
      items: items.map((it) => ({
        id: it.id,
        beneficiarioId: it.beneficiarioId,
        beneficiario: beneMap.get(it.beneficiarioId) ?? null,
        valores: (() => { try { return JSON.parse(it.valores || '{}'); } catch { return {}; } })(),
        notas: it.notas,
        actualizadoEn: it.actualizadoEn,
        actualizadoPor: it.actualizadoPor,
      })),
    };
  }

  async crear(data: any, user: { id: number; nombre: string; rol: string }) {
    if (!data?.nombre?.trim()) throw new BadRequestException('Nombre requerido');
    const columnas = parseColumnas(JSON.stringify(data.columnas ?? []));
    // Asignar clave a columnas nuevas que no la tengan
    const columnasSanitizadas = columnas.map((c) => ({
      clave: c.clave || slugify(c.etiqueta),
      etiqueta: c.etiqueta,
      color: c.color,
    }));
    const max = await this.prisma.listaSeguimiento.aggregate({ _max: { orden: true } });
    return this.prisma.listaSeguimiento.create({
      data: {
        nombre: data.nombre.trim().slice(0, 80),
        descripcion: (data.descripcion ?? '').trim().slice(0, 400) || null,
        color: data.color || '#1976d2',
        icono: data.icono || 'folder',
        columnas: JSON.stringify(columnasSanitizadas),
        orden: (max._max.orden ?? 0) + 1,
        secretaria: getSecretariaForWrite(user.rol),
        creadoPorId: user.id,
        creadoPorNombre: user.nombre,
      },
    });
  }

  async actualizar(id: number, data: any) {
    const actual = await this.prisma.listaSeguimiento.findUnique({ where: { id } });
    if (!actual) throw new NotFoundException('Lista no encontrada');

    const nueva: any = {};
    if (data.nombre != null) nueva.nombre = String(data.nombre).trim().slice(0, 80);
    if (data.descripcion != null) nueva.descripcion = String(data.descripcion).slice(0, 400) || null;
    if (data.color != null) nueva.color = data.color;
    if (data.icono != null) nueva.icono = data.icono;
    if (data.orden != null) nueva.orden = Number(data.orden);
    if (data.columnas != null) {
      const cols = parseColumnas(JSON.stringify(data.columnas));
      nueva.columnas = JSON.stringify(
        cols.map((c) => ({
          clave: c.clave || slugify(c.etiqueta),
          etiqueta: c.etiqueta,
          color: c.color,
        })),
      );
    }
    return this.prisma.listaSeguimiento.update({ where: { id }, data: nueva });
  }

  async eliminar(id: number) {
    const actual = await this.prisma.listaSeguimiento.findUnique({ where: { id } });
    if (!actual) throw new NotFoundException('Lista no encontrada');
    await this.prisma.listaSeguimiento.delete({ where: { id } });
    return { ok: true };
  }

  async duplicar(id: number, data: { nombre?: string; copiarItems?: boolean }, user: { id: number; nombre: string; rol: string }) {
    const origen = await this.prisma.listaSeguimiento.findUnique({ where: { id } });
    if (!origen) throw new NotFoundException('Lista no encontrada');

    const nombre = (data?.nombre?.trim() || `${origen.nombre} (copia)`).slice(0, 80);
    const max = await this.prisma.listaSeguimiento.aggregate({ _max: { orden: true } });
    const copiarItems = data?.copiarItems !== false;

    return this.prisma.$transaction(async (tx) => {
      const nueva = await tx.listaSeguimiento.create({
        data: {
          nombre,
          descripcion: origen.descripcion,
          color: origen.color,
          icono: origen.icono,
          columnas: origen.columnas,
          orden: (max._max.orden ?? 0) + 1,
          secretaria: getSecretariaForWrite(user.rol),
          creadoPorId: user.id,
          creadoPorNombre: user.nombre,
        },
      });

      if (copiarItems) {
        const items = await tx.listaSeguimientoItem.findMany({
          where: { listaId: id },
          select: { beneficiarioId: true, valores: true, notas: true },
        });
        if (items.length) {
          await tx.listaSeguimientoItem.createMany({
            data: items.map((it) => ({
              listaId: nueva.id,
              beneficiarioId: it.beneficiarioId,
              valores: it.valores,
              notas: it.notas,
              actualizadoPor: user.nombre,
            })),
          });
        }
      }

      return nueva;
    });
  }

  async reordenar(orden: Array<{ id: number; orden: number }>) {
    await this.prisma.$transaction(
      orden.map((o) =>
        this.prisma.listaSeguimiento.update({ where: { id: o.id }, data: { orden: o.orden } }),
      ),
    );
    return { ok: true };
  }

  // ─── Items ────────────────────────────────────────────────
  async agregarItems(listaId: number, beneficiarioIds: number[], user: { nombre: string }) {
    const lista = await this.prisma.listaSeguimiento.findUnique({ where: { id: listaId } });
    if (!lista) throw new NotFoundException('Lista no encontrada');
    if (!beneficiarioIds?.length) return { ok: true, creados: 0 };

    const existentes = await this.prisma.listaSeguimientoItem.findMany({
      where: { listaId, beneficiarioId: { in: beneficiarioIds } },
      select: { beneficiarioId: true },
    });
    const yaHay = new Set(existentes.map((e) => e.beneficiarioId));
    const nuevos = beneficiarioIds.filter((id) => !yaHay.has(id));

    if (nuevos.length === 0) return { ok: true, creados: 0 };

    await this.prisma.listaSeguimientoItem.createMany({
      data: nuevos.map((bid) => ({
        listaId,
        beneficiarioId: bid,
        valores: '{}',
        actualizadoPor: user.nombre,
      })),
    });
    return { ok: true, creados: nuevos.length };
  }

  async actualizarItem(itemId: number, data: any, user: { nombre: string }) {
    const item = await this.prisma.listaSeguimientoItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Item no encontrado');

    const payload: any = { actualizadoPor: user.nombre };
    if (data.valores !== undefined) {
      const val = typeof data.valores === 'string' ? data.valores : JSON.stringify(data.valores);
      payload.valores = val.slice(0, 8000);
    }
    if (data.notas !== undefined) payload.notas = data.notas ? String(data.notas).slice(0, 2000) : null;
    return this.prisma.listaSeguimientoItem.update({ where: { id: itemId }, data: payload });
  }

  async eliminarItem(itemId: number) {
    await this.prisma.listaSeguimientoItem.delete({ where: { id: itemId } }).catch(() => null);
    return { ok: true };
  }

  async eliminarItemsBulk(listaId: number, itemIds: number[]) {
    if (!itemIds?.length) return { ok: true, eliminados: 0 };
    const res = await this.prisma.listaSeguimientoItem.deleteMany({
      where: { id: { in: itemIds }, listaId },
    });
    return { ok: true, eliminados: res.count };
  }
}
