import { useEffect, useState } from 'react';
import {
  Box, Typography, CircularProgress, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, TextField, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, Alert, Grid, Card, CardContent,
  FormControl, InputLabel, Select, MenuItem, Tooltip, IconButton, Collapse,
} from '@mui/material';
import {
  PhotoCamera as FotoIcon, Download as DownloadIcon, FilterAlt as FilterIcon,
  ExpandMore as ExpandIcon, ExpandLess as CollapseIcon, CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../services/api';
import ExportExcelButton from '../components/ExportExcelButton';

export default function HistorialEntregas() {
  const [entregas, setEntregas]     = useState<any[]>([]);
  const [depositos, setDepositos]   = useState<any[]>([]);
  const [programas, setProgramas]   = useState<any[]>([]);
  const [loading, setLoading]       = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

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

  useEffect(() => {
    Promise.all([
      api.get('/depositos'),
      api.get('/programas'),
    ]).then(([depR, proR]) => {
      setDepositos(depR.data);
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
    setFotoUrl(remito.entregadoFoto);
    setFotoDialog(true);
  };

  const totalKg  = entregas.reduce((s, r) => s + (r.totalKg || 0), 0);
  const conFoto  = entregas.filter((r) => r.entregadoFoto).length;
  const sinFoto  = entregas.length - conFoto;

  const exportData = entregas.map((r) => ({
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

      {/* Estadísticas */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'TOTAL ENTREGAS', value: entregas.length, color: 'primary', sub: 'en el período' },
          { label: 'TOTAL KG ENTREGADOS', value: `${totalKg.toFixed(0)} kg`, color: 'success.main', sub: 'kilogramos' },
          { label: 'CON FOTO FIRMADA', value: conFoto, color: 'info.main', sub: entregas.length > 0 ? `${Math.round((conFoto / entregas.length) * 100)}% del total` : '—' },
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
      ) : entregas.length === 0 ? (
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
              </TableRow>
            </TableHead>
            <TableBody>
              {entregas.map((remito) => (
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
                    <TableCell sx={{ maxWidth: 180 }}>
                      {remito.entregadoNota
                        ? <Typography variant="caption" noWrap>{remito.entregadoNota}</Typography>
                        : <Typography variant="caption" color="text.disabled">—</Typography>}
                    </TableCell>
                    <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                      {remito.entregadoFoto ? (
                        <Tooltip title="Ver foto firmada">
                          <IconButton size="small" color="success" onClick={() => abrirFoto(remito)}>
                            <FotoIcon />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Typography variant="caption" color="text.disabled">—</Typography>
                      )}
                    </TableCell>
                  </TableRow>

                  {/* Fila expandida: artículos */}
                  <TableRow key={`exp-${remito.id}`}>
                    <TableCell colSpan={10} sx={{ p: 0, border: expandedId === remito.id ? undefined : 'none' }}>
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
          <Button variant="outlined" startIcon={<DownloadIcon />} href={fotoUrl} download target="_blank">
            Descargar
          </Button>
          <Button onClick={() => setFotoDialog(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
