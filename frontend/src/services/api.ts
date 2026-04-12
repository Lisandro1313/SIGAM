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

// Interceptor para agregar token
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar errores (incluye retry con backoff para 429)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('auth-storage');
      window.location.href = '/';
      return Promise.reject(error);
    }

    // Retry automático en 429 (rate limit) — máximo 3 intentos con backoff
    const config = error.config;
    if (error.response?.status === 429 && config && !config._retryCount) {
      config._retryCount = 0;
    }
    if (error.response?.status === 429 && config && config._retryCount < 3) {
      config._retryCount += 1;
      const delay = config._retryCount * 2000; // 2s, 4s, 6s
      await new Promise(res => setTimeout(res, delay));
      return api(config);
    }

    return Promise.reject(error);
  }
);

export default api;
