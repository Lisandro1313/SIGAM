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
  Box,
  Divider,
  IconButton,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useNotificationStore } from '../stores/notificationStore';
import api from '../services/api';

interface StockIngresoFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function StockIngresoForm({
  open,
  onClose,
  onSuccess,
}: StockIngresoFormProps) {
  const [loading, setLoading] = useState(false);
  const [depositos, setDepositos] = useState<any[]>([]);
  const [articulos, setArticulos] = useState<any[]>([]);
  const { showNotification } = useNotificationStore();
  
  const [formData, setFormData] = useState({
    depositoId: 0,
    articuloId: 0,
    cantidad: 0,
    motivo: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [depositosRes, articulosRes] = await Promise.all([
        api.get('/depositos'),
        api.get('/articulos'),
      ]);
      setDepositos(depositosRes.data);
      setArticulos(articulosRes.data.filter((a: any) => a.activo));
      if (depositosRes.data.length > 0) {
        setFormData((prev) => ({ ...prev, depositoId: depositosRes.data[0].id }));
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/stock/ingreso', formData);
      showNotification('Ingreso de stock registrado correctamente', 'success');
      onSuccess();
      onClose();
      // Reset form
      setFormData({
        depositoId: depositos[0]?.id || 0,
        articuloId: 0,
        cantidad: 0,
        motivo: '',
      });
    } catch (error: any) {
      showNotification(
        error.response?.data?.message || 'Error al registrar ingreso',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Registrar Ingreso de Stock</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Registra mercadería que ingresa al depósito (compras, donaciones, etc.)
          </Typography>
          
          <TextField
            select
            fullWidth
            label="Depósito"
            value={formData.depositoId}
            onChange={(e) => handleChange('depositoId', parseInt(e.target.value))}
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
            label="Artículo"
            value={formData.articuloId}
            onChange={(e) => handleChange('articuloId', parseInt(e.target.value))}
            margin="normal"
            required
          >
            <MenuItem value={0}>Seleccionar artículo</MenuItem>
            {articulos.map((articulo) => (
              <MenuItem key={articulo.id} value={articulo.id}>
                {articulo.codigo} - {articulo.descripcion}
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
            inputProps={{ min: 1 }}
            required
          />

          <TextField
            fullWidth
            label="Motivo"
            value={formData.motivo}
            onChange={(e) => handleChange('motivo', e.target.value)}
            margin="normal"
            multiline
            rows={2}
            placeholder="Ej: Compra proveedor, Donación, Ajuste inventario"
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Registrar Ingreso'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
