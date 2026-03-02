import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  CircularProgress,
  MenuItem,
} from '@mui/material';
import { useNotificationStore } from '../stores/notificationStore';
import api from '../services/api';

interface ArticuloFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  articulo?: any;
}

export default function ArticuloForm({
  open,
  onClose,
  onSuccess,
  articulo,
}: ArticuloFormProps) {
  const [loading, setLoading] = useState(false);
  const { showNotification } = useNotificationStore();
  const [formData, setFormData] = useState({
    codigo: articulo?.codigo || '',
    descripcion: articulo?.descripcion || '',
    unidadMedida: articulo?.unidadMedida || 'UNIDAD',
    pesoUnitarioKg: articulo?.pesoUnitarioKg || 0,
    stockMinimo: articulo?.stockMinimo || 100,
    activo: articulo?.activo ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (articulo) {
        await api.patch(`/articulos/${articulo.id}`, formData);
        showNotification('Artículo actualizado correctamente', 'success');
      } else {
        await api.post('/articulos', formData);
        showNotification('Artículo creado correctamente', 'success');
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      showNotification(
        error.response?.data?.message || 'Error al guardar artículo',
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
      <DialogTitle>
        {articulo ? 'Editar Artículo' : 'Nuevo Artículo'}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <TextField
            fullWidth
            label="Código"
            value={formData.codigo}
            onChange={(e) => handleChange('codigo', e.target.value)}
            margin="normal"
            required
            disabled={!!articulo}
            helperText={articulo ? 'El código no se puede modificar' : ''}
          />
          <TextField
            fullWidth
            label="Descripción"
            value={formData.descripcion}
            onChange={(e) => handleChange('descripcion', e.target.value)}
            margin="normal"
            required
          />
          <TextField
            select
            fullWidth
            label="Unidad de Medida"
            value={formData.unidadMedida}
            onChange={(e) => handleChange('unidadMedida', e.target.value)}
            margin="normal"
            required
          >
            <MenuItem value="UNIDAD">Unidad</MenuItem>
            <MenuItem value="KG">Kilogramos</MenuItem>
            <MenuItem value="LITRO">Litros</MenuItem>
            <MenuItem value="PAQUETE">Paquete</MenuItem>
            <MenuItem value="CAJA">Caja</MenuItem>
          </TextField>
          <TextField
            fullWidth
            label="Peso Unitario (kg)"
            type="number"
            value={formData.pesoUnitarioKg}
            onChange={(e) => handleChange('pesoUnitarioKg', parseFloat(e.target.value))}
            margin="normal"
            inputProps={{ step: 0.01, min: 0 }}
            required
            helperText="Peso en kilogramos de una unidad"
          />
          <TextField
            fullWidth
            label="Stock Mínimo"
            type="number"
            value={formData.stockMinimo}
            onChange={(e) => handleChange('stockMinimo', parseInt(e.target.value))}
            margin="normal"
            inputProps={{ min: 0 }}
            required
            helperText="Cantidad mínima antes de mostrar alerta"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Guardar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
