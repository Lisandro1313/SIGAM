import { useEffect, useRef, useState } from 'react';
import {
  Box, Typography, Paper, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, FormControl, InputLabel, Select, MenuItem,
  Chip, IconButton, Tooltip, Alert, CircularProgress, Grid, Card, Skeleton,
  CardContent, CardActions, List, ListItem, ListItemText, ListItemSecondaryAction,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon, CheckCircle as DoneIcon, Delete as DeleteIcon,
  Assignment as TaskIcon, AttachFile as AttachIcon, CloudUpload as UploadIcon,
  InsertDriveFile as FileIcon, OpenInNew as OpenIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { useConfirm } from '../hooks/useConfirm';
import { useLocalStorage } from '../hooks/useLocalStorage';

const PRIORIDAD_COLOR: Record<string, 'error' | 'warning' | 'default' | 'info'> = {
  URGENTE: 'error',
  ALTA: 'warning',
  MEDIA: 'default',
  BAJA: 'info',
};

const ESTADO_COLOR: Record<string, 'warning' | 'info' | 'success' | 'error'> = {
  PENDIENTE: 'warning',
  EN_PROGRESO: 'info',
  COMPLETADA: 'success',
  CANCELADA: 'error',
};

export default function Tareas() {
  const { user } = useAuthStore();
  const { confirm, ConfirmDialog } = useConfirm();
  const [tareas, setTareas]           = useState<any[]>([]);
  const [programas, setProgramas]     = useState<any[]>([]);
  const [personalList, setPersonalList] = useState<any[]>([]);
  const [loading, setLoading]         = useState(false);
  const [filtroEstado, setFiltroEstado]       = useLocalStorage('tareas.filtroEstado', 'ACTIVAS');
  const [filtroPrioridad, setFiltroPrioridad] = useLocalStorage('tareas.filtroPrioridad', '');
  const [filtroPrograma, setFiltroPrograma]   = useLocalStorage('tareas.filtroPrograma', '');

  // Dialog crear
  const [crearOpen, setCrearOpen]     = useState(false);
  const [form, setForm]               = useState({
    titulo: '', descripcion: '', prioridad: 'MEDIA',
    personalId: '', programaId: '', vencimiento: '',
  });
  const [saving, setSaving]           = useState(false);

  // Dialog completar
  const [completarOpen, setCompletarOpen] = useState(false);
  const [tareaSelec, setTareaSelec]       = useState<any>(null);
  const [completarNombre, setCompletarNombre] = useState('');
  const [completarNota, setCompletarNota]     = useState('');
  const [completando, setCompletando]         = useState(false);

  // Dialog adjuntos
  const [adjuntosOpen, setAdjuntosOpen]   = useState(false);
  const [tareaAdj, setTareaAdj]           = useState<any>(null);
  const [documentos, setDocumentos]       = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs]     = useState(false);
  const [uploadingDoc, setUploadingDoc]   = useState(false);
  const fileInputRef                      = useRef<HTMLInputElement>(null);

  const esAdmin = user?.rol === 'ADMIN';
  const puedeAdjuntar = ['ADMIN', 'LOGISTICA', 'OPERADOR_PROGRAMA', 'TRABAJADORA_SOCIAL'].includes(user?.rol ?? '');

  useEffect(() => {
    api.get('/programas').then((r) => setProgramas(r.data.filter((p: any) => p.activo))).catch(() => {});
    api.get('/personal').then((r) => setPersonalList(r.data)).catch(() => {});
    cargarTareas();
  }, [filtroEstado, filtroPrioridad, filtroPrograma]);

  const cargarTareas = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filtroEstado === 'ACTIVAS') {
        params.estado = 'PENDIENTE,EN_PROGRESO';
      } else if (filtroEstado !== 'TODAS') {
        params.estado = filtroEstado;
      }
      if (filtroPrioridad) params.prioridad = filtroPrioridad;
      if (filtroPrograma)  params.programaId = filtroPrograma;
      const res = await api.get('/tareas', { params });
      setTareas(res.data);
    } catch {
      setTareas([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCrear = async () => {
    if (!form.titulo.trim()) return;
    setSaving(true);
    try {
      const body: any = { ...form };
      if (body.personalId === '') delete body.personalId;
      else body.personalId = parseInt(body.personalId);
      if (body.programaId === '') delete body.programaId;
      if (body.vencimiento === '') delete body.vencimiento;
      // Autocompletar asignadoA con el nombre del personal seleccionado
      if (body.personalId) {
        const p = personalList.find((x: any) => x.id === body.personalId);
        if (p) body.asignadoA = p.nombre;
      }
      await api.post('/tareas', body);
      setCrearOpen(false);
      setForm({ titulo: '', descripcion: '', prioridad: 'MEDIA', personalId: '', programaId: '', vencimiento: '' });
      cargarTareas();
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const abrirCompletar = (tarea: any) => {
    setTareaSelec(tarea);
    setCompletarNombre('');
    setCompletarNota('');
    setCompletarOpen(true);
  };

  const handleCompletar = async () => {
    if (!tareaSelec) return;
    setCompletando(true);
    try {
      await api.post(`/tareas/${tareaSelec.id}/completar`, {
        completadoPorNombre: completarNombre || undefined,
        completadoNota: completarNota || undefined,
      });
      setCompletarOpen(false);
      cargarTareas();
    } catch {
    } finally {
      setCompletando(false);
    }
  };

  const handleEliminar = async (id: number) => {
    const ok = await confirm({ title: 'Eliminar tarea', message: '¿Seguro que querés eliminar esta tarea?', confirmText: 'Eliminar', confirmColor: 'error' });
    if (!ok) return;
    await api.delete(`/tareas/${id}`).catch(() => {});
    cargarTareas();
  };

  // ── Adjuntos ────────────────────────────────────────────────────────────────

  const abrirAdjuntos = async (tarea: any) => {
    setTareaAdj(tarea);
    setAdjuntosOpen(true);
    // Usar los documentos ya incluidos en la tarea si están disponibles
    const docsIniciales = tarea.documentos ?? [];
    setDocumentos(docsIniciales);
    if (docsIniciales.length === 0) {
      setLoadingDocs(true);
      try {
        const res = await api.get(`/tareas/${tarea.id}/documentos`);
        setDocumentos(res.data);
      } catch {
      } finally {
        setLoadingDocs(false);
      }
    }
  };

  const handleSubirArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tareaAdj) return;
    setUploadingDoc(true);
    try {
      const fd = new FormData();
      fd.append('archivo', file);
      fd.append('nombre', file.name);
      const res = await api.post(`/tareas/${tareaAdj.id}/documentos`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDocumentos((prev) => [...prev, res.data]);
      // Actualizar el contador en la tarjeta
      setTareas((prev) => prev.map((t) =>
        t.id === tareaAdj.id
          ? { ...t, documentos: [...(t.documentos ?? []), res.data] }
          : t,
      ));
    } catch {
    } finally {
      setUploadingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleEliminarDoc = async (docId: number) => {
    if (!tareaAdj) return;
    await api.delete(`/tareas/${tareaAdj.id}/documentos/${docId}`).catch(() => {});
    setDocumentos((prev) => prev.filter((d) => d.id !== docId));
    setTareas((prev) => prev.map((t) =>
      t.id === tareaAdj.id
        ? { ...t, documentos: (t.documentos ?? []).filter((d: any) => d.id !== docId) }
        : t,
    ));
  };

  // ────────────────────────────────────────────────────────────────────────────

  const pendientes   = tareas.filter((t) => t.estado === 'PENDIENTE');
  const enProgreso   = tareas.filter((t) => t.estado === 'EN_PROGRESO');
  const completadas  = tareas.filter((t) => t.estado === 'COMPLETADA');
  const canceladas   = tareas.filter((t) => t.estado === 'CANCELADA');

  const activeList = filtroEstado === 'ACTIVAS'
    ? [...tareas.filter((t) => t.estado !== 'COMPLETADA' && t.estado !== 'CANCELADA')]
    : filtroEstado === 'COMPLETADA' ? completadas
    : filtroEstado === 'CANCELADA' ? canceladas
    : tareas;

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <TaskIcon color="primary" />
          <Typography variant="h4" fontWeight="bold">Tareas y Pendientes</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCrearOpen(true)}>
          Nueva tarea
        </Button>
      </Box>

      {/* Estadísticas rápidas */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'PENDIENTES', value: pendientes.length, color: 'warning.main' },
          { label: 'EN PROGRESO', value: enProgreso.length, color: 'info.main' },
          { label: 'COMPLETADAS', value: completadas.length, color: 'success.main' },
          { label: 'URGENTES', value: tareas.filter((t) => t.prioridad === 'URGENTE' && t.estado !== 'COMPLETADA').length, color: 'error.main' },
        ].map((s, i) => (
          <Grid item xs={6} sm={3} key={i}>
            <Card variant="outlined">
              <CardContent sx={{ py: 1.5 }}>
                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                <Typography variant="h4" fontWeight="bold" color={s.color}>{s.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Filtros */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
          <FormControl size="small" sx={{ width: 160 }}>
            <InputLabel>Estado</InputLabel>
            <Select value={filtroEstado} label="Estado" onChange={(e) => setFiltroEstado(e.target.value)}>
              <MenuItem value="ACTIVAS">Activas</MenuItem>
              <MenuItem value="TODAS">Todas</MenuItem>
              <MenuItem value="PENDIENTE">Pendiente</MenuItem>
              <MenuItem value="EN_PROGRESO">En progreso</MenuItem>
              <MenuItem value="COMPLETADA">Completadas</MenuItem>
              <MenuItem value="CANCELADA">Canceladas</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ width: 150 }}>
            <InputLabel>Prioridad</InputLabel>
            <Select value={filtroPrioridad} label="Prioridad" onChange={(e) => setFiltroPrioridad(e.target.value)}>
              <MenuItem value="">Todas</MenuItem>
              {['URGENTE', 'ALTA', 'MEDIA', 'BAJA'].map((p) => (
                <MenuItem key={p} value={p}>{p}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ width: 200 }}>
            <InputLabel>Programa</InputLabel>
            <Select value={filtroPrograma} label="Programa" onChange={(e) => setFiltroPrograma(e.target.value)}>
              <MenuItem value="">Todos</MenuItem>
              {programas.map((p) => <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {loading ? (
        <Grid container spacing={2}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Card variant="outlined" sx={{ p: 2 }}>
                <Skeleton variant="text" width="70%" height={28} />
                <Skeleton variant="text" width="40%" />
                <Skeleton variant="rectangular" height={48} sx={{ mt: 1, borderRadius: 1 }} />
                <Box display="flex" gap={1} mt={1}>
                  <Skeleton variant="rounded" width={60} height={24} />
                  <Skeleton variant="rounded" width={80} height={24} />
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : activeList.length === 0 ? (
        <Alert severity="info">No hay tareas con los filtros aplicados.</Alert>
      ) : (
        <Grid container spacing={2}>
          {activeList.map((tarea) => {
            const cantAdj = (tarea.documentos ?? []).length;
            return (
              <Grid item xs={12} sm={6} md={4} key={tarea.id}>
                <Card
                  variant="outlined"
                  sx={{
                    borderLeft: '4px solid',
                    borderLeftColor:
                      tarea.prioridad === 'URGENTE' ? 'error.main'
                      : tarea.prioridad === 'ALTA'    ? 'warning.main'
                      : tarea.prioridad === 'MEDIA'   ? 'primary.main'
                      : 'grey.400',
                    opacity: tarea.estado === 'COMPLETADA' || tarea.estado === 'CANCELADA' ? 0.75 : 1,
                  }}
                >
                  <CardContent sx={{ pb: 1 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={0.5}>
                      <Typography variant="body1" fontWeight="medium" sx={{ flex: 1, mr: 1 }}>
                        {tarea.titulo}
                      </Typography>
                      <Chip
                        label={tarea.prioridad}
                        size="small"
                        color={PRIORIDAD_COLOR[tarea.prioridad] ?? 'default'}
                        sx={{ flexShrink: 0 }}
                      />
                    </Box>

                    {tarea.descripcion && (
                      <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                        {tarea.descripcion}
                      </Typography>
                    )}

                    <Box display="flex" gap={0.5} flexWrap="wrap" mt={0.5}>
                      <Chip label={tarea.estado.replace('_', ' ')} size="small" color={ESTADO_COLOR[tarea.estado] ?? 'default'} variant="outlined" />
                      {tarea.programa && <Chip label={tarea.programa.nombre} size="small" variant="outlined" />}
                      {cantAdj > 0 && (
                        <Chip
                          icon={<AttachIcon sx={{ fontSize: 14 }} />}
                          label={cantAdj}
                          size="small"
                          variant="outlined"
                          color="default"
                          onClick={() => abrirAdjuntos(tarea)}
                          sx={{ cursor: 'pointer' }}
                        />
                      )}
                    </Box>

                    {(tarea.personal || tarea.asignadoA) && (
                      <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                        Asignado a: <strong>{tarea.personal?.nombre || tarea.asignadoA}</strong>
                        {tarea.personal?.cargo && ` (${tarea.personal.cargo})`}
                      </Typography>
                    )}

                    {tarea.vencimiento && (
                      <Typography
                        variant="caption"
                        display="block"
                        mt={0.5}
                        color={new Date(tarea.vencimiento) < new Date() && tarea.estado !== 'COMPLETADA' ? 'error.main' : 'text.secondary'}
                      >
                        Vence: {format(new Date(tarea.vencimiento), 'dd/MM/yyyy', { locale: es })}
                      </Typography>
                    )}

                    {tarea.estado === 'COMPLETADA' && (
                      <Box mt={1} p={1} borderRadius={1} sx={{ bgcolor: '#f0fff4' }}>
                        <Typography variant="caption" color="success.main" display="block">
                          ✓ Completada el {format(new Date(tarea.completadoAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                        </Typography>
                        {tarea.completadoPorNombre && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            Por: {tarea.completadoPorNombre}
                          </Typography>
                        )}
                        {tarea.completadoNota && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            Nota: {tarea.completadoNota}
                          </Typography>
                        )}
                      </Box>
                    )}
                  </CardContent>

                  <CardActions sx={{ pt: 0, justifyContent: 'flex-end' }}>
                    <Tooltip title={`Adjuntos${cantAdj > 0 ? ` (${cantAdj})` : ''}`}>
                      <IconButton size="small" onClick={() => abrirAdjuntos(tarea)} color={cantAdj > 0 ? 'primary' : 'default'}>
                        <AttachIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {tarea.estado !== 'COMPLETADA' && tarea.estado !== 'CANCELADA' && (
                      <Button
                        size="small"
                        color="success"
                        startIcon={<DoneIcon />}
                        onClick={() => abrirCompletar(tarea)}
                      >
                        Completar
                      </Button>
                    )}
                    {esAdmin && (
                      <Tooltip title="Eliminar">
                        <IconButton size="small" color="error" onClick={() => handleEliminar(tarea.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Dialog crear tarea */}
      <Dialog open={crearOpen} onClose={() => setCrearOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nueva tarea</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Título *" fullWidth size="small"
              value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              autoFocus
            />
            <TextField
              label="Descripción" fullWidth size="small" multiline rows={3}
              value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            />
            <Box display="flex" gap={2}>
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>Prioridad</InputLabel>
                <Select value={form.prioridad} label="Prioridad" onChange={(e) => setForm({ ...form, prioridad: e.target.value })}>
                  {['URGENTE', 'ALTA', 'MEDIA', 'BAJA'].map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>Programa</InputLabel>
                <Select value={form.programaId} label="Programa" onChange={(e) => setForm({ ...form, programaId: e.target.value })}>
                  <MenuItem value="">Ninguno</MenuItem>
                  {programas.map((p) => <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>)}
                </Select>
              </FormControl>
            </Box>
            <FormControl size="small" fullWidth>
              <InputLabel>Asignar a</InputLabel>
              <Select
                value={form.personalId}
                label="Asignar a"
                onChange={(e) => setForm({ ...form, personalId: e.target.value })}
              >
                <MenuItem value="">Sin asignar</MenuItem>
                {personalList.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.nombre}{p.cargo ? ` — ${p.cargo}` : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Fecha de vencimiento" type="date" size="small"
              value={form.vencimiento} onChange={(e) => setForm({ ...form, vencimiento: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCrearOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleCrear} disabled={saving || !form.titulo.trim()}>
            {saving ? 'Guardando…' : 'Crear tarea'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog completar tarea */}
      <Dialog open={completarOpen} onClose={() => setCompletarOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <DoneIcon color="success" />
            Completar tarea
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            {tareaSelec?.titulo}
          </Typography>
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField
              label="¿Quién completó esta tarea?" fullWidth size="small"
              value={completarNombre} onChange={(e) => setCompletarNombre(e.target.value)}
              placeholder="Nombre (opcional)"
            />
            <TextField
              label="Nota o comentario" fullWidth size="small" multiline rows={3}
              value={completarNota} onChange={(e) => setCompletarNota(e.target.value)}
              placeholder="¿Cómo se resolvió? (opcional)"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompletarOpen(false)}>Cancelar</Button>
          <Button variant="contained" color="success" onClick={handleCompletar} disabled={completando}>
            {completando ? 'Guardando…' : 'Marcar como completada'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog adjuntos */}
      <Dialog open={adjuntosOpen} onClose={() => setAdjuntosOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <AttachIcon color="primary" />
            Adjuntos — {tareaAdj?.titulo}
          </Box>
        </DialogTitle>
        <DialogContent>
          {loadingDocs ? (
            <Box display="flex" justifyContent="center" py={3}><CircularProgress size={28} /></Box>
          ) : documentos.length === 0 ? (
            <Typography variant="body2" color="text.secondary" py={2} textAlign="center">
              Sin archivos adjuntos todavía.
            </Typography>
          ) : (
            <List dense disablePadding>
              {documentos.map((doc, idx) => (
                <Box key={doc.id}>
                  {idx > 0 && <Divider />}
                  <ListItem disableGutters sx={{ py: 0.5 }}>
                    <FileIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                    <ListItemText
                      primary={doc.nombre}
                      secondary={format(new Date(doc.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                      primaryTypographyProps={{ variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                    <ListItemSecondaryAction>
                      <Tooltip title="Abrir">
                        <IconButton size="small" component="a" href={doc.url} target="_blank" rel="noopener">
                          <OpenIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {puedeAdjuntar && (
                        <Tooltip title="Eliminar">
                          <IconButton size="small" color="error" onClick={() => handleEliminarDoc(doc.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </ListItemSecondaryAction>
                  </ListItem>
                </Box>
              ))}
            </List>
          )}

          {puedeAdjuntar && (
            <Box mt={2}>
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: 'none' }}
                onChange={handleSubirArchivo}
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
              />
              <Button
                variant="outlined"
                startIcon={uploadingDoc ? <CircularProgress size={16} /> : <UploadIcon />}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingDoc}
                fullWidth
              >
                {uploadingDoc ? 'Subiendo…' : 'Adjuntar archivo'}
              </Button>
              <Typography variant="caption" color="text.secondary" display="block" textAlign="center" mt={0.5}>
                Imágenes, PDF, Word, Excel, CSV — máx. 10 MB
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdjuntosOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
      {ConfirmDialog}
    </Box>
  );
}
