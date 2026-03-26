import { useEffect, useRef, useState } from 'react';
import {
  Box, Typography, CircularProgress, Card, CardContent, CardActions,
  Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Alert, Divider, IconButton, Tooltip, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, InputAdornment, Slide, AppBar, Toolbar, Badge,
} from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import React from 'react';
import {
  PictureAsPdf as PdfIcon,
  Print as PrintIcon,
  LocalShipping as EntregarIcon,
  CheckCircle as EntregadoIcon,
  HourglassEmpty as PendienteIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  CameraAlt as CameraIcon,
} from '@mui/icons-material';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../services/api';
import { useNotificationStore } from '../stores/notificationStore';
import { useAuthStore } from '../stores/authStore';
import { resolveFileUrl } from '../utils/fotoUrl';

const ESTADO_LABEL: Record<string, string> = {
  BORRADOR: 'Borrador', CONFIRMADO: 'Confirmado', ENVIADO: 'Enviado',
  ENTREGADO: 'Entregado', PENDIENTE_STOCK: 'Sin stock',
};
const ESTADO_COLOR: Record<string, 'default' | 'warning' | 'success' | 'info' | 'error' | 'secondary'> = {
  BORRADOR: 'default', CONFIRMADO: 'success', ENVIADO: 'info',
  ENTREGADO: 'secondary', PENDIENTE_STOCK: 'error',
};

// Transición slide-up para dialog fullscreen en mobile
const SlideUp = React.forwardRef(function SlideUp(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function DepositoHome() {
  const { user } = useAuthStore();
  const { showNotification } = useNotificationStore();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [pendientes, setPendientes] = useState<any[]>([]);
  const [entregadosHoy, setEntregadosHoy] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  // Diálogo marcar entregado
  const [entregarDialog, setEntregarDialog] = useState(false);
  const [entregarRemito, setEntregarRemito] = useState<any>(null);
  const [entregarNota, setEntregarNota] = useState('');
  const [entregarFoto, setEntregarFoto] = useState<File | null>(null);
  const [entregando, setEntregando] = useState(false);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Historial
  const [tabIndex, setTabIndex] = useState(0);
  const [historial, setHistorial] = useState<any[]>([]);
  const [loadingHist, setLoadingHist] = useState(false);
  const [histFechaDesde, setHistFechaDesde] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [histFechaHasta, setHistFechaHasta] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    loadRemitosDeposito();
    const handler = () => loadRemitosDeposito();
    window.addEventListener('sigam:update', handler);
    return () => window.removeEventListener('sigam:update', handler);
  }, []);

  const loadRemitosDeposito = async () => {
    setLoading(true);
    try {
      const hoy = format(new Date(), 'yyyy-MM-dd');
      const manana = format(new Date(Date.now() + 86400000), 'yyyy-MM-dd');
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
    setFotoPreview(null);
    setEntregarDialog(true);
  };

  const handleFotoChange = (file: File | null) => {
    setEntregarFoto(file);
    if (file && file.type.startsWith('image/')) {
      setFotoPreview(URL.createObjectURL(file));
    } else {
      setFotoPreview(null);
    }
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

  // Filtro de búsqueda
  const filtrar = (lista: any[]) =>
    busqueda.trim()
      ? lista.filter(r =>
          r.beneficiario?.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
          r.numero?.toLowerCase().includes(busqueda.toLowerCase()) ||
          r.caso?.nombreSolicitante?.toLowerCase().includes(busqueda.toLowerCase())
        )
      : lista;

  const pendientesFiltrados = filtrar(pendientes);
  const entregadosFiltrados = filtrar(entregadosHoy);
  const hoyStr = format(new Date(), "EEEE d 'de' MMMM", { locale: es });

  return (
    <Box sx={{ pb: isMobile ? 10 : 3 }}>
      {/* Encabezado */}
      <Box sx={{ bgcolor: 'primary.main', color: 'white', borderRadius: 2, p: { xs: 2, sm: 3 }, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold">
            Buenas, {user?.nombre?.split(' ')[0]} 👋
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.85, textTransform: 'capitalize' }}>
            {hoyStr}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            {user?.rol === 'ASISTENCIA_CRITICA' ? 'Asistencia Crítica · CITA' : (user?.deposito?.nombre || 'Depósito')}
          </Typography>
        </Box>
        <Box textAlign="center">
          <Badge badgeContent={pendientes.length} color="error" max={99}>
            <Box>
              <Typography variant={isMobile ? 'h3' : 'h2'} fontWeight="bold" lineHeight={1}>
                {pendientes.length}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.85 }}>
                pendientes
              </Typography>
            </Box>
          </Badge>
        </Box>
      </Box>

      {/* Buscador */}
      <Box mb={2}>
        <TextField
          fullWidth
          size={isMobile ? 'medium' : 'small'}
          placeholder="Buscar por nombre o N° de remito..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
            endAdornment: busqueda ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setBusqueda('')}><CloseIcon fontSize="small" /></IconButton>
              </InputAdornment>
            ) : null,
          }}
          sx={{ bgcolor: 'background.paper', borderRadius: 1 }}
        />
      </Box>

      {/* Tabs */}
      <Tabs
        value={tabIndex}
        onChange={(_, v) => { setTabIndex(v); if (v === 1 && historial.length === 0) loadHistorial(); }}
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
        variant={isMobile ? 'fullWidth' : 'standard'}
      >
        <Tab label={`📦 Entregar (${pendientes.length})`} sx={{ fontWeight: 'bold' }} />
        <Tab label="📋 Historial" sx={{ fontWeight: 'bold' }} />
      </Tabs>

      {/* TAB PARA ENTREGAR */}
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
            <Box display="flex" justifyContent="center" py={6}><CircularProgress size={48} /></Box>
          ) : pendientesFiltrados.length === 0 && entregadosFiltrados.length === 0 ? (
            <Alert severity="info" sx={{ py: 2 }}>
              {busqueda ? `Sin resultados para "${busqueda}"` : 'No hay remitos pendientes para este depósito.'}
            </Alert>
          ) : (
            <>
              {pendientesFiltrados.length > 0 && (
                <Box mb={3}>
                  <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                    <PendienteIcon color="warning" />
                    <Typography variant="subtitle1" fontWeight="bold" color="warning.dark">
                      Pendientes ({pendientesFiltrados.length})
                    </Typography>
                  </Box>
                  <Box display="flex" flexDirection="column" gap={isMobile ? 1.5 : 2}>
                    {pendientesFiltrados.map((remito) => (
                      <RemitoCard
                        key={remito.id}
                        remito={remito}
                        isMobile={isMobile}
                        onDescargar={handleDescargarPdf}
                        onImprimir={handleImprimir}
                        onEntregar={handleAbrirEntregar}
                      />
                    ))}
                  </Box>
                </Box>
              )}

              {entregadosFiltrados.length > 0 && (
                <Box>
                  <Divider sx={{ mb: 2 }} />
                  <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                    <EntregadoIcon color="success" />
                    <Typography variant="subtitle1" fontWeight="bold" color="success.dark">
                      Ya entregados hoy ({entregadosFiltrados.length})
                    </Typography>
                  </Box>
                  <Box display="flex" flexDirection="column" gap={isMobile ? 1.5 : 2}>
                    {entregadosFiltrados.map((remito) => (
                      <RemitoCard
                        key={remito.id}
                        remito={remito}
                        isMobile={isMobile}
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
          <Box display="flex" gap={1.5} flexWrap="wrap" alignItems="flex-end" mb={2}>
            <TextField
              label="Desde" type="date" size="small" value={histFechaDesde}
              onChange={(e) => setHistFechaDesde(e.target.value)}
              InputLabelProps={{ shrink: true }} sx={{ flex: 1, minWidth: 130 }}
            />
            <TextField
              label="Hasta" type="date" size="small" value={histFechaHasta}
              onChange={(e) => setHistFechaHasta(e.target.value)}
              InputLabelProps={{ shrink: true }} sx={{ flex: 1, minWidth: 130 }}
            />
            <Button variant="outlined" size="small" onClick={loadHistorial} disabled={loadingHist} fullWidth={isMobile}>
              Buscar
            </Button>
          </Box>
          {loadingHist ? (
            <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
          ) : historial.length === 0 ? (
            <Alert severity="info">No hay entregas registradas en ese período.</Alert>
          ) : isMobile ? (
            // Vista mobile del historial: cards en vez de tabla
            <Box display="flex" flexDirection="column" gap={1.5}>
              {historial.map((r) => (
                <Card key={r.id} variant="outlined" sx={{ borderLeft: '3px solid', borderLeftColor: 'success.main' }}>
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                      <Typography variant="body2" fontWeight="bold">{r.numero}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {r.entregadoAt ? format(new Date(r.entregadoAt), 'dd/MM HH:mm', { locale: es }) : '—'}
                      </Typography>
                    </Box>
                    <Typography variant="body2">{r.beneficiario?.nombre}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {r.totalKg?.toFixed(1)} kg · {r.entregadoNota || 'Sin nota'}
                    </Typography>
                    {r.entregadoFoto && (
                      <Box mt={0.5}>
                        <a href={resolveFileUrl(r.entregadoFoto)} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem' }}>
                          📷 Ver foto firmada
                        </a>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Box>
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
                        {r.entregadoAt ? format(new Date(r.entregadoAt), 'dd/MM/yyyy HH:mm', { locale: es }) : '—'}
                      </TableCell>
                      <TableCell>{r.beneficiario?.nombre}</TableCell>
                      <TableCell align="right">{r.totalKg?.toFixed(2)}</TableCell>
                      <TableCell sx={{ maxWidth: 180 }}>
                        <Typography variant="caption">{r.entregadoNota || '—'}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        {r.entregadoFoto
                          ? <a href={resolveFileUrl(r.entregadoFoto)} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem' }}>📷 Ver</a>
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* Diálogo: Marcar Entregado — fullScreen en mobile */}
      <Dialog
        open={entregarDialog}
        onClose={() => !entregando && setEntregarDialog(false)}
        fullScreen={isMobile}
        maxWidth="sm"
        fullWidth={!isMobile}
        TransitionComponent={isMobile ? SlideUp : undefined}
      >
        {isMobile ? (
          <AppBar sx={{ position: 'relative' }} color="success">
            <Toolbar>
              <IconButton color="inherit" onClick={() => !entregando && setEntregarDialog(false)} edge="start">
                <CloseIcon />
              </IconButton>
              <Typography variant="h6" sx={{ flex: 1, ml: 1 }}>Registrar Entrega</Typography>
            </Toolbar>
          </AppBar>
        ) : (
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EntregarIcon color="success" />
            Registrar Entrega
          </DialogTitle>
        )}

        <DialogContent sx={{ pt: isMobile ? 2 : undefined }}>
          {entregarRemito && (
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight="bold">{entregarRemito.numero}</Typography>
              <Typography variant="body2">
                {entregarRemito.caso?.nombreSolicitante ?? entregarRemito.beneficiario?.nombre}
              </Typography>
              <Typography variant="caption">
                {entregarRemito.totalKg?.toFixed(1)} kg
                {entregarRemito.programa ? ` · ${entregarRemito.programa.nombre}` : ''}
              </Typography>
            </Alert>
          )}

          <TextField
            fullWidth
            multiline
            rows={isMobile ? 2 : 3}
            label="¿Quién retiró? (opcional)"
            value={entregarNota}
            onChange={(e) => setEntregarNota(e.target.value)}
            margin="normal"
            placeholder="Ej: Retiró Ana Martínez - DNI 28.444.555"
            autoFocus={!isMobile}
            inputProps={{ style: { fontSize: isMobile ? '16px' : undefined } }}
          />

          {/* Botón de cámara — grande en mobile */}
          <input
            ref={fileInputRef}
            type="file"
            hidden
            accept="image/*,application/pdf"
            capture="environment"
            onChange={(e) => handleFotoChange(e.target.files?.[0] || null)}
          />
          <Button
            variant={entregarFoto ? 'contained' : 'outlined'}
            color={entregarFoto ? 'success' : 'primary'}
            fullWidth
            size="large"
            startIcon={<CameraIcon />}
            onClick={() => fileInputRef.current?.click()}
            sx={{ mt: 2, py: isMobile ? 2 : 1.5, fontSize: isMobile ? '1rem' : undefined }}
          >
            {entregarFoto ? `✓ Foto lista — ${entregarFoto.name.slice(0, 25)}` : '📷 Sacar foto del remito firmado'}
          </Button>

          {fotoPreview && (
            <Box mt={2} textAlign="center" position="relative">
              <img
                src={fotoPreview}
                alt="Vista previa"
                style={{ maxWidth: '100%', maxHeight: isMobile ? 300 : 220, borderRadius: 8, border: '3px solid #4caf50', cursor: 'pointer' }}
                onClick={() => window.open(fotoPreview, '_blank')}
              />
              <IconButton
                size="small"
                color="error"
                sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'white' }}
                onClick={() => { setEntregarFoto(null); setFotoPreview(null); }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
              <Typography variant="caption" color="text.secondary" display="block">Toca para ampliar · X para eliminar</Typography>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: isMobile ? 2 : undefined, flexDirection: isMobile ? 'column' : 'row', gap: 1 }}>
          {!isMobile && (
            <Button onClick={() => setEntregarDialog(false)} disabled={entregando}>Cancelar</Button>
          )}
          <Button
            variant="contained"
            color="success"
            size="large"
            fullWidth
            startIcon={entregando ? <CircularProgress size={20} color="inherit" /> : <EntregarIcon />}
            onClick={handleConfirmarEntrega}
            disabled={entregando}
            sx={{ py: isMobile ? 2 : undefined, fontSize: isMobile ? '1.1rem' : undefined }}
          >
            {entregando ? 'Guardando...' : 'Confirmar Entrega'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ─── Tarjeta de remito ────────────────────────────────────────────────────────

function RemitoCard({ remito, isMobile, onDescargar, onImprimir, onEntregar }: {
  remito: any; isMobile: boolean;
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
        opacity: yaEntregado ? 0.8 : 1,
      }}
    >
      <CardContent sx={{ pb: 1 }}>
        {/* Número y estado */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
          <Typography variant={isMobile ? 'h6' : 'h6'} fontWeight="bold">{remito.numero}</Typography>
          <Box display="flex" gap={0.5} alignItems="center" flexWrap="wrap" justifyContent="flex-end">
            {remito.secretaria === 'AC' && (
              <Chip label="CITA" color="warning" size="small" variant="outlined" />
            )}
            <Chip label={ESTADO_LABEL[remito.estado] ?? remito.estado} color={ESTADO_COLOR[remito.estado] ?? 'default'} size="small" />
          </Box>
        </Box>

        {/* Beneficiario */}
        <Typography variant={isMobile ? 'body1' : 'body1'} fontWeight="medium">
          {remito.caso?.nombreSolicitante ?? remito.beneficiario?.nombre}
        </Typography>
        {remito.programa && (
          <Typography variant="body2" color="text.secondary">{remito.programa.nombre}</Typography>
        )}

        {/* Fecha y hora de retiro */}
        <Box display="flex" alignItems="center" gap={1} mt={0.5}>
          <Typography variant="body2" fontWeight="medium" color="primary.main">
            📅 {remito.fecha ? format(new Date(remito.fecha), "dd/MM/yyyy", { locale: es }) : '—'}
            {remito.horaRetiro && <> &nbsp;·&nbsp; ⏰ {remito.horaRetiro} hs</>}
          </Typography>
        </Box>

        {/* Resumen artículos */}
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          <strong>{remito.totalKg?.toFixed(1)} kg</strong>
          {' · '}{remito.items?.length ?? 0} artículo{remito.items?.length !== 1 ? 's' : ''}
        </Typography>

        {remito.items && remito.items.length > 0 && (
          <Box mt={1} p={1} bgcolor="grey.50" borderRadius={1}>
            {remito.items.slice(0, isMobile ? 3 : 5).map((item: any) => (
              <Box key={item.id} display="flex" justifyContent="space-between">
                <Typography variant="caption">{item.articulo?.descripcion || item.articulo?.nombre}</Typography>
                <Typography variant="caption" fontWeight="bold">×{item.cantidad}</Typography>
              </Box>
            ))}
            {remito.items.length > (isMobile ? 3 : 5) && (
              <Typography variant="caption" color="text.secondary">
                +{remito.items.length - (isMobile ? 3 : 5)} más...
              </Typography>
            )}
          </Box>
        )}

        {yaEntregado && remito.entregadoNota && (
          <Alert severity="success" sx={{ mt: 1, py: 0.5 }}>
            <Typography variant="caption">{remito.entregadoNota}</Typography>
          </Alert>
        )}
        {yaEntregado && remito.entregadoFoto && (
          <Box mt={0.5}>
            <a href={resolveFileUrl(remito.entregadoFoto)} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem' }}>
              📎 Ver foto firmada
            </a>
          </Box>
        )}
      </CardContent>

      <CardActions sx={{ pt: 0, gap: 1, flexWrap: 'wrap', px: isMobile ? 2 : 1 }}>
        {!yaEntregado && remito.estado !== 'BORRADOR' && isMobile ? (
          // Mobile: botón ENTREGAR grande y prominente
          <Button
            variant="contained"
            color="success"
            fullWidth
            size="large"
            startIcon={<EntregarIcon />}
            onClick={() => onEntregar(remito)}
            sx={{ py: 1.5, fontSize: '1rem', fontWeight: 'bold' }}
          >
            MARCAR ENTREGADO
          </Button>
        ) : (
          <>
            <Button size="small" variant="outlined" startIcon={<PdfIcon />} onClick={() => onDescargar(remito)}>PDF</Button>
            <Button size="small" variant="outlined" startIcon={<PrintIcon />} onClick={() => onImprimir(remito)}>Imprimir</Button>
            {!yaEntregado && remito.estado !== 'BORRADOR' && (
              <Button
                size="small" variant="contained" color="success"
                startIcon={<EntregarIcon />}
                onClick={() => onEntregar(remito)}
                sx={{ ml: 'auto' }}
              >
                Marcar entregado
              </Button>
            )}
          </>
        )}
        {yaEntregado && (
          <Chip
            icon={<EntregadoIcon />}
            label={remito.entregadoAt ? `Entregado ${format(new Date(remito.entregadoAt), 'HH:mm')}` : 'Entregado'}
            color="success" variant="outlined" size="small"
            sx={{ ml: isMobile ? 0 : 'auto', width: isMobile ? '100%' : undefined }}
          />
        )}
        {isMobile && !yaEntregado && (
          <Box display="flex" gap={1} width="100%">
            <Button size="small" variant="outlined" startIcon={<PdfIcon />} onClick={() => onDescargar(remito)} sx={{ flex: 1 }}>PDF</Button>
            <Button size="small" variant="outlined" startIcon={<PrintIcon />} onClick={() => onImprimir(remito)} sx={{ flex: 1 }}>Imprimir</Button>
          </Box>
        )}
      </CardActions>
    </Card>
  );
}
