import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SocialService {
  constructor(private prisma: PrismaService) {}

  async listar() {
    return this.prisma.eventoSocial.findMany({
      orderBy: [{ tipo: 'asc' }, { fecha: 'asc' }],
    });
  }

  // Próximos eventos en los siguientes `dias` días (para la campana)
  async proximos(dias = 30) {
    const todos = await this.prisma.eventoSocial.findMany();
    const hoy = new Date();
    const hoyMes = hoy.getMonth() + 1;
    const hoyDia = hoy.getDate();
    const hoyAnio = hoy.getFullYear();

    const resultado: any[] = [];

    for (const ev of todos) {
      let diasFaltan: number;
      let fechaEvento: string;

      if (ev.recurrente) {
        // Formato MM-DD — buscar la próxima ocurrencia este año o el siguiente
        const [mm, dd] = ev.fecha.split('-').map(Number);
        let anio = hoyAnio;
        const esteAnio = new Date(hoyAnio, mm - 1, dd);
        const diff = Math.floor((esteAnio.getTime() - hoy.getTime()) / 86400000);
        if (diff < 0) {
          anio = hoyAnio + 1;
          diasFaltan = Math.floor((new Date(anio, mm - 1, dd).getTime() - hoy.getTime()) / 86400000);
        } else {
          diasFaltan = diff;
        }
        fechaEvento = `${String(dd).padStart(2,'0')}/${String(mm).padStart(2,'0')}`;
      } else {
        // Formato YYYY-MM-DD
        const [anio, mm, dd] = ev.fecha.split('-').map(Number);
        const d = new Date(anio, mm - 1, dd);
        diasFaltan = Math.floor((d.getTime() - hoy.getTime()) / 86400000);
        fechaEvento = `${String(dd).padStart(2,'0')}/${String(mm).padStart(2,'0')}/${anio}`;
      }

      if (diasFaltan >= 0 && diasFaltan <= dias) {
        resultado.push({
          ...ev,
          diasFaltan,
          fechaFormateada: fechaEvento,
          esHoy: diasFaltan === 0,
          esManiana: diasFaltan === 1,
        });
      }
    }

    return resultado.sort((a, b) => a.diasFaltan - b.diasFaltan);
  }

  async crear(data: any, user: { id: number; nombre: string }) {
    return this.prisma.eventoSocial.create({
      data: {
        titulo: String(data.titulo).trim().slice(0, 100),
        fecha: data.fecha,
        tipo: data.tipo ?? 'EVENTO',
        descripcion: data.descripcion ? String(data.descripcion).trim().slice(0, 300) : null,
        color: data.color ?? '#1976d2',
        recurrente: Boolean(data.recurrente),
        creadoPorId: user.id,
        creadoPorNombre: user.nombre,
      },
    });
  }

  async actualizar(id: number, data: any) {
    const ev = await this.prisma.eventoSocial.findUnique({ where: { id } });
    if (!ev) throw new NotFoundException('Evento no encontrado');
    const update: any = {};
    if (data.titulo != null)      update.titulo      = String(data.titulo).trim().slice(0, 100);
    if (data.fecha != null)       update.fecha       = data.fecha;
    if (data.tipo != null)        update.tipo        = data.tipo;
    if (data.descripcion != null) update.descripcion = String(data.descripcion).trim().slice(0, 300) || null;
    if (data.color != null)       update.color       = data.color;
    if (data.recurrente != null)  update.recurrente  = Boolean(data.recurrente);
    return this.prisma.eventoSocial.update({ where: { id }, data: update });
  }

  async eliminar(id: number) {
    await this.prisma.eventoSocial.delete({ where: { id } }).catch(() => null);
    return { ok: true };
  }
}
