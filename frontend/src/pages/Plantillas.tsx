import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import api from '../services/api';
import { useNotificationStore } from '../stores/notificationStore';

export default function PlantillasPage() {
  const [plantillas, setPlantillas] = useState<any[]>([]);
  const [programas, setProgramas] = useState<any[]>([]);
  const [articulos, setArticulos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedPlantilla, setSelectedPlantilla] = useState<any>(null);
  const { showNotification } = useNotificationStore();

  // Estado del formulario
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [kilogramos, setKilogramos] = useState('');
  const [programaId, setProgramaId] = useState('');
  const [items, setItems] = useState<{ articuloId: number; articuloNombre: string; cantidadBase: number }[]>([]);
  const [selectedArticuloId, setSelectedArticuloId] = useState('');
  const [cantidadBase, setCantidadBase] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [plantillasRes, programasRes, articulosRes] = await Promise.all([
        api.get('/plantillas'),
        api.get('/programas'),
        api.get('/articulos'),
      ]);
      setPlantillas(plantillasRes.data);
      setProgramas(programasRes.data.filter((p: any) => p.activo));
      setArticulos(articulosRes.data.filter((a: any) => a.activo));
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const openForm = (plantilla?: any) => {
    if (plantilla) {
      setSelectedPlantilla(plantilla);
      setNombre(plantilla.nombre);
      setDescripcion(plantilla.descripcion || '');
      setKilogramos(plantilla.kilogramos != null ? String(plantilla.kilogramos) : '');
      setProgramaId(String(plantilla.programaId || ''));
      setItems(
        plantilla.items.map((i: any) => ({
          articuloId: i.articulo.id,
          articuloNombre: i.articulo.nombre,
          cantidadBase: i.cantidadBase,
        }))
      );
    } else {
      setSelectedPlantilla(null);
      setNombre('');
      setDescripcion('');
      setKilogramos('');
      setProgramaId('');
      setItems([]);
    }
    setSelectedArticuloId('');
    setCantidadBase('');
    setFormOpen(true);
  };

  const handleAddItem = () => {
    if (!selectedArticuloId || !cantidadBase || parseFloat(cantidadBase) <= 0) {
      showNotification('Seleccione un artículo y cantidad válida', 'warning');
      return;
    }
    const articulo = articulos.find((a) => a.id === parseInt(selectedArticuloId));
    if (!articulo) return;
    if (items.some((i) => i.articuloId === articulo.id)) {
      showNotification('Este artículo ya está en la plantilla', 'warning');
      return;
    }
    setItems([...items, { articuloId: articulo.id, articuloNombre: articulo.nombre, cantidadBase: parseFloat(cantidadBase) }]);
    setSelectedArticuloId('');
    setCantidadBase('');
  };

  const handleRemoveItem = (articuloId: number) => {
    setItems(items.filter((i) => i.articuloId !== articuloId));
  };

  const handleSave = async () => {
    if (!nombre.trim()) {
      showNotification('El nombre es requerido', 'warning');
      return;
    }
    if (items.length === 0) {
      showNotification('Agregue al menos un artículo', 'warning');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nombre,
        descripcion,
        kilogramos: kilogramos ? parseFloat(kilogramos) : null,
        programaId: programaId ? parseInt(programaId) : null,
        items: items.map((i) => ({ articuloId: i.articuloId, cantidadBase: i.cantidadBase })),
      };
      if (selectedPlantilla) {
        await api.patch(`/plantillas/${selectedPlantilla.id}`, payload);
        showNotification('Plantilla actualizada correctamente', 'success');
      } else {
        await api.post('/plantillas', payload);
        showNotification('Plantilla creada correctamente', 'success');
      }
      setFormOpen(false);
      loadAll();
    } catch (error: any) {
      showNotification(error.response?.data?.message || 'Error al guardar plantilla', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Desactivar esta plantilla?')) return;
    try {
      await api.delete(`/plantillas/${id}`);
      showNotification('Plantilla desactivada', 'info');
      loadAll();
    } catch {
      showNotification('Error al desactivar', 'error');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Plantillas de Entrega
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Modelos predefinidos de artículos para cada programa
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => openForm()}>
          Nueva Plantilla
        </Button>
      </Box>

      {plantillas.length === 0 ? (
        <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No hay plantillas creadas aún.
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            Crea plantillas para definir qué artículos se entregan en cada programa.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {plantillas.map((plantilla) => (
            <Grid item xs={12} sm={6} md={4} key={plantilla.id}>
              <Card elevation={2}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Typography variant="h6" fontWeight="bold">
                      {plantilla.nombre}
                    </Typography>
                    {plantilla.programa && (
                      <Chip label={plantilla.programa.nombre} size="small" color="primary" />
                    )}
                  </Box>
                  {plantilla.descripcion && (
                    <Typography variant="body2" color="text.secondary" mt={1}>
                      {plantilla.descripcion}
                    </Typography>
                  )}
                  {plantilla.kilogramos != null && (
                    <Chip label={`${plantilla.kilogramos} kg`} size="small" color="success" sx={{ mt: 0.5 }} />
                  )}
                  <Divider sx={{ my: 1.5 }} />
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    ARTÍCULOS ({plantilla.items.length})
                  </Typography>
                  {plantilla.items.map((item: any) => (
                    <Box key={item.id} display="flex" justifyContent="space-between" py={0.3}>
                      <Typography variant="body2">{item.articulo.nombre}</Typography>
                      <Typography variant="body2" color="primary" fontWeight="bold">
                        x{item.cantidadBase}
                      </Typography>
                    </Box>
                  ))}
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end' }}>
                  <IconButton size="small" onClick={() => openForm(plantilla)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(plantilla.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialog crear/editar */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedPlantilla ? 'Editar Plantilla' : 'Nueva Plantilla'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Nombre de la plantilla"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            margin="normal"
            required
            placeholder="Ej: Caja Básica Mensual"
          />
          <TextField
            fullWidth
            label="Descripción"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            margin="normal"
            multiline
            rows={2}
          />
          <Box display="flex" gap={2}>
            <TextField
              fullWidth
              label="Kilogramos de referencia"
              type="number"
              value={kilogramos}
              onChange={(e) => setKilogramos(e.target.value)}
              margin="normal"
              inputProps={{ min: 0, step: 50 }}
              helperText="Para cuántos kg está pensada esta plantilla (ej: 300, 500, 1000)"
            />
            <TextField
              select
              fullWidth
              label="Programa"
              value={programaId}
              onChange={(e) => setProgramaId(e.target.value)}
              margin="normal"
            >
              <MenuItem value="">Sin programa (general)</MenuItem>
              {programas.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.nombre}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" gutterBottom>
            Artículos de la plantilla
          </Typography>

          <Box display="flex" gap={1} mb={2}>
            <TextField
              select
              fullWidth
              label="Artículo"
              value={selectedArticuloId}
              onChange={(e) => setSelectedArticuloId(e.target.value)}
              size="small"
            >
              <MenuItem value="">Seleccionar...</MenuItem>
              {articulos.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.nombre}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Cantidad"
              type="number"
              value={cantidadBase}
              onChange={(e) => setCantidadBase(e.target.value)}
              size="small"
              sx={{ width: 100 }}
              inputProps={{ min: 1 }}
            />
            <Button variant="contained" onClick={handleAddItem} sx={{ minWidth: 80 }}>
              <AddIcon />
            </Button>
          </Box>

          {items.length > 0 && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Artículo</TableCell>
                  <TableCell align="right">Cantidad</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.articuloId}>
                    <TableCell>{item.articuloNombre}</TableCell>
                    <TableCell align="right">{item.cantidadBase}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" color="error" onClick={() => handleRemoveItem(item.articuloId)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)} disabled={saving}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={24} /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
