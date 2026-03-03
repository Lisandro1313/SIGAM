import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stepper,
  Step,
  StepLabel,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Typography,
  CircularProgress,
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon, PlaylistAdd as PlantillaIcon } from '@mui/icons-material';
import api from '../services/api';
import { useNotificationStore } from '../stores/notificationStore';

interface RemitoFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface RemitoItem {
  articuloId: number;
  articuloNombre: string;
  cantidad: number;
  pesoKg: number;
}

const steps = ['Datos del Remito', 'Artículos', 'Confirmar'];

export default function RemitoForm({ open, onClose, onSuccess }: RemitoFormProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const showNotification = useNotificationStore((state) => state.showNotification);

  // Step 1: Datos básicos
  const [beneficiarios, setBeneficiarios] = useState<any[]>([]);
  const [programas, setProgramas] = useState<any[]>([]);
  const [depositos, setDepositos] = useState<any[]>([]);
  const [beneficiarioId, setBeneficiarioId] = useState('');
  const [programaId, setProgramaId] = useState('');
  const [depositoId, setDepositoId] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);

  // Step 2: Items
  const [articulos, setArticulos] = useState<any[]>([]);
  const [plantillas, setPlantillas] = useState<any[]>([]);
  const [items, setItems] = useState<RemitoItem[]>([]);
  const [selectedArticuloId, setSelectedArticuloId] = useState('');
  const [cantidad, setCantidad] = useState('');

  useEffect(() => {
    if (open) {
      loadBeneficiarios();
      loadDepositos();
      loadArticulos();
      loadProgramas();
      loadPlantillas();
    }
  }, [open]);

  const loadBeneficiarios = async () => {
    try {
      const response = await api.get('/beneficiarios');
      setBeneficiarios(response.data.filter((b: any) => b.activo));
    } catch (error) {
      console.error('Error cargando beneficiarios:', error);
    }
  };

  const loadProgramas = async () => {
    try {
      const response = await api.get('/programas');
      setProgramas(response.data.filter((p: any) => p.activo));
    } catch (error) {
      console.error('Error cargando programas:', error);
    }
  };

  const loadDepositos = async () => {
    try {
      const response = await api.get('/depositos');
      setDepositos(response.data);
    } catch (error) {
      console.error('Error cargando depósitos:', error);
    }
  };

  const loadArticulos = async () => {
    try {
      const response = await api.get('/articulos');
      setArticulos(response.data.filter((a: any) => a.activo));
    } catch (error) {
      console.error('Error cargando artículos:', error);
    }
  };

  const loadPlantillas = async () => {
    try {
      const response = await api.get('/plantillas');
      setPlantillas(response.data);
    } catch (error) {
      console.error('Error cargando plantillas:', error);
    }
  };

  const handleCargarPlantilla = (plantillaId: string) => {
    if (!plantillaId) return;
    const plantilla = plantillas.find((p) => p.id === parseInt(plantillaId));
    if (!plantilla) return;
    const nuevosItems: RemitoItem[] = plantilla.items.map((item: any) => ({
      articuloId: item.articulo.id,
      articuloNombre: item.articulo.nombre,
      cantidad: item.cantidadBase,
      pesoKg: (item.articulo.pesoUnitarioKg || 0) * item.cantidadBase,
    }));
    setItems(nuevosItems);
    showNotification(`Plantilla "${plantilla.nombre}" cargada (${nuevosItems.length} artículos)`, 'success');
  };

  const handleNext = () => {
    if (activeStep === 0) {
      if (!beneficiarioId || !depositoId || !fecha) {
        showNotification('Complete todos los campos', 'warning');
        return;
      }
    }
    if (activeStep === 1) {
      if (items.length === 0) {
        showNotification('Agregue al menos un artículo', 'warning');
        return;
      }
    }
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleAddItem = () => {
    if (!selectedArticuloId || !cantidad || parseFloat(cantidad) <= 0) {
      showNotification('Seleccione un artículo y cantidad válida', 'warning');
      return;
    }

    const articulo = articulos.find((a) => a.id === parseInt(selectedArticuloId));
    if (!articulo) return;

    const newItem: RemitoItem = {
      articuloId: articulo.id,
      articuloNombre: articulo.nombre,
      cantidad: parseFloat(cantidad),
      pesoKg: (articulo.pesoUnitarioKg || 0) * parseFloat(cantidad),
    };

    setItems([...items, newItem]);
    setSelectedArticuloId('');
    setCantidad('');
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.post('/remitos', {
        beneficiarioId: parseInt(beneficiarioId),
        depositoId: parseInt(depositoId),
        programaId: programaId ? parseInt(programaId) : undefined,
        items: items.map((item) => ({
          articuloId: item.articuloId,
          cantidad: item.cantidad,
        })),
      });
      showNotification('Remito creado exitosamente', 'success');
      handleClose();
      onSuccess();
    } catch (error) {
      console.error('Error al crear remito:', error);
      showNotification('Error al crear el remito', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setActiveStep(0);
    setBeneficiarioId('');
    setProgramaId('');
    setDepositoId('');
    setFecha(new Date().toISOString().split('T')[0]);
    setItems([]);
    setSelectedArticuloId('');
    setCantidad('');
    onClose();
  };


  const totalKg = items.reduce((sum, item) => sum + item.pesoKg, 0);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Nuevo Remito</DialogTitle>
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ my: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {activeStep === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <FormControl fullWidth required>
              <InputLabel>Beneficiario</InputLabel>
              <Select
                value={beneficiarioId}
                onChange={(e) => {
                  const val = e.target.value;
                  setBeneficiarioId(val);
                  // Auto-completar programa del beneficiario
                  const b = beneficiarios.find((b) => b.id === parseInt(val));
                  if (b?.programaId) setProgramaId(String(b.programaId));
                }}
                label="Beneficiario"
              >
                {beneficiarios.map((b) => (
                  <MenuItem key={b.id} value={b.id}>
                    {b.nombre} - {b.localidad}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth required>
              <InputLabel>Depósito</InputLabel>
              <Select value={depositoId} onChange={(e) => setDepositoId(e.target.value)} label="Depósito">
                {depositos.map((d) => (
                  <MenuItem key={d.id} value={d.id}>
                    {d.nombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Programa</InputLabel>
              <Select value={programaId} onChange={(e) => setProgramaId(e.target.value)} label="Programa">
                <MenuItem value="">Sin programa</MenuItem>
                {programas.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.nombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              required
              label="Fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        )}

        {activeStep === 1 && (
          <Box sx={{ mt: 2 }}>
            {/* Selector de plantilla */}
            <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'primary.50' }}>
              <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PlantillaIcon fontSize="small" color="primary" />
                Cargar desde plantilla (opcional)
              </Typography>
              <FormControl fullWidth size="small">
                <InputLabel>Seleccionar plantilla...</InputLabel>
                <Select
                  value=""
                  onChange={(e) => handleCargarPlantilla(e.target.value)}
                  label="Seleccionar plantilla..."
                >
                  {plantillas
                    .filter((p) => !programaId || p.programaId === parseInt(programaId) || !p.programaId)
                    .map((p) => (
                      <MenuItem key={p.id} value={p.id}>
                        {p.nombre} ({p.items.length} artículos)
                        {p.programa ? ` — ${p.programa.nombre}` : ''}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary">
                Al seleccionar una plantilla se reemplaza la lista actual
              </Typography>
            </Paper>

            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Artículo</InputLabel>
                <Select
                  value={selectedArticuloId}
                  onChange={(e) => setSelectedArticuloId(e.target.value)}
                  label="Artículo"
                >
                  {articulos.map((a) => (
                    <MenuItem key={a.id} value={a.id}>
                      {a.nombre}{a.categoria ? ` (${a.categoria})` : ''}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Cantidad"
                type="number"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                sx={{ width: 150 }}
                inputProps={{ min: 0, step: 0.1 }}
              />

              <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddItem}>
                Agregar
              </Button>
            </Box>

            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Artículo</TableCell>
                    <TableCell align="right">Cantidad</TableCell>
                    <TableCell align="right">Peso (kg)</TableCell>
                    <TableCell align="center">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No hay artículos agregados
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.articuloNombre}</TableCell>
                        <TableCell align="right">{item.cantidad}</TableCell>
                        <TableCell align="right">{item.pesoKg.toFixed(2)}</TableCell>
                        <TableCell align="center">
                          <IconButton size="small" color="error" onClick={() => handleRemoveItem(index)}>
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ mt: 2, textAlign: 'right' }}>
              <Typography variant="h6">Total: {totalKg.toFixed(2)} kg</Typography>
            </Box>
          </Box>
        )}

        {activeStep === 2 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Resumen del Remito
            </Typography>

            <Box sx={{ mb: 3 }}>
              <Typography>
                <strong>Beneficiario:</strong>{' '}
                {beneficiarios.find((b) => b.id === parseInt(beneficiarioId))?.nombre}
              </Typography>
              <Typography>
                <strong>Depósito:</strong> {depositos.find((d) => d.id === parseInt(depositoId))?.nombre}
              </Typography>
              <Typography>
                <strong>Fecha:</strong> {new Date(fecha).toLocaleDateString()}
              </Typography>
            </Box>

            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Artículo</TableCell>
                    <TableCell align="right">Cantidad</TableCell>
                    <TableCell align="right">Peso (kg)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.articuloNombre}</TableCell>
                      <TableCell align="right">{item.cantidad}</TableCell>
                      <TableCell align="right">{item.pesoKg.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={2} align="right">
                      <strong>Total:</strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong>{totalKg.toFixed(2)} kg</strong>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancelar
        </Button>
        {activeStep > 0 && (
          <Button onClick={handleBack} disabled={loading}>
            Atrás
          </Button>
        )}
        {activeStep < steps.length - 1 ? (
          <Button onClick={handleNext} variant="contained" disabled={loading}>
            Siguiente
          </Button>
        ) : (
          <Button onClick={handleSubmit} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Crear Remito'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
