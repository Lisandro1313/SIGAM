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
  Grid,
} from '@mui/material';
import { useNotificationStore } from '../stores/notificationStore';
import api from '../services/api';

interface BeneficiarioFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  beneficiario?: any;
}

export default function BeneficiarioForm({
  open,
  onClose,
  onSuccess,
  beneficiario,
}: BeneficiarioFormProps) {
  const [loading, setLoading] = useState(false);
  const [programas, setProgramas] = useState<any[]>([]);
  const { showNotification } = useNotificationStore();
  const [formData, setFormData] = useState({
    nombre: beneficiario?.nombre || '',
    tipo: beneficiario?.tipo || 'ESPACIO',
    direccion: beneficiario?.direccion || '',
    localidad: beneficiario?.localidad || '',
    telefono: beneficiario?.telefono || '',
    responsableNombre: beneficiario?.responsableNombre || '',
    responsableDNI: beneficiario?.responsableDNI || '',
    lat: beneficiario?.lat || null,
    lng: beneficiario?.lng || null,
    frecuenciaEntrega: beneficiario?.frecuenciaEntrega || 'EVENTUAL',
    programaId: beneficiario?.programaId || null,
    observaciones: beneficiario?.observaciones || '',
    kilosHabitual: beneficiario?.kilosHabitual || '',
    activo: beneficiario?.activo ?? true,
  });

  useEffect(() => {
    loadProgramas();
  }, []);

  const loadProgramas = async () => {
    try {
      const response = await api.get('/programas');
      setProgramas(response.data);
    } catch (error) {
      console.error('Error cargando programas:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        ...formData,
        lat: formData.lat ? parseFloat(formData.lat as any) : null,
        lng: formData.lng ? parseFloat(formData.lng as any) : null,
        kilosHabitual: formData.kilosHabitual ? parseFloat(formData.kilosHabitual as any) : null,
      };

      if (beneficiario) {
        await api.patch(`/beneficiarios/${beneficiario.id}`, data);
        showNotification('Beneficiario actualizado correctamente', 'success');
      } else {
        await api.post('/beneficiarios', data);
        showNotification('Beneficiario creado correctamente', 'success');
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      showNotification(
        error.response?.data?.message || 'Error al guardar beneficiario',
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
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {beneficiario ? 'Editar Beneficiario' : 'Nuevo Beneficiario'}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Nombre"
                value={formData.nombre}
                onChange={(e) => handleChange('nombre', e.target.value)}
                margin="normal"
                required
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                label="Tipo"
                value={formData.tipo}
                onChange={(e) => handleChange('tipo', e.target.value)}
                margin="normal"
                required
              >
                <MenuItem value="ESPACIO">Espacio</MenuItem>
                <MenuItem value="ORGANIZACION">Organización</MenuItem>
                <MenuItem value="CASO_PARTICULAR">Caso Particular</MenuItem>
                <MenuItem value="COMEDOR">Comedor</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Dirección"
                value={formData.direccion}
                onChange={(e) => handleChange('direccion', e.target.value)}
                margin="normal"
                required
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Localidad"
                value={formData.localidad}
                onChange={(e) => handleChange('localidad', e.target.value)}
                margin="normal"
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Teléfono"
                value={formData.telefono}
                onChange={(e) => handleChange('telefono', e.target.value)}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Responsable - Nombre"
                value={formData.responsableNombre}
                onChange={(e) => handleChange('responsableNombre', e.target.value)}
                margin="normal"
                required
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Responsable - DNI"
                value={formData.responsableDNI}
                onChange={(e) => handleChange('responsableDNI', e.target.value)}
                margin="normal"
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Latitud"
                type="number"
                value={formData.lat || ''}
                onChange={(e) => handleChange('lat', e.target.value)}
                margin="normal"
                inputProps={{ step: 0.000001 }}
                helperText="Coordenada GPS (opcional)"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Longitud"
                type="number"
                value={formData.lng || ''}
                onChange={(e) => handleChange('lng', e.target.value)}
                margin="normal"
                inputProps={{ step: 0.000001 }}
                helperText="Coordenada GPS (opcional)"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Frecuencia de Entrega"
                value={formData.frecuenciaEntrega}
                onChange={(e) => handleChange('frecuenciaEntrega', e.target.value)}
                margin="normal"
                required
              >
                <MenuItem value="MENSUAL">Mensual</MenuItem>
                <MenuItem value="BIMESTRAL">Bimestral</MenuItem>
                <MenuItem value="EVENTUAL">Eventual</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Kilos habituales"
                type="number"
                value={formData.kilosHabitual}
                onChange={(e) => handleChange('kilosHabitual', e.target.value)}
                margin="normal"
                inputProps={{ step: 0.5, min: 0 }}
                helperText="Kilos que recibe normalmente"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                select
                fullWidth
                label="Programa"
                value={formData.programaId || ''}
                onChange={(e) => handleChange('programaId', e.target.value ? parseInt(e.target.value) : null)}
                margin="normal"
              >
                <MenuItem value="">Sin programa</MenuItem>
                {programas.map((programa) => (
                  <MenuItem key={programa.id} value={programa.id}>
                    {programa.nombre}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            {formData.tipo === 'CASO_PARTICULAR' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Relevamiento / Observaciones"
                  value={formData.observaciones}
                  onChange={(e) => handleChange('observaciones', e.target.value)}
                  margin="normal"
                  multiline
                  rows={3}
                  helperText="Detalles de la visita de trabajadora social, estado de aprobación, prioridad, etc."
                />
              </Grid>
            )}
          </Grid>
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
