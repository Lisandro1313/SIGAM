import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Divider,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  PictureAsPdf as PdfIcon,
  Print as PrintIcon,
  LocalShipping as EntregarIcon,
  PhotoCamera as FotoIcon,
  CheckCircle as EntregadoIcon,
  HourglassEmpty as PendienteIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../services/api';
import { useNotificationStore } from '../stores/notificationStore';
import { useAuthStore } from '../stores/authStore';
import { resolveFileUrl } from '../utils/fotoUrl';

const ESTADO_LABEL: Record<string, string> = {
  BORRADOR: 'Borrador',
  CONFIRMADO: 'Confirmado',
  ENVIADO: 'Enviado',
  ENTREGADO: 'Entregado',
  PENDIENTE_STOCK: 'Sin stock',
};

const ESTADO_COLOR: Record<string, 'default' | 'warning' | 'success' | 'info' | 'error' | 'secondary'> = {
  BORRADOR: 'default',
  CONFIRMADO: 'success',
  ENVIADO: 'info',
  ENTREGADO: 'secondary',
  PENDIENTE_STOCK: 'error',
};

export default function DepositoHome() {
  const { user } = useAuthStore();
  const { showNotification } = useNotificationStore();

  const [pendientes, setPendientes] = useState<any[]>([]);
  const [entregadosHoy, setEntregadosHoy] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Diálogo marcar entregado
  const [entregarDialog, setEntregarDialog] = useState(false);
  const [entregarRemito, setEntregarRemito] = useState<any>(null);
  const [entregarNota, setEntregarNota] = useState('');
  const [entregarFoto, setEntregarFoto] = useState<File | null>(null);
  const [entregando, setEntregando] = useState(false);

  // Historial
  const [tabIndex, setTabIndex] = useState(0);
  const [historial, setHistorial] = useState<any[]>([]);
  const [loadingHist, setLoadingHist] = useState(false);
  const [histFechaDesde, setHistFechaDesde] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [histFechaHasta, setHistFechaHasta] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    loadRemitosDeposito();
  }, []);

  const loadRemitosDeposito = async () => {
    setLoading(true);
    try {
      const hoy = format(new Date(), 'yyyy-MM-dd');
      const manana = format(new Date(Date.now() + 86400000), 'yyyy-MM-dd');
      // Cargar en paralelo: pendientes (sin filtro de fecha) + entregados hoy
      const [pendientesRes, entregadosRes] = await Promise.all([
        api.get('/remitos', { params: { estado: 'CONFIRMADO,ENVIADO' } }),
        api.get('/remitos', { params: { estado: 'ENTREGADO', entregadoDesde: hoy, entregadoHasta: manana } }),
      ]);
      setPendientes(pendientesRes.data);
      setEntregadosHoy(entregadosRes.data);
    } catch {
      showNotification('Error al cargar remitos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadHistorial = async () => {
    setLoadingHist(true);
    try {
      const res = await api.get('/remitos', {
        // Filtra por fecha de entrega real (entregadoAt), no por fecha de creación
        params: { estado: 'ENTREGADO', entregadoDesde: histFechaDesde, entregadoHasta: histFechaHasta },
      });
      setHistorial(res.data);
    } catch {
      showNotification('Error al cargar historial', 'error');
    } finally {
      setLoadingHist(false);
    }
  };

  const handleDescargarPdf = async (remito: any) => {
    try {
      const response = await api.get(`/remitos/${remito.id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${(remito.beneficiario?.nombre || `remito-${remito.id}`).toUpperCase().replace(/\s+/g, '_')}.pdf`;
      link.click();
    } catch {
      showNotification('Error al descargar PDF', 'error');
    }
  };

  const handleImprimir = async (remito: any) => {
    try {
      const response = await api.get(`/remitos/${remito.id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = url;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 3000);
      };
    } catch {
      showNotification('Error al imprimir', 'error');
    }
  };

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
      showNotification('✓ Remito marcado como entregado', 'success');
      setEntregarDialog(false);
      loadRemitosDeposito();
    } catch (error: any) {
      showNotification(error.response?.data?.message || 'Error al registrar entrega', 'error');
    } finally {
      setEntregando(false);
    }
  };

  const hoyStr = format(new Date(), "EEEE d 'de' MMMM", { locale: es });

  return (
    <Box>
      {/* Encabezado */}
      <Box
        sx={{
          bgcolor: 'primary.main',
          color: 'white',
          borderRadius: 2,
          p: 3,
          mb: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight="bold">
            Buenas, {user?.nombre?.split(' ')[0]} 👋
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.85, textTransform: 'capitalize' }}>
            {hoyStr}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.7, mt: 0.5 }}>
            {user?.rol === 'ASISTENCIA_CRITICA' ? 'Secretaría de Asistencia Crítica · CITA' : (user?.deposito?.nombre || 'Depósito')}
          </Typography>
        </Box>
        <Box textAlign="center">
          <Typography variant="h2" fontWeight="bold" lineHeight={1}>
            {pendientes.length}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.85 }}>
            remitos pendientes
          </Typography>
        </Box>
      </Box>

      {/* Tabs: Hoy / Historial */}
      <Tabs
        value={tabIndex}
        onChange={(_, v) => { setTabIndex(v); if (v === 1 && historial.length === 0) loadHistorial(); }}
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="� Para Entregar" />
        <Tab label="📋 Historial de Entregas" />
      </Tabs>

      {/* TAB HOY */}
      {tabIndex === 0 && (
        <>
          <Box display="flex" justifyContent="flex-end" mb={1}>
            <Tooltip title="Actualizar">
              <IconButton onClick={loadRemitosDeposito} color="primary" size="small">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
          {loading ? (
            <Box display="flex" justifyContent="center" py={6}>
              <CircularProgress />
            </Box>
          ) : pendientes.length === 0 && entregadosHoy.length === 0 ? (
            <Alert severity="info" sx={{ py: 3 }}>
              <Typography variant="body1">No hay remitos pendientes para este depósito.</Typography>
            </Alert>
          ) : (
            <>
              {/* Pendientes primero */}
              {pendientes.length > 0 && (
                <Box mb={3}>
                  <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                    <PendienteIcon color="warning" />
                    <Typography variant="subtitle1" fontWeight="bold" color="warning.dark">
                      Pendientes de entrega ({pendientes.length})
                    </Typography>
                  </Box>
                  <Box display="flex" flexDirection="column" gap={2}>
                    {pendientes.map((remito) => (
                      <RemitoCard
                        key={remito.id}
                        remito={remito}
                        onDescargar={handleDescargarPdf}
                        onImprimir={handleImprimir}
                        onEntregar={handleAbrirEntregar}
                      />
                    ))}
                  </Box>
                </Box>
              )}
              {/* Entregados al final */}
              {entregadosHoy.length > 0 && (
                <Box>
                  <Divider sx={{ mb: 2 }} />
                  <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                    <EntregadoIcon color="success" />
                    <Typography variant="subtitle1" fontWeight="bold" color="success.dark">
                      Ya entregados hoy ({entregadosHoy.length})
                    </Typography>
                  </Box>
                  <Box display="flex" flexDirection="column" gap={2}>
                    {entregadosHoy.map((remito) => (
                      <RemitoCard
                        key={remito.id}
                        remito={remito}
                        onDescargar={handleDescargarPdf}
                        onImprimir={handleImprimir}
                        onEntregar={handleAbrirEntregar}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </>
          )}
        </>
      )}

      {/* TAB HISTORIAL */}
      {tabIndex === 1 && (
        <Box>
          <Box display="flex" gap={2} flexWrap="wrap" alignItems="flex-end" mb={2}>
            <TextField
              label="Desde"
              type="date"
              size="small"
              value={histFechaDesde}
              onChange={(e) => setHistFechaDesde(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 150 }}
            />
            <TextField
              label="Hasta"
              type="date"
              size="small"
              value={histFechaHasta}
              onChange={(e) => setHistFechaHasta(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 150 }}
            />
            <Button variant="outlined" size="small" onClick={loadHistorial} disabled={loadingHist}>
              Buscar
            </Button>
          </Box>
          {loadingHist ? (
            <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
          ) : historial.length === 0 ? (
            <Alert severity="info">No hay entregas registradas en ese período.</Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell>N° Remito</TableCell>
                    <TableCell>Fecha Entrega</TableCell>
                    <TableCell>Beneficiario</TableCell>
                    <TableCell align="right">Kg</TableCell>
                    <TableCell>¿Quién retiró?</TableCell>
                    <TableCell align="center">Foto</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {historial.map((r) => (
                    <TableRow key={r.id} hover>
                      <TableCell><strong>{r.numero}</strong></TableCell>
                      <TableCell>
                        {r.entregadoAt
                          ? format(new Date(r.entregadoAt), 'dd/MM/yyyy HH:mm', { locale: es })
                          : '—'}
                      </TableCell>
                      <TableCell>{r.beneficiario?.nombre}</TableCell>
                      <TableCell align="right">{r.totalKg?.toFixed(2)}</TableCell>
                      <TableCell sx={{ maxWidth: 180 }}>
                        <Typography variant="caption">{r.entregadoNota || '—'}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        {r.entregadoFoto ? (
                          <a
                            href={resolveFileUrl(r.entregadoFoto)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: '0.8rem' }}
                          >
                            📷 Ver
                          </a>
                        ) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

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
            label="¿Quién retiró? (opcional)"
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
              size="large"
              sx={{ py: 1.5 }}
            >
              {entregarFoto ? `✓ ${entregarFoto.name}` : '📷 Subir foto del remito firmado'}
              <input
                type="file"
                hidden
                accept="image/*,application/pdf"
                capture="environment"
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
                style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 8, border: '2px solid #4caf50' }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setEntregarDialog(false)} disabled={entregando} size="large">
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="success"
            size="large"
            fullWidth
            startIcon={entregando ? <CircularProgress size={20} color="inherit" /> : <EntregarIcon />}
            onClick={handleConfirmarEntrega}
            disabled={entregando}
          >
            Confirmar Entrega
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ─── Tarjeta de remito ───────────────────────────────────────────────────────

function RemitoCard({
  remito,
  onDescargar,
  onImprimir,
  onEntregar,
}: {
  remito: any;
  onDescargar: (r: any) => void;
  onImprimir: (r: any) => void;
  onEntregar: (r: any) => void;
}) {
  const yaEntregado = remito.estado === 'ENTREGADO';

  return (
    <Card
      variant="outlined"
      sx={{
        borderLeft: '4px solid',
        borderLeftColor: yaEntregado ? 'success.main' : 'primary.main',
        opacity: yaEntregado ? 0.75 : 1,
      }}
    >
      <CardContent sx={{ pb: 1 }}>
        {/* Número y estado */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
          <Typography variant="h6" fontWeight="bold">
            {remito.numero}
          </Typography>
          <Box display="flex" gap={0.5} alignItems="center">
            <Chip
              label={remito.secretaria === 'CITA' ? 'Asistencia Crítica' : 'Pol. Alimentaria'}
              color={remito.secretaria === 'CITA' ? 'warning' : 'primary'}
              size="small"
              variant="outlined"
            />
            <Chip
              label={ESTADO_LABEL[remito.estado] ?? remito.estado}
              color={ESTADO_COLOR[remito.estado] ?? 'default'}
              size="small"
            />
          </Box>
        </Box>

        {/* Beneficiario y programa */}
        <Typography variant="body1" fontWeight="medium">
          {remito.beneficiario?.nombre}
        </Typography>
        {remito.programa && (
          <Typography variant="body2" color="text.secondary">
            Programa: {remito.programa.nombre}
          </Typography>
        )}

        {/* Total kg */}
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          Total: <strong>{remito.totalKg?.toFixed(2)} kg</strong>
          {' · '}
          {remito.items?.length ?? 0} artículo{remito.items?.length !== 1 ? 's' : ''}
        </Typography>

        {/* Ítems resumidos */}
        {remito.items && remito.items.length > 0 && (
          <Box
            mt={1}
            p={1}
            bgcolor="grey.50"
            borderRadius={1}
            sx={{ fontSize: '0.8rem' }}
          >
            {remito.items.slice(0, 5).map((item: any) => (
              <Box key={item.id} display="flex" justifyContent="space-between">
                <Typography variant="caption">
                  {item.articulo?.descripcion || item.articulo?.nombre}
                </Typography>
                <Typography variant="caption" fontWeight="bold">
                  x{item.cantidad}
                </Typography>
              </Box>
            ))}
            {remito.items.length > 5 && (
              <Typography variant="caption" color="text.secondary">
                +{remito.items.length - 5} más...
              </Typography>
            )}
          </Box>
        )}

        {/* Info de entrega si ya fue entregado */}
        {yaEntregado && remito.entregadoNota && (
          <Alert severity="success" sx={{ mt: 1, py: 0.5 }}>
            <Typography variant="caption">{remito.entregadoNota}</Typography>
          </Alert>
        )}
        {yaEntregado && remito.entregadoFoto && (
          <Box mt={0.5}>
            <a
              href={resolveFileUrl(remito.entregadoFoto)}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '0.8rem' }}
            >
              📎 Ver foto firmada
            </a>
          </Box>
        )}
      </CardContent>

      <CardActions sx={{ pt: 0, gap: 1, flexWrap: 'wrap' }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<PdfIcon />}
          onClick={() => onDescargar(remito)}
        >
          PDF
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<PrintIcon />}
          onClick={() => onImprimir(remito)}
        >
          Imprimir
        </Button>
        {!yaEntregado && remito.estado !== 'BORRADOR' && (
          <Button
            size="small"
            variant="contained"
            color="success"
            startIcon={<EntregarIcon />}
            onClick={() => onEntregar(remito)}
            sx={{ ml: 'auto' }}
          >
            Marcar entregado
          </Button>
        )}
        {yaEntregado && (
          <Chip
            icon={<EntregadoIcon />}
            label={remito.entregadoAt
              ? `Entregado ${format(new Date(remito.entregadoAt), 'HH:mm')}`
              : 'Entregado'}
            color="success"
            variant="outlined"
            size="small"
            sx={{ ml: 'auto' }}
          />
        )}
      </CardActions>
    </Card>
  );
}
