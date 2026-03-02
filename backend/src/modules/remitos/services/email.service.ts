import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  async enviarRemito(remito: any, pdfBuffer: Buffer) {
    const emailDestino = process.env.DEPOSITO_EMAIL || 'deposito@municipalidad.gob.ar';
    const fecha = new Date(remito.fecha).toLocaleDateString('es-AR');

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM || '"Secretaría de Desarrollo Social" <no-reply@municipalidad.gob.ar>',
      to: emailDestino,
      subject: `Pedido ${fecha} - ${remito.beneficiario.nombre} - REMITO ${remito.numero}`,
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>Nuevo Pedido de Mercadería</h2>
          <p><strong>Remito:</strong> ${remito.numero}</p>
          <p><strong>Beneficiario:</strong> ${remito.beneficiario.nombre}</p>
          <p><strong>Programa:</strong> ${remito.programa?.nombre || ''}</p>
          <p><strong>Dirección:</strong> ${remito.beneficiario.direccion || ''}</p>
          <p><strong>Responsable:</strong> ${remito.beneficiario.responsableNombre || ''} - DNI ${remito.beneficiario.responsableDNI || ''}</p>
          <p><strong>Fecha programada:</strong> ${fecha}</p>
          <hr>
          <p>Se adjunta el remito detallado en PDF.</p>
          <p><em>Este es un mensaje automático del Sistema SIGAM.</em></p>
        </div>
      `,
      attachments: [
        {
          filename: `${remito.numero.replace(' ', '_')}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });
  }
}
