import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
  Alert,
  Tabs,
  Tab,
  Checkbox,
  LinearProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  PictureAsPdf as PdfIcon,
  Email as EmailIcon,
  Check as CheckIcon,
  Send as SendIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  LocalShipping as EntregarIcon,
  PhotoCamera as FotoIcon,
  Search as SearchIcon,
  EventRepeat as ReprogramarIcon,
  Cancel as AnularIcon,
  DoneAll as ConfirmarTodosIcon,
  FileDownload as ExportarIcon,
} from '@mui/icons-material';
import InputAdornment from '@mui/material/InputAdornment';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../services/api';
import RemitoForm from '../components/RemitoForm';
import { useNotificationStore } from '../stores/notificationStore';
import { useAuthStore } from '../stores/authStore';
import LoadingPage from '../components/LoadingPage';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
function resolveUrl(url: string) {
  return url.startsWith('http') ? url : `${API_BASE}/${url.replace(/^\//, '')}`;
}

export default function RemitosPage() {
  const [remitos, setRemitos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [tabPrograma, setTabPrograma] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState('');
  const { showNotification } = useNotificationStore();
  const { user } = useAuthStore();
  const puedeEntregar = user?.rol === 'ADMIN' || user?.rol === 'LOGISTICA' || user?.rol === 'ASISTENCIA_CRITICA';
  const puedeCrear = user?.rol !== 'VISOR';

  // Programas únicos derivados de los remitos cargados
  const programas = Array.from(
    new Map(remitos.filter(r => r.programa).map(r => [r.programa.id, r.programa])).values()
  ).sort((a, b) => a.nombre.localeCompare(b.nombre));

  const remitosVisibles = tabPrograma === 'todos'
    ? remitos
    : tabPrograma === 'sin_programa'
    ? remitos.filter(r => !r.programa)
    : remitos.filter(r => String(r.programa?.id) === tabPrograma);

  // Selección masiva
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkEntregarOpen, setBulkEntregarOpen] = useState(false);
  const [bulkNota, setBulkNota] = useState('');
  const [bulkProgress, setBulkProgress] = useState<{ total: number; done: number; errors: number } | null>(null);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === remitosVisibles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(remitosVisibles.map(r => r.id)));
    }
  };
  const clearSelection = () => setSelectedIds(new Set());

  const selectedRemitos = remitosVisibles.filter(r => selectedIds.has(r.id));
  const selectedBorradores = selectedRemitos.filter(r => r.estado === 'BORRADOR');
  const selectedEntregables = selectedRemitos.filter(r => r.estado === 'CONFIRMADO' || r.estado === 'ENVIADO');

  const handleBulkConfirmar = async () => {
    const ids = selectedBorradores.map(r => r.id);
    setBulkProgress({ total: ids.length, done: 0, errors: 0 });
    let errors = 0;
    for (const id of ids) {
      try {
        await api.post(`/remitos/${id}/confirmar`);
      } catch {
        errors++;
      }
      setBulkProgress(p => p ? { ...p, done: p.done + 1, errors: p.errors + (errors > 0 && p.done === ids.indexOf(id) ? 1 : 0) } : null);
    }
    setBulkProgress(null);
    clearSelection();
    showNotification(`${ids.length - errors} remitos confirmados${errors > 0 ? `, ${errors} errores` : ''}`, errors > 0 ? 'warning' : 'success');
    loadRemitos(busqueda);
  };

  const handleBulkEntregar = async () => {
    const ids = selectedEntregables.map(r => r.id);
    setBulkProgress({ total: ids.length, done: 0, errors: 0 });
    let errors = 0;
    for (const id of ids) {
      try {
        const formData = new FormData();
        if (bulkNota.trim()) formData.append('nota', bulkNota.trim());
        await api.post(`/remitos/${id}/entregar`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      } catch {
        errors++;
      }
      setBulkProgress(p => p ? { ...p, done: p.done + 1 } : null);
    }
    setBulkProgress(null);
    setBulkEntregarOpen(false);
    setBulkNota('');
    clearSelection();
    showNotification(`${ids.length - errors} remitos marcados como entregados${errors > 0 ? `, ${errors} errores` : ''}`, errors > 0 ? 'warning' : 'success');
    loadRemitos(busqueda);
  };

  const handleBulkExportPdf = async () => {
    const ids = selectedRemitos.map(r => r.id);
    setBulkProgress({ total: ids.length, done: 0, errors: 0 });
    for (const remito of selectedRemitos) {
      try {
        const response = await api.get(`/remitos/${remito.id}/pdf`, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.download = `${(remito.beneficiario?.nombre || `remito-${remito.id}`).toUpperCase().replace(/\s+/g, '_')}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      } catch { /* skip */ }
      setBulkProgress(p => p ? { ...p, done: p.done + 1 } : null);
    }
    setBulkProgress(null);
  };

  // Estado diálogo reprogramar/anular
  const [gestionDialog, setGestionDialog] = useState(false);
  const [gestionRemito, setGestionRemito] = useState<any>(null);
  const [gestionFecha, setGestionFecha] = useState('');
  const [gestionHora, setGestionHora] = useState('11:00');
  const [gestionando, setGestionando] = useState(false);

  const abrirGestion = (remito: any) => {
    const f = new Date(remito.fecha);
    setGestionFecha(f.toISOString().split('T')[0]);
    setGestionHora(f.toTimeString().slice(0, 5));
    setGestionRemito(remito);
    setGestionDialog(true);
  };

  const handleReprogramar = async () => {
    if (!gestionRemito || !gestionFecha) return;
    setGestionando(true);
    try {
      await api.patch(`/remitos/${gestionRemito.id}/reprogramar`, { fecha: gestionFecha, horaRetiro: gestionHora });
      showNotification('Remito reprogramado', 'success');
      setGestionDialog(false);
      loadRemitos(busqueda);
    } catch (error: any) {
      showNotification(error.response?.data?.message || 'Error al reprogramar', 'error');
    } finally {
      setGestionando(false);
    }
  };

  const handleAnular = async () => {
    if (!gestionRemito) return;
    if (!window.confirm(`¿Anular el remito ${gestionRemito.numero}? ${gestionRemito.estado !== 'BORRADOR' ? 'El stock será restaurado.' : ''}`)) return;
    setGestionando(true);
    try {
      await api.delete(`/remitos/${gestionRemito.id}/anular`);
      showNotification('Remito anulado y stock restaurado', 'success');
      setGestionDialog(false);
      loadRemitos(busqueda);
    } catch (error: any) {
      showNotification(error.response?.data?.message || 'Error al anular', 'error');
    } finally {
      setGestionando(false);
    }
  };

  // Estado del diálogo de entregar
  const [entregarDialog, setEntregarDialog] = useState(false);
  const [entregarRemito, setEntregarRemito] = useState<any>(null);
  const [entregarNota, setEntregarNota] = useState('');
  const [entregarFoto, setEntregarFoto] = useState<File | null>(null);
  const [entregando, setEntregando] = useState(false);

  const handleAbrirEntregar = (remito: any) => {
    setEntregarRemito(remito);
    setEntregarNota('');
    setEntregarFoto(null);
    setEntregarDialog(true);
  };

  const handleConfirmarEntrega = async () => {
    if (!entregarRemito) return;
    setEntregando(true);
    try {
      const formData = new FormData();
      if (entregarNota.trim()) formData.append('nota', entregarNota.trim());
      if (entregarFoto) formData.append('foto', entregarFoto);
      await api.post(`/remitos/${entregarRemito.id}/entregar`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      showNotification('Remito marcado como entregado', 'success');
      setEntregarDialog(false);
      loadRemitos(busqueda);
    } catch (error: any) {
      showNotification(error.response?.data?.message || 'Error al registrar entrega', 'error');
    } finally {
      setEntregando(false);
    }
  };

  // Estado del diálogo de detalle
  const [detalleDialog, setDetalleDialog] = useState(false);
  const [detalleRemito, setDetalleRemito] = useState<any>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  // Estado del diálogo de email
  const [emailDialog, setEmailDialog] = useState(false);
  const [emailRemito, setEmailRemito] = useState<any>(null);
  const [emailAsunto, setEmailAsunto] = useState('');
  const [emailDestinos, setEmailDestinos] = useState<string[]>([]);
  const [emailDestinosExtra, setEmailDestinosExtra] = useState('');
  const [emailTextoExtra, setEmailTextoExtra] = useState('');

  const DEPOSITOS_EMAIL = [
    { label: 'Depósito CITA', email: 'citadeposito@gmail.com', codigo: 'CITA' },
    { label: 'Depósito Logística', email: 'logistica.deposito.5231@gmail.com', codigo: 'LOGISTICA' },
  ];
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const delay = setTimeout(() => loadRemitos(busqueda), busqueda ? 400 : 0);
    return () => clearTimeout(delay);
  }, [busqueda]);

  const loadRemitos = async (q?: string) => {
    try {
      const params: any = {};
      if (q?.trim()) params.busqueda = q.trim();
      const response = await api.get('/remitos', { params });
      setRemitos(response.data);
    } catch (error) {
      console.error('Error cargando remitos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmar = async (id: number) => {
    try {
      await api.post(`/remitos/${id}/confirmar`);
      showNotification('Remito confirmado. El stock fue descontado.', 'success');
      loadRemitos(busqueda);
    } catch (error: any) {
      showNotification(error.response?.data?.message || 'Error al confirmar remito', 'error');
    }
  };

  const handleVerDetalle = async (id: number) => {
    setLoadingDetalle(true);
    setDetalleDialog(true);
    try {
      const res = await api.get(`/remitos/${id}`);
      setDetalleRemito(res.data);
    } catch {
      showNotification('Error al cargar detalle del remito', 'error');
      setDetalleDialog(false);
    } finally {
      setLoadingDetalle(false);
    }
  };

  const handleEliminar = async (id: number) => {
    if (!window.confirm('¿Eliminar este borrador?')) return;
    try {
      await api.delete(`/remitos/${id}`);
      showNotification('Remito eliminado', 'success');
      loadRemitos(busqueda);
    } catch (error: any) {
      showNotification(error.response?.data?.message || 'Error al eliminar', 'error');
    }
  };

  const handleDescargarPdf = async (remito: any) => {
    try {
      const response = await api.get(`/remitos/${remito.id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const nombre = (remito.beneficiario?.nombre || `remito-${remito.id}`)
        .toUpperCase()
        .replace(/\s+/g, '_');
      link.download = `${nombre}.pdf`;
      link.click();
    } catch {
      showNotification('Error al descargar PDF', 'error');
    }
  };

  const abrirDialogoEmail = (remito: any) => {
    const fecha = new Date(remito.fecha);
    const DIAS = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
    const dia = DIAS[fecha.getDay()];
    const fechaCorta = `${fecha.getDate()}-${fecha.getMonth() + 1}`;
    const nombre = (remito.beneficiario?.nombre || '').toUpperCase();
    setEmailRemito(remito);
    setEmailAsunto(`PEDIDO ${dia} ${fechaCorta} ${nombre}`);
    // Pre-seleccionar el depósito del remito; si no, ambos
    const codigoDeposito = remito.deposito?.codigo as string | undefined;
    const preseleccion = DEPOSITOS_EMAIL
      .filter(d => !codigoDeposito || codigoDeposito === 'CITA' ? d.codigo === 'CITA' : d.codigo === 'LOGISTICA')
      .map(d => d.email);
    setEmailDestinos(preseleccion.length > 0 ? preseleccion : DEPOSITOS_EMAIL.map(d => d.email));
    setEmailDestinosExtra('');
    setEmailTextoExtra('');
    setEmailDialog(true);
  };

  const handleEnviarEmail = async () => {
    if (!emailRemito) return;
    setEnviando(true);
    try {
      const payload: any = {};
      if (emailAsunto) payload.asunto = emailAsunto;
      const extras = emailDestinosExtra.split(/[,;\n]+/).map(e => e.trim()).filter(Boolean);
      const todos = [...emailDestinos, ...extras];
      if (todos.length > 0) payload.destinatarios = todos;
      if (emailTextoExtra.trim()) payload.textoExtra = emailTextoExtra.trim();

      await api.post(`/remitos/${emailRemito.id}/enviar`, payload);
      showNotification('Email enviado correctamente', 'success');
      setEmailDialog(false);
      loadRemitos(busqueda);
    } catch (error: any) {
      showNotification(error.response?.data?.message || 'Error al enviar email', 'error');
    } finally {
      setEnviando(false);
    }
  };

  if (loading) {
    return <LoadingPage />;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4" fontWeight="bold">
          Remitos
        </Typography>
        {puedeCrear && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormOpen(true)}>
            Nuevo Remito
          </Button>
        )}
      </Box>

      <Box mb={2}>
        <TextField
          size="small"
          placeholder="Buscar por nombre, DNI o número de remito..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ width: 380 }}
        />
      </Box>

      {/* Tabs por programa */}
      <Paper elevation={1} sx={{ mb: 2 }}>
        <Tabs
          value={tabPrograma}
          onChange={(_, v) => setTabPrograma(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label={`Todos (${remitos.length})`} value="todos" />
          {programas.map(p => (
            <Tab
              key={p.id}
              label={`${p.nombre} (${remitos.filter(r => r.programa?.id === p.id).length})`}
              value={String(p.id)}
            />
          ))}
          {remitos.some(r => !r.programa) && (
            <Tab label={`Sin programa (${remitos.filter(r => !r.programa).length})`} value="sin_programa" />
          )}
        </Tabs>
      </Paper>

      {/* Toolbar selección masiva */}
      {selectedIds.size > 0 && (
        <Paper elevation={3} sx={{ mb: 2, p: 1.5, bgcolor: 'primary.main', color: 'white', display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Typography variant="body2" fontWeight="bold" sx={{ mr: 1 }}>
            {selectedIds.size} seleccionados
          </Typography>
          {selectedBorradores.length > 0 && (
            <Button
              size="small" variant="contained" color="success"
              startIcon={bulkProgress ? <CircularProgress size={14} sx={{ color: 'white' }} /> : <ConfirmarTodosIcon />}
              onClick={handleBulkConfirmar}
              disabled={!!bulkProgress}
              sx={{ bgcolor: 'success.main' }}
            >
              Confirmar {selectedBorradores.length} borrador{selectedBorradores.length > 1 ? 'es' : ''}
            </Button>
          )}
          {puedeEntregar && selectedEntregables.length > 0 && (
            <Button
              size="small" variant="contained" color="secondary"
              startIcon={<EntregarIcon />}
              onClick={() => { setBulkNota(''); setBulkEntregarOpen(true); }}
              disabled={!!bulkProgress}
              sx={{ bgcolor: 'secondary.main' }}
            >
              Entregar {selectedEntregables.length}
            </Button>
          )}
          <Button
            size="small" variant="outlined"
            startIcon={bulkProgress ? <CircularProgress size={14} sx={{ color: 'white' }} /> : <ExportarIcon />}
            onClick={handleBulkExportPdf}
            disabled={!!bulkProgress}
            sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.6)', '&:hover': { borderColor: 'white' } }}
          >
            Exportar {selectedIds.size} PDF{selectedIds.size > 1 ? 's' : ''}
          </Button>
          <Box flex={1} />
          <Button size="small" onClick={clearSelection} sx={{ color: 'rgba(255,255,255,0.8)' }}>
            Cancelar
          </Button>
          {bulkProgress && (
            <Box sx={{ width: '100%', mt: 0.5 }}>
              <LinearProgress
                variant="determinate"
                value={(bulkProgress.done / bulkProgress.total) * 100}
                sx={{ bgcolor: 'rgba(255,255,255,0.3)', '& .MuiLinearProgress-bar': { bgcolor: 'white' } }}
              />
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                {bulkProgress.done} / {bulkProgress.total}
              </Typography>
            </Box>
          )}
        </Paper>
      )}

      <TableContainer component={Paper} elevation={2}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selectedIds.size > 0 && selectedIds.size < remitosVisibles.length}
                  checked={remitosVisibles.length > 0 && selectedIds.size === remitosVisibles.length}
                  onChange={toggleSelectAll}
                  sx={{ color: 'white', '&.Mui-checked': { color: 'white' }, '&.MuiCheckbox-indeterminate': { color: 'white' } }}
                />
              </TableCell>
              <TableCell>Número</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell>Beneficiario</TableCell>
              <TableCell>Depósito</TableCell>
              <TableCell align="right">Total Kg</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {remitosVisibles.map((remito) => (
              <TableRow key={remito.id} hover selected={selectedIds.has(remito.id)}>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedIds.has(remito.id)}
                    onChange={() => toggleSelect(remito.id)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <strong>{remito.numero || 'BORRADOR'}</strong>
                </TableCell>
                <TableCell>
                  {format(new Date(remito.fecha), 'dd/MM/yyyy', { locale: es })}
                </TableCell>
                <TableCell>
                  {remito.caso?.nombreSolicitante ?? remito.beneficiario?.nombre ?? '—'}
                  {remito.caso?.dni && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      DNI: {remito.caso.dni}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>{remito.deposito?.nombre}</TableCell>
                <TableCell align="right">
                  <strong>{remito.totalKg.toFixed(2)}</strong>
                </TableCell>
                <TableCell>
                  <Chip
                    label={remito.estado}
                    size="small"
                    color={
                      remito.estado === 'CONFIRMADO'
                        ? 'success'
                        : remito.estado === 'ENVIADO'
                        ? 'info'
                        : remito.estado === 'ENTREGADO'
                        ? 'secondary'
                        : remito.estado === 'PENDIENTE_STOCK'
                        ? 'warning'
                        : 'default'
                    }
                  />
                </TableCell>
                <TableCell align="center">
                  {/* Ver detalle — siempre disponible */}
                  <Tooltip title="Ver detalle">
                    <IconButton size="small" onClick={() => handleVerDetalle(remito.id)}>
                      <ViewIcon />
                    </IconButton>
                  </Tooltip>

                  {/* Confirmar — solo BORRADOR */}
                  {remito.estado === 'BORRADOR' && (
                    <>
                      <Tooltip title="Confirmar y descontar stock">
                        <IconButton size="small" color="success" onClick={() => handleConfirmar(remito.id)}>
                          <CheckIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar borrador">
                        <IconButton size="small" color="error" onClick={() => handleEliminar(remito.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}

                  {/* PDF + Email + Entregar — todos los estados confirmados */}
                  {(remito.estado === 'CONFIRMADO' || remito.estado === 'ENVIADO' || remito.estado === 'BORRADOR') && (
                    <Tooltip title="Descargar PDF">
                      <IconButton size="small" color="primary" onClick={() => handleDescargarPdf(remito)}>
                        <PdfIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                  {(remito.estado === 'CONFIRMADO' || remito.estado === 'ENVIADO') && (
                    <Tooltip title={remito.emailEnviado ? 'Reenviar por Email' : 'Enviar por Email'}>
                      <IconButton
                        size="small"
                        color={remito.emailEnviado ? 'success' : 'secondary'}
                        onClick={() => abrirDialogoEmail(remito)}
                      >
                        {remito.emailEnviado ? <SendIcon /> : <EmailIcon />}
                      </IconButton>
                    </Tooltip>
                  )}
                  {puedeEntregar && (remito.estado === 'CONFIRMADO' || remito.estado === 'ENVIADO') && (
                    <Tooltip title="Marcar como entregado">
                      <IconButton size="small" color="success" onClick={() => handleAbrirEntregar(remito)}>
                        <EntregarIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                  {(remito.estado === 'CONFIRMADO' || remito.estado === 'ENVIADO' || remito.estado === 'BORRADOR') && puedeCrear && (
                    <Tooltip title="Reprogramar / Anular">
                      <IconButton size="small" color="warning" onClick={() => abrirGestion(remito)}>
                        <ReprogramarIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                  {remito.estado === 'ENTREGADO' && (
                    <Tooltip title="Ver comprobante de entrega">
                      <IconButton size="small" color="primary" onClick={() => handleDescargarPdf(remito)}>
                        <PdfIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <RemitoForm open={formOpen} onClose={() => setFormOpen(false)} onSuccess={loadRemitos} />

      {/* Diálogo: Reprogramar / Anular */}
      <Dialog open={gestionDialog} onClose={() => setGestionDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ReprogramarIcon color="warning" />
          Gestionar remito {gestionRemito?.numero}
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            {gestionRemito?.beneficiario?.nombre} — {gestionRemito?.estado}
          </Alert>
          <Box display="flex" gap={2} mt={1}>
            <TextField
              fullWidth
              label="Nueva fecha"
              type="date"
              value={gestionFecha}
              onChange={(e) => setGestionFecha(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              sx={{ width: 140 }}
              label="Hora"
              type="time"
              value={gestionHora}
              onChange={(e) => setGestionHora(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            color="error"
            startIcon={gestionando ? <CircularProgress size={16} /> : <AnularIcon />}
            onClick={handleAnular}
            disabled={gestionando}
          >
            Anular remito
          </Button>
          <Box flex={1} />
          <Button onClick={() => setGestionDialog(false)} disabled={gestionando}>Cancelar</Button>
          <Button
            variant="contained"
            startIcon={gestionando ? <CircularProgress size={16} /> : <ReprogramarIcon />}
            onClick={handleReprogramar}
            disabled={gestionando || !gestionFecha}
          >
            Reprogramar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de detalle del remito */}
      <Dialog open={detalleDialog} onClose={() => setDetalleDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" component="span">
              {detalleRemito?.numero || 'Cargando...'}
            </Typography>
            {detalleRemito && (
              <Chip
                label={detalleRemito.estado}
                size="small"
                sx={{ ml: 1 }}
                color={
                  detalleRemito.estado === 'CONFIRMADO' ? 'success' :
                  detalleRemito.estado === 'ENVIADO' ? 'info' :
                  detalleRemito.estado === 'PENDIENTE_STOCK' ? 'warning' : 'default'
                }
              />
            )}
          </Box>
          {detalleRemito && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<PdfIcon />}
              onClick={() => handleDescargarPdf(detalleRemito)}
            >
              Descargar PDF
            </Button>
          )}
        </DialogTitle>
        <DialogContent dividers>
          {loadingDetalle ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : detalleRemito ? (
            <Box>
              {/* Info general */}
              <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2} mb={3}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    {detalleRemito.caso ? 'SOLICITANTE (CASO PARTICULAR)' : 'BENEFICIARIO'}
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {detalleRemito.caso?.nombreSolicitante ?? detalleRemito.beneficiario?.nombre}
                  </Typography>
                  {detalleRemito.caso?.dni && (
                    <Typography variant="body2" fontWeight="bold" color="primary">DNI: {detalleRemito.caso.dni}</Typography>
                  )}
                  {!detalleRemito.caso && detalleRemito.beneficiario?.dni && (
                    <Typography variant="body2" color="text.secondary">DNI: {detalleRemito.beneficiario.dni}</Typography>
                  )}
                  {detalleRemito.beneficiario?.direccion && (
                    <Typography variant="body2" color="text.secondary">{detalleRemito.beneficiario.direccion}</Typography>
                  )}
                </Paper>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary">DATOS DEL REMITO</Typography>
                  <Typography variant="body2">📦 Depósito: <strong>{detalleRemito.deposito?.nombre}</strong></Typography>
                  <Typography variant="body2">📋 Programa: <strong>{detalleRemito.programa?.nombre || '—'}</strong></Typography>
                  <Typography variant="body2">📅 Fecha: <strong>{format(new Date(detalleRemito.fecha), 'dd/MM/yyyy HH:mm', { locale: es })}</strong></Typography>
                  <Typography variant="body2">⚖️ Total: <strong>{detalleRemito.totalKg?.toFixed(2)} kg</strong></Typography>
                </Paper>
              </Box>

              {detalleRemito.observaciones && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <strong>Observaciones:</strong> {detalleRemito.observaciones}
                </Alert>
              )}

              {/* Info de entrega si ya fue entregado */}
              {detalleRemito.estado === 'ENTREGADO' && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  <strong>Entregado</strong>{detalleRemito.entregadoAt
                    ? ` el ${format(new Date(detalleRemito.entregadoAt), 'dd/MM/yyyy HH:mm', { locale: es })}`
                    : ''}
                  {detalleRemito.entregadoNota && (
                    <Box mt={0.5}>{detalleRemito.entregadoNota}</Box>
                  )}
                  {detalleRemito.entregadoFoto && (
                    <Box mt={1}>
                      <a
                        href={resolveUrl(detalleRemito.entregadoFoto)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        📎 Ver / descargar foto del remito firmado
                      </a>
                    </Box>
                  )}
                </Alert>
              )}
              {/* Foto del remito firmado — preview inline */}
              {detalleRemito.estado === 'ENTREGADO' && detalleRemito.entregadoFoto &&
                /\.(jpg|jpeg|png|webp)$/i.test(detalleRemito.entregadoFoto) && (
                <Box mb={2} textAlign="center">
                  <img
                    src={resolveUrl(detalleRemito.entregadoFoto)}
                    alt="Remito firmado"
                    style={{ maxWidth: '100%', maxHeight: 320, borderRadius: 8, border: '2px solid #4caf50', cursor: 'pointer' }}
                    onClick={() => window.open(resolveUrl(detalleRemito.entregadoFoto), '_blank')}
                  />
                  <Typography variant="caption" color="text.secondary" display="block">Clic para ampliar</Typography>
                </Box>
              )}

              {/* Tabla de ítems */}
              <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>ARTÍCULOS</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                      <TableCell>Artículo</TableCell>
                      <TableCell align="right">Cantidad</TableCell>
                      <TableCell align="right">Peso Unit. (kg)</TableCell>
                      <TableCell align="right">Subtotal (kg)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detalleRemito.items?.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.articulo?.descripcion || item.articulo?.nombre}</TableCell>
                        <TableCell align="right">{item.cantidad}</TableCell>
                        <TableCell align="right">{item.articulo?.pesoUnitarioKg?.toFixed(3) || '—'}</TableCell>
                        <TableCell align="right"><strong>{item.pesoKg?.toFixed(3)}</strong></TableCell>
                      </TableRow>
                    ))}
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell colSpan={3}><strong>TOTAL</strong></TableCell>
                      <TableCell align="right"><strong>{detalleRemito.totalKg?.toFixed(3)} kg</strong></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          {detalleRemito?.estado === 'BORRADOR' && (
            <Button
              variant="contained"
              color="success"
              startIcon={<CheckIcon />}
              onClick={() => {
                handleConfirmar(detalleRemito.id);
                setDetalleDialog(false);
              }}
            >
              Confirmar Remito
            </Button>
          )}
          {puedeEntregar && (detalleRemito?.estado === 'CONFIRMADO' || detalleRemito?.estado === 'ENVIADO') && (
            <Button
              variant="contained"
              color="secondary"
              startIcon={<EntregarIcon />}
              onClick={() => {
                setDetalleDialog(false);
                handleAbrirEntregar(detalleRemito);
              }}
            >
              Marcar Entregado
            </Button>
          )}
          <Button onClick={() => setDetalleDialog(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo: Marcar Entregado */}
      <Dialog open={entregarDialog} onClose={() => setEntregarDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EntregarIcon color="success" />
          Registrar Entrega
        </DialogTitle>
        <DialogContent>
          {entregarRemito && (
            <Alert severity="success" sx={{ mb: 2 }}>
              <strong>{entregarRemito.numero}</strong> —{' '}
              {entregarRemito.caso?.nombreSolicitante ?? entregarRemito.beneficiario?.nombre}
              {entregarRemito.caso?.dni && (
                <> · DNI: <strong>{entregarRemito.caso.dni}</strong></>
              )}
            </Alert>
          )}
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Nota de entrega (opcional)"
            value={entregarNota}
            onChange={(e) => setEntregarNota(e.target.value)}
            margin="normal"
            placeholder="Ej: Retiró Ana Martínez - DNI 28.444.555"
          />
          <Box sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              component="label"
              startIcon={<FotoIcon />}
              fullWidth
            >
              {entregarFoto ? `✓ ${entregarFoto.name}` : 'Subir foto del remito firmado'}
              <input
                type="file"
                hidden
                accept="image/*,application/pdf"
                onChange={(e) => setEntregarFoto(e.target.files?.[0] || null)}
              />
            </Button>
            <Typography variant="caption" color="text.secondary" display="block" mt={0.5} textAlign="center">
              Foto del remito firmado por quien retira. Máx. 10 MB.
            </Typography>
          </Box>
          {entregarFoto && entregarFoto.type.startsWith('image/') && (
            <Box mt={2} textAlign="center">
              <img
                src={URL.createObjectURL(entregarFoto)}
                alt="Preview"
                style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, border: '1px solid #ccc' }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEntregarDialog(false)} disabled={entregando}>Cancelar</Button>
          <Button
            variant="contained"
            color="success"
            startIcon={entregando ? <CircularProgress size={18} /> : <EntregarIcon />}
            onClick={handleConfirmarEntrega}
            disabled={entregando}
          >
            Confirmar Entrega
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo: Entrega masiva */}
      <Dialog open={bulkEntregarOpen} onClose={() => setBulkEntregarOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EntregarIcon color="success" />
          Marcar {selectedEntregables.length} remitos como entregados
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Se marcarán como ENTREGADO los {selectedEntregables.length} remitos seleccionados (CONFIRMADO / ENVIADO).
          </Alert>
          <TextField
            fullWidth multiline rows={2}
            label="Nota de entrega (opcional, aplica a todos)"
            value={bulkNota}
            onChange={(e) => setBulkNota(e.target.value)}
            placeholder="Ej: Entrega masiva — retiro en depósito"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkEntregarOpen(false)} disabled={!!bulkProgress}>Cancelar</Button>
          <Button
            variant="contained" color="success"
            startIcon={bulkProgress ? <CircularProgress size={16} /> : <EntregarIcon />}
            onClick={handleBulkEntregar}
            disabled={!!bulkProgress}
          >
            {bulkProgress ? `${bulkProgress.done}/${bulkProgress.total}...` : `Confirmar ${selectedEntregables.length} entregas`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de envío por email */}
      <Dialog open={emailDialog} onClose={() => setEmailDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EmailIcon color="primary" />
          Enviar Remito por Email
        </DialogTitle>
        <DialogContent>
          {emailRemito && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <strong>{emailRemito.numero}</strong> — {emailRemito.beneficiario?.nombre}
              {emailRemito.emailEnviado && <span> (ya enviado anteriormente)</span>}
            </Alert>
          )}

          <TextField
            fullWidth
            label="Asunto"
            value={emailAsunto}
            onChange={(e) => setEmailAsunto(e.target.value)}
            margin="normal"
            inputProps={{ style: { textTransform: 'uppercase' } }}
            helperText="Ej: PEDIDO LUNES 23-2 AMIGAS PLATENSES UNIDAS"
          />

          <Box mt={2}>
            <Typography variant="caption" color="text.secondary" display="block" mb={1}>
              Enviar a:
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap">
              {DEPOSITOS_EMAIL.map((d) => {
                const seleccionado = emailDestinos.includes(d.email);
                return (
                  <Chip
                    key={d.email}
                    label={
                      <Box>
                        <Typography variant="caption" fontWeight="bold" display="block">{d.label}</Typography>
                        <Typography variant="caption" color={seleccionado ? 'inherit' : 'text.secondary'}>{d.email}</Typography>
                      </Box>
                    }
                    onClick={() => setEmailDestinos(
                      seleccionado
                        ? emailDestinos.filter((e: string) => e !== d.email)
                        : [...emailDestinos, d.email]
                    )}
                    color={seleccionado ? 'primary' : 'default'}
                    variant={seleccionado ? 'filled' : 'outlined'}
                    sx={{ height: 'auto', py: 0.5, cursor: 'pointer' }}
                  />
                );
              })}
            </Box>
            {emailDestinos.length === 0 && emailDestinosExtra.trim() === '' && (
              <Typography variant="caption" color="error" display="block" mt={0.5}>
                Seleccioná al menos un destinatario
              </Typography>
            )}
            <TextField
              fullWidth
              size="small"
              label="Otro destinatario (opcional)"
              value={emailDestinosExtra}
              onChange={(e) => setEmailDestinosExtra(e.target.value)}
              placeholder="otro@email.com, otro2@email.com"
              helperText="Podés agregar más emails separados por coma"
              sx={{ mt: 1.5 }}
            />
          </Box>

          <Divider sx={{ my: 2 }} />

          <Typography variant="caption" color="text.secondary" display="block" mb={1}>
            Incluye automáticamente — Responsable:{' '}
            <strong>{emailRemito?.beneficiario?.responsableNombre || 'A CONFIRMAR'}</strong>
            {emailRemito?.beneficiario?.responsableDNI
              ? ` - DNI ${emailRemito.beneficiario.responsableDNI}`
              : ''}
          </Typography>

          <TextField
            fullWidth
            multiline
            rows={2}
            label="Texto adicional (opcional)"
            value={emailTextoExtra}
            onChange={(e) => setEmailTextoExtra(e.target.value)}
            margin="normal"
            placeholder="Ej: RETIRA ANAHÍ SMITH"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmailDialog(false)}>Cancelar</Button>
          <Button
            variant="contained"
            startIcon={enviando ? <CircularProgress size={18} /> : <SendIcon />}
            onClick={handleEnviarEmail}
            disabled={enviando}
          >
            Enviar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
