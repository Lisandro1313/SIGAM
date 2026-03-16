import { useEffect, useState } from 'react';
import { Box, CircularProgress, LinearProgress, Typography } from '@mui/material';

const TIPS = [
  'Verificando que los fideos estén bien contados...',
  'Consultando el stock de yerba...',
  'Calculando los kilos del mes...',
  'Revisando el cronograma de entregas...',
  'Preguntándole a la base de datos...',
  'Ordenando los remitos por fecha...',
  'Contando los beneficiarios activos...',
  'Buscando los programas disponibles...',
  'Sincronizando con el depósito...',
  'Preparando el resumen operativo...',
  'Chequeando el aceite y el arroz...',
  'Cargando la información del mes...',
  'Preparando agua para el mate...',
  'Controlando la heladera del depósito...',
  'Revisando si llegaron las lentejas...',
  'Acomodando los paquetes de azúcar...',
  'Chequeando la polenta x 500 grs...',
  'Contando los aceites uno por uno...',
  'Verificando el dulce de leche (urgente)...',
  'Revisando el stock de galletitas...',
  'Calculando cuánto arroz queda...',
  'Actualizando el libro de inventario...',
  'Chequeando las fechas de vencimiento...',
  'Preparando el informe del día...',
];

const FRASES = [
  '¿Qué es el tiempo? ¿Algo que pasa, o algo en lo que vivimos?',
  '¿Somos realmente libres, o nuestras decisiones ya estaban condicionadas?',
  '¿Te has convertido en la persona que querías ser?',
  '¿Cuál es tu verdadera filosofía de vida?',
  'Si pudieras vivir para siempre, ¿lo harías?',
  '¿Qué es lo que más te asusta de tu futuro?',
  '¿La felicidad es un destino o una forma de viajar?',
  '¿Cambia una persona realmente, o solo cambian las circunstancias?',
  '¿Existe el altruismo puro, o siempre hay algo que ganamos al ayudar?',
  '¿Tiene sentido buscarle un propósito a la vida, o el propósito se construye?',
  '¿Si un árbol cae en el bosque y nadie lo escucha, hace ruido?',
  '¿Qué tan distinta sería tu vida si hubieras nacido en otro lugar?',
  '¿Qué significa realmente "tener éxito"?',
  '¿Le tenés más miedo al fracaso o al arrepentimiento?',
  '¿Qué le dirías a tu yo de hace diez años?',
];

export default function LoadingPage() {
  const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * TIPS.length));
  const [fraseIndex] = useState(() => Math.floor(Math.random() * FRASES.length));

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex(i => (i + 1) % TIPS.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="60vh" gap={3}>
      <CircularProgress size={48} />
      <LinearProgress sx={{ width: 320, borderRadius: 4 }} />
      <Typography variant="body1" color="text.secondary" sx={{ fontStyle: 'italic', textAlign: 'center', maxWidth: 380 }}>
        {TIPS[tipIndex]}
      </Typography>
      <Box sx={{ mt: 2, px: 3, py: 2, borderLeft: '3px solid', borderColor: 'primary.main', maxWidth: 400, bgcolor: 'action.hover', borderRadius: '0 8px 8px 0' }}>
        <Typography variant="caption" color="primary" fontWeight="bold" display="block" mb={0.5}>
          Para pensar mientras esperás...
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          "{FRASES[fraseIndex]}"
        </Typography>
      </Box>
    </Box>
  );
}
