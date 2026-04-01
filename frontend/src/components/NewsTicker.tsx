import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { Newspaper as NewsIcon } from '@mui/icons-material';
import api from '../services/api';

interface Noticia {
  categoria: string;
  titulo: string;
  fuente: string;
  url: string;
}

const REFRESH_MS = 30 * 60 * 1000; // 30 minutos

export default function NewsTicker() {
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    const load = () => {
      api.get<Noticia[]>('/noticias')
        .then(r => { setNoticias(r.data ?? []); setError(false); })
        .catch(() => setError(true));
    };
    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => clearInterval(interval);
  }, []);

  if (error || noticias.length === 0) return null;

  // Duplicar el array para el loop continuo sin cortes
  const items = [...noticias, ...noticias];
  const texto = items.map(n => `${n.categoria.toUpperCase()}: ${n.titulo}  ·  `).join('');

  // Velocidad proporcional al contenido: ~7px por carácter, 120px/s de velocidad
  const durationSec = Math.max(20, Math.round((texto.length * 7 + 1200) / 120));

  return (
    <Box
      sx={{
        width: '100%',
        bgcolor: 'primary.dark',
        color: 'white',
        height: 28,
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* Etiqueta fija */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          px: 1.5,
          bgcolor: 'secondary.main',
          height: '100%',
          flexShrink: 0,
          zIndex: 1,
        }}
      >
        <NewsIcon sx={{ fontSize: 14 }} />
        <Typography variant="caption" fontWeight="bold" sx={{ fontSize: '0.65rem', whiteSpace: 'nowrap' }}>
          NOTICIAS
        </Typography>
      </Box>

      {/* Texto animado */}
      <Box sx={{ overflow: 'hidden', flex: 1, height: '100%', display: 'flex', alignItems: 'center' }}>
        <Box
          sx={{
            display: 'inline-block',
            whiteSpace: 'nowrap',
            animation: `ticker-scroll ${durationSec}s linear infinite`,
            willChange: 'transform',
            '@keyframes ticker-scroll': {
              '0%': { transform: 'translateX(100vw)' },
              '100%': { transform: 'translateX(-100%)' },
            },
          }}
        >
          <Typography
            variant="caption"
            sx={{ fontSize: '0.72rem', letterSpacing: 0.2, opacity: 0.95 }}
          >
            {texto}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
