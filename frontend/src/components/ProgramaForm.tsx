import { useState, useEffect } from 'react';
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
  Box,
  IconButton,
  Tooltip,
  Popover,
  Typography,
  Chip,
} from '@mui/material';
import { AddCircleOutline as AddTypeIcon } from '@mui/icons-material';
import { useNotificationStore } from '../stores/notificationStore';
import api from '../services/api';
import { invalidate } from '../utils/staticCache';

const TIPO_LABELS: Record<string, string> = {
  ESPACIOS: 'Espacios',
  CELIAQUIA: 'Celiaquía',
  VASO_LECHE: 'Vaso de Leche',
  CASOS_PARTICULARES: 'Casos Particulares',
  OTRO: 'Otro',
};

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
  const [tipos, setTipos] = useState<string[]>([]);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [nuevoTipo, setNuevoTipo] = useState('');
  const { showNotification } = useNotificationStore();

  const [formData, setFormData] = useState({
    nombre: programa?.nombre || '',
    tipo: programa?.tipo || '',
    usaCronograma: programa?.usaCronograma || false,
    usaPlantilla: programa?.usaPlantilla || false,
    descuentaStock: programa?.descuentaStock ?? true,
    activo: programa?.activo ?? true,
    mensajeWhatsapp: programa?.mensajeWhatsapp || '',
  });

  useEffect(() => {
    if (open) {
      api.get('/programas/tipos')
        .then(r => setTipos(r.data))
        .catch(() => setTipos(['ESPACIOS', 'CELIAQUIA', 'VASO_LECHE', 'CASOS_PARTICULARES', 'OTRO']));
      setFormData({
        nombre: programa?.nombre || '',
        tipo: programa?.tipo || '',
        usaCronograma: programa?.usaCronograma || false,
        usaPlantilla: programa?.usaPlantilla || false,
        descuentaStock: programa?.descuentaStock ?? true,
        activo: programa?.activo ?? true,
        mensajeWhatsapp: programa?.mensajeWhatsapp || '',
      });
    }
  }, [open, programa]);

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
      invalidate('programas');
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

  const handleAgregarTipo = () => {
    const valor = nuevoTipo.trim().toUpperCase().replace(/\s+/g, '_');
    if (!valor) return;
    if (!tipos.includes(valor)) {
      setTipos(prev => [...prev, valor]);
    }
    setFormData(prev => ({ ...prev, tipo: valor }));
    setNuevoTipo('');
    setAnchorEl(null);
  };

  const tipoLabel = (t: string) => TIPO_LABELS[t] ?? t.replace(/_/g, ' ');

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

          {/* Tipo con botón + para agregar nuevo */}
          <Box display="flex" alignItems="center" gap={1} mt={1} mb={0.5}>
            <TextField
              select
              fullWidth
              label="Tipo *"
              value={formData.tipo}
              onChange={(e) => handleChange('tipo', e.target.value)}
              required
            >
              {tipos.map(t => (
                <MenuItem key={t} value={t}>{tipoLabel(t)}</MenuItem>
              ))}
            </TextField>
            <Tooltip title="Agregar nuevo tipo">
              <IconButton
                color="primary"
                onClick={(e) => setAnchorEl(e.currentTarget)}
                sx={{ flexShrink: 0 }}
              >
                <AddTypeIcon />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Popover para nuevo tipo */}
          <Popover
            open={Boolean(anchorEl)}
            anchorEl={anchorEl}
            onClose={() => { setAnchorEl(null); setNuevoTipo(''); }}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          >
            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 260 }}>
              <Typography variant="subtitle2">Nuevo tipo de programa</Typography>
              <TextField
                size="small"
                label="Nombre del tipo"
                value={nuevoTipo}
                onChange={e => setNuevoTipo(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAgregarTipo()}
                autoFocus
                fullWidth
              />
              <Box display="flex" justifyContent="flex-end" gap={1}>
                <Button size="small" onClick={() => { setAnchorEl(null); setNuevoTipo(''); }}>
                  Cancelar
                </Button>
                <Button size="small" variant="contained" onClick={handleAgregarTipo}>
                  Agregar
                </Button>
              </Box>
            </Box>
          </Popover>

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

          {/* Mensaje WhatsApp */}
          <Box mt={2}>
            <Typography variant="subtitle2" gutterBottom>
              Mensaje WhatsApp
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" mb={1}>
              Variables disponibles:
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={0.5} mb={1}>
              {['{nombre}', '{fecha}', '{hora}', '{deposito}', '{direccion}', '{numero}'].map(v => (
                <Chip
                  key={v}
                  label={v}
                  size="small"
                  variant="outlined"
                  onClick={() => handleChange('mensajeWhatsapp', (formData.mensajeWhatsapp || '') + v)}
                  sx={{ cursor: 'pointer', fontFamily: 'monospace', fontSize: '0.7rem' }}
                />
              ))}
            </Box>
            <TextField
              fullWidth
              multiline
              minRows={4}
              label="Plantilla del mensaje"
              value={formData.mensajeWhatsapp}
              onChange={(e) => handleChange('mensajeWhatsapp', e.target.value)}
              placeholder={`Hola {nombre}, tenés turno para retirar mercadería el {fecha} a las {hora} hs en el depósito {deposito}, ubicado en {direccion}. Remito N°{numero}. Saludos, Dirección General de Política Alimentaria.`}
              helperText="Si está vacío se usará un mensaje genérico"
            />
          </Box>
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
