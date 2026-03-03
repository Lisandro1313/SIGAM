import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

const DIAS: string[] = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];

function formatFechaCorta(fecha: Date): string {
  const d = fecha.getDate();
  const m = fecha.getMonth() + 1;
  return `${d}-${m}`;
}

export interface OpcionesEnvio {
  /** Asunto personalizado. Si no se pasa, se genera automáticamente. */
  asunto?: string;
  /** Destinatarios extra (array de emails). Si no se pasa, usa las vars de entorno. */
  destinatarios?: string[];
  /** Texto adicional para incluir en el cuerpo del email. */
  textoExtra?: string;
}

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  async enviarRemito(remito: any, pdfBuffer: Buffer, opciones: OpcionesEnvio = {}) {
    const fecha = new Date(remito.fecha);
    const diaSemana = DIAS[fecha.getDay()];
    const fechaCorta = formatFechaCorta(fecha);
    const nombreBenef = (remito.beneficiario.nombre as string).toUpperCase();
    const pdfNombre = `${nombreBenef.replace(/\s+/g, '_')}_${fechaCorta.replace('-', '-')}.pdf`;

    // Asunto: PEDIDO LUNES 23-2 AMIGAS PLATENSES UNIDAS
    const asunto =
      opciones.asunto ||
      `PEDIDO ${diaSemana} ${fechaCorta} ${nombreBenef}`;

    // Destinatarios: variables de entorno o custom
    const destinosDefault: string[] = [
      process.env.DEPOSITO_EMAIL_LOGISTICA,
      process.env.DEPOSITO_EMAIL_CITA,
    ].filter(Boolean) as string[];

    const to =
      opciones.destinatarios && opciones.destinatarios.length > 0
        ? opciones.destinatarios
        : destinosDefault.length > 0
          ? destinosDefault
          : [process.env.DEPOSITO_EMAIL || 'deposito@municipalidad.gob.ar'];

    // Responsable
    const responsable = remito.beneficiario.responsableNombre || '';
    const dni = remito.beneficiario.responsableDNI || '';
    const responsableTexto = responsable
      ? `${responsable.toUpperCase()}${dni ? ' - DNI ' + dni : ''}`
      : 'A CONFIRMAR';

    const cuerpoExtra = opciones.textoExtra ? `\n${opciones.textoExtra.toUpperCase()}` : '';

    // Cuerpo en el estilo que usan (todo mayúsculas, simple)
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

    await this.transporter.sendMail({
      from:
        process.env.SMTP_FROM ||
        `"Inclusión Social" <${process.env.SMTP_USER}>`,
      to: to.join(', '),
      subject: asunto,
      text,
      attachments: [
        {
          filename: pdfNombre,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });
  }
}
