import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditoriaService } from './auditoria.service';

// Mapa de patrones de ruta → descripción legible
const DESCRIPCIONES: Array<{ pattern: RegExp; metodo: string; desc: string }> = [
  // Beneficiarios
  { pattern: /^\/beneficiarios$/, metodo: 'POST', desc: 'Creó beneficiario' },
  { pattern: /^\/beneficiarios\/\d+$/, metodo: 'PATCH', desc: 'Editó beneficiario' },
  { pattern: /^\/beneficiarios\/\d+$/, metodo: 'DELETE', desc: 'Eliminó beneficiario' },
  { pattern: /^\/beneficiarios\/\d+\/documentos$/, metodo: 'POST', desc: 'Subió documento de beneficiario' },
  { pattern: /^\/beneficiarios\/\d+\/documentos\/\d+$/, metodo: 'DELETE', desc: 'Eliminó documento de beneficiario' },
  // Remitos
  { pattern: /^\/remitos$/, metodo: 'POST', desc: 'Creó remito' },
  { pattern: /^\/remitos\/\d+\/confirmar$/, metodo: 'POST', desc: 'Confirmó remito' },
  { pattern: /^\/remitos\/\d+\/entregar$/, metodo: 'POST', desc: 'Marcó remito como entregado' },
  { pattern: /^\/remitos\/\d+\/enviar$/, metodo: 'POST', desc: 'Envió remito por email' },
  { pattern: /^\/remitos\/\d+\/reprogramar$/, metodo: 'PATCH', desc: 'Reprogramó remito' },
  { pattern: /^\/remitos\/\d+\/anular$/, metodo: 'DELETE', desc: 'Anuló remito' },
  { pattern: /^\/remitos\/\d+$/, metodo: 'DELETE', desc: 'Eliminó remito' },
  // Stock
  { pattern: /^\/stock\/ingreso$/, metodo: 'POST', desc: 'Registró ingreso de stock' },
  { pattern: /^\/stock\/transferir$/, metodo: 'POST', desc: 'Realizó transferencia de stock' },
  { pattern: /^\/stock\/ajuste$/, metodo: 'POST', desc: 'Realizó ajuste de stock' },
  { pattern: /^\/stock\/lotes$/, metodo: 'POST', desc: 'Creó lote de artículo' },
  { pattern: /^\/stock\/lotes\/\d+$/, metodo: 'PATCH', desc: 'Editó lote de artículo' },
  { pattern: /^\/stock\/lotes\/\d+$/, metodo: 'DELETE', desc: 'Eliminó lote de artículo' },
  // Cronograma
  { pattern: /^\/cronograma\/generar$/, metodo: 'POST', desc: 'Generó cronograma mensual' },
  { pattern: /^\/cronograma\/fila$/, metodo: 'POST', desc: 'Agregó fila al cronograma' },
  { pattern: /^\/cronograma\/fila\/\d+$/, metodo: 'PATCH', desc: 'Editó fila del cronograma' },
  { pattern: /^\/cronograma\/fila\/\d+$/, metodo: 'DELETE', desc: 'Eliminó fila del cronograma' },
  { pattern: /^\/cronograma\/fila\/\d+\/generar-remito$/, metodo: 'POST', desc: 'Generó remito desde cronograma' },
  { pattern: /^\/cronograma\/generar-remitos-masivos$/, metodo: 'POST', desc: 'Generó remitos masivos' },
  { pattern: /^\/cronograma\/\d+\/cancelar$/, metodo: 'PATCH', desc: 'Canceló entrega del cronograma' },
  // Artículos
  { pattern: /^\/articulos$/, metodo: 'POST', desc: 'Creó artículo' },
  { pattern: /^\/articulos\/\d+$/, metodo: 'PATCH', desc: 'Editó artículo' },
  { pattern: /^\/articulos\/\d+\/foto$/, metodo: 'POST', desc: 'Subió foto de artículo' },
  { pattern: /^\/articulos\/\d+\/lotes$/, metodo: 'POST', desc: 'Agregó lote a artículo' },
  { pattern: /^\/articulos\/\d+\/lotes\/\d+$/, metodo: 'DELETE', desc: 'Eliminó lote de artículo' },
  // Programas
  { pattern: /^\/programas$/, metodo: 'POST', desc: 'Creó programa' },
  { pattern: /^\/programas\/\d+$/, metodo: 'PATCH', desc: 'Editó programa' },
  // Usuarios
  { pattern: /^\/usuarios$/, metodo: 'POST', desc: 'Creó usuario' },
  { pattern: /^\/usuarios\/\d+$/, metodo: 'PATCH', desc: 'Editó usuario' },
  { pattern: /^\/usuarios\/\d+$/, metodo: 'DELETE', desc: 'Eliminó usuario' },
  // Zonas
  { pattern: /^\/zonas$/, metodo: 'POST', desc: 'Creó zona en el mapa' },
  { pattern: /^\/zonas\/\d+$/, metodo: 'PATCH', desc: 'Editó zona del mapa' },
  { pattern: /^\/zonas\/\d+$/, metodo: 'DELETE', desc: 'Eliminó zona del mapa' },
  // Tareas
  { pattern: /^\/tareas$/, metodo: 'POST', desc: 'Creó tarea' },
  { pattern: /^\/tareas\/\d+$/, metodo: 'PATCH', desc: 'Editó tarea' },
  { pattern: /^\/tareas\/\d+\/completar$/, metodo: 'POST', desc: 'Completó tarea' },
  { pattern: /^\/tareas\/\d+$/, metodo: 'DELETE', desc: 'Eliminó tarea' },
  // Casos particulares
  { pattern: /^\/casos$/, metodo: 'POST', desc: 'Creó caso particular' },
  { pattern: /^\/casos\/\d+\/revisar$/, metodo: 'PATCH', desc: 'Revisó caso particular' },
  { pattern: /^\/casos\/\d+\/generar-remito$/, metodo: 'POST', desc: 'Generó remito desde caso particular' },
  { pattern: /^\/casos\/\d+\/documentos$/, metodo: 'POST', desc: 'Subió documento de caso' },
  { pattern: /^\/casos\/\d+\/documentos\/\d+$/, metodo: 'DELETE', desc: 'Eliminó documento de caso' },
  // Domicilio / Chofer
  { pattern: /^\/remitos\/\d+\/asignar-domicilio$/, metodo: 'PATCH', desc: 'Asignó remito a entrega a domicilio' },
  { pattern: /^\/remitos\/\d+\/quitar-domicilio$/, metodo: 'PATCH', desc: 'Quitó asignación de entrega a domicilio' },
  { pattern: /^\/remitos\/\d+\/retiro-deposito$/, metodo: 'POST', desc: 'Registró retiro del depósito (chofer)' },
  { pattern: /^\/remitos\/\d+\/firma-entrega$/, metodo: 'POST', desc: 'Registró firma de entrega a domicilio' },
  // Plantillas
  { pattern: /^\/plantillas$/, metodo: 'POST', desc: 'Creó plantilla de entrega' },
  { pattern: /^\/plantillas\/\d+$/, metodo: 'PATCH', desc: 'Editó plantilla de entrega' },
  { pattern: /^\/plantillas\/\d+$/, metodo: 'DELETE', desc: 'Eliminó plantilla de entrega' },
  // Backup
  { pattern: /^\/backup/, metodo: 'POST', desc: 'Ejecutó backup manual' },
  // Emails masivos
  { pattern: /^\/beneficiarios\/email-masivo$/, metodo: 'POST', desc: 'Envió email masivo a beneficiarios' },
  { pattern: /^\/remitos\/\d+\/email$/, metodo: 'POST', desc: 'Envió remito por email' },
];

function normalizePath(path: string): string {
  // Quitar prefijo /api si existe, y query string
  return path.split('?')[0].replace(/^\/api/, '') || '/';
}

function buildDescripcion(method: string, path: string): string {
  const cleanPath = normalizePath(path);
  for (const { pattern, metodo, desc } of DESCRIPCIONES) {
    if (metodo === method && pattern.test(cleanPath)) return desc;
  }
  // Fallback genérico
  const metodosLabel: Record<string, string> = { POST: 'Creó/ejecutó', PATCH: 'Editó', PUT: 'Actualizó', DELETE: 'Eliminó' };
  const segmento = cleanPath.split('/').filter(Boolean)[0] ?? 'recurso';
  return `${metodosLabel[method] ?? method} ${segmento}`;
}

function enrichDescripcion(base: string, method: string, path: string, result: any): string {
  if (!result || typeof result !== 'object') return base;
  const cleanPath = normalizePath(path);

  // Remito creado
  if (method === 'POST' && /^\/remitos$/.test(cleanPath) && result.numero) {
    const nombre = result.beneficiario?.nombre ?? result.caso?.nombreSolicitante ?? '';
    return `Creó remito ${result.numero}${nombre ? ` para ${nombre}` : ''}`;
  }
  // Remito confirmado
  if (method === 'POST' && /^\/remitos\/\d+\/confirmar$/.test(cleanPath) && result.numero) {
    const nombre = result.beneficiario?.nombre ?? result.caso?.nombreSolicitante ?? '';
    return `Confirmó remito ${result.numero}${nombre ? ` para ${nombre}` : ''}`;
  }
  // Remito entregado
  if (method === 'POST' && /^\/remitos\/\d+\/entregar$/.test(cleanPath) && result.numero) {
    const nombre = result.beneficiario?.nombre ?? result.caso?.nombreSolicitante ?? '';
    return `Marcó como entregado remito ${result.numero}${nombre ? ` para ${nombre}` : ''}`;
  }
  // Remito enviado por email
  if (method === 'POST' && /^\/remitos\/\d+\/enviar$/.test(cleanPath)) {
    return base;
  }
  // Ajuste de stock
  if (method === 'POST' && /^\/stock\/ajuste$/.test(cleanPath) && result.articulo) {
    const deposito = result.deposito?.nombre ? ` en ${result.deposito.nombre}` : '';
    return `Ajustó stock de ${result.articulo.nombre} a ${result.cantidad} u.${deposito}`;
  }
  // Ingreso de stock
  if (method === 'POST' && /^\/stock\/ingreso$/.test(cleanPath) && result.articulo) {
    const deposito = result.deposito?.nombre ? ` en ${result.deposito.nombre}` : '';
    return `Registró ingreso de ${result.articulo.nombre} (${result.cantidad} u.)${deposito}`;
  }
  // Transferencia
  if (method === 'POST' && /^\/stock\/transferir$/.test(cleanPath)) {
    return base;
  }
  // Creó beneficiario
  if (method === 'POST' && /^\/beneficiarios$/.test(cleanPath) && result.nombre) {
    return `Creó beneficiario "${result.nombre}"`;
  }
  // Editó beneficiario
  if (method === 'PATCH' && /^\/beneficiarios\/\d+$/.test(cleanPath) && result.nombre) {
    return `Editó beneficiario "${result.nombre}"`;
  }
  // Eliminó beneficiario
  if (method === 'DELETE' && /^\/beneficiarios\/\d+$/.test(cleanPath) && result.nombre) {
    return `Eliminó beneficiario "${result.nombre}"`;
  }
  // Generó remito desde cronograma / caso
  if (method === 'POST' && /^\/cronograma\/fila\/\d+\/generar-remito$/.test(cleanPath) && result.numero) {
    const nombre = result.beneficiario?.nombre ?? '';
    return `Generó remito ${result.numero} desde cronograma${nombre ? ` para ${nombre}` : ''}`;
  }
  if (method === 'POST' && /^\/casos\/\d+\/generar-remito$/.test(cleanPath) && result.numero) {
    const nombre = result.caso?.nombreSolicitante ?? result.beneficiario?.nombre ?? '';
    return `Generó remito ${result.numero} desde caso particular${nombre ? ` para ${nombre}` : ''}`;
  }
  // Asignar domicilio
  if (method === 'PATCH' && /^\/remitos\/\d+\/asignar-domicilio$/.test(cleanPath) && result.numero) {
    const chofer = result.chofer?.nombre ?? '';
    const beneficiario = result.beneficiario?.nombre ?? '';
    return `Asignó remito ${result.numero}${beneficiario ? ` (${beneficiario})` : ''} a entrega a domicilio${chofer ? ` — chofer: ${chofer}` : ''}`;
  }
  // Quitar domicilio
  if (method === 'PATCH' && /^\/remitos\/\d+\/quitar-domicilio$/.test(cleanPath) && result.numero) {
    return `Quitó asignación de domicilio del remito ${result.numero}${result.beneficiario?.nombre ? ` (${result.beneficiario.nombre})` : ''}`;
  }
  // Retiro depósito
  if (method === 'POST' && /^\/remitos\/\d+\/retiro-deposito$/.test(cleanPath) && result.numero) {
    const deposito = result.deposito?.nombre ?? '';
    return `Retiró del depósito${deposito ? ` ${deposito}` : ''} el remito ${result.numero}${result.beneficiario?.nombre ? ` (${result.beneficiario.nombre})` : ''}`;
  }
  // Firma entrega domicilio
  if (method === 'POST' && /^\/remitos\/\d+\/firma-entrega$/.test(cleanPath) && result.numero) {
    const destinatario = result.nombreDestinatario ?? '';
    return `Entregó a domicilio remito ${result.numero}${result.beneficiario?.nombre ? ` (${result.beneficiario.nombre})` : ''}${destinatario ? ` — firmó: ${destinatario}` : ''}`;
  }
  // Reprogramar remito
  if (method === 'PATCH' && /^\/remitos\/\d+\/reprogramar$/.test(cleanPath) && result.numero) {
    const fecha = result.fecha ? new Date(result.fecha).toLocaleDateString('es-AR') : '';
    return `Reprogramó remito ${result.numero}${fecha ? ` para el ${fecha}` : ''}${result.beneficiario?.nombre ? ` (${result.beneficiario.nombre})` : ''}`;
  }
  // Anular remito
  if (method === 'DELETE' && /^\/remitos\/\d+\/anular$/.test(cleanPath)) {
    return base; // result es {success, message}
  }
  // Transferencia
  if (method === 'POST' && /^\/stock\/transferir$/.test(cleanPath) && result.articulo) {
    const desde = result.depositoDesde?.nombre ?? '';
    const hacia = result.depositoHacia?.nombre ?? '';
    return `Transfirió ${result.cantidad} u. de ${result.articulo.nombre}${desde ? ` de ${desde}` : ''}${hacia ? ` a ${hacia}` : ''}`;
  }
  // Creó/editó usuario
  if (method === 'POST' && /^\/usuarios$/.test(cleanPath) && result.nombre) {
    return `Creó usuario "${result.nombre}" (${result.rol})`;
  }
  if (method === 'PATCH' && /^\/usuarios\/\d+$/.test(cleanPath) && result.nombre) {
    return `Editó usuario "${result.nombre}" (${result.rol})`;
  }
  // Creó/editó programa
  if (method === 'POST' && /^\/programas$/.test(cleanPath) && result.nombre) {
    return `Creó programa "${result.nombre}"`;
  }
  if (method === 'PATCH' && /^\/programas\/\d+$/.test(cleanPath) && result.nombre) {
    return `Editó programa "${result.nombre}"`;
  }
  // Creó/editó artículo
  if (method === 'POST' && /^\/articulos$/.test(cleanPath) && result.nombre) {
    return `Creó artículo "${result.nombre}"${result.categoria ? ` (${result.categoria})` : ''}`;
  }
  if (method === 'PATCH' && /^\/articulos\/\d+$/.test(cleanPath) && result.nombre) {
    return `Editó artículo "${result.nombre}"`;
  }

  return base;
}

function sanitizarBody(body: any): string {
  if (!body || typeof body !== 'object') return '';
  const copia = { ...body };
  // Quitar campos sensibles y pesados
  delete copia.password; delete copia.token; delete copia.foto;
  delete copia.firmaDestinatario; // base64 muy largo
  return JSON.stringify(copia).slice(0, 400);
}

@Injectable()
export class AuditoriaInterceptor implements NestInterceptor {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url, user, body } = req;

    // Solo mutaciones, omitir auth y endpoints internos (SSE tickets, etc.)
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return next.handle();
    if (url.includes('/auth/')) return next.handle();
    if (url.includes('/events/')) return next.handle();

    const descripcionBase = buildDescripcion(method, url);
    const datos = sanitizarBody(body);
    const rutaLimpia = normalizePath(url);

    return next.handle().pipe(
      tap((result) => {
        const descripcion = enrichDescripcion(descripcionBase, method, url, result);
        this.auditoriaService.log({
          usuarioId: user?.id,
          usuarioNombre: user?.nombre,
          metodo: method,
          ruta: rutaLimpia,
          descripcion,
          datos,
        }).catch(() => { /* no interrumpir si falla el log */ });
      }),
    );
  }
}
