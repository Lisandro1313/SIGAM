import { useState, useEffect, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, CircularProgress, Box, Typography,
  Divider, MenuItem, IconButton, List, ListItem,
  ListItemText, ListItemSecondaryAction, Chip, Tooltip,
} from '@mui/material';
import {
  PhotoCamera as FotoIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Warning as WarnIcon,
} from '@mui/icons-material';
import { useNotificationStore } from '../stores/notificationStore';
import api from '../services/api';
import { format, differenceInDays, isPast } from 'date-fns';
import { es } from 'date-fns/locale';

interface ArticuloFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  articulo?: any;
  readOnly?: boolean;
}

export default function ArticuloForm({
  open, onClose, onSuccess, articulo, readOnly = false,
}: ArticuloFormProps) {
  const [loading, setLoading] = useState(false);
  const [depositos, setDepositos] = useState<any[]>([]);
  const [lotes, setLotes] = useState<any[]>([]);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [addingLote, setAddingLote] = useState(false);
  const [loteData, setLoteData] = useState({ depositoId: '', cantidad: '', fechaVencimiento: '', lote: '' });
  const fotoInputRef = useRef<HTMLInputElement>(null);
  const { showNotification } = useNotificationStore();

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    categoria: '',
    pesoUnitarioKg: 0,
    stockMinimo: 100,
  });

  useEffect(() => {
    if (open) {
      setFormData({
        nombre: articulo?.nombre || '',
        descripcion: articulo?.descripcion || '',
        categoria: articulo?.categoria || '',
        pesoUnitarioKg: articulo?.pesoUnitarioKg || 0,
        stockMinimo: articulo?.stockMinimo || 100,
      });
      setFotoUrl(articulo?.fotoUrl || null);
      setLotes([]);
      setLoteData({ depositoId: '', cantidad: '', fechaVencimiento: '', lote: '' });

      api.get('/depositos').then(r => setDepositos(r.data.filter((d: any) => d.activo))).catch(() => {});
      if (articulo?.id) {
        api.get(`/articulos/${articulo.id}/lotes`).then(r => setLotes(r.data)).catch(() => {});
      }
    }
  }, [open, articulo]);

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
      showNotification(error.response?.data?.message || 'Error al guardar artículo', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFotoChange = async (file: File) => {
    if (!articulo?.id) return;
    setUploadingFoto(true);
    try {
      const form = new FormData();
      form.append('foto', file);
      const res = await api.post(`/articulos/${articulo.id}/foto`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setFotoUrl(res.data.fotoUrl);
      showNotification('Foto subida correctamente', 'success');
    } catch {
      showNotification('Error al subir foto', 'error');
    } finally {
      setUploadingFoto(false);
    }
  };

  const handleAddLote = async () => {
    if (!articulo?.id || !loteData.depositoId || !loteData.cantidad || !loteData.fechaVencimiento) {
      showNotification('Completá todos los campos del lote', 'warning');
      return;
    }
    setAddingLote(true);
    try {
      const res = await api.post(`/articulos/${articulo.id}/lotes`, {
        depositoId: parseInt(loteData.depositoId),
        cantidad: parseFloat(loteData.cantidad),
        fechaVencimiento: loteData.fechaVencimiento,
        lote: loteData.lote || undefined,
      });
      setLotes(prev => [...prev, res.data].sort((a, b) => new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime()));
      setLoteData({ depositoId: '', cantidad: '', fechaVencimiento: '', lote: '' });
      showNotification('Lote registrado', 'success');
    } catch {
      showNotification('Error al registrar lote', 'error');
    } finally {
      setAddingLote(false);
    }
  };

  const handleDeleteLote = async (loteId: number) => {
    try {
      await api.delete(`/articulos/${articulo.id}/lotes/${loteId}`);
      setLotes(prev => prev.filter(l => l.id !== loteId));
    } catch {
      showNotification('Error al eliminar lote', 'error');
    }
  };

  const getLoteColor = (fecha: string): 'error' | 'warning' | 'success' => {
    const dias = differenceInDays(new Date(fecha), new Date());
    if (isPast(new Date(fecha)) || dias <= 7) return 'error';
    if (dias <= 30) return 'warning';
    return 'success';
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {readOnly ? 'Detalle de Artículo' : (articulo ? 'Editar Artículo' : 'Nuevo Artículo')}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {/* Foto */}
          {articulo && (
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              {fotoUrl ? (
                <Box
                  component="img"
                  src={fotoUrl}
                  alt={articulo.nombre}
                  sx={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 1, border: '1px solid #eee' }}
                />
              ) : (
                <Box sx={{ width: 80, height: 80, bgcolor: 'grey.100', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FotoIcon color="disabled" />
                </Box>
              )}
              {!readOnly && (
                <>
                  <input ref={fotoInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFotoChange(f); }} />
                  <Button size="small" variant="outlined" startIcon={uploadingFoto ? <CircularProgress size={14} /> : <FotoIcon />}
                    disabled={uploadingFoto} onClick={() => fotoInputRef.current?.click()}>
                    {fotoUrl ? 'Cambiar foto' : 'Subir foto'}
                  </Button>
                </>
              )}
            </Box>
          )}

          <TextField fullWidth label="Nombre" value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            margin="normal" required disabled={!!articulo || readOnly}
            helperText={articulo ? 'El nombre no se puede modificar' : ''} />
          <TextField fullWidth label="Descripción" value={formData.descripcion}
            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
            margin="normal" multiline rows={2} disabled={readOnly} />
          <TextField fullWidth label="Categoría" value={formData.categoria}
            onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
            margin="normal" placeholder="Ej: Alimentos, Lácteos, Granos..." disabled={readOnly} />
          <Box display="flex" gap={2}>
            <TextField fullWidth label="Peso Unitario (kg)" type="number" value={formData.pesoUnitarioKg ?? ''}
              onChange={(e) => setFormData({ ...formData, pesoUnitarioKg: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
              margin="normal" inputProps={{ step: 0.01, min: 0 }} required
              helperText="Peso de una unidad" disabled={readOnly} />
            <TextField fullWidth label="Stock Mínimo" type="number" value={formData.stockMinimo ?? ''}
              onChange={(e) => setFormData({ ...formData, stockMinimo: e.target.value === '' ? 0 : parseInt(e.target.value) })}
              margin="normal" inputProps={{ min: 0 }} required
              helperText="Alerta de stock" disabled={readOnly} />
          </Box>

          {/* Lotes / Vencimientos — solo si editando */}
          {articulo && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" gutterBottom>Lotes / Vencimientos</Typography>

              {!readOnly && (
                <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1, mb: 1 }}>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    <TextField select size="small" label="Depósito" value={loteData.depositoId}
                      onChange={(e) => setLoteData({ ...loteData, depositoId: e.target.value })}
                      sx={{ minWidth: 140 }}>
                      {depositos.map(d => <MenuItem key={d.id} value={d.id}>{d.nombre}</MenuItem>)}
                    </TextField>
                    <TextField size="small" label="Cantidad" type="number" value={loteData.cantidad}
                      onChange={(e) => setLoteData({ ...loteData, cantidad: e.target.value })}
                      sx={{ width: 100 }} inputProps={{ min: 0 }} />
                    <TextField size="small" label="Vencimiento" type="date" value={loteData.fechaVencimiento}
                      onChange={(e) => setLoteData({ ...loteData, fechaVencimiento: e.target.value })}
                      InputLabelProps={{ shrink: true }} sx={{ width: 150 }} />
                    <TextField size="small" label="N° Lote (opcional)" value={loteData.lote}
                      onChange={(e) => setLoteData({ ...loteData, lote: e.target.value })}
                      sx={{ width: 130 }} />
                    <Tooltip title="Agregar lote">
                      <IconButton color="primary" onClick={handleAddLote} disabled={addingLote}>
                        {addingLote ? <CircularProgress size={20} /> : <AddIcon />}
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              )}

              {lotes.length === 0 ? (
                <Typography variant="caption" color="text.disabled">Sin lotes registrados</Typography>
              ) : (
                <List dense disablePadding>
                  {lotes.map((lote) => {
                    const color = getLoteColor(lote.fechaVencimiento);
                    const dias = differenceInDays(new Date(lote.fechaVencimiento), new Date());
                    return (
                      <ListItem key={lote.id} divider sx={{ pr: 6 }}>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="body2">{lote.deposito?.nombre}</Typography>
                              <Typography variant="body2" color="text.secondary">— {lote.cantidad} u.</Typography>
                              {lote.lote && <Chip label={`Lote ${lote.lote}`} size="small" variant="outlined" sx={{ fontSize: 10 }} />}
                            </Box>
                          }
                          secondary={
                            <Chip
                              icon={color !== 'success' ? <WarnIcon sx={{ fontSize: 12 }} /> : undefined}
                              label={`Vence ${format(new Date(lote.fechaVencimiento), 'dd/MM/yyyy', { locale: es })}${isPast(new Date(lote.fechaVencimiento)) ? ' (VENCIDO)' : dias <= 30 ? ` (${dias}d)` : ''}`}
                              size="small"
                              color={color}
                              sx={{ fontSize: 10, mt: 0.3 }}
                            />
                          }
                        />
                        {!readOnly && (
                          <ListItemSecondaryAction>
                            <IconButton size="small" color="error" onClick={() => handleDeleteLote(lote.id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </ListItemSecondaryAction>
                        )}
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </>
          )}
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
