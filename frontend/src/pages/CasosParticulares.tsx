import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Box, Typography, Button, TextField, FormControl, InputLabel, Select,
  MenuItem, Chip, Alert, CircularProgress, Tabs, Tab, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, Drawer,
  Divider, IconButton, Tooltip, Grid, Dialog, DialogTitle,
  DialogContent, DialogActions,
} from '@mui/material';
import {
  Close as CloseIcon,
  AttachFile as AttachIcon,
  Warning as WarnIcon,
  CheckCircle as AprobIcon,
  Cancel as RechazarIcon,
  Visibility as VerIcon,
  ReceiptLong as RemitoIcon,
  CloudUpload as UploadIcon,
  PersonAdd as PersonAddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../services/api';

// ── helpers ────────────────────────────────────────────────────────────────
const ESTADO_COLOR: Record<string, 'warning' | 'info' | 'success' | 'error' | 'default'> = {
  PENDIENTE:   'warning',
  EN_REVISION: 'info',
  APROBADO:    'success',
  RECHAZADO:   'error',
  RESUELTO:    'default',
};
const PRIORIDAD_COLOR: Record<string, 'error' | 'warning' | 'default' | 'info'> = {
  URGENTE: 'error', ALTA: 'warning', NORMAL: 'default', BAJA: 'info',
};
const TIPO_LABEL: Record<string, string> = {
  ALIMENTARIO: 'Alimentario', MERCADERIA: 'Mercadería', MIXTO: 'Mixto',
};
const ESTADOS = ['TODOS', 'PENDIENTE', 'EN_REVISION', 'APROBADO', 'RECHAZADO', 'RESUELTO'];

function esUrgenteVencido(caso: any): boolean {
  if (caso.prioridad !== 'URGENTE') return false;
  if (!['PENDIENTE', 'EN_REVISION'].includes(caso.estado)) return false;
  const horas = (Date.now() - new Date(caso.createdAt).getTime()) / 3600000;
  return horas > 24;
}

function resolveUrl(url: string) {
  if (!url) return url;
  if (url.startsWith('http')) return url;
  const base = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  return `${base}/${url}`;
}

interface ItemRemito { articuloId: string; cantidad: string; }

export default function CasosParticulares() {
  const [casos, setCasos]         = useState<any[]>([]);
  const [loading, setLoading]     = useState(false);
  const [tabEstado, setTabEstado] = useState('TODOS');
  const [buscar, setBuscar]       = useState('');
  const [filtroPrio, setFiltroPrio] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');

  // Drawer detalle
  const [casoSel, setCasoSel]     = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Revisar (en_revision / aprobado / rechazado)
  const [notaRevision, setNotaRevision]   = useState('');
  const [revisando, setRevisando]         = useState(false);
  const [errRevisar, setErrRevisar]       = useState('');

  // Dialog generar remito
  const [remitoOpen, setRemitoOpen]   = useState(false);
  const [depositos, setDepositos]     = useState<any[]>([]);
  const [articulos, setArticulos]     = useState<any[]>([]);
  const [remitoDeposito, setRemitoDeposito] = useState('');
  const [remitoItems, setRemitoItems] = useState<ItemRemito[]>([{ articuloId: '', cantidad: '' }]);
  const [generando, setGenerando]     = useState(false);
  const [errRemito, setErrRemito]     = useState('');
  const [stockMap, setStockMap]       = useState<Record<string, number>>({});

  // Documentos del caso
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const docInputRef = useRef<HTMLInputElement>(null);

  // Convertir caso en beneficiario
  const [convirtiendo, setConvirtiendo] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (tabEstado !== 'TODOS') params.estado = tabEstado;
      if (buscar)     params.buscar    = buscar;
      if (filtroPrio) params.prioridad = filtroPrio;
      if (filtroTipo) params.tipo      = filtroTipo;
      const res = await api.get('/casos', { params });
      setCasos(res.data);
    } catch {
      setCasos([]);
    } finally {
      setLoading(false);
    }
  }, [tabEstado, buscar, filtroPrio, filtroTipo]);

  useEffect(() => { cargar(); }, [cargar]);

  // Recargar en tiempo real cuando hay eventos de casos
  useEffect(() => {
    const handler = (e: Event) => {
      const { tipo } = (e as CustomEvent).detail ?? {};
      if (tipo === 'caso:nuevo' || tipo === 'caso:actualizado') cargar();
    };
    window.addEventListener('sigam:update', handler);
    return () => window.removeEventListener('sigam:update', handler);
  }, [cargar]);

  const abrirDetalle = (caso: any) => {
    setCasoSel(caso);
    setNotaRevision('');
    setErrRevisar('');
    setDrawerOpen(true);
  };

  // ── Revisar ───────────────────────────────────────────────────────────────
  const revisar = async (nuevoEstado: string) => {
    if (!casoSel) return;
    setRevisando(true);
    setErrRevisar('');
    try {
      const res = await api.patch(`/casos/${casoSel.id}/revisar`, {
        estado: nuevoEstado,
        notaRevision: notaRevision || null,
      });
      setCasoSel(res.data);
      cargar();
    } catch (e: any) {
      setErrRevisar(e.response?.data?.message ?? 'Error al revisar');
    } finally {
      setRevisando(false);
    }
  };

  // ── Generar remito ────────────────────────────────────────────────────────
  const abrirRemito = async () => {
    setErrRemito('');
    setRemitoItems([{ articuloId: '', cantidad: '' }]);
    setRemitoDeposito('');
    try {
      const [dRes, aRes] = await Promise.all([
        api.get('/depositos'),
        api.get('/articulos'),
      ]);
      setDepositos(dRes.data);
      setArticulos(aRes.data);
    } catch {}
    setRemitoOpen(true);
  };

  const cargarStock = async (depositoId: string) => {
    if (!depositoId) { setStockMap({}); return; }
    try {
      const res = await api.get(`/stock/deposito/${depositoId}`);
      const map: Record<string, number> = {};
      for (const s of res.data) map[String(s.articuloId)] = s.cantidad;
      setStockMap(map);
    } catch { setStockMap({}); }
  };

  const generarRemito = async () => {
    const items = remitoItems.filter((i) => i.articuloId && Number(i.cantidad) > 0);
    if (!remitoDeposito || items.length === 0) {
      setErrRemito('Seleccioná un depósito y al menos un artículo con cantidad.');
      return;
    }
    setGenerando(true);
    setErrRemito('');
    try {
      const res = await api.post(`/casos/${casoSel.id}/generar-remito`, {
        depositoId: Number(remitoDeposito),
        items: items.map((i) => ({ articuloId: Number(i.articuloId), cantidad: Number(i.cantidad) })),
      });
      setCasoSel(res.data.caso);
      setRemitoOpen(false);
      cargar();
    } catch (e: any) {
      setErrRemito(e.response?.data?.message ?? 'Error al generar remito');
    } finally {
      setGenerando(false);
    }
  };

  // ── Subir documento al caso ───────────────────────────────────────────────
  const handleUploadDoc = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !casoSel) return;
    e.target.value = '';
    setUploadingDoc(true);
    try {
      const fd = new FormData();
      fd.append('archivo', file);
      fd.append('nombre', file.name);
      const res = await api.post(`/casos/${casoSel.id}/documentos`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setCasoSel((prev: any) => ({ ...prev, documentos: [...(prev.documentos ?? []), res.data] }));
    } catch { /* silencioso */ }
    finally { setUploadingDoc(false); }
  };

  const handleDeleteDoc = async (docId: number) => {
    if (!casoSel) return;
    try {
      await api.delete(`/casos/${casoSel.id}/documentos/${docId}`);
      setCasoSel((prev: any) => ({ ...prev, documentos: prev.documentos.filter((d: any) => d.id !== docId) }));
    } catch { /* silencioso */ }
  };

  // ── Convertir caso en beneficiario ────────────────────────────────────────
  const handleConvertirBeneficiario = async () => {
    if (!casoSel) return;
    setConvirtiendo(true);
    try {
      await api.post('/beneficiarios', {
        nombre: casoSel.nombreSolicitante,
        tipo: 'CASO_PARTICULAR',
        direccion: casoSel.direccion ?? undefined,
        telefono: casoSel.telefono ?? undefined,
        responsableDNI: casoSel.dni ?? undefined,
        observaciones: `Caso #${casoSel.id} — ${casoSel.descripcion?.slice(0, 200)}`,
      });
      alert(`"${casoSel.nombreSolicitante}" registrado como beneficiario.`);
    } catch (e: any) {
      alert(e.response?.data?.message ?? 'Error al crear el beneficiario');
    } finally {
      setConvirtiendo(false);
    }
  };

  // ── Conteos por estado ────────────────────────────────────────────────────
  const conteo = (estado: string) =>
    estado === 'TODOS' ? casos.length : casos.filter((c) => c.estado === estado).length;

  return (
    <Box>
      {/* Header */}
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
        Casos Particulares
      </Typography>

      {/* Filtros */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField size="small" label="Buscar nombre / DNI / barrio" value={buscar}
          onChange={(e) => setBuscar(e.target.value)} sx={{ minWidth: 260 }} />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Tipo</InputLabel>
          <Select value={filtroTipo} label="Tipo" onChange={(e) => setFiltroTipo(e.target.value)}>
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="ALIMENTARIO">Alimentario</MenuItem>
            <MenuItem value="MERCADERIA">Mercadería</MenuItem>
            <MenuItem value="MIXTO">Mixto</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Prioridad</InputLabel>
          <Select value={filtroPrio} label="Prioridad" onChange={(e) => setFiltroPrio(e.target.value)}>
            <MenuItem value="">Todas</MenuItem>
            <MenuItem value="URGENTE">Urgente</MenuItem>
            <MenuItem value="ALTA">Alta</MenuItem>
            <MenuItem value="NORMAL">Normal</MenuItem>
            <MenuItem value="BAJA">Baja</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Tabs */}
      <Tabs
        value={tabEstado}
        onChange={(_, v) => setTabEstado(v)}
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
        variant="scrollable"
        scrollButtons="auto"
      >
        {ESTADOS.map((e) => (
          <Tab
            key={e}
            value={e}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {e === 'TODOS' ? 'Todos' : e.replace('_', ' ')}
                <Chip
                  label={conteo(e)}
                  size="small"
                  color={e === 'TODOS' ? 'default' : ESTADO_COLOR[e] ?? 'default'}
                  sx={{ height: 18, fontSize: '0.65rem' }}
                />
              </Box>
            }
          />
        ))}
      </Tabs>

      {/* Tabla */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>
      ) : casos.length === 0 ? (
        <Alert severity="info">No hay casos en este estado.</Alert>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell>#</TableCell>
                <TableCell>Nombre</TableCell>
                <TableCell>DNI</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Prioridad</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Creado por</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell align="right">Acción</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {casos.map((c) => (
                <TableRow key={c.id} hover sx={{ cursor: 'pointer' }} onClick={() => abrirDetalle(c)}>
                  <TableCell>{c.id}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {c.nombreSolicitante}
                      {c.alertaCruce && (
                        <Tooltip title={c.detalleCruce ?? 'Cruce detectado'}>
                          <WarnIcon color="warning" fontSize="small" />
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{c.dni ?? '—'}</TableCell>
                  <TableCell>{TIPO_LABEL[c.tipo] ?? c.tipo}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                      <Chip label={c.prioridad} size="small" color={PRIORIDAD_COLOR[c.prioridad] ?? 'default'} variant="outlined" />
                      {esUrgenteVencido(c) && (
                        <Chip label="+24h" size="small" color="error" sx={{ fontSize: '0.6rem', height: 16 }} />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={c.estado.replace('_', ' ')} size="small" color={ESTADO_COLOR[c.estado] ?? 'default'} />
                  </TableCell>
                  <TableCell>{c.creadoPorNombre}</TableCell>
                  <TableCell>{format(new Date(c.createdAt), 'dd/MM/yyyy', { locale: es })}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); abrirDetalle(c); }}>
                      <VerIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ── Drawer detalle ───────────────────────────────────────────────────── */}
      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, p: 3 } }}>
        {casoSel && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight="bold">
                Caso #{casoSel.id}
              </Typography>
              <IconButton onClick={() => setDrawerOpen(false)}><CloseIcon /></IconButton>
            </Box>

            {/* Datos */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              <Chip label={casoSel.estado.replace('_', ' ')} color={ESTADO_COLOR[casoSel.estado] ?? 'default'} />
              <Chip label={casoSel.prioridad} color={PRIORIDAD_COLOR[casoSel.prioridad] ?? 'default'} variant="outlined" />
              {esUrgenteVencido(casoSel) && <Chip label="Sin atención +24h" size="small" color="error" />}
              <Chip label={TIPO_LABEL[casoSel.tipo] ?? casoSel.tipo} variant="outlined" />
            </Box>

            {casoSel.alertaCruce && (
              <Box sx={{ mb: 2, p: 1.5, bgcolor: 'warning.light', borderRadius: 2, border: '2px solid', borderColor: 'warning.main' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <WarnIcon color="warning" />
                  <Typography variant="subtitle2" color="warning.dark" fontWeight="bold">Cruce de datos detectado</Typography>
                </Box>
                <Typography variant="body2" color="warning.dark">{casoSel.detalleCruce}</Typography>
              </Box>
            )}

            <Grid container spacing={1} sx={{ mb: 2 }}>
              <Grid item xs={12}>
                <Typography variant="body2"><strong>Nombre:</strong> {casoSel.nombreSolicitante}</Typography>
              </Grid>
              {casoSel.dni && (
                <Grid item xs={12}>
                  <Typography variant="body2"><strong>DNI:</strong> {casoSel.dni}</Typography>
                </Grid>
              )}
              {casoSel.direccion && (
                <Grid item xs={12}>
                  <Typography variant="body2"><strong>Dirección:</strong> {casoSel.direccion}{casoSel.barrio ? `, ${casoSel.barrio}` : ''}</Typography>
                </Grid>
              )}
              {casoSel.telefono && (
                <Grid item xs={12}>
                  <Typography variant="body2"><strong>Teléfono:</strong> {casoSel.telefono}</Typography>
                </Grid>
              )}
              <Grid item xs={12}>
                <Typography variant="body2"><strong>Creado por:</strong> {casoSel.creadoPorNombre}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2">
                  <strong>Fecha:</strong> {format(new Date(casoSel.createdAt), "d MMM yyyy 'a las' HH:mm", { locale: es })}
                </Typography>
              </Grid>
            </Grid>

            <Divider sx={{ mb: 2 }} />

            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Situación:</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {casoSel.descripcion}
            </Typography>

            {casoSel.notaRevision && (
              <Alert severity={casoSel.estado === 'RECHAZADO' ? 'error' : 'info'} sx={{ mb: 2 }}>
                <strong>Nota de revisión:</strong> {casoSel.notaRevision}
              </Alert>
            )}

            {casoSel.remito && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Remito generado: <strong>{casoSel.remito.numero}</strong>
              </Alert>
            )}

            {/* Documentos */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" fontWeight="bold" color="text.secondary">DOCUMENTOS ADJUNTOS</Typography>
              {casoSel.documentos?.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5 }}>
                  {casoSel.documentos.map((doc: any) => (
                    <Box key={doc.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Chip
                        label={doc.nombre}
                        size="small"
                        icon={<AttachIcon />}
                        onClick={() => window.open(resolveUrl(doc.url), '_blank', 'noopener,noreferrer')}
                        clickable
                        sx={{ flex: 1, justifyContent: 'flex-start' }}
                      />
                      <IconButton size="small" onClick={() => handleDeleteDoc(doc.id)} color="error">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>Sin documentos adjuntos</Typography>
              )}
              {['PENDIENTE', 'EN_REVISION', 'APROBADO'].includes(casoSel.estado) && (
                <Box sx={{ mt: 1 }}>
                  <input ref={docInputRef} type="file" hidden onChange={handleUploadDoc} />
                  <Button
                    size="small" variant="outlined"
                    startIcon={uploadingDoc ? <CircularProgress size={14} /> : <UploadIcon />}
                    onClick={() => docInputRef.current?.click()}
                    disabled={uploadingDoc}
                  >
                    {uploadingDoc ? 'Subiendo...' : 'Adjuntar documento'}
                  </Button>
                </Box>
              )}
            </Box>

            <Divider sx={{ mb: 2 }} />

            {/* Acciones de revisión */}
            {['PENDIENTE', 'EN_REVISION'].includes(casoSel.estado) && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Revisar caso</Typography>
                {errRevisar && <Alert severity="error" sx={{ mb: 1 }}>{errRevisar}</Alert>}
                <TextField
                  label="Nota de revisión (opcional)"
                  value={notaRevision}
                  onChange={(e) => setNotaRevision(e.target.value)}
                  multiline rows={2}
                  fullWidth sx={{ mb: 1.5 }}
                />
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {casoSel.estado === 'PENDIENTE' && (
                    <Button
                      variant="outlined" color="info" size="small"
                      startIcon={<VerIcon />}
                      disabled={revisando}
                      onClick={() => revisar('EN_REVISION')}
                    >
                      Tomar para revisión
                    </Button>
                  )}
                  <Button
                    variant="contained" color="success" size="small"
                    startIcon={<AprobIcon />}
                    disabled={revisando}
                    onClick={() => revisar('APROBADO')}
                  >
                    Aprobar
                  </Button>
                  <Button
                    variant="outlined" color="error" size="small"
                    startIcon={<RechazarIcon />}
                    disabled={revisando}
                    onClick={() => revisar('RECHAZADO')}
                  >
                    Rechazar
                  </Button>
                  {revisando && <CircularProgress size={20} sx={{ alignSelf: 'center' }} />}
                </Box>
              </Box>
            )}

            {/* Generar remito */}
            {casoSel.estado === 'APROBADO' && !casoSel.remito && (
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained" color="primary"
                  startIcon={<RemitoIcon />}
                  onClick={abrirRemito}
                  fullWidth
                >
                  Generar Remito
                </Button>
              </Box>
            )}

            {/* Registrar como beneficiario */}
            {casoSel.estado === 'RESUELTO' && !casoSel.beneficiarioId && (
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="outlined" color="secondary"
                  startIcon={convirtiendo ? <CircularProgress size={16} /> : <PersonAddIcon />}
                  onClick={handleConvertirBeneficiario}
                  disabled={convirtiendo}
                  fullWidth
                >
                  Registrar como Beneficiario
                </Button>
              </Box>
            )}
            {casoSel.estado === 'RESUELTO' && casoSel.beneficiarioId && (
              <Alert severity="success" sx={{ mt: 2 }} icon={<PersonAddIcon />}>
                Ya registrado como beneficiario (ID #{casoSel.beneficiarioId})
              </Alert>
            )}
          </>
        )}
      </Drawer>

      {/* ── Dialog Generar Remito ─────────────────────────────────────────────── */}
      <Dialog open={remitoOpen} onClose={() => setRemitoOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Generar Remito — Caso #{casoSel?.id}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          {errRemito && <Alert severity="error">{errRemito}</Alert>}

          <FormControl fullWidth>
            <InputLabel>Depósito *</InputLabel>
            <Select value={remitoDeposito} label="Depósito *" onChange={(e) => { setRemitoDeposito(e.target.value); cargarStock(e.target.value); }}>
              {depositos.map((d: any) => (
                <MenuItem key={d.id} value={String(d.id)}>{d.nombre}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Typography variant="subtitle2">Artículos</Typography>
          {remitoItems.map((item, idx) => {
            const stockDisp = item.articuloId ? (stockMap[item.articuloId] ?? null) : null;
            const excede = stockDisp !== null && Number(item.cantidad) > stockDisp;
            const sinStock = stockDisp !== null && stockDisp <= 0;
            return (
              <Box key={idx} sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Artículo</InputLabel>
                    <Select
                      value={item.articuloId}
                      label="Artículo"
                      onChange={(e) => {
                        const copia = [...remitoItems];
                        copia[idx].articuloId = e.target.value;
                        setRemitoItems(copia);
                      }}
                    >
                      {articulos.map((a: any) => {
                        const st = stockMap[String(a.id)];
                        return (
                          <MenuItem key={a.id} value={String(a.id)}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: 1 }}>
                              <span>{a.nombre}</span>
                              {remitoDeposito && st !== undefined && (
                                <Typography variant="caption" color={st <= 0 ? 'error' : st < 5 ? 'warning.main' : 'text.secondary'}>
                                  stock: {st}
                                </Typography>
                              )}
                            </Box>
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>
                  <TextField
                    size="small" label="Cantidad" type="number"
                    value={item.cantidad}
                    error={excede}
                    onChange={(e) => {
                      const copia = [...remitoItems];
                      copia[idx].cantidad = e.target.value;
                      setRemitoItems(copia);
                    }}
                    sx={{ width: 110 }}
                  />
                  {remitoItems.length > 1 && (
                    <IconButton size="small" onClick={() => setRemitoItems(remitoItems.filter((_, i) => i !== idx))}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
                {stockDisp !== null && (
                  <Typography variant="caption" color={sinStock ? 'error' : excede ? 'error' : 'text.secondary'} sx={{ ml: 0.5 }}>
                    {sinStock ? '⚠ Sin stock disponible' : excede ? `⚠ Stock insuficiente (disponible: ${stockDisp})` : `Disponible: ${stockDisp}`}
                  </Typography>
                )}
              </Box>
            );
          })}
          <Button size="small" onClick={() => setRemitoItems([...remitoItems, { articuloId: '', cantidad: '' }])}>
            + Agregar artículo
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemitoOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={generarRemito} disabled={generando}>
            {generando ? <CircularProgress size={20} /> : 'Generar Remito'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
