/**
 * Caché en memoria para datos estáticos que no cambian entre navegaciones.
 * TTL: 5 minutos. Evita refetch innecesario al volver a Cronograma, Remitos, etc.
 */
import api from '../services/api';

interface CacheEntry<T> { data: T; ts: number; }
const store = new Map<string, CacheEntry<any>>();
const TTL = 5 * 60 * 1000; // 5 min

function get<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > TTL) { store.delete(key); return null; }
  return entry.data as T;
}

function set<T>(key: string, data: T) {
  store.set(key, { data, ts: Date.now() });
}

export function invalidate(key: string) { store.delete(key); }
export function invalidateAll() { store.clear(); }

async function cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const hit = get<T>(key);
  if (hit !== null) return hit;
  const data = await fetcher();
  set(key, data);
  return data;
}

// ── Helpers tipados ─────────────────────────────────────────────────────────

export const getBeneficiarios = (limit = 500) =>
  cached(`beneficiarios:${limit}`, async () => {
    const r = await api.get(`/beneficiarios`, { params: { limit } });
    return (r.data?.data ?? r.data) as any[];
  });

export const getProgramas = () =>
  cached('programas', async () => {
    const r = await api.get('/programas');
    return (r.data ?? []) as any[];
  });

export const getDepositos = () =>
  cached('depositos', async () => {
    const r = await api.get('/depositos');
    return (r.data ?? []) as any[];
  });

export const getArticulos = () =>
  cached('articulos', async () => {
    const r = await api.get('/articulos');
    return (r.data ?? []) as any[];
  });
