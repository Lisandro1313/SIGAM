import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';

@Injectable()
export class PdfService {
  async generarRemitoPdf(remito: any): Promise<Buffer> {
    const html = this.generarHtmlRemito(remito);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm',
      },
    });

    await browser.close();

    return Buffer.from(pdfBuffer);
  }

  private generarHtmlRemito(remito: any): string {
    const fecha = new Date(remito.fecha).toLocaleDateString('es-AR');
    const hora = new Date(remito.fecha).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, sans-serif;
      padding: 20px;
      font-size: 11pt;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 20px;
      border-bottom: 2px solid #333;
      padding-bottom: 15px;
    }
    .title {
      font-size: 14pt;
      font-weight: bold;
    }
    .subtitle {
      font-size: 10pt;
      color: #666;
      margin-top: 5px;
    }
    .remito-numero {
      text-align: right;
      font-size: 16pt;
      font-weight: bold;
      color: #0066cc;
    }
    .info-section {
      margin: 20px 0;
    }
    .info-row {
      display: flex;
      margin: 5px 0;
    }
    .info-label {
      font-weight: bold;
      min-width: 150px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th {
      background: #0066cc;
      color: white;
      padding: 10px;
      text-align: left;
      font-size: 10pt;
    }
    td {
      padding: 8px 10px;
      border-bottom: 1px solid #ddd;
    }
    tr:nth-child(even) {
      background: #f9f9f9;
    }
    .footer {
      margin-top: 40px;
      border-top: 1px solid #ddd;
      padding-top: 10px;
      font-size: 9pt;
      color: #666;
    }
    .total {
      text-align: right;
      font-weight: bold;
      font-size: 12pt;
      margin-top: 15px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">MUNICIPALIDAD DE LA PLATA</div>
      <div class="subtitle">SECRETARÍA DE DESARROLLO SOCIAL</div>
      <div class="subtitle">${remito.deposito.nombre}</div>
    </div>
    <div class="remito-numero">
      REMITO N° ${remito.numero}
    </div>
  </div>

  <div class="info-section">
    <div class="info-row">
      <div class="info-label">BENEFICIARIO:</div>
      <div>${remito.beneficiario.nombre}</div>
    </div>
    <div class="info-row">
      <div class="info-label">DIRECCIÓN:</div>
      <div>${remito.beneficiario.direccion || ''} ${remito.beneficiario.localidad ? '- ' + remito.beneficiario.localidad : ''}</div>
    </div>
    <div class="info-row">
      <div class="info-label">TELÉFONO:</div>
      <div>${remito.beneficiario.telefono || ''}</div>
    </div>
    <div class="info-row">
      <div class="info-label">PROGRAMA:</div>
      <div>${remito.programa?.nombre || ''}</div>
    </div>
    <div class="info-row">
      <div class="info-label">FECHA:</div>
      <div>${fecha}</div>
    </div>
    <div class="info-row">
      <div class="info-label">HORA DE RETIRO:</div>
      <div>${hora}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>CÓDIGO</th>
        <th>DESCRIPCIÓN</th>
        <th style="text-align: center;">CANTIDAD</th>
      </tr>
    </thead>
    <tbody>
      ${remito.items
        .map(
          (item: any) => `
        <tr>
          <td>${item.articulo.id}</td>
          <td>${item.articulo.nombre}</td>
          <td style="text-align: center;">${item.cantidad} UNIDADES</td>
        </tr>
      `,
        )
        .join('')}
    </tbody>
  </table>

  <div class="total">
    Total de artículos: ${remito.items.length}
    ${remito.totalKg ? ` | Peso total: ${remito.totalKg.toFixed(2)} kg` : ''}
  </div>

  <div class="footer">
    <p>Remito generado automáticamente por SIGAM</p>
    <p>Secretaría de Desarrollo Social - Municipalidad de La Plata</p>
  </div>
</body>
</html>
    `;
  }
}
