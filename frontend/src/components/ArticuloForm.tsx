import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  CircularProgress,
} from '@mui/material';
import { useNotificationStore } from '../stores/notificationStore';
import api from '../services/api';

interface ArticuloFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  articulo?: any;
  readOnly?: boolean;
}

export default function ArticuloForm({
  open,
  onClose,
  onSuccess,
  articulo,
  readOnly = false,
}: ArticuloFormProps) {
  const [loading, setLoading] = useState(false);
  const { showNotification } = useNotificationStore();
  const [formData, setFormData] = useState({
    nombre: articulo?.nombre || '',
    descripcion: articulo?.descripcion || '',
    categoria: articulo?.categoria || '',
    pesoUnitarioKg: articulo?.pesoUnitarioKg || 0,
    stockMinimo: articulo?.stockMinimo || 100,
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
        {readOnly ? 'Detalle de Artículo' : (articulo ? 'Editar Artículo' : 'Nuevo Artículo')}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <TextField
            fullWidth
            label="Nombre"
            value={formData.nombre}
            onChange={(e) => handleChange('nombre', e.target.value)}
            margin="normal"
            required
            disabled={!!articulo || readOnly}
            helperText={articulo ? 'El nombre no se puede modificar' : ''}
          />
          <TextField
            fullWidth
            label="Descripción"
            value={formData.descripcion}
            onChange={(e) => handleChange('descripcion', e.target.value)}
            margin="normal"
            multiline
            rows={2}
            disabled={readOnly}
          />
          <TextField
            fullWidth
            label="Categoría"
            value={formData.categoria}
            onChange={(e) => handleChange('categoria', e.target.value)}
            margin="normal"
            placeholder="Ej: Alimentos, Lácteos, Granos, etc."
            disabled={readOnly}
          />
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
            disabled={readOnly}
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
            disabled={readOnly}
          />
        </DialogContent>
        <DialogActions>
          {readOnly ? (
            <Button onClick={onClose} variant="outlined">Cerrar</Button>
          ) : (
            <>
              <Button onClick={onClose} disabled={loading}>Cancelar</Button>
              <Button type="submit" variant="contained" disabled={loading}>
                {loading ? <CircularProgress size={24} /> : 'Guardar'}
              </Button>
            </>
          )}
        </DialogActions>
      </form>
    </Dialog>
  );
}
