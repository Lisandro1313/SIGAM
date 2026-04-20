import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, CircularProgress, MenuItem,
  Typography, Box, IconButton, Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useNotificationStore } from '../stores/notificationStore';
import api from '../services/api';
import { getDepositos } from '../utils/staticCache';

interface TransferItem {
  articuloId: number;
  cantidad: number;
}

interface StockTransferFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function StockTransferForm({ open, onClose, onSuccess }: StockTransferFormProps) {
  const [loading, setLoading] = useState(false);
  const [depositos, setDepositos] = useState<any[]>([]);
  const [stock, setStock] = useState<any[]>([]);
  const { showNotification } = useNotificationStore();

  const [depositoOrigenId, setDepositoOrigenId] = useState(0);
  const [depositoDestinoId, setDepositoDestinoId] = useState(0);
  const [items, setItems] = useState<TransferItem[]>([{ articuloId: 0, cantidad: 0 }]);

  useEffect(() => {
    if (!open) return;
    getDepositos().then(data => {
      setDepositos(data);
      if (data.length > 0) {
        setDepositoOrigenId(data[0].id);
        setDepositoDestinoId(data[1]?.id || 0);
      }
    }).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (depositoOrigenId) {
      api.get(`/stock/deposito/${depositoOrigenId}`).then(res => setStock(res.data)).catch(() => {});
    }
  }, [depositoOrigenId]);

  const handleOrigenChange = (id: number) => {
    setDepositoOrigenId(id);
    setItems([{ articuloId: 0, cantidad: 0 }]);
  };

  const setItem = (idx: number, partial: Partial<TransferItem>) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...partial } : it));
  };

  const addItem = () => setItems(prev => [...prev, { articuloId: 0, cantidad: 0 }]);

  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const getStockDisponible = (articuloId: number) =>
    stock.find(s => s.articulo.id === articuloId)?.cantidad || 0;

  // Artículos ya seleccionados en otras filas
  const articulosUsados = (currentIdx: number) =>
    items.map((it, i) => i !== currentIdx ? it.articuloId : null).filter(Boolean);

  const canSubmit = items.length > 0 &&
    items.every(it => it.articuloId > 0 && it.cantidad > 0 && it.cantidad <= getStockDisponible(it.articuloId)) &&
    depositoOrigenId > 0 && depositoDestinoId > 0 && depositoOrigenId !== depositoDestinoId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/stock/transferir', { depositoOrigenId, depositoDestinoId, items });
      showNotification(`Transferencia realizada: ${items.length} artículo${items.length > 1 ? 's' : ''}`, 'success');
      onSuccess();
      onClose();
    } catch (error: any) {
      showNotification(error.response?.data?.message || 'Error al realizar transferencia', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Transferir Stock entre Depósitos</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Transfiere mercadería de un depósito a otro
          </Typography>

          <Box display="flex" gap={2} mt={1}>
            <TextField
              select fullWidth label="Depósito Origen *"
              value={depositoOrigenId}
              onChange={e => handleOrigenChange(Number(e.target.value))}
            >
              {depositos.map(d => <MenuItem key={d.id} value={d.id}>{d.nombre}</MenuItem>)}
            </TextField>

            <TextField
              select fullWidth label="Depósito Destino *"
              value={depositoDestinoId}
              onChange={e => setDepositoDestinoId(Number(e.target.value))}
            >
              {depositos.filter(d => d.id !== depositoOrigenId).map(d => (
                <MenuItem key={d.id} value={d.id}>{d.nombre}</MenuItem>
              ))}
            </TextField>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" fontWeight="bold" mb={1}>
            Artículos a transferir
          </Typography>

          {items.map((item, idx) => {
            const stockDisp = getStockDisponible(item.articuloId);
            const usados = articulosUsados(idx);
            const opcionesDisp = stock.filter(s => !usados.includes(s.articulo.id));
            return (
              <Box key={idx} display="flex" gap={1} alignItems="flex-start" mb={1}>
                <TextField
                  select label="Artículo" size="small"
                  value={item.articuloId}
                  onChange={e => setItem(idx, { articuloId: Number(e.target.value), cantidad: 0 })}
                  sx={{ flex: 2 }}
                  required
                >
                  <MenuItem value={0}>Seleccionar...</MenuItem>
                  {opcionesDisp.map(s => (
                    <MenuItem key={s.articulo.id} value={s.articulo.id}>
                      {s.articulo.nombre} (Stock: {s.cantidad})
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  label="Cantidad" type="number" size="small"
                  value={item.cantidad}
                  onChange={e => setItem(idx, { cantidad: Number(e.target.value) })}
                  inputProps={{ min: 1, max: stockDisp || undefined }}
                  helperText={item.articuloId > 0 ? `Disp: ${stockDisp}` : ''}
                  error={item.articuloId > 0 && item.cantidad > stockDisp}
                  sx={{ flex: 1 }}
                  required
                />

                <IconButton
                  size="small" color="error"
                  onClick={() => removeItem(idx)}
                  disabled={items.length === 1}
                  sx={{ mt: 0.5 }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            );
          })}

          <Button
            startIcon={<AddIcon />} size="small" onClick={addItem}
            disabled={stock.length === 0 || items.length >= stock.length}
            sx={{ mt: 0.5 }}
          >
            Agregar artículo
          </Button>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={loading || !canSubmit}>
            {loading ? <CircularProgress size={24} /> : `Transferir${items.length > 1 ? ` (${items.length})` : ''}`}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
