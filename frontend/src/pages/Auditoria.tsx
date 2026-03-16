import { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, TextField, Button, FormControl, InputLabel, Select,
  MenuItem, Chip, CircularProgress, Alert, Avatar, Stack, Divider,
} from '@mui/material';
import {
  FilterAlt as FilterIcon, Security as AuditIcon,
  AddCircle as CreateIcon, Edit as EditIcon, Delete as DeleteIcon,
  PersonAdd as PersonAddIcon,
} from '@mui/icons-material';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../services/api';

// Mapeo método HTTP → tipo legible
const TIPO_MAP: Record<string, { label: string; icon: typeof CreateIcon; color: string; bg: string }> = {
  POST:   { label: 'Creación',      icon: CreateIcon,    color: '#2e7d32', bg: '#e8f5e9' },
  PUT:    { label: 'Modificación',  icon: EditIcon,      color: '#1565c0', bg: '#e3f2fd' },
  PATCH:  { label: 'Modificación',  icon: EditIcon,      color: '#1565c0', bg: '#e3f2fd' },
  DELETE: { label: 'Eliminación',   icon: DeleteIcon,    color: '#c62828', bg: '#ffebee' },
};

// Tipos para el filtro (más amigable)
const TIPOS_FILTRO = [
  { label: 'Todos', value: '' },
  { label: 'Creaciones', value: 'POST' },
  { label: 'Modificaciones', value: 'PATCH' },
  { label: 'Eliminaciones', value: 'DELETE' },
];


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
        <Typography variant="h4" fontWeight="bold">Registro de Actividad</Typography>
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
          <FormControl size="small" sx={{ width: 160 }}>
            <InputLabel>Tipo de acción</InputLabel>
            <Select value={metodo} label="Tipo de acción" onChange={(e) => setMetodo(e.target.value)}>
              {TIPOS_FILTRO.map((t) => (
                <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Buscar" size="small" value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') buscarLogs(); }}
            sx={{ width: 200 }}
            placeholder="Nombre, descripción..."
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
        <Alert severity="info">No hay actividad registrada en el período seleccionado.</Alert>
      ) : (
        <>
          <Typography variant="caption" color="text.secondary" display="block" mb={2}>
            {logs.length} acción{logs.length !== 1 ? 'es' : ''} registrada{logs.length !== 1 ? 's' : ''}
          </Typography>

          <Stack spacing={1}>
            {logs.map((log, index) => {
              const tipo = TIPO_MAP[log.metodo] ?? { label: log.metodo, icon: PersonAddIcon, color: '#555', bg: '#f5f5f5' };
              const IconComponent = tipo.icon;
              const fecha = new Date(log.createdAt);
              const esNuevoDia = index === 0 ||
                format(fecha, 'dd/MM/yyyy') !== format(new Date(logs[index - 1].createdAt), 'dd/MM/yyyy');

              return (
                <Box key={log.id}>
                  {/* Separador de día */}
                  {esNuevoDia && (
                    <Box display="flex" alignItems="center" gap={1} my={1.5}>
                      <Divider sx={{ flex: 1 }} />
                      <Chip
                        label={format(fecha, "EEEE d 'de' MMMM", { locale: es })}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: 11, color: 'text.secondary' }}
                      />
                      <Divider sx={{ flex: 1 }} />
                    </Box>
                  )}

                  {/* Tarjeta de actividad */}
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1.5,
                      borderLeft: `4px solid ${tipo.color}`,
                      '&:hover': { bgcolor: 'grey.50' },
                    }}
                  >
                    {/* Ícono de tipo */}
                    <Avatar sx={{ bgcolor: tipo.bg, width: 36, height: 36, flexShrink: 0 }}>
                      <IconComponent sx={{ fontSize: 18, color: tipo.color }} />
                    </Avatar>

                    {/* Contenido principal */}
                    <Box flex={1} minWidth={0}>
                      <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                        <Typography variant="body2" fontWeight="bold">
                          {log.usuarioNombre || 'Sistema'}
                        </Typography>
                        <Chip
                          label={tipo.label}
                          size="small"
                          sx={{ bgcolor: tipo.bg, color: tipo.color, fontWeight: 600, fontSize: 10, height: 20 }}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                          {format(fecha, 'HH:mm', { locale: es })}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" mt={0.3}>
                        {log.descripcion || '—'}
                      </Typography>
                    </Box>
                  </Paper>
                </Box>
              );
            })}
          </Stack>
        </>
      )}
    </Box>
  );
}
