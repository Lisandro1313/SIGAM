import { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Grid,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  CalendarMonth as CalendarIcon,
  PlayArrow as GenerateIcon,
} from '@mui/icons-material';
import api from '../services/api';

export default function CronogramaPage() {
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [depositoId, setDepositoId] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleGenerarCronograma = async () => {
    try {
      setLoading(true);
      setResult(null);
      const response = await api.post('/cronograma/generar-mensual', {
        mes,
        anio,
      });
      setResult({
        type: 'success',
        message: `Se crearon ${response.data.entregasCreadas} entregas programadas`,
      });
    } catch (error: any) {
      setResult({
        type: 'error',
        message: error.response?.data?.message || 'Error al generar cronograma',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerarRemitosMasivos = async () => {
    try {
      setLoading(true);
      setResult(null);
      const response = await api.post('/cronograma/generar-remitos-masivos', {
        mes,
        anio,
        depositoId,
      });
      const { remitosGenerados, errores } = response.data;
      setResult({
        type: errores.length > 0 ? 'warning' : 'success',
        message: `Se generaron ${remitosGenerados.length} remitos. ${
          errores.length > 0 ? `${errores.length} con errores.` : ''
        }`,
        details: errores,
      });
    } catch (error: any) {
      setResult({
        type: 'error',
        message: error.response?.data?.message || 'Error al generar remitos',
      });
    } finally {
      setLoading(false);
    }
  };

  const meses = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Cronograma Automático
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Genera entregas programadas y remitos masivos basados en plantillas
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              <CalendarIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              Generar Cronograma Mensual
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Crea entregas programadas para todos los beneficiarios con frecuencia
              MENSUAL o BIMESTRAL según corresponda
            </Typography>

            <TextField
              select
              fullWidth
              label="Mes"
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              margin="normal"
            >
              {meses.map((nombre, index) => (
                <MenuItem key={index} value={index + 1}>
                  {nombre}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth
              label="Año"
              type="number"
              value={anio}
              onChange={(e) => setAnio(Number(e.target.value))}
              margin="normal"
            />

            <Button
              variant="contained"
              fullWidth
              size="large"
              startIcon={<CalendarIcon />}
              onClick={handleGenerarCronograma}
              disabled={loading}
              sx={{ mt: 2 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Generar Cronograma'}
            </Button>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              <GenerateIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              Generar Remitos Masivos
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Genera remitos automáticamente para todas las entregas PENDIENTES del
              mes usando las plantillas configuradas
            </Typography>

            <TextField
              select
              fullWidth
              label="Mes"
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              margin="normal"
            >
              {meses.map((nombre, index) => (
                <MenuItem key={index} value={index + 1}>
                  {nombre}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth
              label="Año"
              type="number"
              value={anio}
              onChange={(e) => setAnio(Number(e.target.value))}
              margin="normal"
            />

            <TextField
              select
              fullWidth
              label="Depósito"
              value={depositoId}
              onChange={(e) => setDepositoId(Number(e.target.value))}
              margin="normal"
            >
              <MenuItem value={1}>LOGISTICA</MenuItem>
              <MenuItem value={2}>CITA</MenuItem>
            </TextField>

            <Button
              variant="contained"
              fullWidth
              size="large"
              color="secondary"
              startIcon={<GenerateIcon />}
              onClick={handleGenerarRemitosMasivos}
              disabled={loading}
              sx={{ mt: 2 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Generar Remitos Masivos'}
            </Button>
          </Paper>
        </Grid>
      </Grid>

      {result && (
        <Box mt={3}>
          <Alert severity={result.type as any}>{result.message}</Alert>
          {result.details && result.details.length > 0 && (
            <Paper elevation={1} sx={{ mt: 2, p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Errores:
              </Typography>
              {result.details.map((error: any, index: number) => (
                <Typography key={index} variant="body2" color="error">
                  • Beneficiario ID {error.beneficiarioId}: {error.error}
                </Typography>
              ))}
            </Paper>
          )}
        </Box>
      )}
    </Box>
  );
}
