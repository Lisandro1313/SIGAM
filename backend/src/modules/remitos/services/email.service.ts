import { Injectable } from '@nestjs/common';
import * as https from 'https';

const DIAS: string[] = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];

function formatFechaCorta(fecha: Date): string {
  return `${fecha.getDate()}-${fecha.getMonth() + 1}`;
}

export interface OpcionesEnvio {
  asunto?: string;
  destinatarios?: string[];
  textoExtra?: string;
}

@Injectable()
export class EmailService {
  private apiKey: string | null = null;
  private fromEmail: string = 'dsminclusionsocial@gmail.com';
  private fromName: string = 'Inclusión Social';

  constructor() {
    this.apiKey = process.env.BREVO_API_KEY || null;
    if (process.env.SMTP_USER) this.fromEmail = process.env.SMTP_USER;
    if (!this.apiKey) {
      console.warn('[EmailService] BREVO_API_KEY no configurada — los emails no se enviarán');
    }
  }

  async enviarRemito(remito: any, pdfBuffer: Buffer, opciones: OpcionesEnvio = {}) {
    if (!this.apiKey) {
      console.warn('[EmailService] Email no enviado: BREVO_API_KEY no configurada');
      return;
    }

    const fecha = new Date(remito.fecha);
    const diaSemana = DIAS[fecha.getDay()];
    const fechaCorta = formatFechaCorta(fecha);
    const nombreBenef = (remito.beneficiario.nombre as string).toUpperCase();
    const pdfNombre = `${nombreBenef.replace(/\s+/g, '_')}_${fechaCorta}.pdf`;

    const asunto = opciones.asunto || `PEDIDO ${diaSemana} ${fechaCorta} ${nombreBenef}`;

    const destinosDefault: string[] = [
      process.env.DEPOSITO_EMAIL_LOGISTICA,
      process.env.DEPOSITO_EMAIL_CITA,
    ].filter(Boolean) as string[];

    const destinos: string[] =
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

    const textContent = [
      'ESTIMADO:',
      '',
      `A CONTINUACIÓN TE ADJUNTO EL SIGUIENTE PEDIDO CON RESPONSABLE DE RETIRO: ${responsableTexto}.${cuerpoExtra}`,
      '',
      `REMITO N° ${remito.numero}`,
      `BENEFICIARIO: ${nombreBenef}`,
      `DIRECCIÓN: ${(remito.beneficiario.direccion || '').toUpperCase()}${remito.beneficiario.localidad ? ' - ' + remito.beneficiario.localidad.toUpperCase() : ''}`,
      `PROGRAMA: ${(remito.programa?.nombre || '').toUpperCase()}`,
      '',
      'MUCHAS GRACIAS !!',
    ].join('\n');

    const body = JSON.stringify({
      sender: { name: this.fromName, email: this.fromEmail },
      to: destinos.map(email => ({ email })),
      bcc: [{ email: this.fromEmail }], // copia para registro en bandeja de entrada
      subject: asunto,
      textContent,
      attachment: [
        {
          name: pdfNombre,
          content: pdfBuffer.toString('base64'),
        },
      ],
    });

    await new Promise<void>((resolve, reject) => {
      const req = https.request(
        {
          hostname: 'api.brevo.com',
          path: '/v3/smtp/email',
          method: 'POST',
          headers: {
            'api-key': this.apiKey!,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
          },
        },
        (res) => {
          let data = '';
          res.on('data', chunk => (data += chunk));
          res.on('end', () => {
            if (res.statusCode && res.statusCode >= 400) {
              reject(new Error(`Brevo API error ${res.statusCode}: ${data}`));
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
