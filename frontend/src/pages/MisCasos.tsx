import { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem, Chip, Alert,
  Card, CardContent, CardActions, Grid, CircularProgress, Collapse,
  Divider, Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  AttachFile as AttachIcon,
  Warning as WarnIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../services/api';
import { useAuthStore } from '../stores/authStore';

const ESTADO_COLOR: Record<string, 'warning' | 'info' | 'success' | 'error' | 'default'> = {
  PENDIENTE:   'warning',
  EN_REVISION: 'info',
  APROBADO:    'success',
  RECHAZADO:   'error',
  RESUELTO:    'default',
};

const PRIORIDAD_COLOR: Record<string, 'error' | 'warning' | 'default' | 'info'> = {
  URGENTE: 'error',
  ALTA:    'warning',
  NORMAL:  'default',
  BAJA:    'info',
};

const TIPO_LABEL: Record<string, string> = {
  ALIMENTARIO: 'Alimentario',
  MERCADERIA:  'Mercadería',
  MIXTO:       'Mixto',
};

function resolveUrl(url: string) {
  if (!url) return url;
  if (url.startsWith('http')) return url;
  const base = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  return `${base}/${url}`;
}

const FORM_VACIO = {
  nombreSolicitante: '',
  dni: '',
  direccion: '',
  barrio: '',
  telefono: '',
  descripcion: '',
  tipo: 'ALIMENTARIO',
  prioridad: 'NORMAL',
};

export default function MisCasos() {
  const { user } = useAuthStore();
  const [casos, setCasos]     = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroBuscar, setFiltroBuscar] = useState('');

  // Dialog crear
  const [crearOpen, setCrearOpen]   = useState(false);
  const [form, setForm]             = useState({ ...FORM_VACIO });
  const [alertaCruce, setAlertaCruce] = useState<string | null>(null);
  const [checkingDni, setCheckingDni] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [errorGuardar, setErrorGuardar] = useState('');

  // Expandir tarjeta
  const [expandido, setExpandido]   = useState<number | null>(null);

  // Subir doc a caso existente
  const [docCasoId, setDocCasoId]   = useState<number | null>(null);
  const [docFile, setDocFile]       = useState<File | null>(null);
  const [docNombre, setDocNombre]   = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const esAsistencia = user?.rol === 'ASISTENCIA_CRITICA';

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filtroEstado) params.estado = filtroEstado;
      if (filtroBuscar) params.buscar = filtroBuscar;
      const res = await api.get('/casos', { params });
      setCasos(res.data);
    } catch {
      setCasos([]);
    } finally {
      setLoading(false);
    }
  }, [filtroEstado, filtroBuscar]);

  useEffect(() => { cargar(); }, [cargar]);

  // ── Check DNI ─────────────────────────────────────────────────────────────
  const checkDni = async (dni: string) => {
    if (!dni || dni.length < 7) { setAlertaCruce(null); return; }
    setCheckingDni(true);
    try {
      const res = await api.get(`/casos/check-dni/${dni}`);
      setAlertaCruce(res.data.alerta ? res.data.detalle : null);
    } catch {
      setAlertaCruce(null);
    } finally {
      setCheckingDni(false);
    }
  };

  // ── Crear caso ────────────────────────────────────────────────────────────
  const guardar = async () => {
    if (!form.nombreSolicitante.trim() || !form.descripcion.trim() || !form.tipo) {
      setErrorGuardar('Nombre, descripción y tipo son obligatorios.');
      return;
    }
    setSaving(true);
    setErrorGuardar('');
    try {
      await api.post('/casos', form);
      setCrearOpen(false);
      setForm({ ...FORM_VACIO });
      setAlertaCruce(null);
      cargar();
    } catch (e: any) {
      setErrorGuardar(e.response?.data?.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  // ── Subir doc ─────────────────────────────────────────────────────────────
  const subirDoc = async () => {
    if (!docFile || !docCasoId) return;
    setUploadingDoc(true);
    try {
      const fd = new FormData();
      fd.append('archivo', docFile);
      fd.append('nombre', docNombre || docFile.name);
      await api.post(`/casos/${docCasoId}/documentos`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDocCasoId(null);
      setDocFile(null);
      setDocNombre('');
      cargar();
    } catch {
      // silencioso
    } finally {
      setUploadingDoc(false);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          Mis Casos{esAsistencia ? ' — Asistencia Crítica' : ''}
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => {
          setForm({ ...FORM_VACIO, tipo: esAsistencia ? 'MERCADERIA' : 'ALIMENTARIO' });
          setAlertaCruce(null);
          setErrorGuardar('');
          setCrearOpen(true);
        }}>
          Nuevo Caso
        </Button>
      </Box>

      {/* Filtros */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          size="small" label="Buscar nombre / DNI / barrio"
          value={filtroBuscar} onChange={(e) => setFiltroBuscar(e.target.value)}
          sx={{ minWidth: 260 }}
        />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Estado</InputLabel>
          <Select value={filtroEstado} label="Estado" onChange={(e) => setFiltroEstado(e.target.value)}>
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="PENDIENTE">Pendiente</MenuItem>
            <MenuItem value="EN_REVISION">En revisión</MenuItem>
            <MenuItem value="APROBADO">Aprobado</MenuItem>
            <MenuItem value="RECHAZADO">Rechazado</MenuItem>
            <MenuItem value="RESUELTO">Resuelto</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Lista */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
          <CircularProgress />
        </Box>
      ) : casos.length === 0 ? (
        <Alert severity="info">No hay casos registrados.</Alert>
      ) : (
        <Grid container spacing={2}>
          {casos.map((caso) => (
            <Grid item xs={12} md={6} key={caso.id}>
              <Card variant="outlined" sx={{
                borderLeft: '4px solid',
                borderLeftColor:
                  caso.estado === 'APROBADO'    ? 'success.main' :
                  caso.estado === 'RECHAZADO'   ? 'error.main' :
                  caso.estado === 'EN_REVISION' ? 'info.main' :
                  caso.estado === 'RESUELTO'    ? 'text.disabled' : 'warning.main',
              }}>
                <CardContent sx={{ pb: 0 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {caso.nombreSolicitante}
                        {caso.alertaCruce && (
                          <Tooltip title={caso.detalleCruce ?? 'Cruce detectado'}>
                            <WarnIcon color="warning" fontSize="small" sx={{ ml: 1, verticalAlign: 'middle' }} />
                          </Tooltip>
                        )}
                      </Typography>
                      {caso.dni && <Typography variant="caption" color="text.secondary">DNI: {caso.dni}</Typography>}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <Chip label={caso.estado.replace('_', ' ')} size="small" color={ESTADO_COLOR[caso.estado] ?? 'default'} />
                      <Chip label={caso.prioridad} size="small" color={PRIORIDAD_COLOR[caso.prioridad] ?? 'default'} variant="outlined" />
                      <Chip label={TIPO_LABEL[caso.tipo] ?? caso.tipo} size="small" variant="outlined" />
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }} noWrap>
                    {caso.descripcion}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    {format(new Date(caso.createdAt), "d MMM yyyy 'a las' HH:mm", { locale: es })}
                    {caso.barrio ? ` · ${caso.barrio}` : ''}
                  </Typography>
                </CardContent>

                <CardActions sx={{ justifyContent: 'space-between' }}>
                  <Button
                    size="small"
                    endIcon={expandido === caso.id ? <CollapseIcon /> : <ExpandIcon />}
                    onClick={() => setExpandido(expandido === caso.id ? null : caso.id)}
                  >
                    {expandido === caso.id ? 'Cerrar' : 'Ver detalle'}
                  </Button>
                  {caso.remito && (
                    <Chip size="small" label={`Remito ${caso.remito.numero}`} color="success" />
                  )}
                </CardActions>

                <Collapse in={expandido === caso.id}>
                  <Divider />
                  <Box sx={{ p: 2 }}>
                    {caso.alertaCruce && (
                      <Alert severity="warning" sx={{ mb: 1.5 }}>
                        <strong>Alerta de cruce:</strong> {caso.detalleCruce}
                      </Alert>
                    )}
                    {caso.descripcion && (
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Situación:</strong> {caso.descripcion}
                      </Typography>
                    )}
                    {caso.direccion && <Typography variant="body2"><strong>Dirección:</strong> {caso.direccion}{caso.barrio ? `, ${caso.barrio}` : ''}</Typography>}
                    {caso.telefono  && <Typography variant="body2"><strong>Teléfono:</strong> {caso.telefono}</Typography>}
                    {caso.notaRevision && (
                      <Alert severity={caso.estado === 'RECHAZADO' ? 'error' : 'info'} sx={{ mt: 1 }}>
                        <strong>Nota del revisor:</strong> {caso.notaRevision}
                      </Alert>
                    )}

                    {/* Documentos */}
                    {caso.documentos?.length > 0 && (
                      <Box sx={{ mt: 1.5 }}>
                        <Typography variant="caption" fontWeight="bold" color="text.secondary">DOCUMENTOS</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                          {caso.documentos.map((doc: any) => (
                            <Chip
                              key={doc.id}
                              label={doc.nombre}
                              size="small"
                              icon={<AttachIcon />}
                              onClick={() => window.open(resolveUrl(doc.url), '_blank', 'noopener,noreferrer')}
                              clickable
                            />
                          ))}
                        </Box>
                      </Box>
                    )}

                    {/* Subir doc */}
                    {!['RESUELTO', 'RECHAZADO'].includes(caso.estado) && (
                      docCasoId === caso.id ? (
                        <Box sx={{ mt: 1.5, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                          <Button variant="outlined" size="small" component="label">
                            {docFile ? docFile.name : 'Seleccionar archivo'}
                            <input type="file" hidden onChange={(e) => setDocFile(e.target.files?.[0] ?? null)} />
                          </Button>
                          <TextField
                            size="small" label="Nombre del doc" value={docNombre}
                            onChange={(e) => setDocNombre(e.target.value)} sx={{ flex: 1, minWidth: 140 }}
                          />
                          <Button size="small" variant="contained" disabled={!docFile || uploadingDoc} onClick={subirDoc}>
                            {uploadingDoc ? <CircularProgress size={16} /> : 'Subir'}
                          </Button>
                          <Button size="small" onClick={() => { setDocCasoId(null); setDocFile(null); setDocNombre(''); }}>
                            Cancelar
                          </Button>
                        </Box>
                      ) : (
                        <Button
                          size="small" startIcon={<AttachIcon />} sx={{ mt: 1 }}
                          onClick={() => setDocCasoId(caso.id)}
                        >
                          Adjuntar documento
                        </Button>
                      )
                    )}
                  </Box>
                </Collapse>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* ── Dialog Nuevo Caso ───────────────────────────────────────────────── */}
      <Dialog open={crearOpen} onClose={() => setCrearOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nuevo Caso Particular</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          {errorGuardar && <Alert severity="error">{errorGuardar}</Alert>}

          <TextField
            label="Nombre del solicitante *"
            value={form.nombreSolicitante}
            onChange={(e) => setForm({ ...form, nombreSolicitante: e.target.value })}
            fullWidth
          />

          <TextField
            label="DNI"
            value={form.dni}
            onChange={(e) => setForm({ ...form, dni: e.target.value })}
            onBlur={(e) => checkDni(e.target.value)}
            fullWidth
            InputProps={{ endAdornment: checkingDni ? <CircularProgress size={16} /> : undefined }}
          />

          {alertaCruce && (
            <Alert severity="warning" icon={<WarnIcon />}>
              <strong>Cruce detectado:</strong> {alertaCruce}
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Dirección"
              value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
              fullWidth
            />
            <TextField
              label="Barrio"
              value={form.barrio}
              onChange={(e) => setForm({ ...form, barrio: e.target.value })}
              fullWidth
            />
          </Box>

          <TextField
            label="Teléfono"
            value={form.telefono}
            onChange={(e) => setForm({ ...form, telefono: e.target.value })}
            fullWidth
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Tipo *</InputLabel>
              <Select value={form.tipo} label="Tipo *" onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                <MenuItem value="ALIMENTARIO">Alimentario</MenuItem>
                <MenuItem value="MERCADERIA">Mercadería (materiales, chapas, etc.)</MenuItem>
                <MenuItem value="MIXTO">Mixto (alimentos + mercadería)</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Prioridad</InputLabel>
              <Select value={form.prioridad} label="Prioridad" onChange={(e) => setForm({ ...form, prioridad: e.target.value })}>
                <MenuItem value="BAJA">Baja</MenuItem>
                <MenuItem value="NORMAL">Normal</MenuItem>
                <MenuItem value="ALTA">Alta</MenuItem>
                <MenuItem value="URGENTE">Urgente</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <TextField
            label="Descripción de la situación *"
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            multiline rows={4}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCrearOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={guardar} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'Crear Caso'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
