import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Box, Typography, Paper, Tabs, Tab, Card, CardContent, CardActions,
  Button, Stack, Chip, TextField, InputAdornment, Table, TableBody,
  TableCell, TableHead, TableRow, TableContainer, IconButton, Tooltip,
  useTheme, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, LinearProgress, Snackbar, ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import {
  Description as DescIcon,
  Print as PrintIcon,
  Search as SearchIcon,
  CheckCircle as CheckIcon,
  CloudOff as CloudOffIcon,
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  OpenInNew as OpenIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  InsertDriveFile as FileIcon,
  Edit as EditIcon,
  ContentCopy as CopyIcon,
  Add as AddIcon,
  Restore as RestoreIcon,
  AssignmentTurnedIn as ListIcon,
  Receipt as ReceiptIcon,
  Inventory2 as Inventory2Icon,
  ContactMail as ContactMailIcon,
  Restaurant as RestaurantIcon,
  Visibility as PreviewIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import api from '../services/api';
import { useAuthStore } from '../stores/authStore';
import ListasSeguimientoTab from '../components/ListasSeguimientoTab';

const ROLES_SUBIDA = ['ADMIN', 'LOGISTICA', 'OPERADOR_PROGRAMA', 'ASISTENCIA_CRITICA'];
const ROLES_EDIT_PLANTILLA = ['ADMIN', 'OPERADOR_PROGRAMA', 'LOGISTICA', 'ASISTENCIA_CRITICA'];

const CATEGORIAS_DOC = [
  { value: 'REMITOS',       label: 'Remitos',       color: '#43a047' },
  { value: 'BENEFICIARIOS', label: 'Beneficiarios', color: '#1e88e5' },
  { value: 'RENDICIONES',   label: 'Rendiciones',   color: '#00897b' },
  { value: 'NORMATIVA',     label: 'Normativa',     color: '#8e24aa' },
  { value: 'MODELOS',       label: 'Modelos',       color: '#fb8c00' },
  { value: 'OTRO',          label: 'Otro',          color: '#757575' },
];

const CATEGORIAS_PLANTILLA = ['Operativo', 'Remitos', 'Beneficiarios', 'Nutrición', 'Otro'];

interface Plantilla {
  id: number;
  titulo: string;
  descripcion: string;
  categoria: string;
  contenido: string;
  icono?: string;
  color?: string;
  esBuiltIn: boolean;
  creadoPorNombre?: string;
}

interface DocumentoSubido {
  id: number;
  nombre: string;
  archivo: string;
  url: string;
  categoria: string;
  descripcion?: string;
  tipo?: string;
  tamanioBytes?: number;
  subidoPorNombre?: string;
  createdAt: string;
}

interface EspacioTracking {
  id: number;
  nombre: string;
  localidad?: string;
  responsableNombre?: string;
  responsableDNI?: string;
  ultimaEntrega?: string;
  diasSinRetiro: number | null;
  estado: 'ok' | 'pendiente' | 'vencido';
}

const ICONOS_PLANTILLA: Record<string, JSX.Element> = {
  list: <ListIcon />,
  receipt: <ReceiptIcon />,
  inventory: <Inventory2Icon />,
  mail: <ContactMailIcon />,
  restaurant: <RestaurantIcon />,
  description: <DescIcon />,
};

function formatBytes(b?: number): string {
  if (!b) return '—';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function iconForType(tipo?: string) {
  if (!tipo) return <FileIcon />;
  if (tipo.startsWith('image/')) return <ImageIcon color="info" />;
  if (tipo === 'application/pdf') return <PdfIcon sx={{ color: '#d32f2f' }} />;
  return <FileIcon color="action" />;
}

function tablaEspacios(espacios: EspacioTracking[]): string {
  if (espacios.length === 0) return '<p><em>— sin espacios seleccionados —</em></p>';
  const filas = espacios.map((b, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${b.nombre}</td>
      <td>${b.localidad ?? ''}</td>
      <td>${b.responsableNombre ?? ''}</td>
      <td>${b.responsableDNI ?? ''}</td>
      <td>${b.ultimaEntrega ?? '—'}</td>
      <td style="height:32px;"></td>
    </tr>`).join('');
  return `
    <table>
      <thead>
        <tr>
          <th style="width:30px;">#</th>
          <th>Espacio / Beneficiario</th>
          <th>Localidad</th>
          <th>Responsable</th>
          <th>DNI</th>
          <th>Última entrega</th>
          <th style="width:140px;">Firma</th>
        </tr>
      </thead>
      <tbody>${filas}</tbody>
    </table>
    <div class="small" style="margin-top:6px;">Total: ${espacios.length} registros.</div>
  `;
}

function interpolar(html: string, ctx: { usuario?: string; seleccionados?: EspacioTracking[] }): string {
  const hoy = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return html
    .replace(/\{\{FECHA\}\}/g, hoy)
    .replace(/\{\{USUARIO\}\}/g, ctx.usuario ?? '')
    .replace(/\{\{CANTIDAD_SELECCIONADOS\}\}/g, String(ctx.seleccionados?.length ?? 0))
    .replace(/\{\{LISTA_SELECCIONADOS\}\}/g, tablaEspacios(ctx.seleccionados ?? []));
}

function imprimir(contenido: string, titulo: string, ctx: any) {
  const html = interpolar(contenido, ctx);
  const hoy = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) { alert('Habilitá pop-ups para imprimir.'); return; }
  w.document.write(`
    <!doctype html><html><head><meta charset="utf-8"/><title>${titulo}</title>
      <style>
        @page { margin: 18mm 14mm; size: A4 portrait; }
        body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color:#222; }
        h1 { font-size: 18px; margin: 0 0 4px 0; }
        h2 { font-size: 14px; margin: 16px 0 6px 0; color:#1976d2; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; vertical-align: top; }
        th { background: #f0f4f8; font-size: 11px; }
        .firma-box { display:inline-block; width:48%; border-top:1px solid #333; padding-top:4px; text-align:center; margin-top:48px; }
        .obs { min-height:60px; border:1px solid #999; padding:6px; }
        .small { font-size: 10px; color:#666; }
        @media print { .no-print { display: none; } }
      </style></head><body>
      <div style="display:flex; align-items:center; justify-content:space-between; border-bottom:2px solid #1976d2; padding-bottom:8px; margin-bottom:16px;">
        <div>
          <div style="font-size:14px; font-weight:bold; color:#1976d2;">MUNICIPALIDAD DE LA PLATA</div>
          <div style="font-size:11px; color:#555;">Secretaría de Desarrollo Social — Política Alimentaria</div>
        </div>
        <div style="text-align:right; font-size:11px; color:#666;">Fecha: ${hoy}</div>
      </div>
      ${html}
      <div style="margin-top:48px; border-top:1px dashed #aaa; padding-top:8px; font-size:10px; color:#888; text-align:center;">
        Generado por SIGAM — Sistema Integral de Gestión Alimentaria Municipal
      </div>
      <div class="no-print" style="margin-top:24px; text-align:center;">
        <button onclick="window.print()" style="padding:10px 20px; font-size:14px; background:#1976d2; color:white; border:none; border-radius:4px; cursor:pointer;">Imprimir</button>
      </div>
    </body></html>
  `);
  w.document.close();
}

export default function DocumentacionPage() {
  const theme = useTheme();
  const { user } = useAuthStore();
  const puedeSubir = !!user && ROLES_SUBIDA.includes(user.rol);
  const puedeEditarPlantilla = !!user && ROLES_EDIT_PLANTILLA.includes(user.rol);
  const esAdmin = user?.rol === 'ADMIN';

  const [tab, setTab] = useState(0);
  const [snack, setSnack] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  // ── Modelos (plantillas) ──────────────────────────────────────────────
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [loadingPlantillas, setLoadingPlantillas] = useState(false);
  const [searchPlantilla, setSearchPlantilla] = useState('');
  const [catPlantilla, setCatPlantilla] = useState<string>('todas');

  // edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Plantilla | null>(null);
  const [editTitulo, setEditTitulo] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCat, setEditCat] = useState('Operativo');
  const [editContenido, setEditContenido] = useState('');
  const [editColor, setEditColor] = useState('#1976d2');
  const [saving, setSaving] = useState(false);

  const cargarPlantillas = async () => {
    setLoadingPlantillas(true);
    try {
      const { data } = await api.get('/plantillas-doc');
      setPlantillas(data ?? []);
    } catch (e: any) {
      setSnack({ msg: e?.response?.data?.message ?? 'Error cargando plantillas', type: 'error' });
    } finally { setLoadingPlantillas(false); }
  };

  useEffect(() => { cargarPlantillas(); }, []);

  const plantillasFiltradas = useMemo(() => {
    return plantillas.filter((p) => {
      if (catPlantilla !== 'todas' && p.categoria !== catPlantilla) return false;
      if (searchPlantilla.trim()) {
        const q = searchPlantilla.toLowerCase();
        return p.titulo.toLowerCase().includes(q) || p.descripcion.toLowerCase().includes(q);
      }
      return true;
    });
  }, [plantillas, searchPlantilla, catPlantilla]);

  const abrirEdit = (p: Plantilla | null) => {
    setEditing(p);
    setEditTitulo(p?.titulo ?? '');
    setEditDesc(p?.descripcion ?? '');
    setEditCat(p?.categoria ?? 'Operativo');
    setEditContenido(p?.contenido ?? '<h1>Nuevo modelo</h1>\n<p>Contenido aquí...</p>');
    setEditColor(p?.color ?? '#1976d2');
    setEditOpen(true);
  };

  const guardarPlantilla = async () => {
    if (!editTitulo.trim()) { setSnack({ msg: 'El título es obligatorio', type: 'error' }); return; }
    setSaving(true);
    try {
      const payload = { titulo: editTitulo, descripcion: editDesc, categoria: editCat, contenido: editContenido, color: editColor };
      if (editing) await api.patch(`/plantillas-doc/${editing.id}`, payload);
      else await api.post('/plantillas-doc', payload);
      setSnack({ msg: editing ? 'Modelo actualizado' : 'Modelo creado', type: 'success' });
      setEditOpen(false);
      cargarPlantillas();
    } catch (e: any) {
      setSnack({ msg: e?.response?.data?.message ?? 'Error al guardar', type: 'error' });
    } finally { setSaving(false); }
  };

  const duplicarPlantilla = async (id: number) => {
    try {
      await api.post(`/plantillas-doc/${id}/duplicar`);
      setSnack({ msg: 'Modelo duplicado', type: 'success' });
      cargarPlantillas();
    } catch (e: any) { setSnack({ msg: e?.response?.data?.message ?? 'Error', type: 'error' }); }
  };

  const eliminarPlantilla = async (id: number) => {
    if (!confirm('¿Eliminar este modelo?')) return;
    try {
      await api.delete(`/plantillas-doc/${id}`);
      setSnack({ msg: 'Modelo eliminado', type: 'success' });
      cargarPlantillas();
    } catch (e: any) { setSnack({ msg: e?.response?.data?.message ?? 'Error', type: 'error' }); }
  };

  const resetDefaults = async () => {
    if (!confirm('¿Restaurar los modelos predefinidos al contenido original? Las plantillas custom no se tocan.')) return;
    try {
      await api.post('/plantillas-doc/reset-defaults');
      setSnack({ msg: 'Modelos predefinidos restaurados', type: 'success' });
      cargarPlantillas();
    } catch (e: any) { setSnack({ msg: e?.response?.data?.message ?? 'Error', type: 'error' }); }
  };

  // ── Repositorio de archivos subidos ─────────────────────────────────
  const [docs, setDocs] = useState<DocumentoSubido[]>([]);
  const [conteoCat, setConteoCat] = useState<Record<string, number>>({});
  const [filtroCatDoc, setFiltroCatDoc] = useState<string>('TODAS');
  const [searchDocs, setSearchDocs] = useState('');
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadNombre, setUploadNombre] = useState('');
  const [uploadCat, setUploadCat] = useState('OTRO');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cargarDocs = async () => {
    setLoadingDocs(true);
    try {
      const res = await api.get('/documentos', { params: { categoria: filtroCatDoc, q: searchDocs } });
      setDocs(res.data.items ?? []);
      setConteoCat(res.data.porCategoria ?? {});
    } catch (e: any) { setSnack({ msg: e?.response?.data?.message ?? 'Error', type: 'error' }); }
    finally { setLoadingDocs(false); }
  };

  useEffect(() => {
    if (tab !== 2) return;
    const t = setTimeout(cargarDocs, 250);
    return () => clearTimeout(t);
  }, [tab, filtroCatDoc, searchDocs]);

  const handleFile = (f: File | null) => {
    setUploadFile(f);
    if (f && !uploadNombre) setUploadNombre(f.name.replace(/\.[^.]+$/, ''));
  };

  const handleUpload = async () => {
    if (!uploadFile) { setSnack({ msg: 'Seleccioná un archivo', type: 'error' }); return; }
    if (uploadFile.size > 15 * 1024 * 1024) { setSnack({ msg: 'Supera el límite de 15 MB', type: 'error' }); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('archivo', uploadFile);
      fd.append('nombre', uploadNombre || uploadFile.name);
      fd.append('categoria', uploadCat);
      if (uploadDesc) fd.append('descripcion', uploadDesc);
      await api.post('/documentos/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSnack({ msg: 'Documento subido', type: 'success' });
      setUploadOpen(false);
      setUploadFile(null); setUploadNombre(''); setUploadDesc(''); setUploadCat('OTRO');
      cargarDocs();
    } catch (e: any) { setSnack({ msg: e?.response?.data?.message ?? 'Error al subir', type: 'error' }); }
    finally { setUploading(false); }
  };

  const handleDeleteDoc = async (id: number) => {
    if (!confirm('¿Eliminar este documento?')) return;
    try { await api.delete(`/documentos/${id}`); setSnack({ msg: 'Eliminado', type: 'success' }); cargarDocs(); }
    catch (e: any) { setSnack({ msg: e?.response?.data?.message ?? 'Error', type: 'error' }); }
  };

  // ── Historial de documentos generados ────────────────────────────────
  interface HistorialItem {
    id: number;
    plantillaTitulo: string;
    usuarioNombre?: string;
    cantidadEspacios: number;
    contexto?: string;
    createdAt: string;
  }
  const [historial, setHistorial] = useState<HistorialItem[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  const cargarHistorial = async () => {
    setLoadingHistorial(true);
    try {
      const { data } = await api.get('/plantillas-doc/historial/listar');
      setHistorial(data ?? []);
    } catch {/* silent */}
    finally { setLoadingHistorial(false); }
  };

  useEffect(() => { if (tab === 3) cargarHistorial(); }, [tab]);

  const imprimirYRegistrar = (plantilla: Plantilla, tituloExtra: string, ctx: any, espacios?: EspacioTracking[]) => {
    imprimir(plantilla.contenido, tituloExtra, ctx);
    api.post('/plantillas-doc/historial/registrar', {
      plantillaId: plantilla.id,
      plantillaTitulo: plantilla.titulo,
      cantidadEspacios: espacios?.length ?? 0,
      contexto: espacios?.length ? { espacios: espacios.map((e) => e.nombre) } : undefined,
    }).catch(() => {/* no-op: no bloqueamos al usuario si falla el log */});
  };

  return (
    <Box>
      <Paper
        elevation={0}
        sx={{
          p: 3, mb: 3,
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
          color: 'white', borderRadius: 2, position: 'relative', overflow: 'hidden',
        }}
      >
        <Box sx={{ position: 'absolute', right: -20, top: -20, opacity: 0.15 }}>
          <DescIcon sx={{ fontSize: 200 }} />
        </Box>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <DescIcon sx={{ fontSize: 32 }} />
          <Typography variant="h5" fontWeight="bold">Documentación</Typography>
        </Stack>
        <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.95, maxWidth: 720 }}>
          Modelos editables, seguimiento de entregas con selección múltiple para rendir, y repositorio central de archivos.
        </Typography>
      </Paper>

      <Paper sx={{ borderRadius: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }} variant="scrollable" scrollButtons="auto">
          <Tab label="Modelos" icon={<PrintIcon />} iconPosition="start" />
          <Tab label="Listas de seguimiento" icon={<CheckIcon />} iconPosition="start" />
          <Tab label="Repositorio" icon={<UploadIcon />} iconPosition="start" />
          <Tab label="Historial" icon={<HistoryIcon />} iconPosition="start" />
        </Tabs>

        {/* ── Tab 0: Modelos ─────────────────────────────────────────────── */}
        {tab === 0 && (
          <Box sx={{ p: 3 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={1.5} sx={{ mb: 2 }}>
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">Modelos imprimibles</Typography>
                <Typography variant="body2" color="text.secondary">
                  Editá títulos, contenidos y campos. Usá variables como <code>{'{{FECHA}}'}</code>, <code>{'{{USUARIO}}'}</code>, <code>{'{{LISTA_SELECCIONADOS}}'}</code>.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                {esAdmin && (
                  <Tooltip title="Restaurar modelos predefinidos al contenido original (no toca los custom)">
                    <Button size="small" startIcon={<RestoreIcon />} onClick={resetDefaults}>Restaurar defaults</Button>
                  </Tooltip>
                )}
                {puedeEditarPlantilla && (
                  <Button variant="contained" startIcon={<AddIcon />} onClick={() => abrirEdit(null)}>Nuevo modelo</Button>
                )}
              </Stack>
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
              <TextField
                size="small" placeholder="Buscar modelo..." value={searchPlantilla}
                onChange={(e) => setSearchPlantilla(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
                sx={{ maxWidth: 400, flex: 1 }}
              />
              <ToggleButtonGroup size="small" exclusive value={catPlantilla} onChange={(_, v) => v && setCatPlantilla(v)}>
                <ToggleButton value="todas">Todas</ToggleButton>
                {CATEGORIAS_PLANTILLA.map((c) => <ToggleButton key={c} value={c}>{c}</ToggleButton>)}
              </ToggleButtonGroup>
            </Stack>

            {loadingPlantillas && <LinearProgress sx={{ mb: 2 }} />}

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
              {plantillasFiltradas.map((p) => (
                <Card key={p.id} sx={{ display: 'flex', flexDirection: 'column', borderTop: `4px solid ${p.color ?? '#1976d2'}`, transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 } }}>
                  <CardContent sx={{ flex: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                      <Box sx={{ width: 40, height: 40, borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: `${p.color ?? '#1976d2'}20`, color: p.color ?? '#1976d2' }}>
                        {ICONOS_PLANTILLA[p.icono ?? 'description'] ?? <DescIcon />}
                      </Box>
                      <Chip label={p.categoria} size="small" variant="outlined" />
                      {p.esBuiltIn && <Chip label="Default" size="small" sx={{ bgcolor: '#e3f2fd', color: '#1565c0', fontSize: '0.65rem' }} />}
                    </Stack>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>{p.titulo}</Typography>
                    <Typography variant="body2" color="text.secondary">{p.descripcion}</Typography>
                    {p.creadoPorNombre && !p.esBuiltIn && (
                      <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1 }}>Creado por: {p.creadoPorNombre}</Typography>
                    )}
                  </CardContent>
                  <CardActions sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                    <Button size="small" variant="contained" startIcon={<PrintIcon />} onClick={() => imprimirYRegistrar(p, p.titulo, { usuario: user?.nombre })} sx={{ bgcolor: p.color ?? '#1976d2', flex: 1 }}>
                      Imprimir
                    </Button>
                    {puedeEditarPlantilla && (
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => abrirEdit(p)}><EditIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    )}
                    {puedeEditarPlantilla && (
                      <Tooltip title="Duplicar">
                        <IconButton size="small" onClick={() => duplicarPlantilla(p.id)}><CopyIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    )}
                    {!p.esBuiltIn && esAdmin && (
                      <Tooltip title="Eliminar">
                        <IconButton size="small" color="error" onClick={() => eliminarPlantilla(p.id)}><DeleteIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    )}
                  </CardActions>
                </Card>
              ))}
              {!loadingPlantillas && plantillasFiltradas.length === 0 && (
                <Box sx={{ gridColumn: '1 / -1', textAlign: 'center', py: 6 }}>
                  <CloudOffIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography color="text.secondary">No hay modelos que coincidan.</Typography>
                </Box>
              )}
            </Box>

            <Alert severity="info" sx={{ mt: 3 }}>
              <b>Variables soportadas en el contenido:</b>
              {' '}<code>{'{{FECHA}}'}</code>,{' '}
              <code>{'{{USUARIO}}'}</code>,{' '}
              <code>{'{{LISTA_SELECCIONADOS}}'}</code> (tabla con espacios elegidos en Tracking),{' '}
              <code>{'{{CANTIDAD_SELECCIONADOS}}'}</code>.
            </Alert>
          </Box>
        )}

        {/* ── Tab 1: Listas de seguimiento ─────────────────────────────── */}
        {tab === 1 && (
          <Box sx={{ p: { xs: 2, md: 3 } }}>
            <ListasSeguimientoTab
              plantillas={plantillas}
              puedeEditar={puedeEditarPlantilla}
              userNombre={user?.nombre}
              onImprimir={(p, titulo, espacios) => imprimirYRegistrar(
                p as any,
                titulo,
                { usuario: user?.nombre, seleccionados: espacios as any[] },
                espacios as any[],
              )}
            />
          </Box>
        )}

        {/* ── Tab 2: Repositorio (igual que antes) ────────────────────── */}
        {tab === 2 && (
          <Box sx={{ p: 3 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={1.5} sx={{ mb: 2 }}>
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">Repositorio central de documentos</Typography>
                <Typography variant="body2" color="text.secondary">
                  Subí PDFs, escaneos, planillas firmadas, normativa. Quedan accesibles para todo el equipo.
                </Typography>
              </Box>
              {puedeSubir && (
                <Button variant="contained" startIcon={<UploadIcon />} onClick={() => setUploadOpen(true)}>Subir documento</Button>
              )}
            </Stack>

            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 2 }}>
              <Chip
                label={`Todas (${Object.values(conteoCat).reduce((s, n) => s + n, 0)})`}
                onClick={() => setFiltroCatDoc('TODAS')}
                color={filtroCatDoc === 'TODAS' ? 'primary' : 'default'}
                variant={filtroCatDoc === 'TODAS' ? 'filled' : 'outlined'}
              />
              {CATEGORIAS_DOC.map((c) => (
                <Chip
                  key={c.value}
                  label={`${c.label}${conteoCat[c.value] ? ` (${conteoCat[c.value]})` : ''}`}
                  onClick={() => setFiltroCatDoc(c.value)}
                  variant={filtroCatDoc === c.value ? 'filled' : 'outlined'}
                  sx={filtroCatDoc === c.value ? { bgcolor: c.color, color: 'white' } : { borderColor: c.color, color: c.color }}
                />
              ))}
            </Stack>

            <TextField
              fullWidth size="small" placeholder="Buscar por nombre o descripción..."
              value={searchDocs} onChange={(e) => setSearchDocs(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
              sx={{ mb: 2, maxWidth: 500 }}
            />

            {loadingDocs && <LinearProgress sx={{ mb: 2 }} />}

            {!loadingDocs && docs.length === 0 ? (
              <Alert severity="info" icon={<CloudOffIcon />}>
                No hay documentos {filtroCatDoc !== 'TODAS' ? `en ${filtroCatDoc.toLowerCase()}` : 'cargados todavía'}.
                {puedeSubir ? ' Hacé clic en "Subir documento" para empezar.' : ''}
              </Alert>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell></TableCell>
                      <TableCell>Nombre</TableCell>
                      <TableCell>Categoría</TableCell>
                      <TableCell>Tamaño</TableCell>
                      <TableCell>Subido por</TableCell>
                      <TableCell>Fecha</TableCell>
                      <TableCell align="right">Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {docs.map((d) => {
                      const cat = CATEGORIAS_DOC.find((c) => c.value === d.categoria);
                      return (
                        <TableRow key={d.id} hover>
                          <TableCell sx={{ width: 40 }}>{iconForType(d.tipo)}</TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>{d.nombre}</Typography>
                            {d.descripcion && <Typography variant="caption" color="text.secondary">{d.descripcion}</Typography>}
                          </TableCell>
                          <TableCell>
                            <Chip size="small" label={cat?.label ?? d.categoria} sx={{ bgcolor: cat?.color ?? '#757575', color: 'white' }} />
                          </TableCell>
                          <TableCell>{formatBytes(d.tamanioBytes)}</TableCell>
                          <TableCell>{d.subidoPorNombre ?? '—'}</TableCell>
                          <TableCell>{new Date(d.createdAt).toLocaleDateString('es-AR')}</TableCell>
                          <TableCell align="right">
                            <Tooltip title="Abrir">
                              <IconButton size="small" component="a" href={d.url} target="_blank" rel="noopener noreferrer">
                                <OpenIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            {esAdmin && (
                              <Tooltip title="Eliminar">
                                <IconButton size="small" onClick={() => handleDeleteDoc(d.id)} color="error">
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}

        {/* ── Tab 3: Historial ────────────────────────────────────────── */}
        {tab === 3 && (
          <Box sx={{ p: 3 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={1.5} sx={{ mb: 2 }}>
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">Historial de documentos generados</Typography>
                <Typography variant="body2" color="text.secondary">
                  Registro de cada impresión: qué modelo se usó, quién lo generó y cuándo. Últimos 200.
                </Typography>
              </Box>
              <Button size="small" onClick={cargarHistorial}>Actualizar</Button>
            </Stack>

            {loadingHistorial ? (
              <LinearProgress />
            ) : historial.length === 0 ? (
              <Alert severity="info">Todavía no hay documentos generados.</Alert>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Modelo</TableCell>
                      <TableCell>Generado por</TableCell>
                      <TableCell align="right">Espacios</TableCell>
                      <TableCell>Incluyó</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {historial.map((h) => {
                      let nombres: string[] = [];
                      if (h.contexto) {
                        try {
                          const p = JSON.parse(h.contexto);
                          nombres = Array.isArray(p?.espacios) ? p.espacios : [];
                        } catch {/* ignore */}
                      }
                      return (
                        <TableRow key={h.id} hover>
                          <TableCell>{new Date(h.createdAt).toLocaleString('es-AR')}</TableCell>
                          <TableCell sx={{ fontWeight: 500 }}>{h.plantillaTitulo}</TableCell>
                          <TableCell>{h.usuarioNombre ?? '—'}</TableCell>
                          <TableCell align="right">{h.cantidadEspacios || '—'}</TableCell>
                          <TableCell sx={{ maxWidth: 400 }}>
                            {nombres.length > 0 ? (
                              <Typography variant="caption" sx={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {nombres.slice(0, 6).join(', ')}{nombres.length > 6 ? ` · +${nombres.length - 6}` : ''}
                              </Typography>
                            ) : '—'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}
      </Paper>

      {/* ── Dialog editar/crear modelo ─────────────────────────────────── */}
      <Dialog open={editOpen} onClose={() => !saving && setEditOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          {editing ? `Editar modelo${editing.esBuiltIn ? ' (default)' : ''}` : 'Nuevo modelo'}
          {editing?.esBuiltIn && (
            <Typography variant="caption" display="block" color="text.secondary">
              Al guardar, se sobreescribe el default. Podés restaurarlo con "Restaurar defaults".
            </Typography>
          )}
        </DialogTitle>
        <DialogContent dividers>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ minHeight: 500 }}>
            {/* Form */}
            <Stack spacing={2} sx={{ flex: 1 }}>
              <TextField label="Título" fullWidth value={editTitulo} onChange={(e) => setEditTitulo(e.target.value)} required />
              <TextField label="Descripción" fullWidth value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
              <Stack direction="row" spacing={2}>
                <TextField label="Categoría" select sx={{ flex: 1 }} value={editCat} onChange={(e) => setEditCat(e.target.value)}>
                  {CATEGORIAS_PLANTILLA.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </TextField>
                <TextField label="Color" type="color" value={editColor} onChange={(e) => setEditColor(e.target.value)} sx={{ width: 100 }} />
              </Stack>
              <TextField
                label="Contenido HTML" fullWidth multiline rows={18}
                value={editContenido} onChange={(e) => setEditContenido(e.target.value)}
                InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
                helperText={<>Variables: <code>{'{{FECHA}}'}</code>, <code>{'{{USUARIO}}'}</code>, <code>{'{{LISTA_SELECCIONADOS}}'}</code>, <code>{'{{CANTIDAD_SELECCIONADOS}}'}</code></>}
              />
            </Stack>

            {/* Preview */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <PreviewIcon fontSize="small" />
                <Typography variant="subtitle2">Vista previa</Typography>
              </Stack>
              <Paper variant="outlined" sx={{ p: 2, height: 500, overflow: 'auto', bgcolor: '#fafafa' }}>
                <div
                  style={{ fontSize: 12, color: '#222' }}
                  dangerouslySetInnerHTML={{ __html: interpolar(editContenido, { usuario: user?.nombre, seleccionados: [] }) }}
                />
              </Paper>
            </Box>
          </Stack>
          {saving && <LinearProgress sx={{ mt: 2 }} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={() => imprimir(editContenido, editTitulo, { usuario: user?.nombre })} startIcon={<PrintIcon />} disabled={saving}>
            Probar imprimir
          </Button>
          <Button variant="contained" onClick={guardarPlantilla} disabled={saving || !editTitulo.trim()}>Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog subida documento ─────────────────────────────────── */}
      <Dialog open={uploadOpen} onClose={() => !uploading && setUploadOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Subir documento al repositorio</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Box
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0] ?? null); }}
              sx={{
                border: '2px dashed', borderColor: uploadFile ? 'success.main' : 'divider',
                borderRadius: 2, p: 3, textAlign: 'center', cursor: 'pointer',
                bgcolor: uploadFile ? 'success.50' : 'action.hover',
                transition: 'all 0.2s', '&:hover': { borderColor: 'primary.main' },
              }}
            >
              <input
                ref={fileInputRef} type="file" hidden
                accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
              {uploadFile ? (
                <>
                  {iconForType(uploadFile.type)}
                  <Typography variant="body2" sx={{ mt: 1, fontWeight: 'bold' }}>{uploadFile.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{formatBytes(uploadFile.size)}</Typography>
                </>
              ) : (
                <>
                  <UploadIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
                  <Typography variant="body2" sx={{ mt: 1 }}>Hacé clic o arrastrá un archivo</Typography>
                  <Typography variant="caption" color="text.secondary">PDF, JPG, PNG, XLSX, DOCX — máx. 15 MB</Typography>
                </>
              )}
            </Box>
            <TextField label="Nombre" fullWidth value={uploadNombre} onChange={(e) => setUploadNombre(e.target.value)} required />
            <TextField label="Categoría" select fullWidth value={uploadCat} onChange={(e) => setUploadCat(e.target.value)}>
              {CATEGORIAS_DOC.map((c) => (
                <MenuItem key={c.value} value={c.value}>
                  <Box sx={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', bgcolor: c.color, mr: 1, verticalAlign: 'middle' }} />
                  {c.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField label="Descripción (opcional)" fullWidth multiline rows={2} value={uploadDesc} onChange={(e) => setUploadDesc(e.target.value)} />
            {uploading && <LinearProgress />}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadOpen(false)} disabled={uploading}>Cancelar</Button>
          <Button onClick={handleUpload} variant="contained" disabled={uploading || !uploadFile || !uploadNombre.trim()}>Subir</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snack?.type ?? 'info'} onClose={() => setSnack(null)}>{snack?.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
