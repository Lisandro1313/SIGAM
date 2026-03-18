import { useEffect, useState } from 'react';
import {
  Box, Typography, CircularProgress, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, TextField, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, Alert, Grid, Card, CardContent,
  FormControl, InputLabel, Select, MenuItem, Tooltip, IconButton, Collapse,
  Tabs, Tab,
} from '@mui/material';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
function resolveUrl(url: string) {
  return url?.startsWith('http') ? url : `${API_BASE}/${(url ?? '').replace(/^\//, '')}`;
}
import {
  PhotoCamera as FotoIcon, Download as DownloadIcon, FilterAlt as FilterIcon,
  ExpandMore as ExpandIcon, ExpandLess as CollapseIcon, CheckCircle as CheckIcon,
  Edit as EditIcon, CloudUpload as UploadIcon, Person as PersonIcon,
} from '@mui/icons-material';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../services/api';
import ExportExcelButton from '../components/ExportExcelButton';
import { useAuthStore } from '../stores/authStore';

export default function HistorialEntregas() {
  const { user } = useAuthStore();
  const esCita = user?.rol === 'ASISTENCIA_CRITICA';

  const [entregas, setEntregas]     = useState<any[]>([]);
  const [depositos, setDepositos]   = useState<any[]>([]);
  const [programas, setProgramas]   = useState<any[]>([]);
  const [loading, setLoading]       = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [tabPrograma, setTabPrograma] = useState<string>('todos');

  // Filtros
  const [fechaDesde, setFechaDesde]       = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [fechaHasta, setFechaHasta]       = useState(format(new Date(), 'yyyy-MM-dd'));
  const [depositoFiltro, setDepositoFiltro] = useState('');
  const [programaFiltro, setProgramaFiltro] = useState('');
  const [buscar, setBuscar]               = useState('');

  // Diálogo foto
  const [fotoDialog, setFotoDialog] = useState(false);
  const [fotoUrl, setFotoUrl]       = useState('');
  const [fotoRemito, setFotoRemito] = useState<any>(null);

  // Diálogo editar entrega
  const [editDialog, setEditDialog]   = useState(false);
  const [editRemito, setEditRemito]   = useState<any>(null);
  const [editNota, setEditNota]       = useState('');
  const [editFecha, setEditFecha]     = useState('');
  const [editFoto, setEditFoto]       = useState<File | null>(null);
  const [guardandoEdit, setGuardandoEdit] = useState(false);

  // Inline: subir foto directo desde la tabla
  const [uploadingFotoId, setUploadingFotoId] = useState<number | null>(null);

  const handleUploadFotoInline = async (remito: any, file: File) => {
    setUploadingFotoId(remito.id);
    try {
      const form = new FormData();
      form.append('foto', file);
      if (remito.entregadoNota) form.append('nota', remito.entregadoNota);
      await api.patch(`/remitos/${remito.id}/entrega`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      buscarEntregas();
    } catch {
      // silencioso
    } finally {
      setUploadingFotoId(null);
    }
  };

  // Inline: editar "¿Quién retiró?" directo desde la tabla
  const [editingNotaId, setEditingNotaId] = useState<number | null>(null);
  const [editingNotaValue, setEditingNotaValue] = useState('');
  const [savingNotaId, setSavingNotaId] = useState<number | null>(null);

  const handleSaveNota = async (remito: any) => {
    setSavingNotaId(remito.id);
    try {
      const form = new FormData();
      form.append('nota', editingNotaValue);
      await api.patch(`/remitos/${remito.id}/entrega`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setEditingNotaId(null);
      buscarEntregas();
    } catch {
      // silencioso
    } finally {
      setSavingNotaId(null);
    }
  };

  const handleAbrirEdit = (remito: any) => {
    setEditRemito(remito);
    setEditNota(remito.entregadoNota || '');
    setEditFecha(remito.entregadoAt ? format(new Date(remito.entregadoAt), "yyyy-MM-dd'T'HH:mm") : '');
    setEditFoto(null);
    setEditDialog(true);
  };

  const handleGuardarEdit = async () => {
    if (!editRemito) return;
    setGuardandoEdit(true);
    try {
      const form = new FormData();
      form.append('nota', editNota);
      if (editFecha) form.append('fecha', new Date(editFecha).toISOString());
      if (editFoto) form.append('foto', editFoto);
      await api.patch(`/remitos/${editRemito.id}/entrega`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setEditDialog(false);
      buscarEntregas();
    } catch {
      // silencioso
    } finally {
      setGuardandoEdit(false);
    }
  };

  useEffect(() => {
    Promise.all([
      api.get('/depositos'),
      api.get('/programas'),
    ]).then(([depR, proR]) => {
      const todos = depR.data as any[];
      // ASISTENCIA_CRITICA solo ve el depósito CITA
      setDepositos(esCita ? todos.filter((d) => d.codigo === 'CITA') : todos);
      setProgramas(proR.data.filter((p: any) => p.activo));
    }).catch(() => {});
    buscarEntregas();
  }, []);

  const buscarEntregas = async () => {
    setLoading(true);
    try {
      const params: any = { estado: 'ENTREGADO', fechaDesde, fechaHasta };
      if (depositoFiltro) params.depositoId = depositoFiltro;
      if (programaFiltro) params.programaId = programaFiltro;
      if (buscar.trim()) params.buscar = buscar.trim();
      const res = await api.get('/remitos', { params });
      setEntregas(res.data);
    } catch {
      setEntregas([]);
    } finally {
      setLoading(false);
    }
  };

  const abrirFoto = (remito: any) => {
    setFotoRemito(remito);
    setFotoUrl(resolveUrl(remito.entregadoFoto));
    setFotoDialog(true);
  };

  // Programas únicos de las entregas cargadas
  const programasDisponibles = Array.from(
    new Map(entregas.filter(r => r.programa).map(r => [r.programa.id, r.programa])).values()
  ).sort((a, b) => a.nombre.localeCompare(b.nombre));

  const entregasFiltradas = tabPrograma === 'todos'
    ? entregas
    : tabPrograma === 'sin_programa'
    ? entregas.filter(r => !r.programa)
    : entregas.filter(r => String(r.programa?.id) === tabPrograma);

  const totalKg  = entregasFiltradas.reduce((s, r) => s + (r.totalKg || 0), 0);
  const conFoto  = entregasFiltradas.filter((r) => r.entregadoFoto).length;
  const sinFoto  = entregasFiltradas.length - conFoto;

  const exportData = entregasFiltradas.map((r) => ({
    Numero:       r.numero,
    Fecha:        format(new Date(r.fecha), 'dd/MM/yyyy'),
    FechaEntrega: r.entregadoAt ? format(new Date(r.entregadoAt), 'dd/MM/yyyy HH:mm') : '',
    Beneficiario: r.beneficiario?.nombre,
    Tipo:         r.beneficiario?.tipo,
    Localidad:    r.beneficiario?.localidad,
    Programa:     r.programa?.nombre,
    Deposito:     r.deposito?.nombre,
    TotalKg:      r.totalKg?.toFixed(2),
    QuienRetiro:  r.entregadoNota || '',
    TieneFoto:    r.entregadoFoto ? 'Sí' : 'No',
    Articulos:    r.items?.map((i: any) => `${i.articulo?.nombre} x${i.cantidad}`).join(' | ') ?? '',
  }));

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">Historial de Entregas</Typography>
        <ExportExcelButton
          data={exportData}
          fileName={`historial_entregas_${fechaDesde}_${fechaHasta}`}
          sheetName="Entregas"
          label="Exportar Excel"
        />
      </Box>

      {/* Filtros */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Box display="flex" gap={2} flexWrap="wrap" alignItems="flex-end">
          <TextField
            label="Desde" type="date" size="small" value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            InputLabelProps={{ shrink: true }} sx={{ width: 160 }}
          />
          <TextField
            label="Hasta" type="date" size="small" value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            InputLabelProps={{ shrink: true }} sx={{ width: 160 }}
          />
          <FormControl size="small" sx={{ width: 180 }}>
            <InputLabel>Depósito</InputLabel>
            <Select value={depositoFiltro} label="Depósito" onChange={(e) => setDepositoFiltro(e.target.value)}>
              <MenuItem value="">Todos</MenuItem>
              {depositos.map((d) => <MenuItem key={d.id} value={d.id}>{d.nombre}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ width: 180 }}>
            <InputLabel>Programa</InputLabel>
            <Select value={programaFiltro} label="Programa" onChange={(e) => setProgramaFiltro(e.target.value)}>
              <MenuItem value="">Todos</MenuItem>
              {programas.map((p) => <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField
            label="Buscar beneficiario" size="small" value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') buscarEntregas(); }}
            sx={{ width: 200 }}
          />
          <Button variant="contained" startIcon={<FilterIcon />} onClick={buscarEntregas} disabled={loading}>
            Buscar
          </Button>
        </Box>
      </Paper>

      {/* Tabs por programa */}
      {programasDisponibles.length > 0 && (
        <Paper elevation={1} sx={{ mb: 2 }}>
          <Tabs
            value={tabPrograma}
            onChange={(_, v) => setTabPrograma(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label={`Todos (${entregas.length})`} value="todos" />
            {programasDisponibles.map(p => (
              <Tab
                key={p.id}
                label={`${p.nombre} (${entregas.filter(r => r.programa?.id === p.id).length})`}
                value={String(p.id)}
              />
            ))}
            {entregas.some(r => !r.programa) && (
              <Tab label={`Sin programa (${entregas.filter(r => !r.programa).length})`} value="sin_programa" />
            )}
          </Tabs>
        </Paper>
      )}

      {/* Estadísticas */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'TOTAL ENTREGAS', value: entregasFiltradas.length, color: 'primary', sub: 'en el período' },
          { label: 'TOTAL KG ENTREGADOS', value: `${totalKg.toFixed(0)} kg`, color: 'success.main', sub: 'kilogramos' },
          { label: 'CON FOTO FIRMADA', value: conFoto, color: 'info.main', sub: entregasFiltradas.length > 0 ? `${Math.round((conFoto / entregasFiltradas.length) * 100)}% del total` : '—' },
          { label: 'SIN FOTO', value: sinFoto, color: sinFoto > 0 ? 'warning.main' : 'text.disabled', sub: 'pendientes de documentar' },
        ].map((s, i) => (
          <Grid item xs={12} sm={3} key={i}>
            <Card variant="outlined">
              <CardContent sx={{ py: 1.5 }}>
                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                <Typography variant="h4" fontWeight="bold" color={s.color}>{s.value}</Typography>
                <Typography variant="caption" color="text.secondary">{s.sub}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabla */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
      ) : entregasFiltradas.length === 0 ? (
        <Alert severity="info">No hay entregas en el período seleccionado con los filtros aplicados.</Alert>
      ) : (
        <TableContainer component={Paper} elevation={2}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell width={32} />
                <TableCell>N° Remito</TableCell>
                <TableCell>Fecha Remito</TableCell>
                <TableCell>Fecha Entrega</TableCell>
                <TableCell>Beneficiario</TableCell>
                <TableCell>Programa</TableCell>
                <TableCell>Depósito</TableCell>
                <TableCell align="right">Kg</TableCell>
                <TableCell>¿Quién retiró?</TableCell>
                <TableCell align="center">Foto</TableCell>
                <TableCell align="center">Editar</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {entregasFiltradas.map((remito) => (
                <>
                  <TableRow
                    key={remito.id}
                    hover
                    sx={{ cursor: 'pointer', bgcolor: expandedId === remito.id ? '#f0f7ff' : undefined }}
                    onClick={() => setExpandedId(expandedId === remito.id ? null : remito.id)}
                  >
                    <TableCell>
                      <IconButton size="small">
                        {expandedId === remito.id ? <CollapseIcon fontSize="small" /> : <ExpandIcon fontSize="small" />}
                      </IconButton>
                    </TableCell>
                    <TableCell><strong>{remito.numero}</strong></TableCell>
                    <TableCell>{format(new Date(remito.fecha), 'dd/MM/yyyy', { locale: es })}</TableCell>
                    <TableCell>
                      {remito.entregadoAt
                        ? <Box display="flex" alignItems="center" gap={0.5}>
                            <CheckIcon fontSize="small" color="success" />
                            <Typography variant="caption">{format(new Date(remito.entregadoAt), 'dd/MM/yyyy HH:mm', { locale: es })}</Typography>
                          </Box>
                        : <Typography variant="caption" color="text.disabled">—</Typography>}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{remito.beneficiario?.nombre}</Typography>
                      <Typography variant="caption" color="text.secondary">{remito.beneficiario?.localidad}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{remito.programa?.nombre || '—'}</Typography>
                    </TableCell>
                    <TableCell><Chip label={remito.deposito?.nombre} size="small" variant="outlined" /></TableCell>
                    <TableCell align="right"><strong>{remito.totalKg?.toFixed(2)}</strong></TableCell>
                    <TableCell sx={{ maxWidth: 200 }} onClick={(e) => e.stopPropagation()}>
                      {editingNotaId === remito.id ? (
                        <TextField
                          size="small"
                          autoFocus
                          value={editingNotaValue}
                          onChange={(e) => setEditingNotaValue(e.target.value)}
                          onBlur={() => handleSaveNota(remito)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveNota(remito);
                            if (e.key === 'Escape') setEditingNotaId(null);
                          }}
                          disabled={savingNotaId === remito.id}
                          placeholder="Nombre de quien retiró"
                          sx={{ width: '100%' }}
                          inputProps={{ style: { fontSize: 12, padding: '4px 6px' } }}
                        />
                      ) : (
                        <Tooltip title="Clic para editar">
                          <Box
                            display="flex" alignItems="center" gap={0.5}
                            sx={{ cursor: 'pointer', borderRadius: 1, px: 0.5, '&:hover': { bgcolor: 'action.hover' } }}
                            onClick={() => {
                              setEditingNotaId(remito.id);
                              setEditingNotaValue(remito.entregadoNota || '');
                            }}
                          >
                            {remito.entregadoNota
                              ? <Typography variant="caption" noWrap>{remito.entregadoNota}</Typography>
                              : <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>+ agregar</Typography>
                            }
                            <PersonIcon sx={{ fontSize: 12, color: 'text.disabled', ml: 'auto' }} />
                          </Box>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                      {remito.entregadoFoto ? (
                        <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                          <Tooltip title="Ver foto firmada">
                            <IconButton size="small" color="success" onClick={() => abrirFoto(remito)}>
                              <FotoIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Reemplazar foto">
                            <IconButton size="small" component="label">
                              <UploadIcon fontSize="small" />
                              <input type="file" hidden accept=".jpg,.jpeg,.png,.webp,.pdf"
                                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadFotoInline(remito, f); e.target.value = ''; }}
                              />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      ) : (
                        <Tooltip title="Adjuntar foto firmada">
                          <IconButton
                            size="small"
                            color={uploadingFotoId === remito.id ? 'default' : 'warning'}
                            component="label"
                            disabled={uploadingFotoId === remito.id}
                          >
                            {uploadingFotoId === remito.id
                              ? <CircularProgress size={16} />
                              : <UploadIcon fontSize="small" />
                            }
                            <input type="file" hidden accept=".jpg,.jpeg,.png,.webp,.pdf"
                              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadFotoInline(remito, f); e.target.value = ''; }}
                            />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="Editar entrega">
                        <IconButton size="small" onClick={() => handleAbrirEdit(remito)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>

                  {/* Fila expandida: artículos */}
                  <TableRow key={`exp-${remito.id}`}>
                    <TableCell colSpan={11} sx={{ p: 0, border: expandedId === remito.id ? undefined : 'none' }}>
                      <Collapse in={expandedId === remito.id} timeout="auto" unmountOnExit>
                        <Box sx={{ px: 7, py: 1.5, bgcolor: '#f8faff', borderBottom: '1px solid #e0e0e0' }}>
                          <Typography variant="caption" fontWeight="bold" color="text.secondary" display="block" mb={0.5}>
                            ARTÍCULOS ENTREGADOS
                          </Typography>
                          <Box display="flex" gap={1} flexWrap="wrap">
                            {(remito.items ?? []).map((item: any, idx: number) => (
                              <Chip
                                key={idx}
                                label={`${item.articulo?.nombre} × ${item.cantidad}${item.pesoKg ? ` (${item.pesoKg.toFixed(1)} kg)` : ''}`}
                                size="small"
                                variant="outlined"
                                color="primary"
                              />
                            ))}
                            {(remito.items ?? []).length === 0 && (
                              <Typography variant="caption" color="text.disabled">Sin ítems registrados</Typography>
                            )}
                          </Box>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Diálogo editar entrega */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar entrega — {editRemito?.numero}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            label="Responsable de retiro"
            fullWidth size="small"
            value={editNota}
            onChange={(e) => setEditNota((e.target as HTMLInputElement).value)}
            placeholder="Nombre y apellido de quien retiró"
          />
          <TextField
            label="Fecha y hora de entrega"
            type="datetime-local"
            fullWidth size="small"
            value={editFecha}
            onChange={(e) => setEditFecha((e.target as HTMLInputElement).value)}
            InputLabelProps={{ shrink: true }}
          />
          <Box>
            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
              Foto del remito firmado {editRemito?.entregadoFoto ? '(ya tiene una — subir reemplaza)' : '(opcional)'}
            </Typography>
            <Button
              variant="outlined"
              size="small"
              component="label"
              startIcon={<FotoIcon />}
            >
              {editFoto ? editFoto.name : 'Seleccionar foto'}
              <input
                type="file"
                hidden
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                onChange={(e) => setEditFoto(e.target.files?.[0] ?? null)}
              />
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleGuardarEdit} disabled={guardandoEdit}>
            {guardandoEdit ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo foto */}
      <Dialog open={fotoDialog} onClose={() => setFotoDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Foto firmada — {fotoRemito?.numero} · {fotoRemito?.beneficiario?.nombre}
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', p: 1 }}>
          {fotoUrl?.match(/\.(jpg|jpeg|png|webp)$/i) ? (
            <img src={fotoUrl} alt="Remito firmado" style={{ maxWidth: '100%', borderRadius: 8 }} />
          ) : (
            <iframe src={fotoUrl} style={{ width: '100%', height: 500, border: 'none' }} title="Foto firmada" />
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => window.open(fotoUrl, '_blank', 'noopener,noreferrer')}>
            Descargar
          </Button>
          <Button onClick={() => setFotoDialog(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
