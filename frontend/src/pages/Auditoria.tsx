import { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Paper, TextField, Button, FormControl, InputLabel, Select,
  MenuItem, Chip, CircularProgress, Alert, Avatar, Stack, Divider,
  Collapse, Tooltip, Grid, Card, CardContent, TablePagination,
} from '@mui/material';
import {
  FilterAlt as FilterIcon, Security as AuditIcon,
  AddCircle as CreateIcon, Edit as EditIcon, Delete as DeleteIcon,
  PersonAdd as PersonAddIcon, ExpandMore as ExpandIcon, ExpandLess as CollapseIcon,
  People as BenefIcon, Receipt as RemitoIcon, Inventory as StockIcon,
  Category as ProgramaIcon, Assignment as ArticuloIcon,
  CalendarToday as CalendarIcon, AccessTime as TimeIcon,
} from '@mui/icons-material';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import api from '../services/api';

/* ─── Mapeo método HTTP → tipo legible ─── */
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

/* ─── Convierte la ruta en algo legible ─── */
function rutaAmigable(ruta: string): string {
  const map: Record<string, string> = {
    beneficiarios: 'Beneficiarios',
    remitos: 'Remitos',
    stock: 'Stock',
    programas: 'Programas',
    articulos: 'Artículos',
    usuarios: 'Usuarios',
    casos: 'Casos',
    plantillas: 'Plantillas',
    depositos: 'Depósitos',
    cronograma: 'Cronograma',
    zonas: 'Zonas',
    tareas: 'Tareas',
    backup: 'Backup',
  };
  const parts = ruta.replace(/^\//, '').split('/');
  return map[parts[0]] ?? parts[0];
}

/* ─── Nombres legibles para los campos ─── */
const CAMPO_LABELS: Record<string, string> = {
  nombre: 'Nombre',
  tipo: 'Tipo',
  direccion: 'Dirección',
  localidad: 'Localidad',
  telefono: 'Teléfono',
  responsableNombre: 'Responsable',
  responsableDNI: 'DNI responsable',
  frecuenciaEntrega: 'Frecuencia de entrega',
  programaId: 'Programa',
  observaciones: 'Observaciones',
  kilosHabitual: 'Kilos habituales',
  activo: 'Estado',
  motivoBaja: 'Motivo de baja',
  notaBaja: 'Nota de baja',
  secretaria: 'Secretaría',
  estado: 'Estado',
  descripcion: 'Descripción',
  cantidad: 'Cantidad',
  fecha: 'Fecha',
  usuarioId: 'Usuario',
  beneficiarioId: 'Beneficiario',
  depositoId: 'Depósito',
  articuloId: 'Artículo',
  loteId: 'Lote',
  rol: 'Rol',
  email: 'Email',
  lat: 'Latitud',
  lng: 'Longitud',
  mensajeWhatsapp: 'Mensaje WhatsApp',
  whatsappLink: 'Link WhatsApp',
};

function valorLegible(key: string, val: any): string {
  if (val === null || val === undefined || val === '') return '—';
  if (key === 'activo') return val ? 'Activo' : 'Dado de baja';
  if (key === 'frecuenciaEntrega') {
    const m: Record<string, string> = { MENSUAL: 'Mensual', BIMESTRAL: 'Bimestral', EVENTUAL: 'Eventual' };
    return m[val] ?? val;
  }
  if (key === 'secretaria') return val === 'PA' ? 'Programa Alimentario' : val === 'AC' ? 'Asistencia Crítica' : val;
  if (key === 'tipo') {
    const m: Record<string, string> = {
      ESPACIO: 'Espacio', ORGANIZACION: 'Organización', CASO_PARTICULAR: 'Caso particular', COMEDOR: 'Comedor',
    };
    return m[val] ?? val;
  }
  if (typeof val === 'boolean') return val ? 'Sí' : 'No';
  return String(val);
}

function DatosLegibles({ datos }: { datos: string }) {
  let parsed: Record<string, any> = {};
  try { parsed = JSON.parse(datos); } catch { return <Typography variant="caption" color="text.secondary">{datos}</Typography>; }

  const entries = Object.entries(parsed).filter(([, v]) => v !== null && v !== undefined && v !== '');
  if (entries.length === 0) return null;

  return (
    <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
      {entries.map(([key, val]) => (
        <Box key={key} sx={{ bgcolor: 'grey.100', borderRadius: 1, px: 1, py: 0.25 }}>
          <Typography component="span" variant="caption" color="text.secondary">
            {CAMPO_LABELS[key] ?? key}:{' '}
          </Typography>
          <Typography component="span" variant="caption" fontWeight="600" color="text.primary">
            {valorLegible(key, val)}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

/* ─── Color del módulo ─── */
function moduloColor(ruta: string): string {
  const seg = ruta.replace(/^\//, '').split('/')[0];
  const colors: Record<string, string> = {
    beneficiarios: '#1976d2',
    remitos: '#2e7d32',
    stock: '#ed6c02',
    programas: '#9c27b0',
    articulos: '#0288d1',
    usuarios: '#d32f2f',
    casos: '#f57c00',
    cronograma: '#00796b',
    tareas: '#5c6bc0',
    zonas: '#689f38',
    plantillas: '#7b1fa2',
    backup: '#455a64',
  };
  return colors[seg] ?? '#757575';
}

export default function Auditoria() {
  const [logs, setLogs]           = useState<any[]>([]);
  const [total, setTotal]         = useState(0);
  const [usuarios, setUsuarios]   = useState<any[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [expanded, setExpanded]   = useState<Record<number, boolean>>({});

  // Filtros
  const [usuarioId, setUsuarioId] = useState('');
  const [metodo, setMetodo]       = useState('');
  const [modulo, setModulo]       = useState('');
  const [desde, setDesde]         = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [hasta, setHasta]         = useState(format(new Date(), 'yyyy-MM-dd'));
  const [buscar, setBuscar]       = useState('');

  // Paginación
  const [page, setPage]           = useState(0); // MUI es 0-based
  const [pageSize, setPageSize]   = useState(25);

  useEffect(() => {
    api.get('/auditoria/usuarios').then((r) => setUsuarios(r.data)).catch(() => {});
  }, []);

  const buscarLogs = useCallback(async (pageOverride?: number) => {
    setLoading(true);
    setError('');
    setExpanded({});
    const currentPage = pageOverride ?? page;
    try {
      const params: any = { desde, hasta, page: currentPage + 1, pageSize };
      if (usuarioId) params.usuarioId = usuarioId;
      if (metodo)    params.metodo    = metodo;
      if (buscar.trim()) params.buscar = buscar.trim();
      else if (modulo) params.buscar  = modulo;
      const res = await api.get('/auditoria', { params });
      let data = res.data.data ?? res.data;
      // Si hay filtro de módulo pero no de buscar, filtrar en frontend también
      if (modulo && !buscar.trim()) {
        data = data.filter((l: any) => l.ruta?.includes(modulo));
      }
      setLogs(data);
      setTotal(res.data.total ?? data.length);
    } catch {
      setError('No se pudo cargar el registro de auditoría.');
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [desde, hasta, page, pageSize, usuarioId, metodo, modulo, buscar]);

  useEffect(() => { buscarLogs(); }, [page, pageSize]);

  const handleBuscar = () => {
    setPage(0);
    buscarLogs(0);
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
        <AuditIcon color="primary" sx={{ fontSize: 32 }} />
        <Box>
          <Typography variant="h4" fontWeight="bold">Registro de Actividad</Typography>
          <Typography variant="body2" color="text.secondary">
            Historial completo de acciones en el sistema
          </Typography>
        </Box>
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
              onKeyDown={(e) => { if (e.key === 'Enter') handleBuscar(); }}
              placeholder="Descripción..."
            />
          </Grid>
          <Grid item xs={12} sm="auto">
            <Button variant="contained" startIcon={<FilterIcon />} onClick={handleBuscar} disabled={loading} fullWidth>
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

      {/* Resumen estadísticas */}
      {!loading && logs.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Total (página)', value: `${logs.length} de ${total}`, color: 'text.primary' },
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
        <>
          {/* Paginación superior */}
          <Paper variant="outlined" sx={{ mb: 1 }}>
            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={pageSize}
              onRowsPerPageChange={(e) => { setPageSize(parseInt(e.target.value)); setPage(0); }}
              rowsPerPageOptions={[10, 25, 50, 100]}
              labelRowsPerPage="Por página:"
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
            />
          </Paper>

          {/* Lista de eventos */}
          <Stack spacing={0}>
            {logs.map((log, index) => {
              const tipo = TIPO_MAP[log.metodo] ?? { label: log.metodo, icon: PersonAddIcon, color: '#555', bg: '#f5f5f5' };
              const IconComponent = tipo.icon;
              const fecha = new Date(log.createdAt);
              const esNuevoDia = index === 0 ||
                format(fecha, 'yyyy-MM-dd') !== format(new Date(logs[index - 1].createdAt), 'yyyy-MM-dd');
              const tieneData = log.datos && log.datos !== '{}' && log.datos !== 'null';
              const estaExpandido = expanded[log.id];
              const moduloNombre = rutaAmigable(log.ruta ?? '');
              const mColor = moduloColor(log.ruta ?? '');

              return (
                <Box key={log.id}>
                  {esNuevoDia && (
                    <Box display="flex" alignItems="center" gap={1} mt={index === 0 ? 0 : 2.5} mb={1}>
                      <CalendarIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="subtitle2" fontWeight="bold" color="text.secondary">
                        {format(fecha, "EEEE d 'de' MMMM yyyy", { locale: es })}
                      </Typography>
                      <Divider sx={{ flex: 1 }} />
                    </Box>
                  )}

                  <Paper
                    variant="outlined"
                    sx={{
                      p: 0,
                      mb: 0.5,
                      borderLeft: `4px solid ${tipo.color}`,
                      overflow: 'hidden',
                      transition: 'box-shadow 0.15s',
                      '&:hover': { boxShadow: 2 },
                    }}
                  >
                    <Box display="flex" alignItems="stretch">
                      {/* Columna izquierda: hora */}
                      <Box
                        sx={{
                          width: 72,
                          minWidth: 72,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: 'grey.50',
                          borderRight: '1px solid',
                          borderColor: 'divider',
                          py: 1.5,
                        }}
                      >
                        <TimeIcon sx={{ fontSize: 14, color: 'text.disabled', mb: 0.25 }} />
                        <Typography variant="body2" fontWeight="bold" color="text.primary">
                          {format(fecha, 'HH:mm')}
                        </Typography>
                      </Box>

                      {/* Contenido principal */}
                      <Box flex={1} p={1.5} minWidth={0}>
                        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap" mb={0.5}>
                          {/* Icono de acción */}
                          <Avatar sx={{ bgcolor: tipo.bg, width: 28, height: 28 }}>
                            <IconComponent sx={{ fontSize: 15, color: tipo.color }} />
                          </Avatar>

                          {/* Descripción — prominente */}
                          <Typography variant="body2" fontWeight="bold" sx={{ flex: 1, minWidth: 0 }}>
                            {log.descripcion || `${tipo.label} en ${moduloNombre}`}
                          </Typography>

                          {/* Badges */}
                          <Chip
                            label={tipo.label}
                            size="small"
                            sx={{
                              bgcolor: tipo.bg,
                              color: tipo.color,
                              fontWeight: 600,
                              fontSize: 11,
                              height: 22,
                            }}
                          />
                          <Chip
                            label={moduloNombre}
                            size="small"
                            variant="outlined"
                            sx={{
                              fontSize: 11,
                              height: 22,
                              borderColor: mColor,
                              color: mColor,
                              fontWeight: 500,
                            }}
                          />
                        </Box>

                        {/* Fila secundaria: usuario */}
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <Typography variant="caption" color="text.secondary">
                            por <strong>{log.usuarioNombre || 'Sistema'}</strong>
                          </Typography>

                          {/* Botón expandir datos */}
                          {tieneData && (
                            <Tooltip title={estaExpandido ? 'Ocultar detalle' : 'Ver detalle'}>
                              <Chip
                                label={estaExpandido ? 'Ocultar detalle' : 'Ver detalle'}
                                size="small"
                                variant="outlined"
                                onClick={() => setExpanded(prev => ({ ...prev, [log.id]: !prev[log.id] }))}
                                icon={estaExpandido ? <CollapseIcon sx={{ fontSize: '14px !important' }} /> : <ExpandIcon sx={{ fontSize: '14px !important' }} />}
                                sx={{ ml: 1, fontSize: 10, height: 20, cursor: 'pointer' }}
                              />
                            </Tooltip>
                          )}
                        </Box>

                        {/* Datos expandibles */}
                        {tieneData && (
                          <Collapse in={estaExpandido}>
                            <DatosLegibles datos={log.datos} />
                          </Collapse>
                        )}
                      </Box>
                    </Box>
                  </Paper>
                </Box>
              );
            })}
          </Stack>

          {/* Paginación inferior */}
          <Paper variant="outlined" sx={{ mt: 1 }}>
            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={pageSize}
              onRowsPerPageChange={(e) => { setPageSize(parseInt(e.target.value)); setPage(0); }}
              rowsPerPageOptions={[10, 25, 50, 100]}
              labelRowsPerPage="Por página:"
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
            />
          </Paper>
        </>
      )}
    </Box>
  );
}
