import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Chip,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  SwapHoriz as TransferIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import api from '../services/api';
import StockIngresoForm from '../components/StockIngresoForm';
import StockTransferForm from '../components/StockTransferForm';

export default function StockPage() {
  const { user } = useAuthStore();
  const soloLectura = !!(user?.depositoId);

  const [stock, setStock] = useState<any[]>([]);
  const [depositos, setDepositos] = useState<any[]>([]);
  const [selectedDeposito, setSelectedDeposito] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stockBajo, setStockBajo] = useState<any[]>([]);
  const [ingresoFormOpen, setIngresoFormOpen] = useState(false);
  const [transferFormOpen, setTransferFormOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (depositos.length > 0) {
      loadStock(depositos[selectedDeposito].id);
    }
  }, [selectedDeposito, depositos]);

  const loadData = async () => {
    try {
      const [depositosRes, stockBajoRes] = await Promise.all([
        api.get('/depositos'),
        api.get('/reportes/stock-bajo'),
      ]);
      setDepositos(depositosRes.data);
      setStockBajo(stockBajoRes.data);
      if (depositosRes.data.length > 0) {
        await loadStock(depositosRes.data[0].id);
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

  if (loading && depositos.length === 0) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          Stock
        </Typography>
        <Box display="flex" gap={2}>
          {!soloLectura && (
            <Button
              variant="outlined"
              startIcon={<TransferIcon />}
              onClick={() => setTransferFormOpen(true)}
            >
              Transferir
            </Button>
          )}
          {!soloLectura && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setIngresoFormOpen(true)}
            >
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

      <Paper elevation={2} sx={{ mb: 3 }}>
        <Tabs
          value={selectedDeposito}
          onChange={(_, value) => setSelectedDeposito(value)}
        >
          {depositos.map((deposito, _index) => (
            <Tab key={deposito.id} label={deposito.nombre} />
          ))}
        </Tabs>
      </Paper>

      {loading ? (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
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
                  <TableRow
                    key={item.id}
                    hover
                    sx={{ bgcolor: isBajo ? 'warning.light' : 'inherit' }}
                  >
                    <TableCell><strong>{item.articulo.nombre}</strong></TableCell>
                    <TableCell>{item.articulo.categoria || '-'}</TableCell>
                    <TableCell align="right">
                      <strong>{item.cantidad}</strong>
                    </TableCell>
                    <TableCell>{item.articulo.pesoUnitarioKg ? `${item.articulo.pesoUnitarioKg} kg/u` : '-'}</TableCell>
                    <TableCell align="right">{item.articulo.stockMinimo}</TableCell>
                    <TableCell align="center">
                      {isBajo ? (
                        <Chip label="BAJO" size="small" color="warning" />
                      ) : (
                        <Chip label="OK" size="small" color="success" />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <StockIngresoForm
        open={ingresoFormOpen}
        onClose={() => setIngresoFormOpen(false)}
        onSuccess={() => {
          loadData();
          setIngresoFormOpen(false);
        }}
      />

      <StockTransferForm
        open={transferFormOpen}
        onClose={() => setTransferFormOpen(false)}
        onSuccess={() => {
          loadData();
          setTransferFormOpen(false);
        }}
      />
    </Box>
  );
}
