import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  CircularProgress,
  MenuItem,
  Typography,
} from '@mui/material';
import { useNotificationStore } from '../stores/notificationStore';
import api from '../services/api';

interface StockTransferFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function StockTransferForm({
  open,
  onClose,
  onSuccess,
}: StockTransferFormProps) {
  const [loading, setLoading] = useState(false);
  const [depositos, setDepositos] = useState<any[]>([]);
  const [stock, setStock] = useState<any[]>([]);
  const { showNotification } = useNotificationStore();
  
  const [formData, setFormData] = useState({
    depositoOrigenId: 0,
    depositoDestinoId: 0,
    articuloId: 0,
    cantidad: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (formData.depositoOrigenId) {
      loadStock(formData.depositoOrigenId);
    }
  }, [formData.depositoOrigenId]);

  const loadData = async () => {
    try {
      const depositosRes = await api.get('/depositos');
      setDepositos(depositosRes.data);
      if (depositosRes.data.length > 0) {
        setFormData((prev) => ({
          ...prev,
          depositoOrigenId: depositosRes.data[0].id,
          depositoDestinoId: depositosRes.data[1]?.id || 0,
        }));
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    }
  };

  const loadStock = async (depositoId: number) => {
    try {
      const response = await api.get(`/stock/deposito/${depositoId}`);
      setStock(response.data);
    } catch (error) {
      console.error('Error cargando stock:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/stock/transferir', formData);
      showNotification('Transferencia realizada correctamente', 'success');
      onSuccess();
      onClose();
    } catch (error: any) {
      showNotification(
        error.response?.data?.message || 'Error al realizar transferencia',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const stockDisponible = stock.find(
    (s) => s.articuloId === formData.articuloId
  )?.cantidad || 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Transferir Stock entre Depósitos</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Transfiere mercadería de un depósito a otro
          </Typography>
          
          <TextField
            select
            fullWidth
            label="Depósito Origen"
            value={formData.depositoOrigenId}
            onChange={(e) => handleChange('depositoOrigenId', parseInt(e.target.value))}
            margin="normal"
            required
          >
            {depositos.map((deposito) => (
              <MenuItem key={deposito.id} value={deposito.id}>
                {deposito.nombre}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            fullWidth
            label="Depósito Destino"
            value={formData.depositoDestinoId}
            onChange={(e) => handleChange('depositoDestinoId', parseInt(e.target.value))}
            margin="normal"
            required
          >
            {depositos
              .filter((d) => d.id !== formData.depositoOrigenId)
              .map((deposito) => (
                <MenuItem key={deposito.id} value={deposito.id}>
                  {deposito.nombre}
                </MenuItem>
              ))}
          </TextField>

          <TextField
            select
            fullWidth
            label="Artículo"
            value={formData.articuloId}
            onChange={(e) => handleChange('articuloId', parseInt(e.target.value))}
            margin="normal"
            required
          >
            <MenuItem value={0}>Seleccionar artículo</MenuItem>
            {stock.map((item) => (
              <MenuItem key={item.articulo.id} value={item.articulo.id}>
                {item.articulo.nombre} (Stock: {item.cantidad})
              </MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth
            label="Cantidad"
            type="number"
            value={formData.cantidad}
            onChange={(e) => handleChange('cantidad', parseInt(e.target.value))}
            margin="normal"
            inputProps={{ min: 1, max: stockDisponible }}
            required
            helperText={`Stock disponible: ${stockDisponible}`}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Transferir'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
