import { useEffect, useState, useMemo } from 'react';
import {
  Box, Typography, CircularProgress, Paper, Chip, Divider, ButtonBase, Tooltip,
  Grid, Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Tab, Tabs, List, ListItem, ListItemText, ListItemSecondaryAction,
  InputAdornment, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  Place as PlaceIcon,
  FilterAlt as FilterIcon,
  Layers as ZonasIcon,
  Draw as DrawIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import api from '../services/api';
import BeneficiarioMap, { buildLocalidadColors, TIPO_COLORS, TIPO_LABELS, ZonaData, countBenInZona } from '../components/BeneficiarioMap';
import { useNotificationStore } from '../stores/notificationStore';

const ZONA_COLORS = ['#3388ff','#e53935','#43a047','#fb8c00','#8e24aa','#00acc1','#f06292','#00897b','#ff6d00'];

export default function MapaPage() {
  const { showNotification } = useNotificationStore();
  const [beneficiarios, setBeneficiarios] = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [selLocalidad, setSelLocalidad]   = useState<string | null>(null);
  const [tabIdx, setTabIdx]               = useState(0); // 0 = Localidades, 1 = Zonas

  // Zonas
  const [zonas, setZonas]                 = useState<ZonaData[]>([]);
  const [drawingMode, setDrawingMode]     = useState(false);
  const [drawingPts, setDrawingPts]       = useState<[number, number][]>([]);
  const [saveDialog, setSaveDialog]       = useState(false);
  const [zonaNombre, setZonaNombre]       = useState('');
  const [zonaColor, setZonaColor]         = useState(ZONA_COLORS[0]);
  const [editZona, setEditZona]           = useState<ZonaData | null>(null);
  const [editNombre, setEditNombre]       = useState('');

  // Filtros
  const [tiposFiltro, setTiposFiltro]     = useState<Set<string>>(new Set());
  const [buscarBen, setBuscarBen]         = useState('');
  const [programaFiltro, setProgramaFiltro] = useState<string>('');
  const [soloSinGPS, setSoloSinGPS]       = useState(false);

  const allTipos = useMemo(() => [...new Set(beneficiarios.map(b => b.tipo))], [beneficiarios]);
  const allProgramas = useMemo(
    () => [...new Set(beneficiarios.map(b => b.programa?.nombre).filter(Boolean))].sort() as string[],
    [beneficiarios],
  );
  const benFiltrados = useMemo(() => {
    let list = beneficiarios;
    if (tiposFiltro.size > 0) list = list.filter(b => tiposFiltro.has(b.tipo));
    if (programaFiltro) list = list.filter(b => b.programa?.nombre === programaFiltro);
    if (soloSinGPS) list = list.filter(b => !b.latitud || !b.longitud);
    if (buscarBen.trim()) list = list.filter(b =>
      b.nombre?.toLowerCase().includes(buscarBen.toLowerCase()) ||
      b.localidad?.toLowerCase().includes(buscarBen.toLowerCase())
    );
    return list;
  }, [beneficiarios, tiposFiltro, buscarBen, programaFiltro, soloSinGPS]);

  const localidadColors = useMemo(() => buildLocalidadColors(benFiltrados), [benFiltrados]);

  useEffect(() => {
    Promise.all([
      api.get('/beneficiarios', { params: { limit: 5000 } }),
      api.get('/zonas'),
    ]).then(([benR, zonR]) => {
      setBeneficiarios(benR.data.data ?? benR.data ?? []);
      setZonas(zonR.data ?? []);
    }).catch(() => {
      setBeneficiarios([]);
      setZonas([]);
    }).finally(() => setLoading(false));
  }, []);

  // Beneficiarios sin coordenadas
  const sinCoords = useMemo(() => beneficiarios.filter(b => !b.latitud || !b.longitud), [beneficiarios]);

  // Exportar localidad seleccionada a Excel
  const exportarLocalidad = () => {
    const lista = selLocalidad
      ? benFiltrados.filter(b => (b.localidad || 'Sin localidad') === selLocalidad)
      : benFiltrados;
    const rows = lista.map(b => ({
      nombre: b.nombre, tipo: b.tipo, localidad: b.localidad ?? '', direccion: b.direccion ?? '',
      telefono: b.telefono ?? '', responsable: b.responsableNombre ?? '', dni: b.responsableDNI ?? '',
      programa: b.programa?.nombre ?? '', frecuencia: b.frecuenciaEntrega ?? '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mapa');
    XLSX.writeFile(wb, `mapa_${selLocalidad ?? 'todos'}.xlsx`);
  };

  // Estadísticas agrupadas por localidad
  const stats = useMemo(() => {
    const map: Record<string, { color: string; total: number; tipos: Record<string, number> }> = {};
    benFiltrados.forEach((b) => {
      const loc = b.localidad || 'Sin localidad';
      if (!map[loc]) map[loc] = { color: localidadColors[loc] || '#607d8b', total: 0, tipos: {} };
      map[loc].total++;
      map[loc].tipos[b.tipo] = (map[loc].tipos[b.tipo] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [benFiltrados, localidadColors]);


  function handleMapClick(lat: number, lng: number) {
    if (!drawingMode) return;
    setDrawingPts(prev => [...prev, [lat, lng]]);
  }

  function handleCancelDraw() {
    setDrawingMode(false);
    setDrawingPts([]);
  }

  function handleFinishDraw() {
    if (drawingPts.length < 3) {
      showNotification('Necesitás al menos 3 puntos para crear una zona', 'warning');
      return;
    }
    setSaveDialog(true);
  }

  async function handleSaveZona() {
    if (!zonaNombre.trim()) return;
    try {
      const r = await api.post('/zonas', {
        nombre: zonaNombre.trim(),
        color: zonaColor,
        geojson: JSON.stringify(drawingPts.map(([lat, lng]) => ({ lat, lng }))),
      });
      setZonas(prev => [...prev, r.data]);
      setSaveDialog(false);
      setDrawingMode(false);
      setDrawingPts([]);
      setZonaNombre('');
      showNotification('Zona guardada', 'success');
    } catch { showNotification('Error guardando zona', 'error'); }
  }

  async function handleDeleteZona(zona: ZonaData) {
    if (!zona.id) return;
    try {
      await api.delete(`/zonas/${zona.id}`);
      setZonas(prev => prev.filter(z => z.id !== zona.id));
      showNotification('Zona eliminada', 'success');
    } catch { showNotification('Error eliminando zona', 'error'); }
  }

  async function handleUpdateNombre() {
    if (!editZona?.id || !editNombre.trim()) return;
    try {
      await api.patch(`/zonas/${editZona.id}`, { nombre: editNombre.trim() });
      setZonas(prev => prev.map(z => z.id === editZona.id ? { ...z, nombre: editNombre.trim() } : z));
      setEditZona(null);
      showNotification('Zona actualizada', 'success');
    } catch { showNotification('Error actualizando zona', 'error'); }
  }

  if (loading) {
    return <Box display="flex" justifyContent="center" mt={6}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Header */}
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="h4" fontWeight="bold">
            Mapa de Beneficiarios — La Plata
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {benFiltrados.length}{benFiltrados.length !== beneficiarios.length ? ` de ${beneficiarios.length}` : ''} beneficiarios
          </Typography>
        </Box>
        {/* Filtros de tipo (chips toggle) */}
        <Box display="flex" gap={0.5} flexWrap="wrap" alignItems="center">
          <Typography variant="caption" color="text.secondary" mr={0.5}>Filtrar:</Typography>
          {allTipos.map(tipo => {
            const activo = tiposFiltro.size === 0 || tiposFiltro.has(tipo);
            return (
              <Chip
                key={tipo}
                label={`${TIPO_LABELS[tipo] || tipo} (${beneficiarios.filter(b => b.tipo === tipo).length})`}
                size="small"
                onClick={() => {
                  setTiposFiltro(prev => {
                    const next = new Set(prev);
                    if (prev.size === 0) {
                      // Primer clic: excluir todos excepto este
                      allTipos.forEach(t => { if (t !== tipo) next.add(t); });
                      // Invertir: mostrar solo este tipo
                      const soloEste = new Set(allTipos.filter(t => t !== tipo));
                      return soloEste.size === allTipos.length - 1
                        ? new Set(allTipos.filter(t => t !== tipo))
                        : soloEste;
                    }
                    if (next.has(tipo)) { next.delete(tipo); }
                    else { next.add(tipo); }
                    if (next.size === allTipos.length) next.clear();
                    return next;
                  });
                }}
                sx={{
                  bgcolor: activo ? TIPO_COLORS[tipo] || '#607d8b' : 'grey.200',
                  color: activo ? 'white' : 'text.disabled',
                  fontWeight: activo ? 'bold' : 'normal',
                  opacity: activo ? 1 : 0.6,
                  cursor: 'pointer',
                }}
              />
            );
          })}
          {tiposFiltro.size > 0 && (
            <Chip label="Mostrar todos" size="small" variant="outlined" onClick={() => setTiposFiltro(new Set())} />
          )}
        </Box>
        <Box display="flex" gap={1} flexWrap="wrap" alignItems="center" mt={0.5}>
          {allProgramas.length > 0 && (
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Programa</InputLabel>
              <Select
                value={programaFiltro}
                label="Programa"
                onChange={(e) => setProgramaFiltro(e.target.value)}
              >
                <MenuItem value="">Todos los programas</MenuItem>
                {allProgramas.map(p => (
                  <MenuItem key={p} value={p}>{p}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <Chip
            label={soloSinGPS ? 'Solo sin GPS ✓' : 'Solo sin GPS'}
            size="small"
            color={soloSinGPS ? 'warning' : 'default'}
            variant={soloSinGPS ? 'filled' : 'outlined'}
            onClick={() => setSoloSinGPS(v => !v)}
          />
          {(programaFiltro || soloSinGPS || tiposFiltro.size > 0 || buscarBen) && (
            <Chip
              label="Limpiar filtros"
              size="small"
              variant="outlined"
              onDelete={() => {
                setProgramaFiltro('');
                setSoloSinGPS(false);
                setTiposFiltro(new Set());
                setBuscarBen('');
              }}
              onClick={() => {
                setProgramaFiltro('');
                setSoloSinGPS(false);
                setTiposFiltro(new Set());
                setBuscarBen('');
              }}
            />
          )}
        </Box>
      </Box>

      {/* Cuerpo: panel izquierdo + mapa */}
      <Box sx={{ flex: 1, display: 'flex', gap: 2, overflow: 'hidden' }}>

        {/* Panel lateral */}
        <Paper elevation={2} sx={{ width: 270, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Tabs value={tabIdx} onChange={(_, v) => setTabIdx(v)} sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 40 }}>
            <Tab label="Localidades" icon={<PlaceIcon fontSize="small" />} iconPosition="start" sx={{ minHeight: 40, textTransform: 'none', fontSize: 13 }} />
            <Tab label={`Zonas (${zonas.length})`} icon={<ZonasIcon fontSize="small" />} iconPosition="start" sx={{ minHeight: 40, textTransform: 'none', fontSize: 13 }} />
          </Tabs>

          {/* Tab Localidades */}
          {tabIdx === 0 && (
            <>
              <Box sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                <TextField
                  size="small" fullWidth placeholder="Buscar beneficiario o localidad..."
                  value={buscarBen}
                  onChange={e => setBuscarBen(e.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                  sx={{ mb: 0.5 }}
                />
                <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={0.5}>
                  <Typography variant="caption" color="text.secondary">
                    {benFiltrados.length} ben. · {stats.length} localidades
                    {sinCoords.length > 0 && (
                      <Chip label={`${sinCoords.length} sin GPS`} size="small" color="warning" sx={{ ml: 0.5, fontSize: '0.6rem', height: 16 }} />
                    )}
                    {selLocalidad && (
                      <Chip label="Limpiar" size="small" icon={<FilterIcon />} onDelete={() => setSelLocalidad(null)} sx={{ ml: 0.5, fontSize: 10 }} />
                    )}
                  </Typography>
                  <Tooltip title={selLocalidad ? `Exportar ${selLocalidad}` : 'Exportar todos los visibles'}>
                    <IconButton size="small" onClick={exportarLocalidad} sx={{ p: 0.3 }}>
                      <FilterIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
              <Box sx={{ overflowY: 'auto', flex: 1 }}>
                {stats.map(([loc, info]) => {
                  const selected = selLocalidad === loc;
                  return (
                    <ButtonBase key={loc} onClick={() => setSelLocalidad(selected ? null : loc)}
                      sx={{ width: '100%', textAlign: 'left', p: 1.5, display: 'block',
                        bgcolor: selected ? 'action.selected' : 'transparent',
                        borderLeft: selected ? `4px solid ${info.color}` : '4px solid transparent',
                        '&:hover': { bgcolor: 'action.hover' }, transition: 'all 0.15s' }}>
                      <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                        <Box sx={{ width: 11, height: 11, borderRadius: '50%', bgcolor: info.color, flexShrink: 0 }} />
                        <Typography variant="body2" fontWeight={selected ? 'bold' : 'normal'} noWrap sx={{ flex: 1 }}>{loc}</Typography>
                        <Typography variant="body2" fontWeight="bold" color="text.secondary">{info.total}</Typography>
                      </Box>
                      <Box display="flex" gap={0.5} flexWrap="wrap">
                        {Object.entries(info.tipos).map(([tipo, cnt]) => (
                          <Tooltip key={tipo} title={`${TIPO_LABELS[tipo] || tipo}: ${cnt}`} arrow>
                            <Box sx={{ px: 0.8, py: 0.2, borderRadius: 1, fontSize: 10, fontWeight: 'bold',
                              bgcolor: TIPO_COLORS[tipo] || '#607d8b', color: 'white', cursor: 'default' }}>
                              {cnt}
                            </Box>
                          </Tooltip>
                        ))}
                      </Box>
                    </ButtonBase>
                  );
                })}
                {stats.length === 0 && (
                  <Box p={2} textAlign="center">
                    <LocationIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">No hay beneficiarios cargados</Typography>
                  </Box>
                )}
              </Box>
              <Divider />
              <Box sx={{ p: 1.5 }}>
                <Typography variant="caption" fontWeight="bold" display="block" mb={0.5}>Tipos</Typography>
                <Grid container spacing={0.5}>
                  {Object.entries(TIPO_LABELS).map(([tipo, label]) => (
                    <Grid item xs={6} key={tipo}>
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: TIPO_COLORS[tipo], flexShrink: 0 }} />
                        <Typography variant="caption" noWrap>{label}</Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </>
          )}

          {/* Tab Zonas */}
          {tabIdx === 1 && (
            <>
              <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                {!drawingMode ? (
                  <Button
                    fullWidth variant="contained" startIcon={<DrawIcon />}
                    onClick={() => { setDrawingMode(true); setDrawingPts([]); }}
                    sx={{ bgcolor: '#ff6d00', '&:hover': { bgcolor: '#e65100' } }}
                    size="small"
                  >
                    Dibujar nueva zona
                  </Button>
                ) : (
                  <Box display="flex" gap={1}>
                    <Button variant="contained" color="success" startIcon={<CheckIcon />}
                      onClick={handleFinishDraw} size="small" sx={{ flex: 1 }}>
                      Finalizar ({drawingPts.length}pts)
                    </Button>
                    <Button variant="outlined" color="error" startIcon={<CloseIcon />}
                      onClick={handleCancelDraw} size="small">
                      Cancelar
                    </Button>
                  </Box>
                )}
                {drawingMode && (
                  <Typography variant="caption" color="warning.main" display="block" mt={0.5}>
                    Hacé clic en el mapa para agregar puntos
                  </Typography>
                )}
              </Box>

              <Box sx={{ overflowY: 'auto', flex: 1 }}>
                {zonas.length === 0 && !drawingMode && (
                  <Box p={2} textAlign="center">
                    <ZonasIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">No hay zonas definidas</Typography>
                    <Typography variant="caption" color="text.secondary">Usá "Dibujar nueva zona" para empezar</Typography>
                  </Box>
                )}
                <List dense>
                  {zonas.map(zona => {
                    const count = countBenInZona(beneficiarios, zona.geojson);
                    return (
                      <ListItem key={zona.id} sx={{ borderLeft: `4px solid ${zona.color}`, mb: 0.5 }}>
                        <ListItemText
                          primary={
                            editZona?.id === zona.id ? (
                              <Box display="flex" gap={0.5} alignItems="center">
                                <TextField size="small" value={editNombre} onChange={e => setEditNombre(e.target.value)}
                                  sx={{ flex: 1 }} autoFocus onKeyDown={e => { if (e.key === 'Enter') handleUpdateNombre(); }} />
                                <IconButton size="small" color="success" onClick={handleUpdateNombre}><CheckIcon fontSize="small" /></IconButton>
                                <IconButton size="small" onClick={() => setEditZona(null)}><CloseIcon fontSize="small" /></IconButton>
                              </Box>
                            ) : zona.nombre
                          }
                          secondary={`${count} beneficiario${count !== 1 ? 's' : ''}`}
                        />
                        {editZona?.id !== zona.id && (
                          <ListItemSecondaryAction>
                            <IconButton size="small" onClick={() => { setEditZona(zona); setEditNombre(zona.nombre); }}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => handleDeleteZona(zona)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </ListItemSecondaryAction>
                        )}
                      </ListItem>
                    );
                  })}
                </List>
              </Box>
            </>
          )}
        </Paper>

        {/* Mapa */}
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <BeneficiarioMap
            beneficiarios={benFiltrados}
            localidadColors={localidadColors}
            localidadSeleccionada={selLocalidad}
            zonas={zonas}
            drawingMode={drawingMode}
            drawingPoints={drawingPts}
            onMapClick={handleMapClick}
          />
        </Box>
      </Box>

      {/* Dialog guardar zona */}
      <Dialog open={saveDialog} onClose={() => setSaveDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight="bold">Guardar zona</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth label="Nombre de la zona" value={zonaNombre}
            onChange={e => setZonaNombre(e.target.value)} autoFocus
            sx={{ mt: 1, mb: 2 }} size="small"
            onKeyDown={e => { if (e.key === 'Enter') handleSaveZona(); }}
          />
          <Typography variant="caption" fontWeight="bold" display="block" mb={1}>Color</Typography>
          <Box display="flex" gap={1} flexWrap="wrap">
            {ZONA_COLORS.map(c => (
              <Box
                key={c}
                onClick={() => setZonaColor(c)}
                sx={{
                  width: 28, height: 28, borderRadius: '50%', bgcolor: c, cursor: 'pointer',
                  border: zonaColor === c ? '3px solid #333' : '3px solid transparent',
                  transition: 'border 0.1s',
                }}
              />
            ))}
          </Box>
          <Typography variant="caption" color="text.secondary" mt={1} display="block">
            Zona con {drawingPts.length} puntos
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveZona} disabled={!zonaNombre.trim()}
            sx={{ bgcolor: zonaColor }}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
