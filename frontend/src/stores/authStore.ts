import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

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
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  login: (email: string, password: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => {
        localStorage.setItem('token', token);
        set({ token, user });
      },
      logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Señal para otras pestañas
        localStorage.setItem('sigam:logout', Date.now().toString());
        localStorage.removeItem('sigam:logout');
        set({ token: null, user: null });
      },
      login: async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        const { access_token, user } = response.data;
        localStorage.setItem('token', access_token);
        set({ token: access_token, user });
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
      useAuthStore.setState({ token: null, user: null });
    }
    // Si la clave principal fue eliminada (otra pestaña limpió auth-storage)
    if (e.key === 'auth-storage' && !e.newValue) {
      useAuthStore.setState({ token: null, user: null });
    }
  });
}
