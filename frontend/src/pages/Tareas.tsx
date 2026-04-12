import { useEffect, useState, useRef } from 'react';
import {
  Box, Typography, Paper, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, FormControl, InputLabel, Select, MenuItem,
  Chip, IconButton, Tooltip, Alert, CircularProgress, Grid, Card,
  CardContent, CardActions, List, ListItem, ListItemIcon, ListItemText,
} from '@mui/material';
import {
  Add as AddIcon, CheckCircle as DoneIcon, Delete as DeleteIcon,
  Assignment as TaskIcon, AttachFile as AttachIcon,
  InsertDriveFile as FileIcon, Image as ImageIcon, PictureAsPdf as PdfIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../services/api';
import { useAuthStore } from '../stores/authStore';

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

const API_BASE = import.meta.env.VITE_API_URL || '';

function getFileIcon(tipo?: string) {
  if (!tipo) return <FileIcon fontSize="small" />;
  if (tipo.startsWith('image/')) return <ImageIcon fontSize="small" color="primary" />;
  if (tipo === 'application/pdf') return <PdfIcon fontSize="small" color="error" />;
  return <FileIcon fontSize="small" color="action" />;
}

function fileUrl(url: string) {
  if (url.startsWith('http')) return url;
  return `${API_BASE}/${url}`;
}

export default function Tareas() {
  const { user } = useAuthStore();
  const [tareas, setTareas]           = useState<any[]>([]);
  const [programas, setProgramas]     = useState<any[]>([]);
  const [loading, setLoading]         = useState(false);
  // Filtro estado
  const [filtroEstado, setFiltroEstado]       = useState('ACTIVAS');
  const [filtroPrioridad, setFiltroPrioridad] = useState('');
  const [filtroPrograma, setFiltroPrograma]   = useState('');

  // Dialog crear
  const [crearOpen, setCrearOpen]     = useState(false);
  const [form, setForm]               = useState({
    titulo: '', descripcion: '', prioridad: 'MEDIA',
    asignadoA: '', programaId: '', vencimiento: '',
  });
  const [archivosNuevos, setArchivosNuevos] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving]           = useState(false);

  // Dialog completar
  const [completarOpen, setCompletarOpen] = useState(false);
  const [tareaSelec, setTareaSelec]       = useState<any>(null);
  const [completarNombre, setCompletarNombre] = useState('');
  const [completarNota, setCompletarNota]     = useState('');
  const [completando, setCompletando]         = useState(false);

  // Dialog ver archivos
  const [archivosOpen, setArchivosOpen] = useState(false);
  const [archTarea, setArchTarea]       = useState<any>(null);
  const addFileRef = useRef<HTMLInputElement>(null);
  const [subiendoArch, setSubiendoArch] = useState(false);

  const esAdmin = user?.rol === 'ADMIN';
  const puedeEditar = user && ['ADMIN', 'LOGISTICA', 'OPERADOR_PROGRAMA', 'TRABAJADORA_SOCIAL'].includes(user.rol);

  useEffect(() => {
    api.get('/programas').then((r) => setProgramas(r.data.filter((p: any) => p.activo))).catch(() => {});
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
      const fd = new FormData();
      fd.append('titulo', form.titulo);
      if (form.descripcion) fd.append('descripcion', form.descripcion);
      fd.append('prioridad', form.prioridad);
      if (form.asignadoA) fd.append('asignadoA', form.asignadoA);
      if (form.programaId) fd.append('programaId', form.programaId);
      if (form.vencimiento) fd.append('vencimiento', form.vencimiento);
      archivosNuevos.forEach((f) => fd.append('archivos', f));

      await api.post('/tareas', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setCrearOpen(false);
      setForm({ titulo: '', descripcion: '', prioridad: 'MEDIA', asignadoA: '', programaId: '', vencimiento: '' });
      setArchivosNuevos([]);
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
    if (!window.confirm('¿Eliminar esta tarea?')) return;
    await api.delete(`/tareas/${id}`).catch(() => {});
    cargarTareas();
  };

  // ── Archivos adjuntos ───────────────────────────────────────────────
  const abrirArchivos = (tarea: any) => {
    setArchTarea(tarea);
    setArchivosOpen(true);
  };

  const handleAgregarArchivos = async (files: FileList | null) => {
    if (!files?.length || !archTarea) return;
    setSubiendoArch(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append('archivos', f));
      const res = await api.post(`/tareas/${archTarea.id}/archivos`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setArchTarea(res.data);
      cargarTareas();
    } catch {
    } finally {
      setSubiendoArch(false);
    }
  };

  const handleEliminarArchivo = async (archivoId: number) => {
    if (!archTarea) return;
    await api.delete(`/tareas/${archTarea.id}/archivos/${archivoId}`).catch(() => {});
    // Recargar tarea
    const res = await api.get('/tareas', {
      params: filtroEstado === 'ACTIVAS' ? { estado: 'PENDIENTE,EN_PROGRESO' } : filtroEstado !== 'TODAS' ? { estado: filtroEstado } : {},
    });
    setTareas(res.data);
    const updated = res.data.find((t: any) => t.id === archTarea.id);
    if (updated) setArchTarea(updated);
  };

  // ── Archivos nuevos en dialog crear ──
  const handleFilesCrear = (files: FileList | null) => {
    if (!files) return;
    setArchivosNuevos((prev) => [...prev, ...Array.from(files)]);
  };

  const removeFileCrear = (idx: number) => {
    setArchivosNuevos((prev) => prev.filter((_, i) => i !== idx));
  };

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

      {/* Estadisticas rapidas */}
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
        <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
      ) : activeList.length === 0 ? (
        <Alert severity="info">No hay tareas con los filtros aplicados.</Alert>
      ) : (
        <Grid container spacing={2}>
          {activeList.map((tarea) => (
            <Grid item xs={12} sm={6} md={4} key={tarea.id}>
              <Card
                variant="outlined"
                sx={{
                  borderLeft: `4px solid`,
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
                  </Box>

                  {tarea.asignadoA && (
                    <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                      Asignado a: <strong>{tarea.asignadoA}</strong>
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

                  {/* Indicador de archivos adjuntos */}
                  {tarea.archivos?.length > 0 && (
                    <Chip
                      icon={<AttachIcon />}
                      label={`${tarea.archivos.length} archivo${tarea.archivos.length > 1 ? 's' : ''}`}
                      size="small"
                      variant="outlined"
                      sx={{ mt: 0.5, cursor: 'pointer' }}
                      onClick={() => abrirArchivos(tarea)}
                    />
                  )}

                  {tarea.estado === 'COMPLETADA' && (
                    <Box mt={1} p={1} bgcolor="success.50" borderRadius={1} sx={{ bgcolor: '#f0fff4' }}>
                      <Typography variant="caption" color="success.main" display="block">
                        Completada el {format(new Date(tarea.completadoAt), 'dd/MM/yyyy HH:mm', { locale: es })}
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
                  {/* Boton adjuntar archivos (siempre visible para roles con permiso) */}
                  {puedeEditar && (
                    <Tooltip title="Archivos adjuntos">
                      <IconButton size="small" color="primary" onClick={() => abrirArchivos(tarea)}>
                        <AttachIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
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
          ))}
        </Grid>
      )}

      {/* Dialog crear tarea */}
      <Dialog open={crearOpen} onClose={() => setCrearOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nueva tarea</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Titulo *" fullWidth size="small"
              value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              autoFocus
            />
            <TextField
              label="Descripcion" fullWidth size="small" multiline rows={3}
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
            <TextField
              label="Asignado a" fullWidth size="small"
              value={form.asignadoA} onChange={(e) => setForm({ ...form, asignadoA: e.target.value })}
              placeholder="Nombre de la persona responsable"
            />
            <TextField
              label="Fecha de vencimiento" type="date" size="small"
              value={form.vencimiento} onChange={(e) => setForm({ ...form, vencimiento: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />

            {/* Archivos adjuntos */}
            <Box>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                style={{ display: 'none' }}
                onChange={(e) => { handleFilesCrear(e.target.files); e.target.value = ''; }}
              />
              <Button
                variant="outlined"
                startIcon={<AttachIcon />}
                onClick={() => fileInputRef.current?.click()}
                size="small"
              >
                Adjuntar archivos
              </Button>
              {archivosNuevos.length > 0 && (
                <List dense sx={{ mt: 1 }}>
                  {archivosNuevos.map((f, i) => (
                    <ListItem
                      key={i}
                      secondaryAction={
                        <IconButton edge="end" size="small" onClick={() => removeFileCrear(i)}>
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      }
                    >
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        {getFileIcon(f.type)}
                      </ListItemIcon>
                      <ListItemText
                        primary={f.name}
                        secondary={`${(f.size / 1024).toFixed(0)} KB`}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCrearOpen(false); setArchivosNuevos([]); }}>Cancelar</Button>
          <Button variant="contained" onClick={handleCrear} disabled={saving || !form.titulo.trim()}>
            {saving ? 'Guardando...' : 'Crear tarea'}
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
              label="¿Quien completo esta tarea?" fullWidth size="small"
              value={completarNombre} onChange={(e) => setCompletarNombre(e.target.value)}
              placeholder="Nombre (opcional)"
            />
            <TextField
              label="Nota o comentario" fullWidth size="small" multiline rows={3}
              value={completarNota} onChange={(e) => setCompletarNota(e.target.value)}
              placeholder="¿Como se resolvio? (opcional)"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompletarOpen(false)}>Cancelar</Button>
          <Button variant="contained" color="success" onClick={handleCompletar} disabled={completando}>
            {completando ? 'Guardando...' : 'Marcar como completada'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog archivos adjuntos */}
      <Dialog open={archivosOpen} onClose={() => setArchivosOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <AttachIcon color="primary" />
            Archivos adjuntos
          </Box>
        </DialogTitle>
        <DialogContent>
          {archTarea && (
            <>
              <Typography variant="body2" color="text.secondary" mb={2}>
                {archTarea.titulo}
              </Typography>

              {(!archTarea.archivos || archTarea.archivos.length === 0) ? (
                <Alert severity="info" sx={{ mb: 2 }}>No hay archivos adjuntos.</Alert>
              ) : (
                <List dense>
                  {archTarea.archivos.map((arch: any) => (
                    <ListItem
                      key={arch.id}
                      secondaryAction={
                        puedeEditar && (
                          <Tooltip title="Eliminar archivo">
                            <IconButton
                              edge="end"
                              size="small"
                              color="error"
                              onClick={() => handleEliminarArchivo(arch.id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )
                      }
                    >
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        {getFileIcon(arch.tipo)}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <a
                            href={fileUrl(arch.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'inherit', textDecoration: 'underline' }}
                          >
                            {arch.nombre}
                          </a>
                        }
                        secondary={format(new Date(arch.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </List>
              )}

              {/* Boton agregar mas archivos */}
              {puedeEditar && (
                <Box mt={1}>
                  <input
                    ref={addFileRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                    style={{ display: 'none' }}
                    onChange={(e) => { handleAgregarArchivos(e.target.files); e.target.value = ''; }}
                  />
                  <Button
                    variant="outlined"
                    startIcon={subiendoArch ? <CircularProgress size={16} /> : <AddIcon />}
                    onClick={() => addFileRef.current?.click()}
                    disabled={subiendoArch}
                    size="small"
                  >
                    {subiendoArch ? 'Subiendo...' : 'Agregar archivos'}
                  </Button>
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setArchivosOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
