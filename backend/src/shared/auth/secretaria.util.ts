/**
 * Helper unico para resolver la secretaria del usuario autenticado.
 *
 * Antes estaba copiado en 13 controllers/services con ligeras variaciones —
 * si alguien agrega un endpoint y se olvida del filtro, hay leak entre secretarias.
 *
 * Reglas:
 *  - ADMIN, VISOR, LOGISTICA, CHOFER            -> null  (ven TODO, ambas secretarias)
 *  - ASISTENCIA_CRITICA                         -> 'AC'
 *  - OPERADOR_PROGRAMA, TRABAJADORA_SOCIAL,
 *    NUTRICIONISTA, cualquier otro              -> 'PA'  (default seguro: PA es la secretaria mayoritaria)
 *
 * Importante: `null` significa "no filtrar". Solo los roles globales reciben null.
 * Si un rol nuevo aparece y no se contempla aca, por defecto cae en 'PA' para
 * evitar leaks accidentales a AC.
 */
export type SecretariaScope = 'PA' | 'AC' | null;

const GLOBAL_ROLES = new Set(['ADMIN', 'VISOR', 'LOGISTICA', 'CHOFER']);

export function getSecretariaFromRol(rol?: string | null): SecretariaScope {
  if (!rol) return 'PA';
  if (GLOBAL_ROLES.has(rol)) return null;
  if (rol === 'ASISTENCIA_CRITICA') return 'AC';
  return 'PA';
}

/** Extrae la secretaria desde el objeto `req` de NestJS. */
export function getSecretariaFromReq(req: any): SecretariaScope {
  return getSecretariaFromRol(req?.user?.rol);
}

/**
 * Variante para operaciones de ESCRITURA: nunca devuelve null, porque un
 * registro nuevo debe pertenecer a una secretaria concreta.
 *  - ASISTENCIA_CRITICA -> 'AC'
 *  - resto              -> 'PA'
 */
export function getSecretariaForWrite(rol?: string | null): 'PA' | 'AC' {
  return rol === 'ASISTENCIA_CRITICA' ? 'AC' : 'PA';
}
