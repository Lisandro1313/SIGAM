import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as https from 'https';
import { PrismaService } from '../../prisma/prisma.service';

function toCsv(rows: object[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    const s = v === null || v === undefined ? '' : String(v).replace(/"/g, '""');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
  };
  return [
    headers.join(','),
    ...rows.map(r => headers.map(h => escape(r[h])).join(',')),
  ].join('\n');
}

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  constructor(private prisma: PrismaService) {}

  /** Ejecuta todos los domingos a las 6:00 AM UTC */
  @Cron('0 6 * * 0')
  async ejecutarBackupSemanal() {
    this.logger.log('Iniciando backup semanal...');
    try {
      await this.generarYEnviarBackup();
      this.logger.log('Backup semanal enviado correctamente');
    } catch (err) {
      this.logger.error('Error en backup semanal', err);
    }
  }

  async generarYEnviarBackup() {
    const apiKey = process.env.BREVO_API_KEY;
    const destino = process.env.BACKUP_EMAIL || process.env.SMTP_USER || 'dsminclusionsocial@gmail.com';
    const remitente = process.env.SMTP_USER || 'dsminclusionsocial@gmail.com';

    if (!apiKey) {
      this.logger.warn('BREVO_API_KEY no configurada — backup no enviado');
      return;
    }

    const ahora = new Date();
    const fechaStr = ahora.toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
    const semana = `${ahora.getFullYear()}-S${Math.ceil((ahora.getDate()) / 7).toString().padStart(2, '0')}`;

    // ── Exportar datos ────────────────────────────────────────────────────────
    const [beneficiarios, remitos, casos, stock] = await Promise.all([
      this.prisma.beneficiario.findMany({
        where: { activo: true },
        include: { programa: { select: { nombre: true } } },
        orderBy: { nombre: 'asc' },
      }),
      this.prisma.remito.findMany({
        include: {
          beneficiario: { select: { nombre: true, localidad: true } },
          programa: { select: { nombre: true } },
          deposito: { select: { nombre: true } },
        },
        orderBy: { fecha: 'desc' },
        take: 2000,
      }),
      this.prisma.caso.findMany({
        orderBy: { createdAt: 'desc' },
        take: 1000,
      }),
      this.prisma.stockItem.findMany({
        include: {
          articulo: { select: { nombre: true, categoria: true } },
          deposito: { select: { nombre: true } },
        },
      }),
    ]);

    const csvBenef = toCsv(beneficiarios.map(b => ({
      ID: b.id,
      Nombre: b.nombre,
      Tipo: b.tipo,
      Programa: b.programa?.nombre ?? '',
      Localidad: b.localidad ?? '',
      Direccion: b.direccion ?? '',
      Telefono: b.telefono ?? '',
      ResponsableNombre: b.responsableNombre ?? '',
      ResponsableDNI: b.responsableDNI ?? '',
      KilosHabitual: b.kilosHabitual ?? '',
      Activo: b.activo ? 'SI' : 'NO',
      FechaAlta: b.createdAt?.toISOString().slice(0, 10) ?? '',
    })));

    const csvRemitos = toCsv(remitos.map(r => ({
      Numero: r.numero,
      Fecha: r.fecha?.toISOString().slice(0, 10) ?? '',
      Estado: r.estado,
      Beneficiario: r.beneficiario?.nombre ?? '',
      Localidad: r.beneficiario?.localidad ?? '',
      Programa: r.programa?.nombre ?? '',
      Deposito: r.deposito?.nombre ?? '',
      TotalKg: r.totalKg ?? '',
      EntregadoAt: r.entregadoAt?.toISOString().slice(0, 16).replace('T', ' ') ?? '',
      QuienRetiro: r.entregadoNota ?? '',
    })));

    const csvCasos = toCsv(casos.map(c => ({
      ID: c.id,
      Solicitante: c.nombreSolicitante,
      DNI: c.dni ?? '',
      Tipo: c.tipo,
      Estado: c.estado,
      Prioridad: c.prioridad,
      Fecha: c.createdAt?.toISOString().slice(0, 10) ?? '',
    })));

    const csvStock = toCsv(stock.map(s => ({
      Articulo: s.articulo?.nombre ?? '',
      Categoria: s.articulo?.categoria ?? '',
      Deposito: s.deposito?.nombre ?? '',
      Cantidad: s.cantidad,
    })));

    // ── Resumen en texto ──────────────────────────────────────────────────────
    const resumen = [
      `BACKUP SEMANAL SIGAM — ${fechaStr}`,
      ``,
      `RESUMEN:`,
      `  Beneficiarios activos: ${beneficiarios.length}`,
      `  Remitos exportados (últimos 2000): ${remitos.length}`,
      `  Casos particulares: ${casos.length}`,
      `  Items de stock: ${stock.length}`,
      ``,
      `Se adjuntan 4 archivos CSV:`,
      `  • beneficiarios.csv — todos los beneficiarios activos`,
      `  • remitos.csv — últimos 2000 remitos`,
      `  • casos.csv — últimos 1000 casos particulares`,
      `  • stock.csv — stock actual por depósito`,
      ``,
      `Este backup se genera automáticamente cada domingo a las 6:00 AM.`,
    ].join('\n');

    // ── Enviar por Brevo ──────────────────────────────────────────────────────
    const body = JSON.stringify({
      sender: { name: 'SIGAM Backup', email: remitente },
      to: [{ email: destino }],
      subject: `[SIGAM] Backup semanal — ${fechaStr}`,
      textContent: resumen,
      attachment: [
        { name: `beneficiarios_${semana}.csv`, content: Buffer.from(csvBenef).toString('base64') },
        { name: `remitos_${semana}.csv`,       content: Buffer.from(csvRemitos).toString('base64') },
        { name: `casos_${semana}.csv`,         content: Buffer.from(csvCasos).toString('base64') },
        { name: `stock_${semana}.csv`,         content: Buffer.from(csvStock).toString('base64') },
      ],
    });

    await new Promise<void>((resolve, reject) => {
      const req = https.request(
        {
          hostname: 'api.brevo.com',
          path: '/v3/smtp/email',
          method: 'POST',
          headers: {
            'api-key': apiKey,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
          },
        },
        (res) => {
          let data = '';
          res.on('data', chunk => (data += chunk));
          res.on('end', () => {
            if (res.statusCode && res.statusCode >= 400) {
              reject(new Error(`Brevo error ${res.statusCode}: ${data}`));
            } else {
              resolve();
            }
          });
        },
      );
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }
}
