import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

// Filas vacías mínimas para que la tabla llegue hasta el pie
const MIN_FILAS = 20;

// A4 en puntos (72pt = 1 pulgada)
const PAGE_W = 595.28;
const M = 28.35; // 10 mm
const CW = PAGE_W - 2 * M; // ancho del contenido

@Injectable()
export class PdfService {
  async generarRemitoPdf(remito: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 0 });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      this.drawRemito(doc, remito);
      doc.end();
    });
  }

  private drawRemito(doc: PDFKit.PDFDocument, remito: any): void {
    const fecha = new Date(remito.fecha).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const hora = new Date(remito.fecha).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    let y = M;

    // ── 1. HEADER (3 columnas) ──────────────────────────────────────────────
    const HH = 54;
    const C1 = CW * 0.28;
    const C2 = CW * 0.44;
    const C3 = CW * 0.28;
    const x2 = M + C1;
    const x3 = M + C1 + C2;

    doc.lineWidth(1.5).rect(M, y, CW, HH).stroke('#000');
    doc
      .lineWidth(1)
      .moveTo(x2, y)
      .lineTo(x2, y + HH)
      .stroke()
      .moveTo(x3, y)
      .lineTo(x3, y + HH)
      .stroke();

    // Col1: Municipalidad
    doc
      .font('Helvetica-Bold')
      .fontSize(13)
      .fillColor('#000')
      .text('MUNICIPALIDAD DE\nLA PLATA', M, y + 10, {
        width: C1,
        align: 'center',
      });

    // Col2: Depósito
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .text('DEPOSITO-SECRETARIA DE\nDESARROLLO SOCIAL', x2, y + 8, {
        width: C2,
        align: 'center',
      });
    doc
      .font('Helvetica')
      .fontSize(8)
      .text('SECRETARIA DE DESARROLLO SOCIAL', x2, y + 35, {
        width: C2,
        align: 'center',
      });

    // Col3: Remito/fecha/hora (3 sub-filas)
    const r3h = HH / 3;
    doc.lineWidth(0.5);
    doc
      .moveTo(x3, y + r3h)
      .lineTo(x3 + C3, y + r3h)
      .stroke()
      .moveTo(x3, y + r3h * 2)
      .lineTo(x3 + C3, y + r3h * 2)
      .stroke();
    doc.lineWidth(1);

    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .text('REMITO N°', x3 + 3, y + 4, { width: C3 * 0.6, lineBreak: false });
    doc.text(String(remito.numero), x3, y + 4, {
      width: C3 - 3,
      align: 'right',
      lineBreak: false,
    });

    doc
      .font('Helvetica')
      .fontSize(8)
      .text('FECHA:', x3 + 3, y + r3h + 4, {
        width: C3 * 0.5,
        lineBreak: false,
      });
    doc.text(fecha, x3, y + r3h + 4, {
      width: C3 - 3,
      align: 'right',
      lineBreak: false,
    });

    doc
      .font('Helvetica')
      .fontSize(8)
      .text('HORA DE RETIRO:', x3 + 3, y + r3h * 2 + 4, {
        width: C3 * 0.6,
        lineBreak: false,
      });
    doc.text(hora, x3, y + r3h * 2 + 4, {
      width: C3 - 3,
      align: 'right',
      lineBreak: false,
    });

    y += HH;

    // ── 2. INFO BENEFICIARIO ────────────────────────────────────────────────
    const IRH = 16;
    const LW = 75;
    const infoRows: [string, string][] = [
      ['BENEFICIARIO:', (remito.beneficiario.nombre as string).toUpperCase()],
      ['DIRECCION:', (remito.beneficiario.direccion || '').toUpperCase()],
      ['TELEFONO', remito.beneficiario.telefono || ''],
    ];

    for (const [label, val] of infoRows) {
      doc.lineWidth(1).rect(M, y, CW, IRH).stroke();
      doc.moveTo(M + LW, y).lineTo(M + LW, y + IRH).stroke();
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .text(label, M + 4, y + 4, { width: LW - 4, lineBreak: false });
      doc
        .font('Helvetica')
        .fontSize(9)
        .text(val, M + LW + 4, y + 4, {
          width: CW - LW - 8,
          align: 'center',
          lineBreak: false,
        });
      y += IRH;
    }

    // ── 3. TABLA DE ITEMS ───────────────────────────────────────────────────
    const THH = 16;
    const TRH = 14;
    const CodW = CW * 0.12;
    const DescW = CW * 0.68;
    const CantW = CW * 0.2;

    // Cabecera
    doc.rect(M, y, CW, THH).fillAndStroke('#d0d0d0', '#000');
    doc
      .moveTo(M + CodW, y)
      .lineTo(M + CodW, y + THH)
      .stroke()
      .moveTo(M + CodW + DescW, y)
      .lineTo(M + CodW + DescW, y + THH)
      .stroke();
    doc.fillColor('#000').font('Helvetica-Bold').fontSize(9);
    doc.text('CODIGO', M, y + 4, {
      width: CodW,
      align: 'center',
      lineBreak: false,
    });
    doc.text('DESCRIPCION', M + CodW, y + 4, {
      width: DescW,
      align: 'center',
      lineBreak: false,
    });
    doc.text('CANTIDAD', M + CodW + DescW, y + 4, {
      width: CantW,
      align: 'center',
      lineBreak: false,
    });
    y += THH;

    // Filas (items + vacías)
    const totalRows = Math.max(remito.items.length, MIN_FILAS);
    for (let i = 0; i < totalRows; i++) {
      doc.lineWidth(1).rect(M, y, CW, TRH).stroke();
      doc
        .moveTo(M + CodW, y)
        .lineTo(M + CodW, y + TRH)
        .stroke()
        .moveTo(M + CodW + DescW, y)
        .lineTo(M + CodW + DescW, y + TRH)
        .stroke();
      if (i < remito.items.length) {
        const item = remito.items[i];
        doc
          .font('Helvetica')
          .fontSize(9)
          .text(
            (item.articulo.nombre as string).toUpperCase(),
            M + CodW,
            y + 3,
            { width: DescW, align: 'center', lineBreak: false },
          );
        doc.text(`${item.cantidad} UNIDADES`, M + CodW + DescW, y + 3, {
          width: CantW,
          align: 'center',
          lineBreak: false,
        });
      }
      y += TRH;
    }

    // ── 4. PIE LEGAL ───────────────────────────────────────────────────────
    const FP = 4;
    const FW = CW - FP * 2;
    const fSize = 7.5;

    const tA1 =
      'A- El beneficiario acepta la entrega de los productos previamente detallados de conformidad, por haber realizado su previa constatación, no teniendo nada que reclamar al respecto. ';
    const tA2 =
      'Las cantidad y exitencias pueden variar dependendiendo del stock existente al momento de realizar el pedido.';
    const tB =
      'B- El beneficiario dispondrá de los productos entregados con criterio social, para asistir situaciones de emergencia y vulnerabilidad quedando terminantemente prohibida su comercialización.';
    const tC = 'C- ADJUNTAR FOTOCOPIA DEL DNI';
    const tD = 'D- Patente del vehículo que retira: ___________________';

    // Pre-calcular alto del pie para dibujar el borde antes del texto
    doc.font('Helvetica').fontSize(fSize);
    const footerH =
      FP * 2 +
      doc.heightOfString(tA1 + tA2, { width: FW }) +
      doc.heightOfString(tB, { width: FW }) +
      doc.heightOfString(tC, { width: FW }) +
      doc.heightOfString(tD, { width: FW }) +
      8; // separación entre líneas

    doc.lineWidth(1).rect(M, y, CW, footerH).stroke();

    let fy = y + FP;

    // Texto A: parte normal + parte en negrita (inline)
    doc
      .font('Helvetica')
      .fontSize(fSize)
      .text(tA1, M + FP, fy, { width: FW, continued: true });
    doc.font('Helvetica-Bold').text(tA2);
    fy = doc.y + 2;

    // Textos B, C, D
    for (const t of [tB, tC, tD]) {
      doc.font('Helvetica').fontSize(fSize).text(t, M + FP, fy, { width: FW });
      fy = doc.y + 2;
    }

    y += footerH;

    // ── 5. FIRMA ───────────────────────────────────────────────────────────
    const SH = 28;
    const DniW = CW * 0.25;
    const NomW = CW * 0.5;
    const FirW = CW * 0.25;

    doc.lineWidth(1).rect(M, y, CW, SH).stroke();
    doc
      .moveTo(M + DniW, y)
      .lineTo(M + DniW, y + SH)
      .stroke()
      .moveTo(M + DniW + NomW, y)
      .lineTo(M + DniW + NomW, y + SH)
      .stroke();

    doc.font('Helvetica-Bold').fontSize(9).fillColor('#000');
    doc.text('DNI', M, y + 9, {
      width: DniW,
      align: 'center',
      lineBreak: false,
    });
    doc.text('APELLIDO Y NOMBRE', M + DniW, y + 9, {
      width: NomW,
      align: 'center',
      lineBreak: false,
    });
    doc.text('FIRMA', M + DniW + NomW, y + 9, {
      width: FirW,
      align: 'center',
      lineBreak: false,
    });
  }
}
