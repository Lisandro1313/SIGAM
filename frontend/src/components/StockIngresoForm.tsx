import { useState, useEffect, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, CircularProgress, MenuItem,
  Typography, Box, Chip, IconButton, Divider,
} from '@mui/material';
import { AttachFile as AttachIcon, Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useNotificationStore } from '../stores/notificationStore';
import api from '../services/api';

interface ItemIngreso { articuloId: number; cantidad: number; }

interface StockIngresoFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const emptyItem = (): ItemIngreso => ({ articuloId: 0, cantidad: 0 });

export default function StockIngresoForm({ open, onClose, onSuccess }: StockIngresoFormProps) {
  const [loading, setLoading] = useState(false);
  const [depositos, setDepositos] = useState<any[]>([]);
  const [articulos, setArticulos] = useState<any[]>([]);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [depositoId, setDepositoId] = useState(0);
  const [motivo, setMotivo] = useState('');
  const [items, setItems] = useState<ItemIngreso[]>([emptyItem()]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showNotification } = useNotificationStore();

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
      if (depositosRes.data.length > 0) setDepositoId(depositosRes.data[0].id);
    } catch (error) {
      console.error('Error cargando datos:', error);
    }
  };

  const updateItem = (index: number, field: keyof ItemIngreso, value: number) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const addItem = () => setItems(prev => [...prev, emptyItem()]);
  const removeItem = (index: number) => setItems(prev => prev.filter((_, i) => i !== index));

  const handleClose = () => {
    setItems([emptyItem()]);
    setMotivo('');
    setArchivo(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = items.filter(it => it.articuloId > 0 && it.cantidad > 0);
    if (validItems.length === 0) {
      showNotification('Agregá al menos un artículo con cantidad', 'warning');
      return;
    }
    setLoading(true);
    try {
      for (let i = 0; i < validItems.length; i++) {
        const form = new FormData();
        form.append('depositoId', String(depositoId));
        form.append('articuloId', String(validItems[i].articuloId));
        form.append('cantidad', String(validItems[i].cantidad));
        form.append('observaciones', motivo);
        // El documento solo va en el primero
        if (i === 0 && archivo) form.append('documento', archivo);
        await api.post('/stock/ingreso', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      showNotification(
        validItems.length === 1
          ? 'Ingreso registrado correctamente'
          : `${validItems.length} ingresos registrados correctamente`,
        'success',
      );
      onSuccess();
      handleClose();
    } catch (error: any) {
      showNotification(error.response?.data?.message || 'Error al registrar ingreso', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Registrar Ingreso de Stock</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Registra mercadería que ingresa al depósito. Podés agregar varios artículos a la vez.
          </Typography>

          <TextField select fullWidth label="Depósito" value={depositoId}
            onChange={(e) => setDepositoId(parseInt(e.target.value))}
            margin="normal" required>
            {depositos.map((d) => <MenuItem key={d.id} value={d.id}>{d.nombre}</MenuItem>)}
          </TextField>

          {/* Lista de artículos */}
          <Box mt={2} mb={1}>
            <Typography variant="caption" fontWeight="bold" color="text.secondary">
              ARTÍCULOS
            </Typography>
          </Box>

          {items.map((item, index) => (
            <Box key={index} display="flex" gap={1} alignItems="center" mb={1}>
              <TextField select label="Artículo" value={item.articuloId}
                onChange={(e) => updateItem(index, 'articuloId', parseInt(e.target.value))}
                sx={{ flex: 2 }} required size="small">
                <MenuItem value={0}>Seleccionar...</MenuItem>
                {articulos.map((a) => (
                  <MenuItem key={a.id} value={a.id}>
                    {a.nombre}{a.categoria ? ` (${a.categoria})` : ''}
                  </MenuItem>
                ))}
              </TextField>

              <TextField label="Cantidad" type="number" value={item.cantidad || ''}
                onChange={(e) => updateItem(index, 'cantidad', parseFloat(e.target.value))}
                sx={{ flex: 1 }} required size="small"
                inputProps={{ min: 0.01, step: 0.01 }} />

              {items.length > 1 && (
                <IconButton size="small" color="error" onClick={() => removeItem(index)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          ))}

          <Button size="small" startIcon={<AddIcon />} onClick={addItem} sx={{ mt: 0.5 }}>
            Agregar artículo
          </Button>

          <Divider sx={{ my: 2 }} />

          <TextField fullWidth label="Motivo / Observaciones" value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            multiline rows={2}
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
              {archivo && <Chip label={archivo.name} size="small" onDelete={() => setArchivo(null)} />}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : `Registrar${items.length > 1 ? ` (${items.length})` : ''}`}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
