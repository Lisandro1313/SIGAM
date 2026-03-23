import { useState } from 'react';
import {
  Box, Typography, TextField, Button, CircularProgress,
  Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Alert, Divider, InputAdornment,
} from '@mui/material';
import { Search as SearchIcon, Badge as BadgeIcon } from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../services/api';

const ESTADO_COLOR: Record<string, 'warning' | 'info' | 'success' | 'error' | 'default'> = {
  PENDIENTE: 'warning', EN_REVISION: 'info', APROBADO: 'success', RECHAZADO: 'error', RESUELTO: 'default',
};

export default function BusquedaDNI() {
  const [dni, setDni] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [error, setError] = useState('');

  const buscar = async () => {
    const q = dni.trim();
    if (!q) return;
    setLoading(true);
    setError('');
    setResultado(null);
    try {
      const res = await api.get('/beneficiarios/buscar-dni', { params: { dni: q } });
      setResultado(res.data);
      if (res.data.beneficiarios.length === 0 && res.data.casos.length === 0 && res.data.integrantes.length === 0) {
        setError(`No se encontraron registros para el DNI ${q}`);
      }
    } catch {
      setError('Error al buscar. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const total = resultado
    ? resultado.beneficiarios.length + resultado.casos.length + resultado.integrantes.length
    : 0;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <BadgeIcon color="primary" />
        <Typography variant="h5" fontWeight="bold">Búsqueda por DNI</Typography>
      </Box>

      <Paper variant="outlined" sx={{ p: 3, mb: 3, maxWidth: 500 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Buscá un DNI para ver todos los registros asociados en el sistema: beneficiarios, casos particulares e integrantes de espacios.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            label="Número de DNI"
            value={dni}
            onChange={(e) => setDni(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && buscar()}
            size="small"
            sx={{ flex: 1 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
            }}
          />
          <Button variant="contained" onClick={buscar} disabled={loading || !dni.trim()}>
            {loading ? <CircularProgress size={20} /> : 'Buscar'}
          </Button>
        </Box>
      </Paper>

      {error && <Alert severity="info" sx={{ mb: 2 }}>{error}</Alert>}

      {resultado && total > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Typography variant="subtitle1" color="text.secondary">
            {total} registro{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''} para DNI <strong>{resultado.dni}</strong>
          </Typography>

          {/* ── Beneficiarios ── */}
          {resultado.beneficiarios.length > 0 && (
            <Box>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                Beneficiarios ({resultado.beneficiarios.length})
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell>#</TableCell>
                      <TableCell>Nombre</TableCell>
                      <TableCell>Tipo</TableCell>
                      <TableCell>Programa</TableCell>
                      <TableCell>Secretaría</TableCell>
                      <TableCell>Estado</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {resultado.beneficiarios.map((b: any) => (
                      <TableRow key={b.id} hover>
                        <TableCell>{b.id}</TableCell>
                        <TableCell><strong>{b.nombre}</strong></TableCell>
                        <TableCell><Typography variant="caption">{b.tipo}</Typography></TableCell>
                        <TableCell>{b.programa?.nombre ?? '—'}</TableCell>
                        <TableCell>
                          {b.programa?.secretaria && (
                            <Chip label={b.programa.secretaria} size="small" color={b.programa.secretaria === 'AC' ? 'warning' : 'primary'} variant="outlined" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip label={b.activo ? 'Activo' : 'Baja'} size="small" color={b.activo ? 'success' : 'default'} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* ── Casos particulares ── */}
          {resultado.casos.length > 0 && (
            <Box>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                Casos particulares ({resultado.casos.length})
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell>#</TableCell>
                      <TableCell>Nombre solicitante</TableCell>
                      <TableCell>Tipo</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell>Prioridad</TableCell>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Remito</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {resultado.casos.map((c: any) => (
                      <TableRow key={c.id} hover>
                        <TableCell>{c.id}</TableCell>
                        <TableCell><strong>{c.nombreSolicitante}</strong></TableCell>
                        <TableCell><Typography variant="caption">{c.tipo}</Typography></TableCell>
                        <TableCell>
                          <Chip label={c.estado.replace('_', ' ')} size="small" color={ESTADO_COLOR[c.estado] ?? 'default'} />
                        </TableCell>
                        <TableCell>
                          <Chip label={c.prioridad} size="small" color={c.prioridad === 'URGENTE' ? 'error' : c.prioridad === 'ALTA' ? 'warning' : 'default'} variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">{format(new Date(c.createdAt), 'dd/MM/yyyy', { locale: es })}</Typography>
                        </TableCell>
                        <TableCell>
                          {c.remito ? (
                            <Typography variant="caption" color="success.main">{c.remito.numero}</Typography>
                          ) : (
                            <Typography variant="caption" color="text.disabled">—</Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* ── Integrantes de espacio ── */}
          {resultado.integrantes.length > 0 && (
            <Box>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                Integrante de espacio/comedor ({resultado.integrantes.length})
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell>Nombre</TableCell>
                      <TableCell>Espacio / Comedor</TableCell>
                      <TableCell>Programa</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {resultado.integrantes.map((i: any) => (
                      <TableRow key={i.id} hover>
                        <TableCell><strong>{i.nombre}</strong></TableCell>
                        <TableCell>{i.beneficiario?.nombre ?? '—'}</TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {i.beneficiario?.programa?.nombre ?? '—'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
