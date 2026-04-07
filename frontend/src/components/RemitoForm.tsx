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
  Autocomplete,
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
  Tooltip,
  Alert,
  Chip,
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon, PlaylistAdd as PlantillaIcon, PersonAdd as PersonAddIcon, Warning as WarningIcon, Info as InfoIcon } from '@mui/icons-material';
import api from '../services/api';
import { useNotificationStore } from '../stores/notificationStore';
import { useAuthStore } from '../stores/authStore';
import BeneficiarioForm from './BeneficiarioForm';

interface InitialData {
  beneficiarioId?: number;
  fecha?: string;
  horaRetiro?: string;
  depositoId?: number;
  programaId?: number;
  cronogramaEntregaId?: number;
}

interface RemitoFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (remito?: any) => void;
  initialData?: InitialData;
}

interface RemitoItem {
  articuloId: number;
  articuloNombre: string;
  cantidad: number;
  pesoKg: number;
}

const steps = ['Datos del Remito', 'Artículos', 'Confirmar'];

export default function RemitoForm({ open, onClose, onSuccess, initialData }: RemitoFormProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const showNotification = useNotificationStore((state) => state.showNotification);
  const { user } = useAuthStore();
  const esCita = user?.rol === 'ASISTENCIA_CRITICA';

  // Step 1: Datos básicos
  const [beneficiarios, setBeneficiarios] = useState<any[]>([]);
  const [programas, setProgramas] = useState<any[]>([]);
  const [depositos, setDepositos] = useState<any[]>([]);
  const [beneficiarioId, setBeneficiarioId] = useState('');
  const [programaId, setProgramaId] = useState('');
  const [depositoId, setDepositoId] = useState('');
  const manana = new Date(); manana.setDate(manana.getDate() + 1);
  const [fecha, setFecha] = useState(manana.toISOString().split('T')[0]);
  const [horaRetiro, setHoraRetiro] = useState('11:00');

  const [openNuevoBeneficiario, setOpenNuevoBeneficiario] = useState(false);
  const [ultimasEntregas, setUltimasEntregas] = useState<any>(null); // Array<{ fecha, programa, totalKg }> | null | 'loading'
  const [promedioKg, setPromedioKg] = useState<number | null>(null);
  const [cruceDatos, setCruceDatos] = useState<any>(null);

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
      if (initialData) {
        if (initialData.beneficiarioId) setBeneficiarioId(String(initialData.beneficiarioId));
        if (initialData.fecha) setFecha(initialData.fecha);
        if (initialData.horaRetiro) setHoraRetiro(initialData.horaRetiro);
        if (initialData.depositoId) setDepositoId(String(initialData.depositoId));
        if (initialData.programaId) setProgramaId(String(initialData.programaId));
      }
    }
  }, [open]);

  const loadBeneficiarios = async (autoSelectLatest = false) => {
    try {
      const response = await api.get('/beneficiarios', { params: { limit: 500 } });
      const activos = (response.data.data ?? response.data).filter((b: any) => b.activo);
      setBeneficiarios(activos);
      if (autoSelectLatest && activos.length > 0) {
        const ultimo = activos.reduce((a: any, b: any) => (b.id > a.id ? b : a));
        setBeneficiarioId(String(ultimo.id));
        if (ultimo.programaId) setProgramaId(String(ultimo.programaId));
      }
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
      const todos = response.data as any[];
      // ASISTENCIA_CRITICA solo ve y puede usar el depósito CITA
      const filtrados = esCita ? todos.filter((d) => d.codigo === 'CITA') : todos;
      setDepositos(filtrados);
      // Pre-seleccionar automáticamente si solo hay uno disponible
      if (filtrados.length === 1) setDepositoId(String(filtrados[0].id));
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
      const res = await api.post('/remitos', {
        beneficiarioId: parseInt(beneficiarioId),
        depositoId: parseInt(depositoId),
        programaId: programaId ? parseInt(programaId) : undefined,
        fecha,
        horaRetiro,
        cronogramaEntregaId: initialData?.cronogramaEntregaId,
        items: items.map((item) => ({
          articuloId: item.articuloId,
          cantidad: item.cantidad,
        })),
      });
      handleClose();
      onSuccess(res.data);
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
    const m = new Date(); m.setDate(m.getDate() + 1);
    setFecha(m.toISOString().split('T')[0]);
    setHoraRetiro('11:00');
    setItems([]);
    setSelectedArticuloId('');
    setCantidad('');
    setUltimasEntregas('loading');
    setPromedioKg(null);
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
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Autocomplete
                fullWidth
                options={beneficiarios}
                disabled={!!initialData?.beneficiarioId}
                getOptionLabel={(b: any) => b.nombre + (b.localidad ? ` — ${b.localidad}` : '') + (b.responsableNombre ? ` (${b.responsableNombre})` : '')}
                filterOptions={(options, { inputValue }) => {
                  const q = inputValue.toLowerCase();
                  return options.filter((b: any) =>
                    b.nombre.toLowerCase().includes(q) ||
                    (b.localidad && b.localidad.toLowerCase().includes(q)) ||
                    (b.responsableDNI && b.responsableDNI.includes(q))
                  );
                }}
                value={beneficiarios.find((b: any) => String(b.id) === beneficiarioId) || null}
                onChange={async (_e, b: any) => {
                  const val = b ? String(b.id) : '';
                  setBeneficiarioId(val);
                  setCruceDatos(null);
                  if (b?.programaId) setProgramaId(String(b.programaId));
                  if (val) {
                    setUltimasEntregas('loading');
                    setPromedioKg(null);
                    try {
                      const res = await api.get('/remitos', { params: { beneficiarioId: val, estado: 'ENTREGADO' } });
                      const entregados = res.data.filter((r: any) => r.entregadoAt || r.fecha);
                      if (entregados.length > 0) {
                        const sorted = entregados.sort((a: any, b: any) =>
                          new Date(b.entregadoAt || b.fecha).getTime() - new Date(a.entregadoAt || a.fecha).getTime()
                        );
                        // Agrupar por programa: último remito de cada programa
                        const porPrograma = new Map<string, any>();
                        for (const r of sorted) {
                          const key = r.programa?.nombre || '__sin_programa__';
                          if (!porPrograma.has(key)) porPrograma.set(key, r);
                        }
                        setUltimasEntregas(Array.from(porPrograma.values()).map((r: any) => ({
                          fecha: r.entregadoAt || r.fecha,
                          programa: r.programa?.nombre || null,
                          totalKg: r.totalKg || 0,
                        })));
                        // Promedio kg de las últimas entregas
                        const kgs = sorted.filter((r: any) => r.totalKg > 0).map((r: any) => r.totalKg);
                        if (kgs.length > 0) setPromedioKg(kgs.reduce((a: number, b: number) => a + b, 0) / kgs.length);
                      } else {
                        setUltimasEntregas(null);
                      }
                    } catch {
                      setUltimasEntregas(null);
                    }
                    // Cruce de datos por DNI
                    api.get(`/beneficiarios/${val}/cruce-programas`)
                      .then(r => setCruceDatos(r.data))
                      .catch(() => {});
                  } else {
                    setUltimasEntregas('loading');
                  }
                }}
                renderOption={(props, b: any) => (
                  <li {...props} key={b.id}>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">{b.nombre}</Typography>
                      {b.localidad && (
                        <Typography variant="caption" color="text.secondary">{b.localidad}</Typography>
                      )}
                    </Box>
                  </li>
                )}
                renderInput={(params) => (
                  <TextField {...params} label="Beneficiario *" placeholder="Escribí para buscar..." />
                )}
                noOptionsText="No se encontraron beneficiarios"
              />
              {!initialData?.beneficiarioId && (
                <Tooltip title="Crear nuevo beneficiario">
                  <IconButton
                    color="primary"
                    onClick={() => setOpenNuevoBeneficiario(true)}
                    sx={{ flexShrink: 0, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
                  >
                    <PersonAddIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Box>

            {/* Última entrega por programa + kg típicos */}
            {beneficiarioId && ultimasEntregas !== 'loading' && (
              ultimasEntregas && ultimasEntregas.length > 0 ? (
                <Alert severity="info" sx={{ py: 0.5 }}>
                  {ultimasEntregas.map((ue: any, idx: number) => (
                    <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', mb: idx < ultimasEntregas.length - 1 ? 0.3 : 0 }}>
                      <span>Última entrega{ultimasEntregas.length > 1 ? '' : ''}:</span>
                      <strong>{new Date(ue.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</strong>
                      {ue.programa && (
                        <Chip label={ue.programa} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                      )}
                      {ue.totalKg > 0 && (
                        <span>— {ue.totalKg.toFixed(1)} kg</span>
                      )}
                    </Box>
                  ))}
                  {(() => {
                    const benef = beneficiarios.find((b: any) => String(b.id) === beneficiarioId);
                    const kilosHabitual = benef?.kilosHabitual;
                    if (kilosHabitual && kilosHabitual > 0) {
                      return (
                        <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.3 }}>
                          Kg habituales del espacio: <strong>{kilosHabitual.toFixed(1)} kg</strong>
                        </Typography>
                      );
                    }
                    if (promedioKg !== null) {
                      return (
                        <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.3 }}>
                          Promedio por entrega: <strong>{promedioKg.toFixed(1)} kg</strong>
                        </Typography>
                      );
                    }
                    return null;
                  })()}
                </Alert>
              ) : (
                <Alert severity="success" sx={{ py: 0.5 }}>
                  Primera entrega para este beneficiario
                </Alert>
              )
            )}

            {/* Cruce de datos por DNI */}
            {beneficiarioId && cruceDatos && (cruceDatos.integrantes?.length > 0 || cruceDatos.beneficiarios?.length > 0 || cruceDatos.casos?.length > 0) && (
              <Alert
                severity="warning"
                icon={<InfoIcon />}
                sx={{ py: 1, '& .MuiAlert-message': { width: '100%' } }}
              >
                <Typography variant="body2" fontWeight="bold" sx={{ mb: 0.5 }}>
                  Cruce de datos (DNI: {cruceDatos.dni})
                </Typography>

                {/* Integrante de espacios */}
                {cruceDatos.integrantes?.length > 0 && (
                  <Box sx={{ mb: 0.5 }}>
                    {cruceDatos.integrantes.map((int: any, i: number) => (
                      <Typography key={i} variant="caption" sx={{ display: 'block' }}>
                        Es integrante de <strong>{int.beneficiario?.nombre}</strong>
                        {int.beneficiario?.programa?.nombre ? ` (${int.beneficiario.programa.nombre})` : ''}
                      </Typography>
                    ))}
                  </Box>
                )}

                {/* Otros beneficiarios con mismo DNI */}
                {cruceDatos.beneficiarios?.length > 0 && (
                  <Box sx={{ mb: 0.5 }}>
                    {cruceDatos.beneficiarios.map((b: any) => (
                      <Typography key={b.id} variant="caption" sx={{ display: 'block' }}>
                        También recibe como <strong>{b.nombre}</strong>
                        {b.programa?.nombre ? ` (${b.programa.nombre})` : ''}
                        {b.ultimaEntrega
                          ? ` — última entrega: ${new Date(b.ultimaEntrega).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
                          : ''}
                        {!b.activo ? ' [INACTIVO]' : ''}
                      </Typography>
                    ))}
                  </Box>
                )}

                {/* Casos particulares */}
                {cruceDatos.casos?.length > 0 && (
                  <Box>
                    {cruceDatos.casos.map((c: any) => (
                      <Typography key={c.id} variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        Caso particular: <strong>{c.nombreSolicitante}</strong>
                        <Chip
                          label={c.estado}
                          size="small"
                          sx={{ height: 16, fontSize: '0.6rem', ml: 0.5 }}
                          color={c.estado === 'APROBADO' || c.estado === 'RESUELTO' ? 'success' : c.estado === 'PENDIENTE' ? 'warning' : 'default'}
                        />
                      </Typography>
                    ))}
                  </Box>
                )}
              </Alert>
            )}

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

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                required
                label="Fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                sx={{ width: 160 }}
                label="Hora de retiro"
                type="time"
                value={horaRetiro}
                onChange={(e) => setHoraRetiro(e.target.value)}
                InputLabelProps={{ shrink: true }}
                helperText="Por defecto: 11:00"
              />
            </Box>
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

            <Box sx={{ display: 'flex', gap: 2, mb: 1, flexWrap: 'wrap' }}>
              <FormControl fullWidth>
                <InputLabel>Artículo</InputLabel>
                <Select
                  value={selectedArticuloId}
                  onChange={(e) => { setSelectedArticuloId(e.target.value); setCantidad(''); }}
                  label="Artículo"
                >
                  {articulos.map((a) => {
                    const stockDeposito = depositoId
                      ? a.stockItems?.find((s: any) => s.depositoId === parseInt(depositoId))?.cantidad ?? 0
                      : null;
                    const yaAgregado = items.some(i => i.articuloId === a.id);
                    return (
                      <MenuItem key={a.id} value={a.id} sx={yaAgregado ? { bgcolor: 'success.light', '&:hover': { bgcolor: 'success.light' } } : undefined}>
                        {a.nombre}{a.categoria ? ` (${a.categoria})` : ''}
                        {yaAgregado && (
                          <Typography component="span" variant="caption" sx={{ ml: 1, color: 'success.dark', fontWeight: 'bold' }}>
                            ✓ en remito
                          </Typography>
                        )}
                        {stockDeposito !== null && (
                          <Typography component="span" variant="caption" sx={{ ml: 1, color: stockDeposito <= (a.stockMinimo ?? 0) ? 'warning.main' : 'text.secondary' }}>
                            · Stock: {stockDeposito}
                          </Typography>
                        )}
                      </MenuItem>
                    );
                  })}
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

            {/* Alerta de stock bajo para el artículo seleccionado */}
            {(() => {
              if (!selectedArticuloId || !depositoId) return null;
              const art = articulos.find((a) => a.id === parseInt(selectedArticuloId));
              if (!art) return null;
              const stockDisponible = art.stockItems?.find((s: any) => s.depositoId === parseInt(depositoId))?.cantidad ?? 0;
              const cantNum = parseFloat(cantidad) || 0;
              const yaEnRemito = items.filter((i) => i.articuloId === art.id).reduce((s, i) => s + i.cantidad, 0);
              const restante = stockDisponible - yaEnRemito;
              if (restante <= 0) {
                return (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    <strong>Sin stock disponible</strong> — {art.nombre} no tiene unidades en este depósito.
                    {articulos.filter(a => a.id !== art.id && (a.stockItems?.find((s: any) => s.depositoId === parseInt(depositoId))?.cantidad ?? 0) > 0).length > 0 && (
                      <> Alternativas con stock: {articulos
                        .filter(a => a.id !== art.id)
                        .map(a => ({ ...a, stock: a.stockItems?.find((s: any) => s.depositoId === parseInt(depositoId))?.cantidad ?? 0 }))
                        .filter(a => a.stock > 0)
                        .sort((a, b) => b.stock - a.stock)
                        .slice(0, 3)
                        .map(a => `${a.nombre} (${a.stock})`)
                        .join(', ')}.
                      </>
                    )}
                  </Alert>
                );
              }
              if (cantNum > restante) {
                return (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Stock disponible: <strong>{restante}</strong> unidades. Cantidad solicitada ({cantNum}) supera el disponible.
                    Para compensar el kilaje podés agregar:{' '}
                    {articulos
                      .filter(a => a.id !== art.id)
                      .map(a => ({ ...a, stock: a.stockItems?.find((s: any) => s.depositoId === parseInt(depositoId))?.cantidad ?? 0 }))
                      .filter(a => a.stock > 0)
                      .sort((a, b) => b.stock - a.stock)
                      .slice(0, 3)
                      .map(a => `${a.nombre} (${a.stock} disponibles)`)
                      .join(', ')}.
                  </Alert>
                );
              }
              if (art.stockMinimo != null && restante < art.stockMinimo) {
                return (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Stock bajo mínimo — quedan <strong>{restante}</strong> unidades (mínimo: {art.stockMinimo}).
                  </Alert>
                );
              }
              return null;
            })()}


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
                    items.map((item, index) => {
                      const art = articulos.find(a => a.id === item.articuloId);
                      const stockDisp = art && depositoId
                        ? (art.stockItems?.find((s: any) => s.depositoId === parseInt(depositoId))?.cantidad ?? null)
                        : null;
                      const sinStock = stockDisp !== null && stockDisp <= 0;
                      const stockBajo = !sinStock && stockDisp !== null && art?.stockMinimo != null && stockDisp < art.stockMinimo;
                      const cantidadExcede = stockDisp !== null && item.cantidad > stockDisp;
                      const alertaColor = sinStock || cantidadExcede ? 'error.light' : stockBajo ? 'warning.light' : undefined;
                      return (
                        <TableRow key={index} sx={alertaColor ? { bgcolor: alertaColor } : undefined}>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={0.5}>
                              {(sinStock || cantidadExcede || stockBajo) && (
                                <Tooltip title={
                                  sinStock ? 'Sin stock en este depósito'
                                  : cantidadExcede ? `Stock insuficiente: solo hay ${stockDisp} unidades`
                                  : `Stock bajo mínimo: quedan ${stockDisp} unidades`
                                }>
                                  <WarningIcon fontSize="small" color={sinStock || cantidadExcede ? 'error' : 'warning'} />
                                </Tooltip>
                              )}
                              {item.articuloNombre}
                              {stockDisp !== null && (
                                <Typography variant="caption" color={sinStock || cantidadExcede ? 'error' : stockBajo ? 'warning.dark' : 'text.secondary'} sx={{ ml: 0.5 }}>
                                  (stock: {stockDisp})
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell align="right">{item.cantidad}</TableCell>
                          <TableCell align="right">{item.pesoKg.toFixed(2)}</TableCell>
                          <TableCell align="center">
                            <IconButton size="small" color="error" onClick={() => handleRemoveItem(index)}>
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })
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

      <BeneficiarioForm
        open={openNuevoBeneficiario}
        onClose={() => setOpenNuevoBeneficiario(false)}
        onSuccess={() => {
          setOpenNuevoBeneficiario(false);
          loadBeneficiarios(true);
        }}
      />
    </Dialog>
  );
}
