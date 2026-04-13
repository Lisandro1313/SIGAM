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
  Box,
  IconButton,
  Tooltip,
  Popover,
  Typography,
  Alert,
} from '@mui/material';
import { AddCircleOutline as AddIcon } from '@mui/icons-material';
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
  const [localidades, setLocalidades] = useState<string[]>([]);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [nuevaLocalidad, setNuevaLocalidad] = useState('');
  const [alertaDni, setAlertaDni] = useState<string | null>(null);
  const [checkingDni, setCheckingDni] = useState(false);
  const [confirmDupOpen, setConfirmDupOpen] = useState(false);
  const { showNotification } = useNotificationStore();

  const [formData, setFormData] = useState({
    nombre: beneficiario?.nombre || '',
    tipo: beneficiario?.tipo || 'ESPACIO',
    direccion: beneficiario?.direccion || '',
    localidad: beneficiario?.localidad || '',
    telefono: beneficiario?.telefono || '',
    responsableNombre: beneficiario?.responsableNombre || '',
    responsableDNI: beneficiario?.responsableDNI || '',
    frecuenciaEntrega: beneficiario?.frecuenciaEntrega || 'EVENTUAL',
    programaId: beneficiario?.programaId || null,
    observaciones: beneficiario?.observaciones || '',
    kilosHabitual: beneficiario?.kilosHabitual || '',
    activo: beneficiario?.activo ?? true,
  });

  useEffect(() => {
    if (open) {
      setFormData({
        nombre: beneficiario?.nombre || '',
        tipo: beneficiario?.tipo || 'ESPACIO',
        direccion: beneficiario?.direccion || '',
        localidad: beneficiario?.localidad || '',
        telefono: beneficiario?.telefono || '',
        responsableNombre: beneficiario?.responsableNombre || '',
        responsableDNI: beneficiario?.responsableDNI || '',
        frecuenciaEntrega: beneficiario?.frecuenciaEntrega || 'EVENTUAL',
        programaId: beneficiario?.programaId || null,
        observaciones: beneficiario?.observaciones || '',
        kilosHabitual: beneficiario?.kilosHabitual || '',
        activo: beneficiario?.activo ?? true,
      });
      api.get('/programas').then(r => setProgramas(r.data)).catch(() => {});
      api.get('/beneficiarios/localidades').then(r => setLocalidades(r.data)).catch(() => {});
    }
  }, [open, beneficiario]);

  const doSave = async () => {
    setConfirmDupOpen(false);
    setLoading(true);
    try {
      const data = {
        ...formData,
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (alertaDni) {
      setConfirmDupOpen(true);
    } else {
      doSave();
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAgregarLocalidad = () => {
    const val = nuevaLocalidad.trim();
    if (!val) return;
    if (!localidades.includes(val)) {
      setLocalidades(prev => [...prev, val].sort());
    }
    setFormData(prev => ({ ...prev, localidad: val }));
    setNuevaLocalidad('');
    setAnchorEl(null);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {beneficiario ? 'Editar Beneficiario' : 'Nuevo Beneficiario'}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Grid container spacing={2}>

            {/* Nombre */}
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

            {/* Tipo */}
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
                <MenuItem value="MANZANERA">Manzanera</MenuItem>
                <MenuItem value="DIRECCION">Dirección</MenuItem>
              </TextField>
            </Grid>

            {/* Dirección */}
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

            {/* Localidad con botón + */}
            <Grid item xs={12} md={4}>
              <Box display="flex" alignItems="center" gap={0.5} mt={2}>
                <TextField
                  select
                  fullWidth
                  label="Localidad *"
                  value={formData.localidad}
                  onChange={(e) => handleChange('localidad', e.target.value)}
                  required
                  size="medium"
                >
                  {localidades.map(l => (
                    <MenuItem key={l} value={l}>{l}</MenuItem>
                  ))}
                </TextField>
                <Tooltip title="Agregar localidad">
                  <IconButton
                    color="primary"
                    onClick={(e) => setAnchorEl(e.currentTarget)}
                    sx={{ flexShrink: 0 }}
                  >
                    <AddIcon />
                  </IconButton>
                </Tooltip>
              </Box>

              {/* Popover nueva localidad */}
              <Popover
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                onClose={() => { setAnchorEl(null); setNuevaLocalidad(''); }}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              >
                <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 260 }}>
                  <Typography variant="subtitle2">Nueva localidad</Typography>
                  <TextField
                    size="small"
                    label="Nombre de la localidad"
                    value={nuevaLocalidad}
                    onChange={e => setNuevaLocalidad(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAgregarLocalidad()}
                    autoFocus
                    fullWidth
                  />
                  <Box display="flex" justifyContent="flex-end" gap={1}>
                    <Button size="small" onClick={() => { setAnchorEl(null); setNuevaLocalidad(''); }}>
                      Cancelar
                    </Button>
                    <Button size="small" variant="contained" onClick={handleAgregarLocalidad}>
                      Agregar
                    </Button>
                  </Box>
                </Box>
              </Popover>
            </Grid>

            {/* Teléfono */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Teléfono"
                value={formData.telefono}
                onChange={(e) => handleChange('telefono', e.target.value)}
                margin="normal"
              />
            </Grid>

            {/* Responsable nombre */}
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

            {/* Responsable DNI */}
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Responsable - DNI (opcional)"
                value={formData.responsableDNI}
                onChange={(e) => { handleChange('responsableDNI', e.target.value); setAlertaDni(null); }}
                onBlur={async (e) => {
                  const dni = e.target.value.trim();
                  if (!dni || dni.length < 6) return;
                  setCheckingDni(true);
                  try {
                    const params = beneficiario?.id ? `?excludeId=${beneficiario.id}` : '';
                    const res = await api.get(`/beneficiarios/check-dni/${dni}${params}`);
                    setAlertaDni(res.data.encontrado ? res.data.detalle : null);
                  } catch { setAlertaDni(null); }
                  finally { setCheckingDni(false); }
                }}
                margin="normal"
                InputProps={{ endAdornment: checkingDni ? <CircularProgress size={14} /> : undefined }}
              />
              {alertaDni && (
                <Alert severity="warning" sx={{ mt: 0.5, py: 0.5 }}>
                  Este DNI ya está registrado en: {alertaDni}
                </Alert>
              )}
            </Grid>

            {/* Frecuencia + Kilos + Programa */}
            <Grid item xs={12} md={4}>
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
            <Grid item xs={12} md={4}>
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
            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                label="Programa"
                value={formData.programaId || ''}
                onChange={(e) => handleChange('programaId', e.target.value ? parseInt(e.target.value) : null)}
                margin="normal"
              >
                <MenuItem value="">Sin programa</MenuItem>
                {programas.map((p) => (
                  <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Observaciones (solo Caso Particular) */}
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
          <Button onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Guardar'}
          </Button>
        </DialogActions>
      </form>

      {/* Diálogo de confirmación cuando hay duplicado de DNI */}
      <Dialog open={confirmDupOpen} onClose={() => setConfirmDupOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>DNI ya registrado</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 1 }}>
            Este DNI ya figura como responsable en: {alertaDni}
          </Alert>
          <Typography variant="body2">
            ¿Querés guardar igual? (podría ser un cruce de programas)
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDupOpen(false)}>Cancelar</Button>
          <Button variant="contained" color="warning" onClick={doSave}>
            Guardar igual
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}
