import { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, CircularProgress, Card, CardContent, CardActions,
  Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Alert, Divider, Tabs, Tab, Paper, IconButton, Tooltip,
  Slide, AppBar, Toolbar,
} from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import React from 'react';
import {
  LocalShipping as EntregarIcon,
  CheckCircle as EntregadoIcon,
  HourglassEmpty as PendienteIcon,
  Refresh as RefreshIcon,
  Warehouse as RetiroIcon,
  Draw as FirmaIcon,
  Phone as PhoneIcon,
  Place as UbicacionIcon,
  Inventory as ItemsIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../services/api';
import { useNotificationStore } from '../stores/notificationStore';
import { useAuthStore } from '../stores/authStore';
import FirmaDigital from '../components/FirmaDigital';

const ESTADO_COLOR: Record<string, 'warning' | 'success' | 'info' | 'default'> = {
  CONFIRMADO: 'warning',
  ENVIADO: 'warning',
  ENTREGADO: 'success',
};

// Slide-up para dialog fullscreen mobile
const SlideUp = React.forwardRef(function SlideUp(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function ChoferHome() {
  const { user } = useAuthStore();
  const { showNotification } = useNotificationStore();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [remitos, setRemitos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0); // 0=pendientes, 1=entregados

  // Retiro de deposito
  const [retiroDialog, setRetiroDialog] = useState(false);
  const [retiroRemito, setRetiroRemito] = useState<any>(null);
  const [retiroNota, setRetiroNota] = useState('');
  const [retirando, setRetirando] = useState(false);

  // Firma de entrega
  const [firmaDialog, setFirmaDialog] = useState(false);
  const [firmaRemito, setFirmaRemito] = useState<any>(null);
  const [firmaNombre, setFirmaNombre] = useState('');
  const [firmaDni, setFirmaDni] = useState('');
  const [firmaData, setFirmaData] = useState('');
  const [firmaNota, setFirmaNota] = useState('');
  const [firmando, setFirmando] = useState(false);

  // Detalle del remito
  const [detalleRemito, setDetalleRemito] = useState<any>(null);

  const loadRemitos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/remitos/mis-entregas');
      setRemitos(res.data);
      // Cache para offline
      try { localStorage.setItem('sigam_chofer_remitos', JSON.stringify(res.data)); } catch { /* */ }
    } catch {
      // Intentar cargar desde cache offline
      try {
        const cached = localStorage.getItem('sigam_chofer_remitos');
        if (cached) {
          setRemitos(JSON.parse(cached));
          showNotification('Sin conexion - mostrando datos guardados', 'warning');
        }
      } catch { /* */ }
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => { loadRemitos(); }, [loadRemitos]);

  // Escuchar actualizaciones SSE
  useEffect(() => {
    const handler = () => loadRemitos();
    window.addEventListener('sigam:update', handler);
    return () => window.removeEventListener('sigam:update', handler);
  }, [loadRemitos]);

  const pendientes = remitos.filter(r => r.estado !== 'ENTREGADO');
  const entregados = remitos.filter(r => r.estado === 'ENTREGADO');
  const sinRetirar = pendientes.filter(r => !r.retiroDepositoAt);
  const retirados = pendientes.filter(r => r.retiroDepositoAt);

  // ── Retiro del deposito ──
  const handleRetiro = async () => {
    if (!retiroRemito) return;
    setRetirando(true);
    try {
      await api.post(`/remitos/${retiroRemito.id}/retiro-deposito`, {
        nota: retiroNota.trim() || undefined,
      });
      showNotification('Retiro del deposito registrado', 'success');
      setRetiroDialog(false);
      loadRemitos();
    } catch (e: any) {
      showNotification(e.response?.data?.message || 'Error al registrar retiro', 'error');
    } finally {
      setRetirando(false);
    }
  };

  // ── Firma de entrega a domicilio ──
  const handleFirmaEntrega = async () => {
    if (!firmaRemito || !firmaNombre.trim() || !firmaDni.trim() || !firmaData) return;
    setFirmando(true);
    try {
      await api.post(`/remitos/${firmaRemito.id}/firma-entrega`, {
        nombreDestinatario: firmaNombre.trim(),
        dniDestinatario: firmaDni.trim(),
        firmaDestinatario: firmaData,
        nota: firmaNota.trim() || undefined,
      });
      showNotification('Entrega registrada con firma digital', 'success');
      setFirmaDialog(false);
      loadRemitos();
    } catch (e: any) {
      showNotification(e.response?.data?.message || 'Error al registrar entrega', 'error');
    } finally {
      setFirmando(false);
    }
  };

  const abrirRetiro = (remito: any) => {
    setRetiroRemito(remito);
    setRetiroNota('');
    setRetiroDialog(true);
  };

  const abrirFirma = (remito: any) => {
    setFirmaRemito(remito);
    setFirmaNombre('');
    setFirmaDni('');
    setFirmaData('');
    setFirmaNota('');
    setFirmaDialog(true);
  };

  const hoyStr = format(new Date(), "EEEE d 'de' MMMM", { locale: es });

  return (
    <Box sx={{ pb: isMobile ? 10 : 3 }}>
      {/* Encabezado */}
      <Box sx={{
        bgcolor: '#e65100', color: 'white', borderRadius: 2,
        p: { xs: 2, sm: 3 }, mb: 2,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <Box>
          <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold">
            Mis Entregas
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.85 }}>
            {hoyStr} | {user?.nombre}
          </Typography>
        </Box>
        <Tooltip title="Actualizar">
          <IconButton color="inherit" onClick={loadRemitos} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Resumen */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
        <Paper sx={{ px: 2, py: 1, flex: 1, minWidth: 100, textAlign: 'center', borderLeft: '3px solid #fb8c00' }}>
          <Typography variant="h5" fontWeight="bold" color="warning.main">{sinRetirar.length}</Typography>
          <Typography variant="caption" color="text.secondary">Por retirar</Typography>
        </Paper>
        <Paper sx={{ px: 2, py: 1, flex: 1, minWidth: 100, textAlign: 'center', borderLeft: '3px solid #1e88e5' }}>
          <Typography variant="h5" fontWeight="bold" color="primary.main">{retirados.length}</Typography>
          <Typography variant="caption" color="text.secondary">En camino</Typography>
        </Paper>
        <Paper sx={{ px: 2, py: 1, flex: 1, minWidth: 100, textAlign: 'center', borderLeft: '3px solid #43a047' }}>
          <Typography variant="h5" fontWeight="bold" color="success.main">{entregados.length}</Typography>
          <Typography variant="caption" color="text.secondary">Entregados</Typography>
        </Paper>
      </Box>

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={`Pendientes (${pendientes.length})`} />
        <Tab label={`Entregados (${entregados.length})`} />
      </Tabs>

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
      ) : (
        <>
          {/* ── Pendientes ── */}
          {tab === 0 && (
            pendientes.length === 0 ? (
              <Alert severity="info">No tenes entregas asignadas.</Alert>
            ) : (
              pendientes.map(remito => (
                <RemitoCard
                  key={remito.id}
                  remito={remito}
                  isMobile={isMobile}
                  onRetiro={() => abrirRetiro(remito)}
                  onFirma={() => abrirFirma(remito)}
                  onDetalle={() => setDetalleRemito(remito)}
                />
              ))
            )
          )}

          {/* ── Entregados ── */}
          {tab === 1 && (
            entregados.length === 0 ? (
              <Alert severity="info">No tenes entregas completadas.</Alert>
            ) : (
              entregados.map(remito => (
                <RemitoCard
                  key={remito.id}
                  remito={remito}
                  isMobile={isMobile}
                  onDetalle={() => setDetalleRemito(remito)}
                />
              ))
            )
          )}
        </>
      )}

      {/* ── Dialog: Retiro del deposito ── */}
      <Dialog
        open={retiroDialog}
        onClose={() => setRetiroDialog(false)}
        maxWidth="xs" fullWidth
        fullScreen={isMobile}
        TransitionComponent={isMobile ? SlideUp : undefined}
      >
        {isMobile && (
          <AppBar sx={{ position: 'relative', bgcolor: '#e65100' }}>
            <Toolbar>
              <IconButton color="inherit" onClick={() => setRetiroDialog(false)}><CloseIcon /></IconButton>
              <Typography variant="h6" sx={{ flex: 1, ml: 1 }}>Retiro del Deposito</Typography>
            </Toolbar>
          </AppBar>
        )}
        {!isMobile && (
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <RetiroIcon color="warning" />
            Registrar Retiro del Deposito
          </DialogTitle>
        )}
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          {retiroRemito && (
            <Alert severity="info" sx={{ py: 0.5 }}>
              <strong>{retiroRemito.numero}</strong> — {retiroRemito.beneficiario?.nombre}
              <Typography variant="caption" display="block">
                Deposito: {retiroRemito.deposito?.nombre}
              </Typography>
            </Alert>
          )}
          <Typography variant="body2" color="text.secondary">
            Al registrar el retiro, confirmas que recibiste la mercaderia del deposito para llevarla al domicilio.
          </Typography>
          <TextField
            label="Observaciones (opcional)"
            value={retiroNota}
            onChange={e => setRetiroNota(e.target.value)}
            multiline rows={2}
            fullWidth
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRetiroDialog(false)} disabled={retirando}>Cancelar</Button>
          <Button
            variant="contained"
            sx={{ bgcolor: '#e65100', '&:hover': { bgcolor: '#bf360c' } }}
            startIcon={retirando ? <CircularProgress size={16} /> : <RetiroIcon />}
            onClick={handleRetiro}
            disabled={retirando}
            size="large"
          >
            Confirmar retiro
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog: Firma de entrega ── */}
      <Dialog
        open={firmaDialog}
        onClose={() => setFirmaDialog(false)}
        maxWidth="sm" fullWidth
        fullScreen={isMobile}
        TransitionComponent={isMobile ? SlideUp : undefined}
      >
        {isMobile && (
          <AppBar sx={{ position: 'relative', bgcolor: '#2e7d32' }}>
            <Toolbar>
              <IconButton color="inherit" onClick={() => setFirmaDialog(false)}><CloseIcon /></IconButton>
              <Typography variant="h6" sx={{ flex: 1, ml: 1 }}>Registrar Entrega</Typography>
            </Toolbar>
          </AppBar>
        )}
        {!isMobile && (
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FirmaIcon color="success" />
            Registrar Entrega a Domicilio
          </DialogTitle>
        )}
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          {firmaRemito && (
            <Alert severity="info" sx={{ py: 0.5 }}>
              <strong>{firmaRemito.numero}</strong> — {firmaRemito.beneficiario?.nombre}
              {firmaRemito.beneficiario?.direccion && (
                <Typography variant="caption" display="block">
                  {firmaRemito.beneficiario.direccion}
                  {firmaRemito.beneficiario.localidad && `, ${firmaRemito.beneficiario.localidad}`}
                </Typography>
              )}
            </Alert>
          )}

          <Divider>Datos de quien recibe</Divider>

          <TextField
            label="Nombre y Apellido *"
            value={firmaNombre}
            onChange={e => setFirmaNombre(e.target.value)}
            fullWidth
            autoFocus={!isMobile}
          />
          <TextField
            label="DNI *"
            value={firmaDni}
            onChange={e => setFirmaDni(e.target.value)}
            fullWidth
            inputProps={{ inputMode: 'numeric' }}
          />

          <Divider>Firma del destinatario</Divider>

          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <FirmaDigital
              onFirma={setFirmaData}
              width={isMobile ? Math.min(window.innerWidth - 48, 340) : 340}
              height={isMobile ? 200 : 180}
            />
          </Box>

          <TextField
            label="Observaciones (opcional)"
            value={firmaNota}
            onChange={e => setFirmaNota(e.target.value)}
            multiline rows={2}
            fullWidth
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setFirmaDialog(false)} disabled={firmando}>Cancelar</Button>
          <Button
            variant="contained" color="success" size="large"
            startIcon={firmando ? <CircularProgress size={16} /> : <FirmaIcon />}
            onClick={handleFirmaEntrega}
            disabled={firmando || !firmaNombre.trim() || !firmaDni.trim() || !firmaData}
          >
            Confirmar entrega
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog: Detalle del remito ── */}
      <Dialog
        open={!!detalleRemito}
        onClose={() => setDetalleRemito(null)}
        maxWidth="sm" fullWidth
        fullScreen={isMobile}
        TransitionComponent={isMobile ? SlideUp : undefined}
      >
        {isMobile && (
          <AppBar sx={{ position: 'relative' }}>
            <Toolbar>
              <IconButton color="inherit" onClick={() => setDetalleRemito(null)}><CloseIcon /></IconButton>
              <Typography variant="h6" sx={{ flex: 1, ml: 1 }}>Detalle Remito</Typography>
            </Toolbar>
          </AppBar>
        )}
        {!isMobile && (
          <DialogTitle>Detalle del Remito</DialogTitle>
        )}
        <DialogContent>
          {detalleRemito && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
              <Typography variant="h6" fontWeight="bold">{detalleRemito.numero}</Typography>
              <Divider />
              <Typography variant="body2">
                <strong>Beneficiario:</strong> {detalleRemito.beneficiario?.nombre}
              </Typography>
              {detalleRemito.beneficiario?.direccion && (
                <Typography variant="body2">
                  <strong>Direccion:</strong> {detalleRemito.beneficiario.direccion}
                  {detalleRemito.beneficiario.localidad && `, ${detalleRemito.beneficiario.localidad}`}
                </Typography>
              )}
              {detalleRemito.beneficiario?.telefono && (
                <Typography variant="body2">
                  <strong>Telefono:</strong> {detalleRemito.beneficiario.telefono}
                </Typography>
              )}
              <Typography variant="body2">
                <strong>Deposito:</strong> {detalleRemito.deposito?.nombre}
              </Typography>
              <Typography variant="body2">
                <strong>Fecha:</strong> {format(new Date(detalleRemito.fecha), 'dd/MM/yyyy HH:mm', { locale: es })}
              </Typography>
              <Divider>Articulos</Divider>
              {detalleRemito.items?.map((item: any) => (
                <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', px: 1 }}>
                  <Typography variant="body2">{item.articulo?.nombre}</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {item.cantidad} u. {item.pesoKg ? `(${item.pesoKg.toFixed(1)} kg)` : ''}
                  </Typography>
                </Box>
              ))}
              <Divider />
              <Typography variant="body2" fontWeight="bold">
                Total: {detalleRemito.totalKg?.toFixed(1)} kg
              </Typography>
              {detalleRemito.firmaDestinatarioAt && (
                <>
                  <Divider>Entrega registrada</Divider>
                  <Typography variant="body2"><strong>Recibio:</strong> {detalleRemito.nombreDestinatario}</Typography>
                  <Typography variant="body2"><strong>DNI:</strong> {detalleRemito.dniDestinatario}</Typography>
                  <Typography variant="body2"><strong>Fecha:</strong> {format(new Date(detalleRemito.firmaDestinatarioAt), 'dd/MM/yyyy HH:mm', { locale: es })}</Typography>
                  {detalleRemito.firmaDestinatario && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" color="text.secondary">Firma:</Typography>
                      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1, bgcolor: '#fafafa' }}>
                        <img src={detalleRemito.firmaDestinatario} alt="Firma" style={{ maxWidth: '100%', height: 'auto' }} />
                      </Box>
                    </Box>
                  )}
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetalleRemito(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/* ─── Card de remito para el chofer ─── */
function RemitoCard({ remito, isMobile, onRetiro, onFirma, onDetalle }: {
  remito: any;
  isMobile: boolean;
  onRetiro?: () => void;
  onFirma?: () => void;
  onDetalle: () => void;
}) {
  const pendiente = remito.estado !== 'ENTREGADO';
  const retirado = !!remito.retiroDepositoAt;
  const borderColor = !pendiente ? '#43a047' : retirado ? '#1e88e5' : '#fb8c00';

  return (
    <Card
      variant="outlined"
      sx={{ mb: 1.5, borderLeft: `4px solid ${borderColor}`, cursor: 'pointer' }}
      onClick={onDetalle}
    >
      <CardContent sx={{ pb: 0.5 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
          <Typography variant="subtitle2" fontWeight="bold">{remito.numero}</Typography>
          <Chip
            icon={pendiente ? (retirado ? <EntregarIcon /> : <PendienteIcon />) : <EntregadoIcon />}
            label={!pendiente ? 'Entregado' : retirado ? 'En camino' : 'Por retirar'}
            size="small"
            color={ESTADO_COLOR[remito.estado] ?? 'default'}
            sx={{ fontWeight: 600 }}
          />
        </Box>

        <Typography variant="body2" fontWeight="bold" sx={{ mb: 0.3 }}>
          {remito.beneficiario?.nombre}
        </Typography>

        {remito.beneficiario?.direccion && (
          <Box display="flex" alignItems="center" gap={0.5}>
            <UbicacionIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              {remito.beneficiario.direccion}
              {remito.beneficiario.localidad && `, ${remito.beneficiario.localidad}`}
            </Typography>
          </Box>
        )}

        {remito.beneficiario?.telefono && (
          <Box display="flex" alignItems="center" gap={0.5}>
            <PhoneIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography
              variant="caption"
              component="a"
              href={`tel:${remito.beneficiario.telefono}`}
              sx={{ color: 'primary.main', textDecoration: 'none' }}
              onClick={e => e.stopPropagation()}
            >
              {remito.beneficiario.telefono}
            </Typography>
          </Box>
        )}

        <Box display="flex" alignItems="center" gap={0.5} mt={0.3}>
          <ItemsIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
          <Typography variant="caption" color="text.secondary">
            {remito.items?.length ?? 0} articulos | {remito.totalKg?.toFixed(1) ?? 0} kg | {remito.deposito?.nombre}
          </Typography>
        </Box>

        {retirado && pendiente && (
          <Typography variant="caption" color="primary.main" sx={{ display: 'block', mt: 0.3 }}>
            Retirado: {format(new Date(remito.retiroDepositoAt), 'dd/MM HH:mm', { locale: es })}
          </Typography>
        )}
      </CardContent>

      {pendiente && (
        <CardActions sx={{ px: 2, pb: 1.5, pt: 0 }} onClick={e => e.stopPropagation()}>
          {!retirado ? (
            <Button
              fullWidth variant="contained" size={isMobile ? 'large' : 'medium'}
              sx={{ bgcolor: '#e65100', '&:hover': { bgcolor: '#bf360c' } }}
              startIcon={<RetiroIcon />}
              onClick={onRetiro}
            >
              Registrar retiro
            </Button>
          ) : (
            <Button
              fullWidth variant="contained" color="success" size={isMobile ? 'large' : 'medium'}
              startIcon={<FirmaIcon />}
              onClick={onFirma}
            >
              Registrar entrega con firma
            </Button>
          )}
        </CardActions>
      )}
    </Card>
  );
}
