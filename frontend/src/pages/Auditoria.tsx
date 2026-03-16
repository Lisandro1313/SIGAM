import { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Button, FormControl, InputLabel, Select,
  MenuItem, Chip, CircularProgress, Alert, Tooltip,
} from '@mui/material';
import { FilterAlt as FilterIcon, Security as AuditIcon } from '@mui/icons-material';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../services/api';

const METODO_COLOR: Record<string, 'error' | 'warning' | 'info' | 'success' | 'default'> = {
  POST: 'success',
  PUT: 'info',
  PATCH: 'warning',
  DELETE: 'error',
};

export default function Auditoria() {
  const [logs, setLogs]           = useState<any[]>([]);
  const [usuarios, setUsuarios]   = useState<any[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  const [usuarioId, setUsuarioId] = useState('');
  const [metodo, setMetodo]       = useState('');
  const [desde, setDesde]         = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [hasta, setHasta]         = useState(format(new Date(), 'yyyy-MM-dd'));
  const [buscar, setBuscar]       = useState('');

  useEffect(() => {
    api.get('/auditoria/usuarios').then((r) => setUsuarios(r.data)).catch(() => {});
    buscarLogs();
  }, []);

  const buscarLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const params: any = { desde, hasta };
      if (usuarioId) params.usuarioId = usuarioId;
      if (metodo)    params.metodo    = metodo;
      if (buscar.trim()) params.buscar = buscar.trim();
      const res = await api.get('/auditoria', { params });
      setLogs(res.data);
    } catch {
      setError('No se pudo cargar el registro de auditoría.');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={1.5} mb={3}>
        <AuditIcon color="primary" />
        <Typography variant="h4" fontWeight="bold">Auditoría del Sistema</Typography>
      </Box>

      {/* Filtros */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Box display="flex" gap={2} flexWrap="wrap" alignItems="flex-end">
          <TextField
            label="Desde" type="date" size="small" value={desde}
            onChange={(e) => setDesde(e.target.value)}
            InputLabelProps={{ shrink: true }} sx={{ width: 160 }}
          />
          <TextField
            label="Hasta" type="date" size="small" value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            InputLabelProps={{ shrink: true }} sx={{ width: 160 }}
          />
          <FormControl size="small" sx={{ width: 200 }}>
            <InputLabel>Usuario</InputLabel>
            <Select value={usuarioId} label="Usuario" onChange={(e) => setUsuarioId(e.target.value)}>
              <MenuItem value="">Todos</MenuItem>
              {usuarios.map((u) => (
                <MenuItem key={u.id} value={u.id}>{u.nombre}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ width: 130 }}>
            <InputLabel>Método</InputLabel>
            <Select value={metodo} label="Método" onChange={(e) => setMetodo(e.target.value)}>
              <MenuItem value="">Todos</MenuItem>
              {['POST', 'PATCH', 'PUT', 'DELETE'].map((m) => (
                <MenuItem key={m} value={m}>{m}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Buscar en descripción" size="small" value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') buscarLogs(); }}
            sx={{ width: 220 }}
          />
          <Button variant="contained" startIcon={<FilterIcon />} onClick={buscarLogs} disabled={loading}>
            Buscar
          </Button>
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
      ) : logs.length === 0 ? (
        <Alert severity="info">No hay registros en el período seleccionado con los filtros aplicados.</Alert>
      ) : (
        <>
          <Typography variant="caption" color="text.secondary" display="block" mb={1}>
            {logs.length} registro{logs.length !== 1 ? 's' : ''} encontrado{logs.length !== 1 ? 's' : ''}
          </Typography>
          <TableContainer component={Paper} elevation={2}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.100' }}>
                  <TableCell>Fecha y hora</TableCell>
                  <TableCell>Usuario</TableCell>
                  <TableCell>Acción</TableCell>
                  <TableCell>Descripción</TableCell>
                  <TableCell>Ruta</TableCell>
                  <TableCell>Datos</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <Typography variant="caption">
                        {format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm:ss', { locale: es })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">{log.usuarioNombre || '—'}</Typography>
                      {log.usuarioId && (
                        <Typography variant="caption" color="text.secondary">ID {log.usuarioId}</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={log.metodo}
                        size="small"
                        color={METODO_COLOR[log.metodo] ?? 'default'}
                      />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 280 }}>
                      <Typography variant="body2">{log.descripcion || '—'}</Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 200 }}>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {log.ruta}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 200 }}>
                      {log.datos ? (
                        <Tooltip title={log.datos} arrow>
                          <Typography variant="caption" noWrap sx={{ cursor: 'help', borderBottom: '1px dashed #aaa' }}>
                            {log.datos.length > 60 ? log.datos.slice(0, 60) + '…' : log.datos}
                          </Typography>
                        </Tooltip>
                      ) : (
                        <Typography variant="caption" color="text.disabled">—</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
}
