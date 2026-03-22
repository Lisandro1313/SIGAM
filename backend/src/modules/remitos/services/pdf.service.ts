import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

// A4 en puntos (72pt = 1 pulgada)
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 28.35; // 10 mm de margen
const CW = PAGE_W - 2 * M;

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

  async generarHistorialPdf(
    remitos: any[],
    filtros: { desde?: string; hasta?: string; programa?: string; deposito?: string },
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: false });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      this.drawHistorial(doc, remitos, filtros);
      doc.end();
    });
  }

  private drawHistorial(
    doc: PDFKit.PDFDocument,
    remitos: any[],
    filtros: { desde?: string; hasta?: string; programa?: string; deposito?: string },
  ): void {
    const totalKg = remitos.reduce((s, r) => s + (r.totalKg ?? 0), 0);
    const conFoto = remitos.filter((r) => r.entregadoFoto).length;

    // ── Columnas ────────────────────────────────────────────────────────────
    const cols = [
      { label: 'N° Remito',      key: 'numero',     w: 60,  align: 'left'   },
      { label: 'Fecha Entrega',  key: 'fechaEnt',   w: 66,  align: 'center' },
      { label: 'Beneficiario',   key: 'benef',      w: 130, align: 'left'   },
      { label: 'DNI',            key: 'dni',        w: 50,  align: 'center' },
      { label: 'Programa',       key: 'programa',   w: 88,  align: 'left'   },
      { label: 'Kg',             key: 'kg',         w: 35,  align: 'right'  },
      { label: '¿Quién retiró?', key: 'quienRetiro',w: 81,  align: 'left'   },
      { label: 'Foto',           key: 'foto',       w: 28,  align: 'center' },
    ] as { label: string; key: string; w: number; align: 'left'|'center'|'right' }[];

    const ROW_H   = 14;
    const HDR_H   = 52; // header page title block
    const COL_H   = 16; // column headers row
    const STATS_H = 28; // stats strip
    const FOOT_H  = 16; // page number footer
    const PAGE_H_USABLE = PAGE_H - M * 2 - FOOT_H;

    let pageNum = 0;
    let rowsOnPage = 0;
    let maxRowsFirstPage: number;
    let maxRowsOtherPages: number;

    const startPage = () => {
      pageNum++;
      doc.addPage({ size: 'A4', margin: 0 });

      // ── Page header ───────────────────────────────────────────────────────
      let y = M;

      doc.rect(M, y, CW, HDR_H).fillAndStroke('#1565C0', '#1565C0');

      doc.fillColor('#fff').font('Helvetica-Bold').fontSize(11)
        .text('MUNICIPALIDAD DE LA PLATA', M + 8, y + 6, { width: CW - 16, align: 'left', lineBreak: false });

      doc.font('Helvetica-Bold').fontSize(14)
        .text('HISTORIAL DE ENTREGAS — SIGAM', M + 8, y + 20, { width: CW - 16, align: 'left', lineBreak: false });

      const periodoLabel = filtros.desde && filtros.hasta
        ? `Período: ${filtros.desde}  al  ${filtros.hasta}`
        : `Generado: ${new Date().toLocaleDateString('es-AR')}`;
      doc.font('Helvetica').fontSize(8)
        .text(periodoLabel, M + 8, y + 39, { width: CW / 2, align: 'left', lineBreak: false });

      if (filtros.programa) {
        doc.text(`Programa: ${filtros.programa}`, M + CW / 2, y + 39, { width: CW / 2 - 8, align: 'right', lineBreak: false });
      }

      y += HDR_H;

      // ── Stats (only first page) ───────────────────────────────────────────
      if (pageNum === 1) {
        doc.rect(M, y, CW, STATS_H).fillAndStroke('#E3F2FD', '#1565C0');
        doc.fillColor('#1565C0').font('Helvetica-Bold').fontSize(9);
        const stats = [
          `Total entregas: ${remitos.length}`,
          `Total Kg: ${totalKg.toFixed(1)} kg`,
          `Con foto: ${conFoto}`,
          `Sin foto: ${remitos.length - conFoto}`,
        ];
        const sw = CW / stats.length;
        stats.forEach((s, i) => {
          doc.text(s, M + sw * i + 6, y + 10, { width: sw - 6, align: 'left', lineBreak: false });
        });
        y += STATS_H;
      }

      // ── Column headers ────────────────────────────────────────────────────
      doc.rect(M, y, CW, COL_H).fillAndStroke('#90CAF9', '#1565C0');
      doc.fillColor('#000').font('Helvetica-Bold').fontSize(7.5);
      let cx = M;
      for (const col of cols) {
        doc.text(col.label, cx + 2, y + 4, { width: col.w - 4, align: col.align, lineBreak: false });
        if (col !== cols[cols.length - 1]) {
          doc.moveTo(cx + col.w, y).lineTo(cx + col.w, y + COL_H).strokeColor('#1565C0').lineWidth(0.5).stroke();
        }
        cx += col.w;
      }
      y += COL_H;

      rowsOnPage = 0;
      return y;
    };

    // pre-calculate max rows per page
    const usableFirst  = PAGE_H_USABLE - HDR_H - STATS_H - COL_H;
    const usableOthers = PAGE_H_USABLE - HDR_H - COL_H;
    maxRowsFirstPage   = Math.floor(usableFirst  / ROW_H);
    maxRowsOtherPages  = Math.floor(usableOthers / ROW_H);

    let y = startPage();

    const drawPageNumber = () => {
      doc.fillColor('#999').font('Helvetica').fontSize(7.5)
        .text(
          `Pág. ${pageNum}  ·  Generado ${new Date().toLocaleString('es-AR')}`,
          M, PAGE_H - M - 10, { width: CW, align: 'right', lineBreak: false },
        );
    };

    for (let idx = 0; idx < remitos.length; idx++) {
      const maxRows = pageNum === 1 ? maxRowsFirstPage : maxRowsOtherPages;
      if (rowsOnPage >= maxRows) {
        drawPageNumber();
        y = startPage();
      }

      const r = remitos[idx];
      const bg = rowsOnPage % 2 === 0 ? '#fff' : '#F5F5F5';
      doc.rect(M, y, CW, ROW_H).fillColor(bg).fill();
      doc.rect(M, y, CW, ROW_H).strokeColor('#E0E0E0').lineWidth(0.3).stroke();

      const fechaEnt = r.entregadoAt
        ? new Date(r.entregadoAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
        : '—';
      const benef = r.caso?.nombreSolicitante ?? r.beneficiario?.nombre ?? '—';
      const dni   = r.caso?.dni ?? '';
      const prog  = r.programa?.nombre ?? '—';
      const kg    = r.totalKg != null ? r.totalKg.toFixed(1) : '—';
      const quien = r.entregadoNota ?? '';
      const foto  = r.entregadoFoto ? 'Sí' : 'No';

      const values: Record<string, string> = {
        numero: r.numero ?? '',
        fechaEnt,
        benef,
        dni,
        programa: prog,
        kg,
        quienRetiro: quien,
        foto,
      };

      doc.fillColor('#000').font('Helvetica').fontSize(7.5);
      let cx2 = M;
      for (const col of cols) {
        const val = values[col.key] ?? '';
        doc.text(val, cx2 + 2, y + 3, { width: col.w - 4, align: col.align, lineBreak: false, ellipsis: true });
        cx2 += col.w;
      }

      y += ROW_H;
      rowsOnPage++;
    }

    if (remitos.length === 0) {
      doc.fillColor('#999').font('Helvetica-Oblique').fontSize(10)
        .text('Sin entregas para el período y filtros seleccionados.', M, y + 16, { width: CW, align: 'center' });
    }

    drawPageNumber();
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

    // ── Textos del pie legal ────────────────────────────────────────────────
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

    // Pre-calcular alto del pie (necesario para saber cuántas filas caben)
    doc.font('Helvetica').fontSize(fSize);
    const footerH =
      FP * 2 +
      doc.heightOfString(tA1 + tA2, { width: FW }) +
      doc.heightOfString(tB, { width: FW }) +
      doc.heightOfString(tC, { width: FW }) +
      doc.heightOfString(tD, { width: FW }) +
      8;

    // ── Dimensiones fijas ───────────────────────────────────────────────────
    const HH = 54;    // header
    const IRH = 16;   // fila info beneficiario
    const THH = 16;   // cabecera tabla items
    const TRH = 14;   // fila item
    const SH_L = 16;  // fila etiquetas firma
    const SH_W = 28;  // fila escritura firma (con línea punteada)

    // Calcular cuántas filas de items caben para llegar al fondo de página
    const fixedH = HH + 3 * IRH + THH + footerH + SH_L + SH_W;
    const availForRows = PAGE_H - 2 * M - fixedH;
    const totalRows = Math.max(remito.items.length, Math.floor(availForRows / TRH));

    let y = M;

    // ── 1. HEADER (3 columnas) ──────────────────────────────────────────────
    const C1 = CW * 0.28;
    const C2 = CW * 0.44;
    const C3 = CW * 0.28;
    const x2 = M + C1;
    const x3 = M + C1 + C2;

    doc.lineWidth(1.5).rect(M, y, CW, HH).stroke('#000');
    doc
      .lineWidth(1)
      .moveTo(x2, y).lineTo(x2, y + HH).stroke()
      .moveTo(x3, y).lineTo(x3, y + HH).stroke();

    doc.font('Helvetica-Bold').fontSize(13).fillColor('#000')
      .text('MUNICIPALIDAD DE\nLA PLATA', M, y + 10, { width: C1, align: 'center' });

    doc.font('Helvetica-Bold').fontSize(10)
      .text('DEPOSITO-SECRETARIA DE\nDESARROLLO SOCIAL', x2, y + 8, { width: C2, align: 'center' });
    doc.font('Helvetica').fontSize(8)
      .text('SECRETARIA DE DESARROLLO SOCIAL', x2, y + 35, { width: C2, align: 'center' });

    const r3h = HH / 3;
    doc.lineWidth(0.5)
      .moveTo(x3, y + r3h).lineTo(x3 + C3, y + r3h).stroke()
      .moveTo(x3, y + r3h * 2).lineTo(x3 + C3, y + r3h * 2).stroke();
    doc.lineWidth(1);

    doc.font('Helvetica-Bold').fontSize(11)
      .text('REMITO N°', x3 + 3, y + 4, { width: C3 * 0.6, lineBreak: false });
    doc.text(String(remito.numero), x3, y + 4, { width: C3 - 3, align: 'right', lineBreak: false });

    doc.font('Helvetica').fontSize(8)
      .text('FECHA:', x3 + 3, y + r3h + 4, { width: C3 * 0.5, lineBreak: false });
    doc.text(fecha, x3, y + r3h + 4, { width: C3 - 3, align: 'right', lineBreak: false });

    doc.font('Helvetica').fontSize(8)
      .text('HORA DE RETIRO:', x3 + 3, y + r3h * 2 + 4, { width: C3 * 0.6, lineBreak: false });
    doc.text(hora, x3, y + r3h * 2 + 4, { width: C3 - 3, align: 'right', lineBreak: false });

    y += HH;

    // ── 2. INFO BENEFICIARIO ────────────────────────────────────────────────
    const LW = 75;
    const infoRows: [string, string][] = [
      ['BENEFICIARIO:', (remito.beneficiario.nombre as string).toUpperCase()],
      ['DIRECCION:', (remito.beneficiario.direccion || '').toUpperCase()],
      ['TELEFONO', remito.beneficiario.telefono || ''],
    ];
    for (const [label, val] of infoRows) {
      doc.lineWidth(1).rect(M, y, CW, IRH).stroke();
      doc.moveTo(M + LW, y).lineTo(M + LW, y + IRH).stroke();
      doc.font('Helvetica-Bold').fontSize(9)
        .text(label, M + 4, y + 4, { width: LW - 4, lineBreak: false });
      doc.font('Helvetica').fontSize(9)
        .text(val, M + LW + 4, y + 4, { width: CW - LW - 8, align: 'center', lineBreak: false });
      y += IRH;
    }

    // ── 3. TABLA DE ITEMS ───────────────────────────────────────────────────
    const CodW = CW * 0.12;
    const DescW = CW * 0.68;
    const CantW = CW * 0.2;

    // Cabecera
    doc.rect(M, y, CW, THH).fillAndStroke('#d0d0d0', '#000');
    doc
      .moveTo(M + CodW, y).lineTo(M + CodW, y + THH).stroke()
      .moveTo(M + CodW + DescW, y).lineTo(M + CodW + DescW, y + THH).stroke();
    doc.fillColor('#000').font('Helvetica-Bold').fontSize(9);
    doc.text('CODIGO', M, y + 4, { width: CodW, align: 'center', lineBreak: false });
    doc.text('DESCRIPCION', M + CodW, y + 4, { width: DescW, align: 'center', lineBreak: false });
    doc.text('CANTIDAD', M + CodW + DescW, y + 4, { width: CantW, align: 'center', lineBreak: false });
    y += THH;

    // Filas (items + vacías hasta llenar la página)
    for (let i = 0; i < totalRows; i++) {
      doc.lineWidth(1).rect(M, y, CW, TRH).stroke();
      doc
        .moveTo(M + CodW, y).lineTo(M + CodW, y + TRH).stroke()
        .moveTo(M + CodW + DescW, y).lineTo(M + CodW + DescW, y + TRH).stroke();
      if (i < remito.items.length) {
        const item = remito.items[i];
        doc.font('Helvetica').fontSize(9)
          .text((item.articulo.nombre as string).toUpperCase(), M + CodW, y + 3, {
            width: DescW, align: 'center', lineBreak: false,
          });
        doc.text(`${item.cantidad} UNIDADES`, M + CodW + DescW, y + 3, {
          width: CantW, align: 'center', lineBreak: false,
        });
      }
      y += TRH;
    }

    // ── 4. PIE LEGAL ───────────────────────────────────────────────────────
    doc.lineWidth(1).rect(M, y, CW, footerH).stroke();

    let fy = y + FP;
    doc.font('Helvetica').fontSize(fSize)
      .text(tA1, M + FP, fy, { width: FW, continued: true });
    doc.font('Helvetica-Bold').text(tA2);
    fy = doc.y + 2;

    for (const t of [tB, tC, tD]) {
      doc.font('Helvetica').fontSize(fSize).text(t, M + FP, fy, { width: FW });
      fy = doc.y + 2;
    }

    y += footerH;

    // ── 5. FIRMA ───────────────────────────────────────────────────────────
    const DniW = CW * 0.25;
    const NomW = CW * 0.5;
    const FirW = CW * 0.25;

    // Fila etiquetas
    doc.lineWidth(1).rect(M, y, CW, SH_L).stroke();
    doc
      .moveTo(M + DniW, y).lineTo(M + DniW, y + SH_L).stroke()
      .moveTo(M + DniW + NomW, y).lineTo(M + DniW + NomW, y + SH_L).stroke();
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#000');
    doc.text('DNI', M, y + 4, { width: DniW, align: 'center', lineBreak: false });
    doc.text('APELLIDO Y NOMBRE', M + DniW, y + 4, { width: NomW, align: 'center', lineBreak: false });
    doc.text('FIRMA', M + DniW + NomW, y + 4, { width: FirW, align: 'center', lineBreak: false });
    y += SH_L;

    // Fila escritura (con líneas punteadas para completar a mano)
    doc.lineWidth(1).rect(M, y, CW, SH_W).stroke();
    doc
      .moveTo(M + DniW, y).lineTo(M + DniW, y + SH_W).stroke()
      .moveTo(M + DniW + NomW, y).lineTo(M + DniW + NomW, y + SH_W).stroke();

    const dotY = y + SH_W - 8;
    doc.dash(2, { space: 2 }).lineWidth(0.5);
    doc.moveTo(M + 6, dotY).lineTo(M + DniW - 6, dotY).stroke();
    doc.moveTo(M + DniW + 6, dotY).lineTo(M + DniW + NomW - 6, dotY).stroke();
    doc.moveTo(M + DniW + NomW + 6, dotY).lineTo(M + CW - 6, dotY).stroke();
    doc.undash().lineWidth(1);
  }
}
