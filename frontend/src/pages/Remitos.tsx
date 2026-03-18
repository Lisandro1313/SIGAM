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
  const [emailDestinatarios, setEmailDestinatarios] = useState('');
  const [emailTextoExtra, setEmailTextoExtra] = useState('');
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
    setEmailDestinatarios('');
    setEmailTextoExtra('');
    setEmailDialog(true);
  };

  const handleEnviarEmail = async () => {
    if (!emailRemito) return;
    setEnviando(true);
    try {
      const payload: any = {};
      if (emailAsunto) payload.asunto = emailAsunto;
      if (emailDestinatarios.trim()) {
        payload.destinatarios = emailDestinatarios
          .split(/[,;\n]+/)
          .map((e) => e.trim())
          .filter(Boolean);
      }
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

      <TableContainer component={Paper} elevation={2}>
        <Table>
          <TableHead>
            <TableRow>
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
              <TableRow key={remito.id} hover>
                <TableCell>
                  <strong>{remito.numero || 'BORRADOR'}</strong>
                </TableCell>
                <TableCell>
                  {format(new Date(remito.fecha), 'dd/MM/yyyy', { locale: es })}
                </TableCell>
                <TableCell>{remito.beneficiario?.nombre}</TableCell>
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
                  <Typography variant="caption" color="text.secondary">BENEFICIARIO</Typography>
                  <Typography variant="body1" fontWeight="bold">{detalleRemito.beneficiario?.nombre}</Typography>
                  {detalleRemito.beneficiario?.dni && (
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
              <strong>{entregarRemito.numero}</strong> — {entregarRemito.beneficiario?.nombre}
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

          <TextField
            fullWidth
            label="Destinatarios (separados por coma)"
            value={emailDestinatarios}
            onChange={(e) => setEmailDestinatarios(e.target.value)}
            margin="normal"
            placeholder="logistica.deposito.5231@gmail.com, cita@gmail.com"
            helperText="Dejá vacío para usar los emails configurados en el sistema"
          />

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
