import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import {
  Box, Button, Typography, CircularProgress, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Tabs, Tab, Chip, Alert, IconButton, Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  SwapHoriz as TransferIcon,
  Warning as WarningIcon,
  Description as DocIcon,
  OpenInNew as OpenIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../services/api';
import StockIngresoForm from '../components/StockIngresoForm';
import StockTransferForm from '../components/StockTransferForm';

const TIPO_LABEL: Record<string, string> = {
  INGRESO: 'Ingreso',
  EGRESO: 'Egreso',
  AJUSTE: 'Ajuste',
  TRANSFERENCIA: 'Transferencia',
};
const TIPO_COLOR: Record<string, 'success' | 'error' | 'warning' | 'info'> = {
  INGRESO: 'success',
  EGRESO: 'error',
  AJUSTE: 'warning',
  TRANSFERENCIA: 'info',
};

export default function StockPage() {
  const { user } = useAuthStore();
  const soloLectura = !!(user?.depositoId) || !['ADMIN', 'LOGISTICA'].includes(user?.rol ?? '');

  const [stock, setStock] = useState<any[]>([]);
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [depositos, setDepositos] = useState<any[]>([]);
  const [selectedDeposito, setSelectedDeposito] = useState(0);
  const [vistaTab, setVistaTab] = useState(0); // 0=stock, 1=movimientos
  const [loading, setLoading] = useState(true);
  const [loadingMov, setLoadingMov] = useState(false);
  const [stockBajo, setStockBajo] = useState<any[]>([]);
  const [ingresoFormOpen, setIngresoFormOpen] = useState(false);
  const [transferFormOpen, setTransferFormOpen] = useState(false);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (depositos.length > 0) {
      loadStock(depositos[selectedDeposito].id);
    }
  }, [selectedDeposito, depositos]);

  useEffect(() => {
    if (vistaTab === 1) loadMovimientos();
  }, [vistaTab]);

  const loadData = async () => {
    try {
      const [depositosRes, stockBajoRes] = await Promise.all([
        api.get('/depositos'),
        api.get('/reportes/stock-bajo'),
      ]);
      const esCita = user?.rol === 'ASISTENCIA_CRITICA';
      const todos = depositosRes.data as any[];
      // ASISTENCIA_CRITICA solo ve el depósito CITA
      const depositosFiltrados = esCita ? todos.filter((d) => d.codigo === 'CITA') : todos;
      setDepositos(depositosFiltrados);
      setStockBajo(stockBajoRes.data);
      if (depositosFiltrados.length > 0) {
        await loadStock(depositosFiltrados[0].id);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStock = async (depositoId: number) => {
    try {
      setLoading(true);
      const response = await api.get(`/stock/deposito/${depositoId}`);
      setStock(response.data);
    } catch (error) {
      console.error('Error cargando stock:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMovimientos = async () => {
    setLoadingMov(true);
    try {
      const res = await api.get('/stock/movimientos');
      setMovimientos(res.data);
    } catch {
      console.error('Error cargando movimientos');
    } finally {
      setLoadingMov(false);
    }
  };

  if (loading && depositos.length === 0) {
    return <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">Stock</Typography>
        <Box display="flex" gap={2}>
          {!soloLectura && (
            <Button variant="outlined" startIcon={<TransferIcon />} onClick={() => setTransferFormOpen(true)}>
              Transferir
            </Button>
          )}
          {!soloLectura && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setIngresoFormOpen(true)}>
              Registrar Ingreso
            </Button>
          )}
        </Box>
      </Box>

      {stockBajo.length > 0 && (
        <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 3 }}>
          Hay {stockBajo.length} artículo(s) con stock bajo
        </Alert>
      )}

      {/* Tabs vista: Stock / Movimientos */}
      <Paper elevation={2} sx={{ mb: 3 }}>
        <Tabs value={vistaTab} onChange={(_, v) => setVistaTab(v)}>
          <Tab label="Stock actual" />
          <Tab label="Historial de movimientos" />
        </Tabs>
      </Paper>

      {vistaTab === 0 && (
        <>
          {/* Sub-tabs por depósito */}
          <Paper elevation={1} sx={{ mb: 2 }}>
            <Tabs value={selectedDeposito} onChange={(_, v) => setSelectedDeposito(v)}>
              {depositos.map((d) => <Tab key={d.id} label={d.nombre} />)}
            </Tabs>
          </Paper>

          {loading ? (
            <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>
          ) : (
            <TableContainer component={Paper} elevation={2}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Artículo</TableCell>
                    <TableCell>Categoría</TableCell>
                    <TableCell align="right">Cantidad</TableCell>
                    <TableCell>Peso Unit.</TableCell>
                    <TableCell align="right">Stock Mínimo</TableCell>
                    <TableCell align="center">Estado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stock.map((item) => {
                    const isBajo = item.cantidad <= item.articulo.stockMinimo;
                    return (
                      <TableRow key={item.id} hover sx={{ bgcolor: isBajo ? 'warning.light' : 'inherit' }}>
                        <TableCell><strong>{item.articulo.nombre}</strong></TableCell>
                        <TableCell>{item.articulo.categoria || '-'}</TableCell>
                        <TableCell align="right"><strong>{item.cantidad}</strong></TableCell>
                        <TableCell>{item.articulo.pesoUnitarioKg ? `${item.articulo.pesoUnitarioKg} kg/u` : '-'}</TableCell>
                        <TableCell align="right">{item.articulo.stockMinimo}</TableCell>
                        <TableCell align="center">
                          {isBajo
                            ? <Chip label="BAJO" size="small" color="warning" />
                            : <Chip label="OK" size="small" color="success" />}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      {vistaTab === 1 && (
        <>
          {loadingMov ? (
            <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>
          ) : (
            <TableContainer component={Paper} elevation={2}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Artículo</TableCell>
                    <TableCell align="right">Cantidad</TableCell>
                    <TableCell>Depósito</TableCell>
                    <TableCell>Usuario</TableCell>
                    <TableCell>Observaciones</TableCell>
                    <TableCell align="center">Doc.</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {movimientos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Typography variant="body2" color="text.secondary">Sin movimientos</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    movimientos.map((m) => (
                      <TableRow key={m.id} hover>
                        <TableCell sx={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                          {format(new Date(m.fecha), 'dd/MM/yy HH:mm', { locale: es })}
                        </TableCell>
                        <TableCell>
                          <Chip label={TIPO_LABEL[m.tipo] ?? m.tipo} size="small" color={TIPO_COLOR[m.tipo] ?? 'default'} />
                        </TableCell>
                        <TableCell>{m.articulo?.nombre}</TableCell>
                        <TableCell align="right"><strong>{m.cantidad}</strong></TableCell>
                        <TableCell sx={{ fontSize: '0.8rem' }}>
                          {m.depositoHacia?.nombre || m.depositoDesde?.nombre || '—'}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.8rem' }}>{m.usuario?.nombre || '—'}</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.observaciones || '—'}
                        </TableCell>
                        <TableCell align="center">
                          {m.documentoUrl ? (
                            <Tooltip title="Ver documento adjunto">
                              <IconButton size="small" color="primary" href={m.documentoUrl} target="_blank" rel="noopener noreferrer">
                                <DocIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          ) : (
                            <Typography variant="caption" color="text.disabled">—</Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      <StockIngresoForm
        open={ingresoFormOpen}
        onClose={() => setIngresoFormOpen(false)}
        onSuccess={() => { loadData(); setIngresoFormOpen(false); }}
      />

      <StockTransferForm
        open={transferFormOpen}
        onClose={() => setTransferFormOpen(false)}
        onSuccess={() => { loadData(); setTransferFormOpen(false); }}
      />
    </Box>
  );
}
