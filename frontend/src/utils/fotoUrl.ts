/**
 * Resuelve la URL de una foto de remito:
 * - Si ya es URL completa (Supabase Storage) → la devuelve tal cual.
 * - Si es path local legado (ej: "uploads/remitos/foto.jpg") → apunta al backend.
 */
export function resolveFileUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  // Legado: path local guardado pre-Supabase
  const api = import.meta.env.VITE_API_URL || '';
  const clean = path.replace(/^\/uploads\//, '').replace(/^uploads\//, '');
  return `${api}/uploads/${clean}`;
}
