import { Injectable, OnModuleDestroy } from '@nestjs/common';
import * as puppeteer from 'puppeteer';

// Filas vacías mínimas para que la tabla llegue hasta el pie
const MIN_FILAS = 20;

@Injectable()
export class PdfService implements OnModuleDestroy {
  private browser: puppeteer.Browser | null = null;

  private async getBrowser(): Promise<puppeteer.Browser> {
    if (!this.browser || !this.browser.connected) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--single-process',
        ],
      });
    }
    return this.browser;
  }

  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async generarRemitoPdf(remito: any): Promise<Buffer> {
    const html = this.generarHtmlRemito(remito);
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
      });
      return Buffer.from(pdfBuffer);
    } finally {
      await page.close();
    }
  }

  private generarHtmlRemito(remito: any): string {
    const fecha = new Date(remito.fecha).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const hora = new Date(remito.fecha).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Filas de items + filas vacías para completar la tabla
    const filasItems = remito.items
      .map(
        (item: any) => `
        <tr>
          <td class="col-codigo"></td>
          <td class="col-desc">${(item.articulo.nombre as string).toUpperCase()}</td>
          <td class="col-cant">${item.cantidad} UNIDADES</td>
        </tr>`,
      )
      .join('');

    const filasVacias = Array.from({
      length: Math.max(0, MIN_FILAS - remito.items.length),
    })
      .map(
        () => `<tr><td class="col-codigo">&nbsp;</td><td class="col-desc"></td><td class="col-cant"></td></tr>`,
      )
      .join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, sans-serif;
      font-size: 9pt;
      padding: 8px;
    }

    /* ── HEADER ── */
    .header {
      width: 100%;
      border-collapse: collapse;
      border: 2px solid #000;
      margin-bottom: 4px;
    }
    .header td {
      border: 1px solid #000;
      padding: 4px 8px;
      vertical-align: middle;
    }
    .header .col-muni {
      width: 28%;
      text-align: center;
      font-size: 13pt;
      font-weight: bold;
      line-height: 1.4;
    }
    .header .col-dep {
      width: 44%;
      text-align: center;
    }
    .header .col-dep .dep-titulo {
      font-size: 10pt;
      font-weight: bold;
    }
    .header .col-dep .dep-sub {
      font-size: 8pt;
    }
    .header .col-remito {
      width: 28%;
      padding: 0;
    }
    .header .col-remito table {
      width: 100%;
      border-collapse: collapse;
    }
    .header .col-remito table td {
      border: none;
      border-bottom: 1px solid #000;
      padding: 2px 6px;
      font-size: 8pt;
    }
    .header .col-remito table tr:last-child td {
      border-bottom: none;
    }
    .remito-label {
      font-weight: bold;
      font-size: 11pt;
    }
    .remito-numero {
      font-size: 11pt;
      font-weight: bold;
      text-align: right;
    }

    /* ── INFO BENEFICIARIO ── */
    .info-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #000;
      margin-bottom: 0;
    }
    .info-table td {
      border: 1px solid #000;
      padding: 3px 8px;
      font-size: 9pt;
    }
    .info-table .label {
      font-weight: bold;
      width: 90px;
    }
    .info-table .valor {
      text-align: center;
    }

    /* ── TABLA DE ITEMS ── */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #000;
    }
    .items-table th {
      background: #d0d0d0;
      border: 1px solid #000;
      padding: 4px 8px;
      font-size: 9pt;
      text-align: center;
      font-weight: bold;
    }
    .items-table td {
      border: 1px solid #000;
      padding: 3px 8px;
      font-size: 9pt;
      height: 18px;
    }
    .col-codigo { width: 12%; text-align: center; }
    .col-desc   { width: 68%; text-align: center; }
    .col-cant   { width: 20%; text-align: center; }

    /* ── PIE ── */
    .footer {
      border: 1px solid #000;
      border-top: none;
      padding: 5px 8px;
      font-size: 7.5pt;
    }
    .footer p { margin-bottom: 2px; }
    .footer .bold { font-weight: bold; }

    .firma-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #000;
      border-top: none;
    }
    .firma-table td {
      border: 1px solid #000;
      padding: 5px 8px;
      text-align: center;
      font-size: 9pt;
      font-weight: bold;
      height: 28px;
    }
  </style>
</head>
<body>

  <!-- HEADER -->
  <table class="header">
    <tr>
      <td class="col-muni">
        MUNICIPALIDAD DE<br>LA PLATA
      </td>
      <td class="col-dep">
        <div class="dep-titulo">DEPOSITO-SECRETARIA DE<br>DESARROLLO SOCIAL</div>
        <div class="dep-sub">SECRETARIA DE DESARROLLO SOCIAL</div>
      </td>
      <td class="col-remito">
        <table>
          <tr>
            <td class="remito-label">REMITO N°</td>
            <td class="remito-numero">${remito.numero}</td>
          </tr>
          <tr>
            <td>FECHA:</td>
            <td style="text-align:right">${fecha}</td>
          </tr>
          <tr>
            <td>HORA DE RETIRO:</td>
            <td style="text-align:right">${hora}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- INFO BENEFICIARIO -->
  <table class="info-table">
    <tr>
      <td class="label">BENEFICIARIO:</td>
      <td class="valor">${(remito.beneficiario.nombre as string).toUpperCase()}</td>
    </tr>
    <tr>
      <td class="label">DIRECCION:</td>
      <td class="valor">${(remito.beneficiario.direccion || '').toUpperCase()}</td>
    </tr>
    <tr>
      <td class="label">TELEFONO</td>
      <td class="valor">${remito.beneficiario.telefono || ''}</td>
    </tr>
  </table>

  <!-- TABLA DE ITEMS -->
  <table class="items-table">
    <thead>
      <tr>
        <th class="col-codigo">CODIGO</th>
        <th class="col-desc">DESCRIPCION</th>
        <th class="col-cant">CANTIDAD</th>
      </tr>
    </thead>
    <tbody>
      ${filasItems}
      ${filasVacias}
    </tbody>
  </table>

  <!-- PIE LEGAL -->
  <div class="footer">
    <p>A- El beneficiario acepta la entrega de los productos previamente detallados de conformidad, por haber realizado su previa constatación, no teniendo nada que reclamar al respecto. <span class="bold">Las cantidad y exitencias pueden variar dependendiendo del stock existente al momento de realizar el pedido.</span></p>
    <p>B- El beneficiario dispondrá de los productos entregados con criterio social, para asistir situaciones de emergencia y vulnerabilidad quedando terminantemente prohibida su comercialización.</p>
    <p>C- ADJUNTAR FOTOCOPIA DEL DNI</p>
    <p>D- Patente del vehículo que retira: ___________________</p>
  </div>

  <!-- FIRMA -->
  <table class="firma-table">
    <tr>
      <td style="width:25%">DNI</td>
      <td style="width:50%">APELLIDO Y NOMBRE</td>
      <td style="width:25%">FIRMA</td>
    </tr>
  </table>

</body>
</html>`;
  }
}
