import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import {
  Box, Button, Typography, CircularProgress, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Tabs, Tab, Chip, Alert, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  SwapHoriz as TransferIcon,
  Warning as WarningIcon,
  Description as DocIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  OpenInNew as OpenIcon,
  FolderOpen as FolderIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNotificationStore } from '../stores/notificationStore';
import LoadingPage from '../components/LoadingPage';
import api from '../services/api';
import StockIngresoForm from '../components/StockIngresoForm';
import StockTransferForm from '../components/StockTransferForm';

const TIPO_LABEL: Record<string, string> = {
  INGRESO: 'Ingreso',
  EGRESO: 'Egreso',
  AJUSTE: 'Ajuste',
  TRANSFERENCIA: 'Transferencia',
};
const TIPO_COLOR: Record<string, 'success' | 'error' | 'warning' | 'info'> = {
  INGRESO: 'success',
  EGRESO: 'error',
  AJUSTE: 'warning',
  TRANSFERENCIA: 'info',
};

export default function StockPage() {
  const { user } = useAuthStore();
  const soloLectura = user?.rol !== 'ADMIN';
  const { showNotification } = useNotificationStore();

  // PIN lock para modificaciones de stock
  const PIN_STOCK = '6409';
  const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutos
  const [desbloqueado, setDesbloqueado] = useState(false);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingActionRef = useRef<(() => void) | null>(null);

  const iniciarTimerLockeo = () => {
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    lockTimerRef.current = setTimeout(() => {
      setDesbloqueado(false);
      showNotification('Stock bloqueado automáticamente', 'info');
    }, LOCK_TIMEOUT_MS);
  };

  const handleAbrirConPin = (accion: () => void) => {
    if (desbloqueado) {
      accion();
    } else {
      pendingActionRef.current = accion;
      setPinInput('');
      setPinError('');
      setPinDialogOpen(true);
    }
  };

  const handleConfirmarPin = () => {
    if (pinInput === PIN_STOCK) {
      setDesbloqueado(true);
      setPinDialogOpen(false);
      iniciarTimerLockeo();
      if (pendingActionRef.current) {
        pendingActionRef.current();
        pendingActionRef.current = null;
      }
    } else {
      setPinError('Código incorrecto');
      setPinInput('');
    }
  };

  const handleBloquearManual = () => {
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    setDesbloqueado(false);
    showNotification('Stock bloqueado', 'info');
  };

  const [stock, setStock] = useState<any[]>([]);
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [depositos, setDepositos] = useState<any[]>([]);
  const [articulos, setArticulos] = useState<any[]>([]);
  const [selectedDeposito, setSelectedDeposito] = useState(0);
  const [vistaTab, setVistaTab] = useState(0); // 0=stock, 1=movimientos, 2=lotes, 3=documentos
  const [loading, setLoading] = useState(true);
  const [loadingMov, setLoadingMov] = useState(false);
  const [stockBajo, setStockBajo] = useState<any[]>([]);
  const [ingresoFormOpen, setIngresoFormOpen] = useState(false);
  const [transferFormOpen, setTransferFormOpen] = useState(false);

  // Ajuste de stock
  const [ajusteOpen, setAjusteOpen] = useState(false);
  const [ajusteForm, setAjusteForm] = useState({ articuloId: '', depositoId: '', cantidadReal: '', observaciones: '' });
  const [savingAjuste, setSavingAjuste] = useState(false);

  const abrirAjuste = (item?: any) => {
    if (item) {
      setAjusteForm({ articuloId: String(item.articuloId), depositoId: String(item.depositoId), cantidadReal: String(item.cantidad), observaciones: '' });
    } else {
      const dep = depositos[selectedDeposito];
      setAjusteForm({ articuloId: '', depositoId: dep ? String(dep.id) : '', cantidadReal: '', observaciones: '' });
    }
    setAjusteOpen(true);
  };

  const handleGuardarAjuste = async () => {
    if (!ajusteForm.articuloId || !ajusteForm.depositoId || ajusteForm.cantidadReal === '') return;
    setSavingAjuste(true);
    try {
      await api.post('/stock/ajuste', {
        articuloId: Number(ajusteForm.articuloId),
        depositoId: Number(ajusteForm.depositoId),
        cantidadReal: Number(ajusteForm.cantidadReal),
        observaciones: ajusteForm.observaciones || undefined,
      });
      showNotification('Ajuste registrado correctamente', 'success');
      setAjusteOpen(false);
      loadData();
      if (depositos.length > 0) loadStock(depositos[selectedDeposito].id);
    } catch (error: any) {
      showNotification(error.response?.data?.message || 'Error al registrar ajuste', 'error');
    } finally {
      setSavingAjuste(false);
    }
  };

  // Lotes
  const [lotes, setLotes] = useState<any[]>([]);
  const [loadingLotes, setLoadingLotes] = useState(false);
  const [loteFormOpen, setLoteFormOpen] = useState(false);
  const [loteEditing, setLoteEditing] = useState<any>(null);
  const [loteForm, setLoteForm] = useState({ articuloId: '', depositoId: '', cantidad: '', fechaVencimiento: '', lote: '' });
  const [savingLote, setSavingLote] = useState(false);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (depositos.length > 0) {
      loadStock(depositos[selectedDeposito].id);
    }
  }, [selectedDeposito, depositos]);

  useEffect(() => {
    if (vistaTab === 1 || vistaTab === 3) loadMovimientos();
    if (vistaTab === 2 && depositos.length > 0) loadLotes(depositos[selectedDeposito]?.id);
  }, [vistaTab]);

  useEffect(() => {
    if (vistaTab === 2 && depositos.length > 0) loadLotes(depositos[selectedDeposito]?.id);
  }, [selectedDeposito]);

  const loadData = async () => {
    try {
      const [depositosRes, stockBajoRes, artRes] = await Promise.all([
        api.get('/depositos'),
        api.get('/reportes/stock-bajo'),
        api.get('/articulos'),
      ]);
      const esCita = user?.rol === 'ASISTENCIA_CRITICA';
      const todos = depositosRes.data as any[];
      const depositosFiltrados = esCita
        ? todos.filter((d) => d.codigo === 'CITA')
        : user?.depositoId
        ? todos.filter((d) => d.id === user.depositoId)
        : todos;
      setDepositos(depositosFiltrados);
      setStockBajo(stockBajoRes.data);
      setArticulos((artRes.data ?? []).filter((a: any) => a.activo));
      if (depositosFiltrados.length > 0) {
        await loadStock(depositosFiltrados[0].id);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLotes = async (depositoId?: number) => {
    if (!depositoId) return;
    setLoadingLotes(true);
    try {
      const res = await api.get('/stock/lotes', { params: { depositoId } });
      setLotes(res.data);
    } catch { console.error('Error cargando lotes'); }
    finally { setLoadingLotes(false); }
  };

  const handleAbrirLoteForm = (lote?: any) => {
    if (lote) {
      setLoteEditing(lote);
      setLoteForm({
        articuloId: String(lote.articuloId),
        depositoId: String(lote.depositoId),
        cantidad: String(lote.cantidad),
        fechaVencimiento: lote.fechaVencimiento.slice(0, 10),
        lote: lote.lote ?? '',
      });
    } else {
      setLoteEditing(null);
      setLoteForm({
        articuloId: '',
        depositoId: String(depositos[selectedDeposito]?.id ?? ''),
        cantidad: '',
        fechaVencimiento: '',
        lote: '',
      });
    }
    setLoteFormOpen(true);
  };

  const handleGuardarLote = async () => {
    if (!loteForm.articuloId || !loteForm.depositoId || !loteForm.cantidad || !loteForm.fechaVencimiento) return;
    setSavingLote(true);
    try {
      const body = {
        articuloId: +loteForm.articuloId,
        depositoId: +loteForm.depositoId,
        cantidad: parseFloat(loteForm.cantidad),
        fechaVencimiento: loteForm.fechaVencimiento,
        lote: loteForm.lote || undefined,
      };
      if (loteEditing) {
        await api.patch(`/stock/lotes/${loteEditing.id}`, body);
        showNotification('Lote actualizado', 'success');
      } else {
        await api.post('/stock/lotes', body);
        showNotification('Lote creado', 'success');
      }
      setLoteFormOpen(false);
      loadLotes(depositos[selectedDeposito]?.id);
    } catch (e: any) {
      showNotification(e.response?.data?.message || 'Error guardando lote', 'error');
    } finally {
      setSavingLote(false);
    }
  };

  const handleEliminarLote = async (lote: any) => {
    if (!confirm(`¿Eliminar lote de "${lote.articulo.nombre}"?`)) return;
    try {
      await api.delete(`/stock/lotes/${lote.id}`);
      showNotification('Lote eliminado', 'info');
      loadLotes(depositos[selectedDeposito]?.id);
    } catch {
      showNotification('Error eliminando lote', 'error');
    }
  };

  const loadStock = async (depositoId: number) => {
    try {
      setLoading(true);
      const response = await api.get(`/stock/deposito/${depositoId}`);
      setStock(response.data);
    } catch (error) {
      console.error('Error cargando stock:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMovimientos = async () => {
    setLoadingMov(true);
    try {
      const res = await api.get('/stock/movimientos');
      setMovimientos(res.data);
    } catch {
      console.error('Error cargando movimientos');
    } finally {
      setLoadingMov(false);
    }
  };

  if (loading && depositos.length === 0) {
    return <LoadingPage />;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">Stock</Typography>
        <Box display="flex" gap={2} alignItems="center">
          {!soloLectura && (
            <Tooltip title={desbloqueado ? 'Stock desbloqueado — click para bloquear' : 'Stock bloqueado — click para desbloquear'}>
              <IconButton
                onClick={desbloqueado ? handleBloquearManual : () => handleAbrirConPin(() => {})}
                color={desbloqueado ? 'warning' : 'default'}
                size="small"
              >
                {desbloqueado ? <LockOpenIcon /> : <LockIcon />}
              </IconButton>
            </Tooltip>
          )}
          {!soloLectura && (
            <Button variant="outlined" startIcon={<TransferIcon />} onClick={() => handleAbrirConPin(() => setTransferFormOpen(true))}>
              Transferir
            </Button>
          )}
          {!soloLectura && (
            <Button variant="outlined" color="warning" startIcon={<EditIcon />} onClick={() => handleAbrirConPin(() => abrirAjuste())}>
              Ajuste
            </Button>
          )}
          {!soloLectura && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleAbrirConPin(() => setIngresoFormOpen(true))}>
              Registrar Ingreso
            </Button>
          )}
        </Box>
      </Box>

      {stockBajo.length > 0 && (
        <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 3 }}>
          Hay {stockBajo.length} artículo(s) con stock bajo
        </Alert>
      )}

      {/* Tabs vista: Stock / Movimientos / Lotes */}
      <Paper elevation={2} sx={{ mb: 3 }}>
        <Tabs value={vistaTab} onChange={(_, v) => setVistaTab(v)}>
          <Tab label="Stock actual" />
          <Tab label="Historial de movimientos" />
          <Tab label="Lotes / Vencimientos" />
          <Tab label="Documentos" icon={<FolderIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
        </Tabs>
      </Paper>

      {vistaTab === 0 && (
        <>
          {/* Sub-tabs por depósito */}
          <Paper elevation={1} sx={{ mb: 2 }}>
            <Tabs value={selectedDeposito} onChange={(_, v) => setSelectedDeposito(v)}>
              {depositos.map((d) => <Tab key={d.id} label={d.nombre} />)}
            </Tabs>
          </Paper>

          {loading ? (
            <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>
          ) : (
            <TableContainer component={Paper} elevation={2}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Artículo</TableCell>
                    <TableCell>Categoría</TableCell>
                    <TableCell align="right">Cantidad</TableCell>
                    <TableCell>Peso Unit.</TableCell>
                    <TableCell align="right">Stock Mínimo</TableCell>
                    <TableCell align="center">Estado</TableCell>
                    {!soloLectura && <TableCell />}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stock.map((item) => {
                    const isBajo = item.cantidad <= item.articulo.stockMinimo;
                    return (
                      <TableRow key={item.id} hover sx={{ bgcolor: isBajo ? 'warning.light' : 'inherit' }}>
                        <TableCell><strong>{item.articulo.nombre}</strong></TableCell>
                        <TableCell>{item.articulo.categoria || '-'}</TableCell>
                        <TableCell align="right"><strong>{item.cantidad}</strong></TableCell>
                        <TableCell>{item.articulo.pesoUnitarioKg ? `${item.articulo.pesoUnitarioKg} kg/u` : '-'}</TableCell>
                        <TableCell align="right">{item.articulo.stockMinimo}</TableCell>
                        <TableCell align="center">
                          {isBajo
                            ? <Chip label="BAJO" size="small" color="warning" />
                            : <Chip label="OK" size="small" color="success" />}
                        </TableCell>
                        {!soloLectura && (
                          <TableCell align="center" sx={{ p: 0.5 }}>
                            <Tooltip title="Ajustar cantidad">
                              <IconButton size="small" onClick={() => handleAbrirConPin(() => abrirAjuste(item))}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      {vistaTab === 1 && (
        <>
          {loadingMov ? (
            <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>
          ) : (
            <TableContainer component={Paper} elevation={2}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Artículo</TableCell>
                    <TableCell align="right">Cantidad</TableCell>
                    <TableCell>Depósito</TableCell>
                    <TableCell>Usuario</TableCell>
                    <TableCell>Observaciones</TableCell>
                    <TableCell align="center">Doc.</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {movimientos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Typography variant="body2" color="text.secondary">Sin movimientos</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    movimientos.map((m) => (
                      <TableRow key={m.id} hover>
                        <TableCell sx={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                          {format(new Date(m.fecha), 'dd/MM/yy HH:mm', { locale: es })}
                        </TableCell>
                        <TableCell>
                          <Chip label={TIPO_LABEL[m.tipo] ?? m.tipo} size="small" color={TIPO_COLOR[m.tipo] ?? 'default'} />
                        </TableCell>
                        <TableCell>{m.articulo?.nombre}</TableCell>
                        <TableCell align="right"><strong>{m.cantidad}</strong></TableCell>
                        <TableCell sx={{ fontSize: '0.8rem' }}>
                          {m.depositoHacia?.nombre || m.depositoDesde?.nombre || '—'}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.8rem' }}>{m.usuario?.nombre || '—'}</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.observaciones || '—'}
                        </TableCell>
                        <TableCell align="center">
                          {m.documentoUrl ? (
                            <Tooltip title="Ver documento adjunto">
                              <IconButton size="small" color="primary" href={m.documentoUrl} target="_blank" rel="noopener noreferrer">
                                <DocIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          ) : (
                            <Typography variant="caption" color="text.disabled">—</Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      {/* ── Tab 2: Lotes ── */}
      {vistaTab === 2 && (
        <>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            {/* Sub-tabs por depósito */}
            <Paper elevation={1} sx={{ flex: 1, mr: 2 }}>
              <Tabs value={selectedDeposito} onChange={(_, v) => setSelectedDeposito(v)}>
                {depositos.map((d) => <Tab key={d.id} label={d.nombre} />)}
              </Tabs>
            </Paper>
            {!soloLectura && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleAbrirConPin(() => handleAbrirLoteForm())}>
                Nuevo Lote
              </Button>
            )}
          </Box>

          {loadingLotes ? (
            <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>
          ) : (
            <TableContainer component={Paper} elevation={2}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell>Artículo</TableCell>
                    <TableCell>Código lote</TableCell>
                    <TableCell align="right">Cantidad</TableCell>
                    <TableCell>Vencimiento</TableCell>
                    <TableCell>Estado</TableCell>
                    {!soloLectura && <TableCell align="center">Acciones</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lotes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography variant="body2" color="text.secondary">No hay lotes registrados para este depósito</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    lotes.map((lote) => {
                      const hoy = new Date(); hoy.setHours(0,0,0,0);
                      const venc = new Date(lote.fechaVencimiento);
                      const diasParaVencer = Math.ceil((venc.getTime() - hoy.getTime()) / (1000*60*60*24));
                      const vencido = diasParaVencer < 0;
                      const proximoVencer = !vencido && diasParaVencer <= 30;
                      return (
                        <TableRow key={lote.id} hover sx={{ bgcolor: vencido ? 'error.50' : proximoVencer ? 'warning.50' : 'inherit' }}>
                          <TableCell>
                            <strong>{lote.articulo.nombre}</strong>
                            {lote.articulo.categoria && (
                              <Typography variant="caption" color="text.secondary" display="block">{lote.articulo.categoria}</Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                              {lote.lote || <Typography component="span" variant="caption" color="text.disabled">—</Typography>}
                            </Typography>
                          </TableCell>
                          <TableCell align="right"><strong>{lote.cantidad}</strong></TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>
                            {format(venc, 'dd/MM/yyyy', { locale: es })}
                          </TableCell>
                          <TableCell>
                            {vencido
                              ? <Chip label="VENCIDO" size="small" color="error" />
                              : proximoVencer
                              ? <Chip label={`${diasParaVencer}d`} size="small" color="warning" />
                              : <Chip label="OK" size="small" color="success" />}
                          </TableCell>
                          {!soloLectura && (
                            <TableCell align="center">
                              <Tooltip title="Editar">
                                <IconButton size="small" onClick={() => handleAbrirConPin(() => handleAbrirLoteForm(lote))}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Eliminar">
                                <IconButton size="small" color="error" onClick={() => handleAbrirConPin(() => handleEliminarLote(lote))}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      {/* ── Tab 3: Documentos ── */}
      {vistaTab === 3 && (
        <>
          {loadingMov ? (
            <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>
          ) : (() => {
            const docs = movimientos.filter(m => m.documentoUrl);
            return docs.length === 0 ? (
              <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
                <FolderIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  No hay documentos adjuntos en los movimientos registrados.
                </Typography>
              </Paper>
            ) : (
              <TableContainer component={Paper} elevation={2}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Tipo</TableCell>
                      <TableCell>Artículo</TableCell>
                      <TableCell align="right">Cantidad</TableCell>
                      <TableCell>Depósito</TableCell>
                      <TableCell>Observaciones</TableCell>
                      <TableCell align="center">Documento</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {docs.map((m) => (
                      <TableRow key={m.id} hover>
                        <TableCell sx={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                          {format(new Date(m.fecha), 'dd/MM/yy HH:mm', { locale: es })}
                        </TableCell>
                        <TableCell>
                          <Chip label={TIPO_LABEL[m.tipo] ?? m.tipo} size="small" color={TIPO_COLOR[m.tipo] ?? 'default'} />
                        </TableCell>
                        <TableCell><strong>{m.articulo?.nombre}</strong></TableCell>
                        <TableCell align="right">{m.cantidad}</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem' }}>
                          {m.depositoHacia?.nombre || m.depositoDesde?.nombre || '—'}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.8rem', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.observaciones || '—'}
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Abrir documento">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => window.open(m.documentoUrl, '_blank', 'noopener,noreferrer')}
                            >
                              <OpenIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            );
          })()}
        </>
      )}

      {/* Diálogo crear/editar lote */}
      <Dialog open={loteFormOpen} onClose={() => setLoteFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{loteEditing ? 'Editar Lote' : 'Nuevo Lote'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            select fullWidth label="Artículo" required
            value={loteForm.articuloId}
            onChange={e => setLoteForm(f => ({ ...f, articuloId: e.target.value }))}
            disabled={!!loteEditing}
          >
            {articulos.map(a => <MenuItem key={a.id} value={a.id}>{a.nombre}</MenuItem>)}
          </TextField>
          <TextField
            select fullWidth label="Depósito" required
            value={loteForm.depositoId}
            onChange={e => setLoteForm(f => ({ ...f, depositoId: e.target.value }))}
            disabled={!!loteEditing}
          >
            {depositos.map(d => <MenuItem key={d.id} value={d.id}>{d.nombre}</MenuItem>)}
          </TextField>
          <TextField
            fullWidth label="Cantidad" type="number" required
            value={loteForm.cantidad}
            onChange={e => setLoteForm(f => ({ ...f, cantidad: e.target.value }))}
            inputProps={{ min: 0, step: 1 }}
          />
          <TextField
            fullWidth label="Fecha de vencimiento" type="date" required
            value={loteForm.fechaVencimiento}
            onChange={e => setLoteForm(f => ({ ...f, fechaVencimiento: e.target.value }))}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            fullWidth label="Código / N° de lote (opcional)"
            value={loteForm.lote}
            onChange={e => setLoteForm(f => ({ ...f, lote: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLoteFormOpen(false)} disabled={savingLote}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={savingLote || !loteForm.articuloId || !loteForm.cantidad || !loteForm.fechaVencimiento}
            onClick={handleGuardarLote}
          >
            {savingLote ? <CircularProgress size={22} /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      <StockIngresoForm
        open={ingresoFormOpen}
        onClose={() => setIngresoFormOpen(false)}
        onSuccess={() => { loadData(); setIngresoFormOpen(false); }}
      />

      <StockTransferForm
        open={transferFormOpen}
        onClose={() => setTransferFormOpen(false)}
        onSuccess={() => { loadData(); setTransferFormOpen(false); }}
      />

      {/* Diálogo PIN desbloqueo de stock */}
      <Dialog open={pinDialogOpen} onClose={() => setPinDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LockIcon color="warning" /> Desbloquear modificaciones de stock
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            autoFocus
            fullWidth
            label="Código de acceso"
            type="password"
            value={pinInput}
            onChange={(e) => { setPinInput(e.target.value); setPinError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleConfirmarPin()}
            error={!!pinError}
            helperText={pinError || 'Ingresá el código para habilitar los cambios por 5 minutos'}
            size="small"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPinDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleConfirmarPin} disabled={!pinInput}>
            Desbloquear
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo ajuste de stock */}
      <Dialog open={ajusteOpen} onClose={() => setAjusteOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Ajuste de stock</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <Alert severity="info" sx={{ mb: 1 }}>
            El stock se actualizará a la cantidad real ingresada. Se registrará un movimiento de ajuste.
          </Alert>
          <TextField
            select label="Artículo" size="small"
            value={ajusteForm.articuloId}
            onChange={(e) => setAjusteForm(f => ({ ...f, articuloId: e.target.value }))}
          >
            {articulos.map(a => <MenuItem key={a.id} value={String(a.id)}>{a.nombre}</MenuItem>)}
          </TextField>
          <TextField
            select label="Depósito" size="small"
            value={ajusteForm.depositoId}
            onChange={(e) => setAjusteForm(f => ({ ...f, depositoId: e.target.value }))}
          >
            {depositos.map(d => <MenuItem key={d.id} value={String(d.id)}>{d.nombre}</MenuItem>)}
          </TextField>
          <TextField
            label="Cantidad real (nueva)" type="number" size="small"
            inputProps={{ min: 0, step: 0.01 }}
            value={ajusteForm.cantidadReal}
            onChange={(e) => setAjusteForm(f => ({ ...f, cantidadReal: e.target.value }))}
          />
          <TextField
            label="Observaciones" size="small" multiline rows={2}
            value={ajusteForm.observaciones}
            onChange={(e) => setAjusteForm(f => ({ ...f, observaciones: e.target.value }))}
            placeholder="Motivo del ajuste (recuento físico, merma, error de carga...)"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAjusteOpen(false)}>Cancelar</Button>
          <Button
            variant="contained" color="warning"
            disabled={savingAjuste || !ajusteForm.articuloId || !ajusteForm.depositoId || ajusteForm.cantidadReal === ''}
            onClick={handleGuardarAjuste}
          >
            {savingAjuste ? <CircularProgress size={20} /> : 'Confirmar ajuste'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
