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

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Limpiar TODAS las claves de sesión (directas + zustand-persist)
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('auth-storage');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default api;
