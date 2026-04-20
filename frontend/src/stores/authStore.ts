import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';
import { invalidateAll } from '../utils/staticCache';

interface User {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  programa?: any;
  depositoId?: number;
  deposito?: any;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  setAuth: (token: string, refreshToken: string | null, user: User) => void;
  setTokens: (token: string, refreshToken: string | null) => void;
  logout: () => void;
  login: (email: string, password: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      user: null,
      setAuth: (token, refreshToken, user) => {
        localStorage.setItem('token', token);
        if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
        set({ token, refreshToken, user });
      },
      setTokens: (token, refreshToken) => {
        localStorage.setItem('token', token);
        if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
        set({ token, refreshToken });
      },
      logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        // Señal para otras pestañas
        localStorage.setItem('sigam:logout', Date.now().toString());
        localStorage.removeItem('sigam:logout');
        invalidateAll();
        set({ token: null, refreshToken: null, user: null });
      },
      login: async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        const { access_token, refresh_token, user } = response.data;
        localStorage.setItem('token', access_token);
        if (refresh_token) localStorage.setItem('refresh_token', refresh_token);
        set({ token: access_token, refreshToken: refresh_token ?? null, user });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);

// Escuchar eventos de storage para sincronizar logout entre pestañas
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'sigam:logout') {
      useAuthStore.setState({ token: null, refreshToken: null, user: null });
    }
    // Si la clave principal fue eliminada (otra pestaña limpió auth-storage)
    if (e.key === 'auth-storage' && !e.newValue) {
      useAuthStore.setState({ token: null, refreshToken: null, user: null });
    }
  });
}
