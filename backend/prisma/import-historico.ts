/**
 * Importación de entregas históricas — versión SQL bulk
 *
 * Estrategia:
 *   1. Parsear todo el archivo en memoria
 *   2. Crear beneficiarios nuevos con 1 INSERT bulk
 *   3. Insertar remitos con 1 INSERT bulk → obtener IDs con RETURNING
 *   4. Insertar todos los items con 1 INSERT bulk
 *
 * Sin Movimientos, sin artículos nuevos, idempotente por número.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

// Usar conexión directa para evitar limitaciones del transaction pooler
const DIRECT = process.env.DIRECT_URL || process.env.DATABASE_URL || '';
const prisma = new PrismaClient({ datasources: { db: { url: DIRECT } } });

const CHUNK = 500; // filas por INSERT

// ---------------------------------------------------------------------------
// Artículos canónicos
// ---------------------------------------------------------------------------
const ARTICULO_MAP: Array<[string, string]> = [
  ['PURE DE TOMATE',  'PURE DE TOMATE'],
  ['DULCE DE BATATA', 'DULCE DE BATATA'],
  ['DULCE DE LECHE',  'DULCE DE LECHE'],
  ['GALLETITA',       'GALLETITAS'],
  ['POLENTA',         'POLENTA X 500 GRS'],
  ['YERBA',           'YERBA X 500 GRS'],
  ['ARVEJA',          'ARVEJAS'],
  ['LENTEJA',         'LENTEJAS'],
  ['MERMELADA',       'MERMELADA'],
  ['ACEITE',          'ACEITE'],
  ['AZUCAR',          'AZUCAR'],
  ['HARINA',          'HARINA'],
  ['ARROZ',           'ARROZ'],
  ['FIDEOS',          'FIDEOS'],
  ['FIDEO',           'FIDEOS'],
  ['LECHE',           'LECHE EN POLVO'],
];

function canonicalizarArticulo(nombre: string): string | null {
  const u = nombre.trim().toUpperCase();
  for (const [kw, canon] of ARTICULO_MAP) {
    if (u.includes(kw)) return canon;
  }
  return null;
}

function parsearFecha(str: string): Date | null {
  str = str.trim();
  if (!str) return null;
  const p = str.split('/');
  if (p.length === 3) {
    const [d, m, y] = p.map(Number);
    if (!d || !m || !y || y < 2000 || y > 2035) return null;
    return new Date(y, m - 1, d, 12, 0, 0);
  }
  const dt = new Date(str);
  return isNaN(dt.getTime()) ? null : dt;
}

function cols(l: string) { return l.split('\t').map(c => c.trim()); }

function esc(v: string | null): string {
  if (v === null) return 'NULL';
  return `'${v.replace(/'/g, "''")}'`;
}

// ---------------------------------------------------------------------------
// Chunks para no superar límites de parámetros
// ---------------------------------------------------------------------------
function chunks<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const filePath = process.argv[2];
  if (!filePath) { console.error('❌ Uso: npx ts-node prisma/import-historico.ts <archivo.tsv>'); process.exit(1); }

  const fullPath = path.resolve(filePath);
  if (!fs.existsSync(fullPath)) { console.error(`❌ No encontrado: ${fullPath}`); process.exit(1); }

  const nombre = path.basename(fullPath).toUpperCase();
  let formato: 'ESPACIOS' | 'PARTICULARES' | 'VASO_LECHE' = 'ESPACIOS';
  if (nombre.includes('PARTICULAR')) formato = 'PARTICULARES';
  else if (nombre.includes('VASO'))  formato = 'VASO_LECHE';

  console.log(`\n📂 ${path.basename(fullPath)}\n🔍 Formato: ${formato}\n`);

  const lineas = fs.readFileSync(fullPath, 'utf-8').split('\n').map(l => l.replace(/\r$/, ''));

  // ── Catálogos ──────────────────────────────────────────────────────────
  console.log('⏳ Cargando catálogos...');
  const [depositos, programas, articulosDB, benefDB, numerosDB] = await Promise.all([
    prisma.deposito.findMany(),
    prisma.programa.findMany(),
    prisma.articulo.findMany(),
    prisma.beneficiario.findMany(),
    prisma.remito.findMany({ select: { numero: true } }),
  ]);

  const depositoMap = new Map(depositos.map(d => [d.codigo.toUpperCase(), d]));
  const programaMap = new Map(programas.map(p => [p.nombre.toUpperCase(), p]));
  const articuloDB  = new Map(articulosDB.map(a => [a.nombre.toUpperCase(), a as any]));
  const benefCache  = new Map<string, { id: number }>();
  benefDB.forEach(b => benefCache.set(b.nombre.toUpperCase().trim(), b));
  const numerosUsados = new Set(numerosDB.map(r => r.numero));

  // ── Header ESPACIOS ────────────────────────────────────────────────────
  let headers: Record<string, number> = {};
  let dataStart = 0;
  if (formato === 'ESPACIOS') {
    for (let i = 0; i < Math.min(lineas.length, 5); i++) {
      const c = cols(lineas[i]);
      if (c.some(h => h.includes('Número C/R') || h.includes('Numero C/R'))) {
        c.forEach((h, idx) => { headers[h] = idx; });
        dataStart = i + 1;
        break;
      }
    }
  }
  const col = (c: string[], h: string) => c[headers[h] ?? -1]?.trim() ?? '';

  // ── Parsear ─────────────────────────────────────────────────────────────
  console.log('⏳ Parseando filas...');

  interface Fila {
    numero: string; fecha: Date;
    espacioNombre: string; domicilio: string | null; telefono: string | null; localidad: string | null;
    depositoCod: string; programaNom: string; tipoB: string;
    responsableNombre: string | null; responsableDNI: string | null; totalKg: number | null;
    items: { articuloId: number; cantidad: number; pesoKg: number | null }[];
  }

  const filas: Fila[] = [];
  let saltados = 0;

  for (let i = dataStart; i < lineas.length; i++) {
    if (!lineas[i].trim()) continue;
    const c = cols(lineas[i]);

    let numero = '', fechaStr = '', espacioNombre = '', domicilio = '',
        telefono = '', localidad = '', detalleStr = '', cantStr = '',
        pesoStr = '', depositoCod = 'CITA', programaNom = 'Espacios',
        tipoB = 'ESPACIO', responsableNombre = '', responsableDNI = '';

    if (formato === 'ESPACIOS') {
      fechaStr      = col(c, 'Fecha');
      numero        = col(c, 'Número C/R') || col(c, 'Numero C/R');
      espacioNombre = col(c, 'Espacio');
      domicilio     = col(c, 'Domicilio');
      detalleStr    = col(c, 'Detalle');
      cantStr       = col(c, 'Cantidad');
      telefono      = col(c, 'Telefono');
      localidad     = col(c, 'Localidad');
      pesoStr       = col(c, 'Peso');
      depositoCod   = col(c, 'Deposito').toUpperCase() === 'LOGISTICA' ? 'LOGISTICA' : 'CITA';
      if (col(c, 'ID').toUpperCase().includes('PARTICULAR')) { programaNom = 'Casos Particulares'; tipoB = 'CASO_PARTICULAR'; }

    } else if (formato === 'PARTICULARES') {
      fechaStr          = c[0] ?? '';
      numero            = c[1]?.trim() ?? '';
      espacioNombre     = c[2]?.trim() ?? '';
      responsableDNI    = c[3]?.trim() ?? '';
      domicilio         = c[4]?.trim() ?? '';
      detalleStr        = c[5]?.trim() ?? '';
      cantStr           = c[6]?.trim() ?? '';
      telefono          = c[7]?.trim() ?? '';
      localidad         = c[8]?.trim() ?? '';
      depositoCod = 'LOGISTICA'; programaNom = 'Casos Particulares'; tipoB = 'CASO_PARTICULAR';
      responsableNombre = espacioNombre;
      if (!espacioNombre || espacioNombre.toLowerCase() === 'beneficiario') { saltados++; continue; }
      if (parseInt((fechaStr.split('/')[2] ?? '').trim(), 10) < 2000) { saltados++; continue; }

    } else { // VASO_LECHE
      if ((c[0] ?? '').toUpperCase() !== 'EGRESO') { saltados++; continue; }
      fechaStr      = c[1] ?? '';
      numero        = c[2]?.trim() ?? '';
      espacioNombre = c[3]?.trim() ?? '';
      responsableNombre = c[4]?.trim() || c[5]?.trim() || '';
      detalleStr    = c[6]?.trim() ?? '';
      cantStr       = c[7]?.trim() ?? '';
      depositoCod = 'LOGISTICA'; programaNom = 'Vaso de Leche'; tipoB = 'ESPACIO';
      if (/^\d+$/.test(numero)) numero = `VL-${numero}`;
    }

    const fecha = parsearFecha(fechaStr);
    if (!fecha || !numero || !espacioNombre || !detalleStr) { saltados++; continue; }
    if (numerosUsados.has(numero)) { saltados++; continue; }
    numerosUsados.add(numero);

    const nombresRaw = detalleStr.split(',').map(s => s.trim()).filter(Boolean);
    const cantNums   = cantStr.split(',').map(s => { const n = parseInt(s.replace(/[^0-9]/g, ''), 10); return isNaN(n) ? 0 : n; });

    const items: Fila['items'] = [];
    for (let j = 0; j < nombresRaw.length; j++) {
      const canon = canonicalizarArticulo(nombresRaw[j]);
      if (!canon) continue;
      const art = articuloDB.get(canon);
      if (!art) continue;
      const cant = cantNums[j] ?? 0;
      if (cant <= 0) continue;
      items.push({ articuloId: art.id, cantidad: cant, pesoKg: art.pesoUnitarioKg != null ? cant * art.pesoUnitarioKg : null });
    }
    if (items.length === 0) { saltados++; continue; }
    if (!depositoMap.has(depositoCod)) { saltados++; continue; }

    const telL = (telefono && !/^(PARTICULARES|A CONFIRMAR|S\/N)$/i.test(telefono)) ? telefono : null;
    const dirL = (domicilio && !/^(PARTICULARES|A CONFIRMAR)$/i.test(domicilio)) ? domicilio : null;
    const locL = (localidad && !/^A CONFIRMAR$/i.test(localidad)) ? localidad : null;
    const dniL = (responsableDNI && /^\d{7,10}$/.test(responsableDNI)) ? responsableDNI : null;

    filas.push({ numero, fecha, espacioNombre: espacioNombre.trim(), domicilio: dirL, telefono: telL, localidad: locL, depositoCod, programaNom, tipoB, responsableNombre: responsableNombre || null, responsableDNI: dniL, totalKg: pesoStr ? (parseFloat(pesoStr) || null) : null, items });
  }

  console.log(`✅ Parseadas: ${filas.length} válidas, ${saltados} saltadas\n`);
  if (filas.length === 0) { console.log('Nada que importar.'); return; }

  // ── Beneficiarios nuevos en 1 bulk INSERT ──────────────────────────────
  const nuevosBene: { nombre: string; tipo: string; direccion: string | null; localidad: string | null; telefono: string | null; responsableNombre: string | null; responsableDNI: string | null; programaId: number | null; activo: boolean }[] = [];
  const vistosNombres = new Set<string>();

  for (const f of filas) {
    const key = f.espacioNombre.toUpperCase();
    if (!benefCache.has(key) && !vistosNombres.has(key)) {
      vistosNombres.add(key);
      const prog = programaMap.get(f.programaNom.toUpperCase()) ?? null;
      nuevosBene.push({ nombre: f.espacioNombre, tipo: f.tipoB, direccion: f.domicilio, localidad: f.localidad, telefono: f.telefono, responsableNombre: f.responsableNombre, responsableDNI: f.responsableDNI, programaId: prog?.id ?? null, activo: true });
    }
  }

  if (nuevosBene.length > 0) {
    console.log(`⏳ Insertando ${nuevosBene.length} beneficiarios...`);
    // bulk INSERT con chunks de 500
    for (const ch of chunks(nuevosBene, CHUNK)) {
      const vals = ch.map(b =>
        `(${esc(b.nombre)}, ${esc(b.tipo)}, ${esc(b.direccion)}, ${esc(b.localidad)}, ${esc(b.telefono)}, ${esc(b.responsableNombre)}, ${esc(b.responsableDNI)}, ${b.programaId ?? 'NULL'}, true, NOW(), NOW())`
      ).join(',\n');
      await prisma.$executeRawUnsafe(`
        INSERT INTO "Beneficiario" (nombre, tipo, direccion, localidad, telefono, "responsableNombre", "responsableDNI", "programaId", activo, "createdAt", "updatedAt")
        VALUES ${vals}
        ON CONFLICT DO NOTHING
      `);
    }
    // Recargar cache
    (await prisma.beneficiario.findMany()).forEach(b => benefCache.set(b.nombre.toUpperCase().trim(), b));
    console.log('✅ Beneficiarios insertados\n');
  }

  // ── Remitos bulk INSERT con RETURNING id ─────────────────────────────
  console.log(`⏳ Insertando ${filas.length} remitos...`);

  // Construimos mapeo numero→items para después
  const itemsByNumero = new Map<string, Fila['items']>();
  filas.forEach(f => itemsByNumero.set(f.numero, f.items));

  let importados = 0;
  let errores = 0;

  for (const ch of chunks(filas, CHUNK)) {
    const vals = ch.map(f => {
      const deposito    = depositoMap.get(f.depositoCod)!;
      const programa    = programaMap.get(f.programaNom.toUpperCase()) ?? null;
      const beneficiario = benefCache.get(f.espacioNombre.toUpperCase());
      if (!beneficiario) return null;

      const fechaISO = f.fecha.toISOString();
      return `(${esc(f.numero)}, '${fechaISO}', 'ENTREGADO', ${f.totalKg ?? 'NULL'}, ${deposito.id}, ${programa?.id ?? 'NULL'}, ${beneficiario.id}, '${fechaISO}', NOW(), NOW())`;
    }).filter(Boolean);

    if (vals.length === 0) continue;

    try {
      // INSERT remitos → obtener id+numero
      const rows: { id: number; numero: string }[] = await prisma.$queryRawUnsafe(`
        INSERT INTO "Remito" (numero, fecha, estado, "totalKg", "depositoId", "programaId", "beneficiarioId", "entregadoAt", "createdAt", "updatedAt")
        VALUES ${vals.join(',\n')}
        ON CONFLICT (numero) DO NOTHING
        RETURNING id, numero
      `);

      // Ahora insertar items para cada remito creado
      if (rows.length > 0) {
        const itemVals: string[] = [];
        for (const row of rows) {
          const items = itemsByNumero.get(row.numero) ?? [];
          for (const item of items) {
            itemVals.push(`(${row.id}, ${item.articuloId}, ${item.cantidad}, ${item.pesoKg ?? 'NULL'})`);
          }
        }
        if (itemVals.length > 0) {
          for (const itemChunk of chunks(itemVals, 1000)) {
            await prisma.$executeRawUnsafe(`
              INSERT INTO "RemitoItem" ("remitoId", "articuloId", cantidad, "pesoKg")
              VALUES ${itemChunk.join(',\n')}
            `);
          }
        }
        importados += rows.length;
      }
      process.stdout.write(`\r  ✅ ${importados}/${filas.length}`);
    } catch (err: any) {
      errores += ch.length;
      console.error(`\n❌ Error en chunk: ${err.message}`);
    }
  }

  console.log('\n══════════════════════════════════');
  console.log(`📊 ${formato}`);
  console.log(`  ✅ Importados: ${importados}`);
  console.log(`  ⏭️  Saltados:   ${saltados}`);
  console.log(`  ❌ Errores:    ${errores}`);
  console.log('══════════════════════════════════\n');
}

main()
  .catch(e => { console.error('\n❌ Error fatal:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
