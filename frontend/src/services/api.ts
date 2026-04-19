import axios from 'axios';

// En desarrollo usa el proxy de Vite (/api)
// En producción usa la variable VITE_API_URL apuntando al backend de Render
const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const api = axios.create({ baseURL });

// Lee el token desde donde sea que esté guardado
function getToken(): string | null {
  // Primero intenta la clave directa (seteada en login)
  const direct = localStorage.getItem('token');
  if (direct) return direct;
  // Si no, lee desde el storage de zustand-persist
  try {
    const raw = localStorage.getItem('auth-storage');
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed?.state?.token ?? null;
    }
  } catch {}
  return null;
}

function getRefreshToken(): string | null {
  const direct = localStorage.getItem('refresh_token');
  if (direct) return direct;
  try {
    const raw = localStorage.getItem('auth-storage');
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed?.state?.refreshToken ?? null;
    }
  } catch {}
  return null;
}

function hardLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  localStorage.removeItem('auth-storage');
  window.location.href = '/';
}

// Mutex: si varias requests fallan con 401 a la vez, solo una dispara el refresh
// y el resto espera el mismo promise.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    // Request "cruda" (sin interceptor) para evitar loops.
    const resp = await axios.post(`${baseURL}/auth/refresh`, { refresh_token: refreshToken });
    const { access_token, refresh_token: newRefresh } = resp.data || {};
    if (!access_token) return null;
    localStorage.setItem('token', access_token);
    if (newRefresh) localStorage.setItem('refresh_token', newRefresh);
    // Mantener zustand-persist sincronizado
    try {
      const raw = localStorage.getItem('auth-storage');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.state) {
          parsed.state.token = access_token;
          if (newRefresh) parsed.state.refreshToken = newRefresh;
          localStorage.setItem('auth-storage', JSON.stringify(parsed));
        }
      }
    } catch {}
    return access_token;
  } catch {
    return null;
  }
}

// Interceptor para agregar token
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar errores (incluye retry con backoff para 429 y refresh en 401)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    // 401: intentar refresh una sola vez por request; si falla, logout.
    // No aplicar al propio endpoint de refresh ni al login para evitar loops.
    const url: string = config?.url || '';
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/refresh');
    if (error.response?.status === 401 && config && !config._retriedAuth && !isAuthEndpoint) {
      config._retriedAuth = true;
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const newToken = await refreshPromise;
      if (newToken) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${newToken}`;
        return api(config);
      }
      hardLogout();
      return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      hardLogout();
      return Promise.reject(error);
    }

    // Retry automático en 429 (rate limit) — máximo 3 intentos con backoff + jitter
    // El jitter evita que múltiples requests reintentan al mismo tiempo (thundering herd)
    if (error.response?.status === 429 && config) {
      if (config._retryCount === undefined) config._retryCount = 0;
      if (config._retryCount < 3) {
        config._retryCount += 1;
        const base = config._retryCount * 2000; // 2s, 4s, 6s
        const jitter = Math.random() * 1000;     // +0–1s aleatorio
        await new Promise(res => setTimeout(res, base + jitter));
        return api(config);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
