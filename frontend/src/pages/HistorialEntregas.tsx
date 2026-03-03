import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  PhotoCamera as FotoIcon,
  Download as DownloadIcon,
  FilterAlt as FilterIcon,
} from '@mui/icons-material';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../services/api';
import ExportExcelButton from '../components/ExportExcelButton';

export default function HistorialEntregas() {
  const [entregas, setEntregas]   = useState<any[]>([]);
  const [depositos, setDepositos] = useState<any[]>([]);
  const [loading, setLoading]     = useState(false);

  // Filtros
  const [fechaDesde, setFechaDesde]   = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [fechaHasta, setFechaHasta]   = useState(format(new Date(), 'yyyy-MM-dd'));
  const [depositoFiltro, setDepositoFiltro] = useState('');

  // Diálogo foto
  const [fotoDialog, setFotoDialog] = useState(false);
  const [fotoUrl, setFotoUrl]       = useState('');
  const [fotoRemito, setFotoRemito] = useState<any>(null);

  useEffect(() => {
    api.get('/depositos').then((r) => setDepositos(r.data)).catch(() => {});
    buscar();
  }, []);

  const buscar = async () => {
    setLoading(true);
    try {
      const params: any = { estado: 'ENTREGADO', fechaDesde, fechaHasta };
      if (depositoFiltro) params.depositoId = depositoFiltro;
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
    setFotoUrl(`/uploads/${remito.entregadoFoto.replace(/^uploads\//, '')}`);
    setFotoDialog(true);
  };

  // ── Estadísticas ────────────────────────────────────────────────────────────
  const totalKg     = entregas.reduce((s, r) => s + (r.totalKg || 0), 0);
  const conFoto     = entregas.filter((r) => r.entregadoFoto).length;
  const sinFoto     = entregas.length - conFoto;

  // Datos para exportar
  const exportData = entregas.map((r) => ({
    Numero:       r.numero,
    Fecha:        format(new Date(r.fecha), 'dd/MM/yyyy'),
    FechaEntrega: r.entregadoAt ? format(new Date(r.entregadoAt), 'dd/MM/yyyy HH:mm') : '',
    Beneficiario: r.beneficiario?.nombre,
    Deposito:     r.deposito?.nombre,
    TotalKg:      r.totalKg?.toFixed(2),
    QuienRetiro:  r.entregadoNota || '',
    TieneFoto:    r.entregadoFoto ? 'Sí' : 'No',
  }));

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          Historial de Entregas
        </Typography>
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
            label="Desde"
            type="date"
            size="small"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 160 }}
          />
          <TextField
            label="Hasta"
            type="date"
            size="small"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 160 }}
          />
          <FormControl size="small" sx={{ width: 200 }}>
            <InputLabel>Depósito</InputLabel>
            <Select
              value={depositoFiltro}
              label="Depósito"
              onChange={(e) => setDepositoFiltro(e.target.value)}
            >
              <MenuItem value="">Todos</MenuItem>
              {depositos.map((d) => (
                <MenuItem key={d.id} value={d.id}>{d.nombre}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<FilterIcon />}
            onClick={buscar}
            disabled={loading}
          >
            Buscar
          </Button>
        </Box>
      </Paper>

      {/* Estadísticas */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={3}>
          <Card variant="outlined">
            <CardContent sx={{ py: 1.5 }}>
              <Typography variant="caption" color="text.secondary">TOTAL ENTREGAS</Typography>
              <Typography variant="h4" fontWeight="bold" color="primary">
                {entregas.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                en el período seleccionado
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card variant="outlined">
            <CardContent sx={{ py: 1.5 }}>
              <Typography variant="caption" color="text.secondary">TOTAL KG ENTREGADOS</Typography>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {totalKg.toFixed(0)}
              </Typography>
              <Typography variant="caption" color="text.secondary">kilogramos</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card variant="outlined">
            <CardContent sx={{ py: 1.5 }}>
              <Typography variant="caption" color="text.secondary">CON FOTO FIRMADA</Typography>
              <Typography variant="h4" fontWeight="bold" color="info.main">
                {conFoto}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {entregas.length > 0
                  ? `${Math.round((conFoto / entregas.length) * 100)}% del total`
                  : '—'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card variant="outlined">
            <CardContent sx={{ py: 1.5 }}>
              <Typography variant="caption" color="text.secondary">SIN FOTO</Typography>
              <Typography variant="h4" fontWeight="bold" color={sinFoto > 0 ? 'warning.main' : 'text.disabled'}>
                {sinFoto}
              </Typography>
              <Typography variant="caption" color="text.secondary">pendientes de documentar</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabla */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
      ) : entregas.length === 0 ? (
        <Alert severity="info">No hay entregas en el período seleccionado.</Alert>
      ) : (
        <TableContainer component={Paper} elevation={2}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell>N° Remito</TableCell>
                <TableCell>Fecha Remito</TableCell>
                <TableCell>Fecha Entrega</TableCell>
                <TableCell>Beneficiario</TableCell>
                <TableCell>Depósito</TableCell>
                <TableCell align="right">Kg</TableCell>
                <TableCell>¿Quién retiró?</TableCell>
                <TableCell align="center">Foto</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {entregas.map((remito) => (
                <TableRow key={remito.id} hover>
                  <TableCell><strong>{remito.numero}</strong></TableCell>
                  <TableCell>
                    {format(new Date(remito.fecha), 'dd/MM/yyyy', { locale: es })}
                  </TableCell>
                  <TableCell>
                    {remito.entregadoAt
                      ? format(new Date(remito.entregadoAt), 'dd/MM/yyyy HH:mm', { locale: es })
                      : <Typography variant="caption" color="text.disabled">—</Typography>}
                  </TableCell>
                  <TableCell>{remito.beneficiario?.nombre}</TableCell>
                  <TableCell>
                    <Chip label={remito.deposito?.nombre} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell align="right">
                    <strong>{remito.totalKg?.toFixed(2)}</strong>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 200 }}>
                    {remito.entregadoNota
                      ? <Typography variant="caption">{remito.entregadoNota}</Typography>
                      : <Typography variant="caption" color="text.disabled">—</Typography>}
                  </TableCell>
                  <TableCell align="center">
                    {remito.entregadoFoto ? (
                      <Tooltip title="Ver foto firmada">
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => abrirFoto(remito)}
                        >
                          <FotoIcon />
                        </IconButton>
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
      )}

      {/* Diálogo foto */}
      <Dialog open={fotoDialog} onClose={() => setFotoDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Foto firmada — {fotoRemito?.numero} · {fotoRemito?.beneficiario?.nombre}
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', p: 1 }}>
          {fotoUrl.match(/\.(jpg|jpeg|png|webp)$/i) ? (
            <img
              src={fotoUrl}
              alt="Remito firmado"
              style={{ maxWidth: '100%', borderRadius: 8 }}
            />
          ) : (
            <iframe src={fotoUrl} style={{ width: '100%', height: 500, border: 'none' }} title="Foto firmada" />
          )}
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            href={fotoUrl}
            download
            target="_blank"
          >
            Descargar
          </Button>
          <Button onClick={() => setFotoDialog(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
