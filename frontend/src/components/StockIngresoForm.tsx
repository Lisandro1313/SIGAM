import { useState, useEffect, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, CircularProgress, MenuItem,
  Typography, Box, Chip,
} from '@mui/material';
import { AttachFile as AttachIcon } from '@mui/icons-material';
import { useNotificationStore } from '../stores/notificationStore';
import api from '../services/api';

interface StockIngresoFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function StockIngresoForm({ open, onClose, onSuccess }: StockIngresoFormProps) {
  const [loading, setLoading] = useState(false);
  const [depositos, setDepositos] = useState<any[]>([]);
  const [articulos, setArticulos] = useState<any[]>([]);
  const [archivo, setArchivo] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showNotification } = useNotificationStore();

  const [formData, setFormData] = useState({
    depositoId: 0,
    articuloId: 0,
    cantidad: 0,
    motivo: '',
  });

  useEffect(() => {
    if (open) loadData();
  }, [open]);

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
      const form = new FormData();
      form.append('depositoId', String(formData.depositoId));
      form.append('articuloId', String(formData.articuloId));
      form.append('cantidad', String(formData.cantidad));
      form.append('observaciones', formData.motivo);
      if (archivo) form.append('documento', archivo);

      await api.post('/stock/ingreso', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      showNotification('Ingreso de stock registrado correctamente', 'success');
      onSuccess();
      onClose();
      setFormData({ depositoId: depositos[0]?.id || 0, articuloId: 0, cantidad: 0, motivo: '' });
      setArchivo(null);
    } catch (error: any) {
      showNotification(error.response?.data?.message || 'Error al registrar ingreso', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Registrar Ingreso de Stock</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Registra mercadería que ingresa al depósito (compras, donaciones, etc.)
          </Typography>

          <TextField select fullWidth label="Depósito" value={formData.depositoId}
            onChange={(e) => setFormData({ ...formData, depositoId: parseInt(e.target.value) })}
            margin="normal" required>
            {depositos.map((d) => <MenuItem key={d.id} value={d.id}>{d.nombre}</MenuItem>)}
          </TextField>

          <TextField select fullWidth label="Artículo" value={formData.articuloId}
            onChange={(e) => setFormData({ ...formData, articuloId: parseInt(e.target.value) })}
            margin="normal" required>
            <MenuItem value={0}>Seleccionar artículo</MenuItem>
            {articulos.map((a) => (
              <MenuItem key={a.id} value={a.id}>
                {a.nombre}{a.categoria ? ` (${a.categoria})` : ''}
              </MenuItem>
            ))}
          </TextField>

          <TextField fullWidth label="Cantidad" type="number" value={formData.cantidad}
            onChange={(e) => setFormData({ ...formData, cantidad: parseInt(e.target.value) })}
            margin="normal" inputProps={{ min: 1 }} required />

          <TextField fullWidth label="Motivo / Observaciones" value={formData.motivo}
            onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
            margin="normal" multiline rows={2}
            placeholder="Ej: Compra proveedor, Donación, Ajuste inventario" required />

          {/* Documento adjunto */}
          <Box mt={2}>
            <Typography variant="caption" color="text.secondary" gutterBottom display="block">
              Documento adjunto (remito de empresa, factura, etc.) — opcional
            </Typography>
            <input ref={fileInputRef} type="file" style={{ display: 'none' }}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={(e) => setArchivo(e.target.files?.[0] || null)} />
            <Box display="flex" alignItems="center" gap={1}>
              <Button size="small" variant="outlined" startIcon={<AttachIcon />}
                onClick={() => fileInputRef.current?.click()}>
                {archivo ? 'Cambiar archivo' : 'Adjuntar documento'}
              </Button>
              {archivo && (
                <Chip label={archivo.name} size="small" onDelete={() => setArchivo(null)} />
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Registrar Ingreso'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
