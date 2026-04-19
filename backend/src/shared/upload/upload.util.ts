import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { extname } from 'path';

// Whitelists de MIME y extensión para uploads.
// Cualquier archivo que no caiga acá se rechaza en el controller.

export const MIME_IMAGES: ReadonlySet<string> = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export const MIME_DOCUMENTS: ReadonlySet<string> = new Set([
  // Imágenes (los documentos frecuentemente se adjuntan como foto)
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  // PDF
  'application/pdf',
  // Word
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // Excel
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  // Texto
  'text/plain',
  'text/csv',
]);

const EXT_IMAGE = /^\.(jpe?g|png|webp|gif)$/i;
const EXT_DOCUMENT = /^\.(jpe?g|png|webp|gif|pdf|docx?|xlsx?|txt|csv)$/i;

export function assertMime(
  file: Express.Multer.File | undefined,
  allowed: ReadonlySet<string>,
): asserts file is Express.Multer.File {
  if (!file) throw new BadRequestException('No se recibió archivo');
  if (!allowed.has(file.mimetype)) {
    throw new BadRequestException(`Tipo de archivo no permitido: ${file.mimetype}`);
  }
  const ext = extname(file.originalname || '').toLowerCase();
  const extRegex = allowed === MIME_IMAGES ? EXT_IMAGE : EXT_DOCUMENT;
  if (!extRegex.test(ext)) {
    throw new BadRequestException(`Extensión de archivo no permitida: ${ext || '(sin extensión)'}`);
  }
}

// Genera un nombre seguro basado en UUID preservando la extensión validada.
// El nombre original NUNCA se usa en el path de storage — evita path traversal,
// nombres con caracteres raros, colisiones, y fingerprinting del filesystem.
export function safeFilename(originalname: string): string {
  const ext = extname(originalname || '').toLowerCase();
  const safeExt = EXT_DOCUMENT.test(ext) ? ext : '';
  return `${randomUUID()}${safeExt}`;
}
