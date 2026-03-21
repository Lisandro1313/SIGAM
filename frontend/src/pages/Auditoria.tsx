import { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, TextField, Button, FormControl, InputLabel, Select,
  MenuItem, Chip, CircularProgress, Alert, Avatar, Stack, Divider,
  Collapse, IconButton, Tooltip, Grid, Card, CardContent,
} from '@mui/material';
import {
  FilterAlt as FilterIcon, Security as AuditIcon,
  AddCircle as CreateIcon, Edit as EditIcon, Delete as DeleteIcon,
  PersonAdd as PersonAddIcon, ExpandMore as ExpandIcon, ExpandLess as CollapseIcon,
  People as BenefIcon, Receipt as RemitoIcon, Inventory as StockIcon,
  Category as ProgramaIcon, Assignment as ArticuloIcon,
} from '@mui/icons-material';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import api from '../services/api';

// Mapeo método HTTP → tipo legible
const TIPO_MAP: Record<string, { label: string; icon: typeof CreateIcon; color: string; bg: string }> = {
  POST:   { label: 'Creación',      icon: CreateIcon,    color: '#2e7d32', bg: '#e8f5e9' },
  PUT:    { label: 'Modificación',  icon: EditIcon,      color: '#1565c0', bg: '#e3f2fd' },
  PATCH:  { label: 'Modificación',  icon: EditIcon,      color: '#1565c0', bg: '#e3f2fd' },
  DELETE: { label: 'Eliminación',   icon: DeleteIcon,    color: '#c62828', bg: '#ffebee' },
};

const TIPOS_FILTRO = [
  { label: 'Todos', value: '' },
  { label: 'Creaciones', value: 'POST' },
  { label: 'Modificaciones', value: 'PATCH' },
  { label: 'Eliminaciones', value: 'DELETE' },
];

// Módulos derivables de la ruta
const MODULOS = [
  { label: 'Todos', value: '' },
  { label: 'Beneficiarios', value: '/beneficiarios', icon: <BenefIcon fontSize="small" /> },
  { label: 'Remitos', value: '/remitos', icon: <RemitoIcon fontSize="small" /> },
  { label: 'Stock', value: '/stock', icon: <StockIcon fontSize="small" /> },
  { label: 'Programas', value: '/programas', icon: <ProgramaIcon fontSize="small" /> },
  { label: 'Artículos', value: '/articulos', icon: <ArticuloIcon fontSize="small" /> },
  { label: 'Usuarios', value: '/usuarios', icon: <PersonAddIcon fontSize="small" /> },
  { label: 'Casos', value: '/casos', icon: <EditIcon fontSize="small" /> },
];

// Convierte la ruta en algo legible: /beneficiarios/42 → "Beneficiario #42"
function rutaAmigable(ruta: string): string {
  const map: Record<string, string> = {
    beneficiarios: 'Beneficiario',
    remitos: 'Remito',
    stock: 'Stock',
    programas: 'Programa',
    articulos: 'Artículo',
    usuarios: 'Usuario',
    casos: 'Caso',
    plantillas: 'Plantilla',
    depositos: 'Depósito',
  };
  const parts = ruta.replace(/^\//, '').split('/');
  const modulo = map[parts[0]] ?? parts[0];
  const id = parts[1] ? ` #${parts[1]}` : '';
  const sub = parts[2] ? ` / ${parts[2]}` : '';
  return `${modulo}${id}${sub}`;
}

export default function Auditoria() {
  const [logs, setLogs]           = useState<any[]>([]);
  const [usuarios, setUsuarios]   = useState<any[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [expanded, setExpanded]   = useState<Record<number, boolean>>({});

  const [usuarioId, setUsuarioId] = useState('');
  const [metodo, setMetodo]       = useState('');
  const [modulo, setModulo]       = useState('');
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
    setExpanded({});
    try {
      const params: any = { desde, hasta };
      if (usuarioId) params.usuarioId = usuarioId;
      if (metodo)    params.metodo    = metodo;
      if (buscar.trim()) params.buscar = buscar.trim();
      else if (modulo) params.buscar  = modulo;
      const res = await api.get('/auditoria', { params });
      // Si hay filtro de módulo pero no de buscar, filtrar en frontend también
      const data = modulo && !buscar.trim()
        ? res.data.filter((l: any) => l.ruta?.includes(modulo))
        : res.data;
      setLogs(data);
    } catch {
      setError('No se pudo cargar el registro de auditoría.');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  // Estadísticas resumen
  const stats = {
    creaciones: logs.filter(l => l.metodo === 'POST').length,
    modificaciones: logs.filter(l => ['PATCH', 'PUT'].includes(l.metodo)).length,
    eliminaciones: logs.filter(l => l.metodo === 'DELETE').length,
    usuarios: new Set(logs.map(l => l.usuarioId).filter(Boolean)).size,
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
        <Grid container spacing={1.5} alignItems="flex-end">
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              label="Desde" type="date" size="small" fullWidth value={desde}
              onChange={(e) => setDesde(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              label="Hasta" type="date" size="small" fullWidth value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>Módulo</InputLabel>
              <Select value={modulo} label="Módulo" onChange={(e) => setModulo(e.target.value)}>
                {MODULOS.map((m) => (
                  <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>Tipo de acción</InputLabel>
              <Select value={metodo} label="Tipo de acción" onChange={(e) => setMetodo(e.target.value)}>
                {TIPOS_FILTRO.map((t) => (
                  <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>Usuario</InputLabel>
              <Select value={usuarioId} label="Usuario" onChange={(e) => setUsuarioId(e.target.value)}>
                <MenuItem value="">Todos</MenuItem>
                {usuarios.map((u) => (
                  <MenuItem key={u.id} value={u.id}>{u.usuarioNombre ?? u.nombre}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={1.5}>
            <TextField
              label="Buscar" size="small" fullWidth value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') buscarLogs(); }}
              placeholder="Descripción..."
            />
          </Grid>
          <Grid item xs={12} sm="auto">
            <Button variant="contained" startIcon={<FilterIcon />} onClick={buscarLogs} disabled={loading} fullWidth>
              Buscar
            </Button>
          </Grid>
          <Grid item xs={12} sm="auto">
            <Button
              variant="outlined"
              startIcon={<ArticuloIcon />}
              disabled={loading || logs.length === 0}
              onClick={() => {
                const rows = logs.map(l => ({
                  fecha: format(new Date(l.createdAt), 'dd/MM/yyyy HH:mm', { locale: es }),
                  usuario: l.usuarioNombre ?? 'Sistema',
                  accion: l.descripcion ?? '',
                  tipo: l.metodo,
                  ruta: l.ruta ?? '',
                  datos: l.datos ?? '',
                }));
                const ws = XLSX.utils.json_to_sheet(rows);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Auditoria');
                XLSX.writeFile(wb, `auditoria_${desde}_${hasta}.xlsx`);
              }}
              fullWidth
            >
              Exportar
            </Button>
          </Grid>
        </Grid>
        {/* Atajos de período */}
        <Box display="flex" gap={1} mt={1.5} flexWrap="wrap">
          {[
            { label: 'Hoy', fn: () => { const h = format(new Date(), 'yyyy-MM-dd'); setDesde(h); setHasta(h); } },
            { label: 'Últimos 7 días', fn: () => { setDesde(format(subDays(new Date(), 7), 'yyyy-MM-dd')); setHasta(format(new Date(), 'yyyy-MM-dd')); } },
            { label: 'Últimos 30 días', fn: () => { setDesde(format(subDays(new Date(), 30), 'yyyy-MM-dd')); setHasta(format(new Date(), 'yyyy-MM-dd')); } },
            { label: 'Este mes', fn: () => { setDesde(format(startOfMonth(new Date()), 'yyyy-MM-dd')); setHasta(format(endOfMonth(new Date()), 'yyyy-MM-dd')); } },
          ].map(({ label, fn }) => (
            <Chip key={label} label={label} size="small" variant="outlined" onClick={fn} sx={{ cursor: 'pointer' }} />
          ))}
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!loading && logs.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Total', value: logs.length, color: 'text.primary' },
            { label: 'Creaciones', value: stats.creaciones, color: 'success.main' },
            { label: 'Modificaciones', value: stats.modificaciones, color: 'primary.main' },
            { label: 'Eliminaciones', value: stats.eliminaciones, color: 'error.main' },
            { label: 'Usuarios activos', value: stats.usuarios, color: 'text.secondary' },
          ].map(s => (
            <Grid item xs={6} sm={4} md={2} key={s.label}>
              <Card variant="outlined">
                <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                  <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                  <Typography variant="h6" fontWeight="bold" color={s.color}>{s.value}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
      ) : logs.length === 0 ? (
        <Alert severity="info">No hay actividad registrada en el período seleccionado.</Alert>
      ) : (
        <Stack spacing={0.5}>
          {logs.map((log, index) => {
            const tipo = TIPO_MAP[log.metodo] ?? { label: log.metodo, icon: PersonAddIcon, color: '#555', bg: '#f5f5f5' };
            const IconComponent = tipo.icon;
            const fecha = new Date(log.createdAt);
            const esNuevoDia = index === 0 ||
              format(fecha, 'dd/MM/yyyy') !== format(new Date(logs[index - 1].createdAt), 'dd/MM/yyyy');
            const tieneData = log.datos && log.datos !== '{}' && log.datos !== 'null';
            const estaExpandido = expanded[log.id];

            return (
              <Box key={log.id}>
                {esNuevoDia && (
                  <Box display="flex" alignItems="center" gap={1} my={2}>
                    <Divider sx={{ flex: 1 }} />
                    <Chip
                      label={format(fecha, "EEEE d 'de' MMMM", { locale: es })}
                      size="small" variant="outlined"
                      sx={{ fontSize: 11, color: 'text.secondary' }}
                    />
                    <Divider sx={{ flex: 1 }} />
                  </Box>
                )}

                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    borderLeft: `4px solid ${tipo.color}`,
                    '&:hover': { bgcolor: 'grey.50' },
                  }}
                >
                  <Box display="flex" alignItems="flex-start" gap={1.5}>
                    <Avatar sx={{ bgcolor: tipo.bg, width: 34, height: 34, flexShrink: 0, mt: 0.3 }}>
                      <IconComponent sx={{ fontSize: 17, color: tipo.color }} />
                    </Avatar>

                    <Box flex={1} minWidth={0}>
                      <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                        <Typography variant="body2" fontWeight="bold">
                          {log.usuarioNombre || 'Sistema'}
                        </Typography>
                        <Chip
                          label={tipo.label}
                          size="small"
                          sx={{ bgcolor: tipo.bg, color: tipo.color, fontWeight: 600, fontSize: 10, height: 18 }}
                        />
                        <Chip
                          label={rutaAmigable(log.ruta ?? '')}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: 10, height: 18, color: 'text.secondary' }}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                          {format(fecha, 'HH:mm', { locale: es })}
                        </Typography>
                      </Box>
                      {log.descripcion && (
                        <Typography variant="body2" color="text.secondary" mt={0.3} sx={{ whiteSpace: 'pre-wrap' }}>
                          {log.descripcion}
                        </Typography>
                      )}

                      {/* Datos expandibles */}
                      {tieneData && (
                        <>
                          <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
                            <Tooltip title={estaExpandido ? 'Ocultar datos' : 'Ver datos enviados'}>
                              <IconButton
                                size="small"
                                onClick={() => setExpanded(prev => ({ ...prev, [log.id]: !prev[log.id] }))}
                                sx={{ p: 0.25 }}
                              >
                                {estaExpandido ? <CollapseIcon fontSize="small" /> : <ExpandIcon fontSize="small" />}
                              </IconButton>
                            </Tooltip>
                            <Typography variant="caption" color="text.disabled">datos adjuntos</Typography>
                          </Box>
                          <Collapse in={estaExpandido}>
                            <Box
                              component="pre"
                              sx={{
                                mt: 0.5, p: 1, bgcolor: 'grey.100', borderRadius: 1,
                                fontSize: '0.72rem', overflowX: 'auto', maxHeight: 200,
                                fontFamily: 'monospace', color: 'text.secondary',
                              }}
                            >
                              {(() => {
                                try { return JSON.stringify(JSON.parse(log.datos), null, 2); }
                                catch { return log.datos; }
                              })()}
                            </Box>
                          </Collapse>
                        </>
                      )}
                    </Box>
                  </Box>
                </Paper>
              </Box>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
