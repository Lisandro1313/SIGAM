import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

const DIAS: string[] = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];

function formatFechaCorta(fecha: Date): string {
  const d = fecha.getDate();
  const m = fecha.getMonth() + 1;
  return `${d}-${m}`;
}

export interface OpcionesEnvio {
  asunto?: string;
  destinatarios?: string[];
  textoExtra?: string;
}

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
      });
    } else {
      console.warn('[EmailService] SMTP_USER / SMTP_PASSWORD no configurados — los emails no se enviarán');
    }
  }

  async enviarRemito(remito: any, pdfBuffer: Buffer, opciones: OpcionesEnvio = {}) {
    if (!this.transporter) {
      console.warn('[EmailService] Email no enviado: credenciales SMTP no configuradas');
      return;
    }

    const fecha = new Date(remito.fecha);
    const diaSemana = DIAS[fecha.getDay()];
    const fechaCorta = formatFechaCorta(fecha);
    const nombreBenef = (remito.beneficiario.nombre as string).toUpperCase();
    const pdfNombre = `${nombreBenef.replace(/\s+/g, '_')}_${fechaCorta}.pdf`;

    const asunto =
      opciones.asunto ||
      `PEDIDO ${diaSemana} ${fechaCorta} ${nombreBenef}`;

    const destinosDefault: string[] = [
      process.env.DEPOSITO_EMAIL_LOGISTICA,
      process.env.DEPOSITO_EMAIL_CITA,
    ].filter(Boolean) as string[];

    const to =
      opciones.destinatarios && opciones.destinatarios.length > 0
        ? opciones.destinatarios
        : destinosDefault.length > 0
          ? destinosDefault
          : ['deposito@municipalidad.gob.ar'];

    const responsable = remito.beneficiario.responsableNombre || '';
    const dni = remito.beneficiario.responsableDNI || '';
    const responsableTexto = responsable
      ? `${responsable.toUpperCase()}${dni ? ' - DNI ' + dni : ''}`
      : 'A CONFIRMAR';

    const cuerpoExtra = opciones.textoExtra ? `\n${opciones.textoExtra.toUpperCase()}` : '';

    const text = [
      'ESTIMADO:',
      '',
      `A CONTINUACIÓN TE ADJUNTO EL SIGUIENTE PEDIDO CON RESPONSABLE DE RETIRO: ${responsableTexto}.${cuerpoExtra}`,
      '',
      `REMITO N° ${remito.numero}`,
      `BENEFICIARIO: ${nombreBenef}`,
      `DIRECCIÓN: ${(remito.beneficiario.direccion || '').toUpperCase()} ${remito.beneficiario.localidad ? '- ' + remito.beneficiario.localidad.toUpperCase() : ''}`.trim(),
      `PROGRAMA: ${(remito.programa?.nombre || '').toUpperCase()}`,
      '',
      'MUCHAS GRACIAS !!',
    ].join('\n');

    const from = process.env.SMTP_FROM || `Inclusión Social <${process.env.SMTP_USER}>`;

    await this.transporter.sendMail({
      from,
      to,
      subject: asunto,
      text,
      attachments: [{ filename: pdfNombre, content: pdfBuffer }],
    });
  }
}
