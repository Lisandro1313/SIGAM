import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  MenuItem,
} from '@mui/material';
import { useNotificationStore } from '../stores/notificationStore';
import api from '../services/api';

interface ProgramaFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  programa?: any;
}

export default function ProgramaForm({
  open,
  onClose,
  onSuccess,
  programa,
}: ProgramaFormProps) {
  const [loading, setLoading] = useState(false);
  const { showNotification } = useNotificationStore();
  const [formData, setFormData] = useState({
    nombre: programa?.nombre || '',
    tipo: programa?.tipo || '',
    usaCronograma: programa?.usaCronograma || false,
    usaPlantilla: programa?.usaPlantilla || false,
    descuentaStock: programa?.descuentaStock || true,
    activo: programa?.activo ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (programa) {
        await api.patch(`/programas/${programa.id}`, formData);
        showNotification('Programa actualizado correctamente', 'success');
      } else {
        await api.post('/programas', formData);
        showNotification('Programa creado correctamente', 'success');
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      showNotification(
        error.response?.data?.message || 'Error al guardar programa',
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
        {programa ? 'Editar Programa' : 'Nuevo Programa'}
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
          />
          <TextField
            select
            fullWidth
            label="Tipo"
            value={formData.tipo}
            onChange={(e) => handleChange('tipo', e.target.value)}
            margin="normal"
            required
          >
            <MenuItem value="ESPACIOS">Espacios</MenuItem>
            <MenuItem value="CELIAQUIA">Celiaquía</MenuItem>
            <MenuItem value="VASO_LECHE">Vaso de Leche</MenuItem>
            <MenuItem value="CASOS_PARTICULARES">Casos Particulares</MenuItem>
            <MenuItem value="OTRO">Otro</MenuItem>
          </TextField>
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.usaCronograma}
                onChange={(e) => handleChange('usaCronograma', e.target.checked)}
              />
            }
            label="Usa Cronograma (entregas automáticas)"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.usaPlantilla}
                onChange={(e) => handleChange('usaPlantilla', e.target.checked)}
              />
            }
            label="Usa Plantilla (items predefinidos)"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.descuentaStock}
                onChange={(e) => handleChange('descuentaStock', e.target.checked)}
              />
            }
            label="Descuenta Stock al confirmar remito"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.activo}
                onChange={(e) => handleChange('activo', e.target.checked)}
              />
            }
            label="Activo"
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
