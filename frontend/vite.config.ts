import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['*.svg', '*.jpg', '*.png'],
      manifest: {
        name: 'SIGAM — Gestión Alimentaria Municipal',
        short_name: 'SIGAM',
        description: 'Sistema de Gestión Alimentaria Municipal — Municipalidad de La Plata',
        theme_color: '#1565C0',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        lang: 'es',
        icons: [
          {
            src: '/pwa-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/pwa-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Mis Casos',
            short_name: 'Casos',
            description: 'Ver y gestionar casos particulares',
            url: '/mis-casos',
            icons: [{ src: '/pwa-192.svg', sizes: '192x192' }],
          },
          {
            name: 'Depósito',
            short_name: 'Depósito',
            description: 'Confirmar entregas en depósito',
            url: '/deposito',
            icons: [{ src: '/pwa-192.svg', sizes: '192x192' }],
          },
        ],
        categories: ['productivity', 'government'],
      },
      workbox: {
        // Cachear assets estáticos y la shell de la app
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/uploads/],
        runtimeCaching: [
          {
            // API: network-first — datos frescos siempre, cache como fallback offline
            urlPattern: /^https?:\/\/.*\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
              networkTimeoutSeconds: 5,
            },
          },
          {
            // Fotos de firmas: cache-first (no cambian)
            urlPattern: /^https?:\/\/.*\/uploads\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'uploads-cache',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      devOptions: {
        enabled: false, // no activar SW en dev para no interferir con hot reload
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('react-router')) return 'vendor-react';
            if (id.includes('@mui/x-charts') || id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
            if (id.includes('@mui/material') || id.includes('@mui/icons') || id.includes('@emotion')) return 'vendor-mui';
            if (id.includes('leaflet') || id.includes('react-leaflet')) return 'vendor-leaflet';
            if (id.includes('xlsx')) return 'vendor-xlsx';
            if (id.includes('date-fns')) return 'vendor-datefns';
            if (id.includes('zustand') || id.includes('axios')) return 'vendor-utils';
          }
        },
      },
    },
  },
});
