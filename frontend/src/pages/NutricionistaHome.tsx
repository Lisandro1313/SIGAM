import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent, Chip, Tabs, Tab,
  Button, IconButton, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, MenuItem, FormControlLabel, Checkbox, Tooltip, Avatar,
  CircularProgress, Autocomplete, Collapse, Divider, Alert, Stack,
  useMediaQuery, useTheme,
} from '@mui/material';
import {
  Restaurant as NutricionIcon,
  Assessment as RelevamientoIcon,
  Park as HuertaIcon,
  Add as AddIcon,
  Edit as EditIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  CheckCircle as ActiveIcon,
  Done as DoneIcon,
  Place as PlaceIcon,
  CalendarMonth as CalendarIcon,
  Kitchen as KitchenIcon,
  WaterDrop as WaterIcon,
  AcUnit as FridgeIcon,
  ChildCare as ChildIcon,
  EscalatorWarning as AdolescentIcon,
  Person as AdultIcon,
  Delete as DeleteIcon,
  AttachFile as AttachIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  InsertDriveFile as FileIcon,
  OpenInNew as OpenIcon,
  Vaccines as EnfermedadIcon,
  Groups as RedesIcon,
} from '@mui/icons-material';
import api from '../services/api';
import { useAuthStore } from '../stores/authStore';

// ── Tipos ────────────────────────────────────────────────────────────────────

interface Beneficiario { id: number; nombre: string; direccion?: string; localidad?: string; }

interface Relevamiento {
  id: number;
  beneficiarioId: number;
  beneficiario: { id: number; nombre: string; direccion?: string };
  nutricionista: { id: number; nombre: string };
  fecha: string;
  poblacionInfantil05?: number;
  poblacionInfantil612?: number;
  poblacionAdolescente?: number;
  poblacionAdulta?: number;
  modalidad?: string;
  tieneCocina: boolean;
  aguaPotable: boolean;
  tieneHeladera: boolean;
  aguaCorriente: boolean;
  estadoGeneral?: string;
  necesidades?: string;
  observaciones?: string;
  fotos: string[];
  enfermedadesCronicas: string[];
  asistenciasEspeciales: string[];
  asistenciasEspecialesDetalle?: string;
  recibeOtraRed: boolean;
  otraRedDetalle?: string;
  alimentosIntegrar?: string;
  alimentosModificar?: string;
}

interface ProgramaTerreno {
  id: number;
  tipo: string;
  nombre?: string;
  descripcion?: string;
  beneficiario: { id: number; nombre: string; direccion?: string };
  nutricionista: { id: number; nombre: string };
  fechaInicio: string;
  fechaFin?: string;
  duracionSemanas?: number;
  estado: string;
  _count?: { actividades: number };
  actividades?: Actividad[];
}

interface Actividad {
  id: number;
  programaTerrenoId: number;
  fecha: string;
  descripcion: string;
  asistentes?: number;
  observaciones?: string;
  fotos: string[];
  documentos: { url: string; nombre: string; tipo: string }[];
}

interface DashboardData {
  relevamientos: number;
  programasActivos: number;
  programasTotal: number;
  actividadesMes: number;
  ultimosRelevamientos: any[];
  proximasActividades: any[];
}

// ── Constantes ───────────────────────────────────────────────────────────────

const MODALIDAD_LABELS: Record<string, string> = {
  RETIRAN_ALIMENTOS: 'Retiran alimentos',
  COMEN_EN_LUGAR: 'Comen en el lugar',
  MIXTO: 'Mixto',
};

const ESTADO_GENERAL_LABELS: Record<string, string> = {
  BUENO: 'Bueno',
  REGULAR: 'Regular',
  MALO: 'Malo',
};

const ESTADO_GENERAL_COLORS: Record<string, string> = {
  BUENO: '#43a047',
  REGULAR: '#fb8c00',
  MALO: '#e53935',
};

const TIPO_PROGRAMA_LABELS: Record<string, string> = {
  HUERTA: 'Huerta',
  MANIPULACION_ALIMENTOS: 'Manipulación de alimentos',
  NUTRICION_INFANTIL: 'Nutrición infantil',
  CAPACITACION: 'Capacitación',
  OTRO: 'Otro',
};

const TIPO_PROGRAMA_ICONS: Record<string, JSX.Element> = {
  HUERTA: <HuertaIcon />,
  MANIPULACION_ALIMENTOS: <KitchenIcon />,
  NUTRICION_INFANTIL: <ChildIcon />,
  CAPACITACION: <RelevamientoIcon />,
  OTRO: <NutricionIcon />,
};

const ESTADO_PROGRAMA_LABELS: Record<string, string> = {
  PLANIFICADO: 'Planificado',
  EN_CURSO: 'En curso',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
};

const ESTADO_PROGRAMA_COLORS: Record<string, string> = {
  PLANIFICADO: '#1e88e5',
  EN_CURSO: '#43a047',
  FINALIZADO: '#546e7a',
  CANCELADO: '#e53935',
};

const ENFERMEDADES = [
  { key: 'OBESIDAD',       label: 'Obesidad' },
  { key: 'DIABETES_T1',    label: 'Diabetes Tipo 1' },
  { key: 'DIABETES_T2',    label: 'Diabetes Tipo 2' },
  { key: 'HIPERTENSION',   label: 'Hipertensión' },
  { key: 'DISLIPEMIA',     label: 'Dislipemia' },
  { key: 'ANEMIA',         label: 'Anemia' },
  { key: 'DESNUTRICION',   label: 'Desnutrición' },
  { key: 'CELIAQUIA',      label: 'Celiaquía' },
  { key: 'ALERGIAS',       label: 'Alergias alimentarias' },
];

const ASISTENCIAS_ESPECIALES = [
  { key: 'CELIAQUIA',    label: 'Celiaquía' },
  { key: 'DISCAPACIDAD', label: 'Discapacidad' },
  { key: 'OTRO',         label: 'Otro' },
];

// ── Componente principal ─────────────────────────────────────────────────────

export default function NutricionistaHome() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuthStore();

  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);

  // Dashboard
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  // Relevamientos
  const [relevamientos, setRelevamientos] = useState<Relevamiento[]>([]);
  const [relTotal, setRelTotal] = useState(0);
  const [relPage, setRelPage] = useState(1);
  const [dialogRel, setDialogRel] = useState(false);
  const [editRel, setEditRel] = useState<Relevamiento | null>(null);

  // Programas
  const [programas, setProgramas] = useState<ProgramaTerreno[]>([]);
  const [progTotal, setProgTotal] = useState(0);
  const [progPage, setProgPage] = useState(1);
  const [dialogProg, setDialogProg] = useState(false);
  const [editProg, setEditProg] = useState<ProgramaTerreno | null>(null);
  const [expandedProg, setExpandedProg] = useState<number | null>(null);

  // Actividad dialog
  const [dialogAct, setDialogAct] = useState(false);
  const [actProgId, setActProgId] = useState<number | null>(null);

  // Eliminación con código de seguridad
  const [deleteDialog, setDeleteDialog] = useState<{ type: 'relevamiento' | 'programa'; id: number } | null>(null);
  const [deleteCode, setDeleteCode] = useState('');

  // Buscador de beneficiarios
  const [beneSearch, setBeneSearch] = useState('');
  const [beneOptions, setBeneOptions] = useState<Beneficiario[]>([]);
  const [beneLoading, setBeneLoading] = useState(false);

  // ── Fetch data ───────────────────────────────────────────────────────────

  const fetchDashboard = useCallback(async () => {
    try {
      const { data } = await api.get('/nutricionista/dashboard');
      setDashboard(data);
    } catch { /* ignore */ }
  }, []);

  const fetchRelevamientos = useCallback(async (page = 1) => {
    try {
      const { data } = await api.get('/nutricionista/relevamientos', { params: { page, limit: 10 } });
      setRelevamientos(data.data);
      setRelTotal(data.total);
      setRelPage(page);
    } catch { /* ignore */ }
  }, []);

  const fetchProgramas = useCallback(async (page = 1) => {
    try {
      const { data } = await api.get('/nutricionista/programas-terreno', { params: { page, limit: 10 } });
      setProgramas(data.data);
      setProgTotal(data.total);
      setProgPage(page);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchDashboard(), fetchRelevamientos(), fetchProgramas()])
      .finally(() => setLoading(false));
  }, [fetchDashboard, fetchRelevamientos, fetchProgramas]);

  // ── Búsqueda de beneficiarios ────────────────────────────────────────────

  useEffect(() => {
    if (beneSearch.length < 2) { setBeneOptions([]); return; }
    const t = setTimeout(async () => {
      setBeneLoading(true);
      try {
        const { data } = await api.get('/beneficiarios', { params: { buscar: beneSearch, limit: 10 } });
        setBeneOptions(data.data || data);
      } catch { /* ignore */ }
      setBeneLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [beneSearch]);

  // ── Handlers relevamiento ────────────────────────────────────────────────

  const handleSaveRelevamiento = async (formData: any) => {
    if (editRel) {
      await api.patch(`/nutricionista/relevamientos/${editRel.id}`, formData);
    } else {
      await api.post('/nutricionista/relevamientos', formData);
    }
    setDialogRel(false);
    setEditRel(null);
    fetchRelevamientos(relPage);
    fetchDashboard();
  };

  // ── Handlers programa ────────────────────────────────────────────────────

  const handleSavePrograma = async (formData: any) => {
    if (editProg) {
      await api.patch(`/nutricionista/programas-terreno/${editProg.id}`, formData);
    } else {
      await api.post('/nutricionista/programas-terreno', formData);
    }
    setDialogProg(false);
    setEditProg(null);
    fetchProgramas(progPage);
    fetchDashboard();
  };

  // ── Handler actividad ────────────────────────────────────────────────────

  const handleSaveActividad = async (formData: any) => {
    if (!actProgId) return;
    await api.post(`/nutricionista/programas-terreno/${actProgId}/actividades`, formData);
    setDialogAct(false);
    setActProgId(null);
    // Refresh el programa expandido
    if (expandedProg) {
      const { data } = await api.get(`/nutricionista/programas-terreno/${expandedProg}`);
      setProgramas(prev => prev.map(p => p.id === expandedProg ? { ...p, ...data } : p));
    }
    fetchProgramas(progPage);
    fetchDashboard();
  };

  // ── Cambiar estado programa ──────────────────────────────────────────────

  const handleCambiarEstado = async (progId: number, estado: string) => {
    await api.patch(`/nutricionista/programas-terreno/${progId}`, { estado });
    fetchProgramas(progPage);
    fetchDashboard();
  };

  // ── Expandir programa (carga actividades) ────────────────────────────────

  const handleExpandProg = async (progId: number) => {
    if (expandedProg === progId) { setExpandedProg(null); return; }
    try {
      const { data } = await api.get(`/nutricionista/programas-terreno/${progId}`);
      setProgramas(prev => prev.map(p => p.id === progId ? { ...p, actividades: data.actividades } : p));
      setExpandedProg(progId);
    } catch { /* ignore */ }
  };

  // ── Eliminar con código de seguridad ──────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteDialog || deleteCode !== '6409') return;
    try {
      if (deleteDialog.type === 'relevamiento') {
        await api.delete(`/nutricionista/relevamientos/${deleteDialog.id}`);
        fetchRelevamientos(relPage);
      } else {
        await api.delete(`/nutricionista/programas-terreno/${deleteDialog.id}`);
        fetchProgramas(progPage);
      }
      fetchDashboard();
    } catch { /* ignore */ }
    setDeleteDialog(null);
    setDeleteCode('');
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Avatar sx={{ bgcolor: '#2e7d32', width: 48, height: 48 }}>
          <NutricionIcon sx={{ fontSize: 28 }} />
        </Avatar>
        <Box>
          <Typography variant="h5" fontWeight={700}>Nutrición</Typography>
          <Typography variant="body2" color="text.secondary">
            {user?.nombre} — Módulo de relevamientos y programas de terreno
          </Typography>
        </Box>
      </Box>

      {/* Dashboard Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card sx={{ bgcolor: '#e8f5e9', borderLeft: '4px solid #2e7d32' }}>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="caption" color="text.secondary">Relevamientos</Typography>
              <Typography variant="h4" fontWeight={700} color="#2e7d32">{dashboard?.relevamientos ?? 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ bgcolor: '#e3f2fd', borderLeft: '4px solid #1565c0' }}>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="caption" color="text.secondary">Programas activos</Typography>
              <Typography variant="h4" fontWeight={700} color="#1565c0">{dashboard?.programasActivos ?? 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ bgcolor: '#fff3e0', borderLeft: '4px solid #e65100' }}>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="caption" color="text.secondary">Programas total</Typography>
              <Typography variant="h4" fontWeight={700} color="#e65100">{dashboard?.programasTotal ?? 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ bgcolor: '#f3e5f5', borderLeft: '4px solid #7b1fa2' }}>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="caption" color="text.secondary">Actividades del mes</Typography>
              <Typography variant="h4" fontWeight={700} color="#7b1fa2">{dashboard?.actividadesMes ?? 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant={isMobile ? 'fullWidth' : 'standard'}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<RelevamientoIcon />} label="Relevamientos" iconPosition="start" />
          <Tab icon={<HuertaIcon />} label="Programas" iconPosition="start" />
        </Tabs>
      </Paper>

      {/* ── TAB: RELEVAMIENTOS ──────────────────────────────────────────── */}
      {tab === 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight={600}>Relevamientos nutricionales</Typography>
            <Button variant="contained" startIcon={<AddIcon />} color="success"
              onClick={() => { setEditRel(null); setDialogRel(true); }}>
              Nuevo relevamiento
            </Button>
          </Box>

          {relevamientos.length === 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              No hay relevamientos aún. Hacé clic en "Nuevo relevamiento" para crear el primero.
            </Alert>
          ) : (
            <Grid container spacing={2}>
              {relevamientos.map(rel => (
                <Grid item xs={12} md={6} key={rel.id}>
                  <Card variant="outlined" sx={{ '&:hover': { boxShadow: 3 }, transition: 'box-shadow 0.2s' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PlaceIcon color="action" fontSize="small" />
                          <Typography fontWeight={600}>{rel.beneficiario.nombre}</Typography>
                        </Box>
                        <Box>
                          <Tooltip title="Editar">
                            <IconButton size="small" onClick={() => { setEditRel(rel); setDialogRel(true); }}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Eliminar">
                            <IconButton size="small" color="error" onClick={() => setDeleteDialog({ type: 'relevamiento', id: rel.id })}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>

                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                        {rel.beneficiario.direccion} — {new Date(rel.fecha).toLocaleDateString('es-AR')}
                      </Typography>

                      {rel.estadoGeneral && (
                        <Chip
                          label={ESTADO_GENERAL_LABELS[rel.estadoGeneral]}
                          size="small"
                          sx={{ bgcolor: ESTADO_GENERAL_COLORS[rel.estadoGeneral], color: '#fff', mr: 1, mb: 1 }}
                        />
                      )}
                      {rel.modalidad && (
                        <Chip label={MODALIDAD_LABELS[rel.modalidad]} size="small" variant="outlined" sx={{ mb: 1 }} />
                      )}

                      <Grid container spacing={1} sx={{ mt: 0.5 }}>
                        {rel.poblacionInfantil05 != null && (
                          <Grid item xs={6}>
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <ChildIcon fontSize="small" color="primary" />
                              <Typography variant="body2">0-5 años: <b>{rel.poblacionInfantil05}</b></Typography>
                            </Stack>
                          </Grid>
                        )}
                        {rel.poblacionInfantil612 != null && (
                          <Grid item xs={6}>
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <ChildIcon fontSize="small" color="secondary" />
                              <Typography variant="body2">6-12 años: <b>{rel.poblacionInfantil612}</b></Typography>
                            </Stack>
                          </Grid>
                        )}
                        {rel.poblacionAdolescente != null && (
                          <Grid item xs={6}>
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <AdolescentIcon fontSize="small" color="warning" />
                              <Typography variant="body2">Adolescentes: <b>{rel.poblacionAdolescente}</b></Typography>
                            </Stack>
                          </Grid>
                        )}
                        {rel.poblacionAdulta != null && (
                          <Grid item xs={6}>
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <AdultIcon fontSize="small" color="action" />
                              <Typography variant="body2">Adultos: <b>{rel.poblacionAdulta}</b></Typography>
                            </Stack>
                          </Grid>
                        )}
                      </Grid>

                      <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1.5, gap: 0.5 }}>
                        {rel.tieneCocina && <Chip icon={<KitchenIcon />} label="Cocina" size="small" variant="outlined" color="success" />}
                        {rel.aguaPotable && <Chip icon={<WaterIcon />} label="Agua potable" size="small" variant="outlined" color="info" />}
                        {rel.aguaCorriente && <Chip icon={<WaterIcon />} label="Agua corriente" size="small" variant="outlined" color="primary" />}
                        {rel.tieneHeladera && <Chip icon={<FridgeIcon />} label="Heladera" size="small" variant="outlined" color="secondary" />}
                        {rel.recibeOtraRed && <Chip icon={<RedesIcon />} label={rel.otraRedDetalle ? `Otra red: ${rel.otraRedDetalle}` : 'Recibe otra red'} size="small" variant="outlined" color="warning" />}
                      </Stack>

                      {rel.enfermedadesCronicas?.length > 0 && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            <EnfermedadIcon sx={{ fontSize: 13, mr: 0.3, verticalAlign: 'middle' }} />
                            Enf. crónicas:
                          </Typography>
                          <Stack direction="row" flexWrap="wrap" sx={{ gap: 0.5, mt: 0.3 }}>
                            {rel.enfermedadesCronicas.map(e => (
                              <Chip key={e} label={ENFERMEDADES.find(x => x.key === e)?.label ?? e} size="small" sx={{ bgcolor: '#ffebee', color: '#c62828', fontSize: 11 }} />
                            ))}
                          </Stack>
                        </Box>
                      )}

                      {rel.asistenciasEspeciales?.length > 0 && (
                        <Box sx={{ mt: 0.8 }}>
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>Asistencias especiales: </Typography>
                          {rel.asistenciasEspeciales.map(a => (
                            <Chip key={a} label={ASISTENCIAS_ESPECIALES.find(x => x.key === a)?.label ?? a} size="small" sx={{ mr: 0.5, bgcolor: '#e8eaf6', color: '#283593', fontSize: 11 }} />
                          ))}
                          {rel.asistenciasEspecialesDetalle && <Typography variant="caption" color="text.secondary"> ({rel.asistenciasEspecialesDetalle})</Typography>}
                        </Box>
                      )}

                      {rel.necesidades && (
                        <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                          <b>Necesidades:</b> {rel.necesidades}
                        </Typography>
                      )}

                      {rel.alimentosIntegrar && (
                        <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
                          <b>Alimentos a integrar:</b> {rel.alimentosIntegrar}
                        </Typography>
                      )}
                      {rel.alimentosModificar && (
                        <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
                          <b>Alimentos a modificar:</b> {rel.alimentosModificar}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {relTotal > 10 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 2 }}>
              <Button disabled={relPage <= 1} onClick={() => fetchRelevamientos(relPage - 1)}>Anterior</Button>
              <Typography sx={{ alignSelf: 'center' }}>Pág. {relPage} de {Math.ceil(relTotal / 10)}</Typography>
              <Button disabled={relPage >= Math.ceil(relTotal / 10)} onClick={() => fetchRelevamientos(relPage + 1)}>Siguiente</Button>
            </Box>
          )}
        </Box>
      )}

      {/* ── TAB: PROGRAMAS DE TERRENO ───────────────────────────────────── */}
      {tab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight={600}>Programas de terreno</Typography>
            <Button variant="contained" startIcon={<AddIcon />} color="primary"
              onClick={() => { setEditProg(null); setDialogProg(true); }}>
              Nuevo programa
            </Button>
          </Box>

          {programas.length === 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              No hay programas aún. Creá uno para empezar a registrar actividades de terreno.
            </Alert>
          ) : (
            <Stack spacing={2}>
              {programas.map(prog => (
                <Card key={prog.id} variant="outlined" sx={{ '&:hover': { boxShadow: 2 }, transition: 'box-shadow 0.2s' }}>
                  <CardContent sx={{ pb: expandedProg === prog.id ? 0 : undefined }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                        <Avatar sx={{ bgcolor: ESTADO_PROGRAMA_COLORS[prog.estado] + '22', color: ESTADO_PROGRAMA_COLORS[prog.estado], width: 40, height: 40 }}>
                          {TIPO_PROGRAMA_ICONS[prog.tipo] || <NutricionIcon />}
                        </Avatar>
                        <Box>
                          <Typography fontWeight={600}>
                            {prog.nombre || TIPO_PROGRAMA_LABELS[prog.tipo]}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {prog.beneficiario.nombre} {prog.beneficiario.direccion ? `— ${prog.beneficiario.direccion}` : ''}
                          </Typography>
                        </Box>
                      </Box>
                      <Stack direction="row" spacing={0.5}>
                        <Chip
                          label={ESTADO_PROGRAMA_LABELS[prog.estado]}
                          size="small"
                          sx={{ bgcolor: ESTADO_PROGRAMA_COLORS[prog.estado], color: '#fff' }}
                        />
                        <Tooltip title="Editar">
                          <IconButton size="small" onClick={() => { setEditProg(prog); setDialogProg(true); }}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar">
                          <IconButton size="small" color="error" onClick={() => setDeleteDialog({ type: 'programa', id: prog.id })}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Box>

                    <Stack direction="row" spacing={2} sx={{ mt: 1.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        <CalendarIcon sx={{ fontSize: 14, mr: 0.3, verticalAlign: 'middle' }} />
                        {new Date(prog.fechaInicio).toLocaleDateString('es-AR')}
                        {prog.fechaFin ? ` — ${new Date(prog.fechaFin).toLocaleDateString('es-AR')}` : ''}
                      </Typography>
                      {prog.duracionSemanas && (
                        <Typography variant="body2" color="text.secondary">{prog.duracionSemanas} semanas</Typography>
                      )}
                      <Typography variant="body2" color="text.secondary">
                        {prog._count?.actividades ?? 0} actividades
                      </Typography>
                    </Stack>

                    {prog.descripcion && (
                      <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>{prog.descripcion}</Typography>
                    )}

                    {/* Action buttons */}
                    <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                      <Button size="small" startIcon={expandedProg === prog.id ? <CollapseIcon /> : <ExpandIcon />}
                        onClick={() => handleExpandProg(prog.id)}>
                        {expandedProg === prog.id ? 'Ocultar' : 'Ver actividades'}
                      </Button>
                      <Button size="small" startIcon={<AddIcon />} color="success"
                        onClick={() => { setActProgId(prog.id); setDialogAct(true); }}>
                        Agregar actividad
                      </Button>
                      {prog.estado === 'PLANIFICADO' && (
                        <Button size="small" startIcon={<ActiveIcon />} color="primary"
                          onClick={() => handleCambiarEstado(prog.id, 'EN_CURSO')}>
                          Iniciar
                        </Button>
                      )}
                      {prog.estado === 'EN_CURSO' && (
                        <Button size="small" startIcon={<DoneIcon />} color="success"
                          onClick={() => handleCambiarEstado(prog.id, 'FINALIZADO')}>
                          Finalizar
                        </Button>
                      )}
                    </Stack>
                  </CardContent>

                  {/* Actividades expandidas */}
                  <Collapse in={expandedProg === prog.id}>
                    <Divider />
                    <Box sx={{ p: 2, bgcolor: '#fafafa' }}>
                      {!prog.actividades || prog.actividades.length === 0 ? (
                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                          No hay actividades registradas aún
                        </Typography>
                      ) : (
                        <Stack spacing={1.5}>
                          {prog.actividades.map((act, idx) => (
                            <Paper key={act.id} variant="outlined" sx={{ p: 1.5 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Box>
                                  <Typography variant="body2" fontWeight={600}>{act.descripcion}</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {new Date(act.fecha).toLocaleDateString('es-AR')}
                                    {act.asistentes != null ? ` — ${act.asistentes} asistentes` : ''}
                                  </Typography>
                                </Box>
                                <Chip label={`#${idx + 1}`} size="small" variant="outlined" />
                              </Box>
                              {act.observaciones && (
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{act.observaciones}</Typography>
                              )}
                              {(act.fotos?.length > 0 || act.documentos?.length > 0) && (
                                <Box sx={{ mt: 1 }}>
                                  {act.fotos?.length > 0 && (
                                    <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 0.5 }}>
                                      {act.fotos.map((foto, i) => (
                                        <Box key={i} component="a" href={foto} target="_blank" rel="noopener">
                                          <Box component="img" src={foto} sx={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 1, cursor: 'pointer', '&:hover': { opacity: 0.85 } }} />
                                        </Box>
                                      ))}
                                    </Stack>
                                  )}
                                  {act.documentos?.length > 0 && (
                                    <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 0.5 }}>
                                      {act.documentos.map((doc, i) => (
                                        <Chip
                                          key={i}
                                          size="small"
                                          icon={doc.tipo === 'pdf' ? <PdfIcon /> : doc.tipo === 'foto' ? <ImageIcon /> : <FileIcon />}
                                          label={doc.nombre.length > 20 ? doc.nombre.slice(0, 20) + '...' : doc.nombre}
                                          onClick={() => window.open(doc.url, '_blank')}
                                          onDelete={() => window.open(doc.url, '_blank')}
                                          deleteIcon={<OpenIcon />}
                                          sx={{ cursor: 'pointer', bgcolor: doc.tipo === 'pdf' ? '#ffebee' : '#e3f2fd' }}
                                        />
                                      ))}
                                    </Stack>
                                  )}
                                </Box>
                              )}
                            </Paper>
                          ))}
                        </Stack>
                      )}
                    </Box>
                  </Collapse>
                </Card>
              ))}
            </Stack>
          )}

          {progTotal > 10 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 2 }}>
              <Button disabled={progPage <= 1} onClick={() => fetchProgramas(progPage - 1)}>Anterior</Button>
              <Typography sx={{ alignSelf: 'center' }}>Pág. {progPage} de {Math.ceil(progTotal / 10)}</Typography>
              <Button disabled={progPage >= Math.ceil(progTotal / 10)} onClick={() => fetchProgramas(progPage + 1)}>Siguiente</Button>
            </Box>
          )}
        </Box>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* DIALOG: RELEVAMIENTO */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <RelevamientoDialog
        open={dialogRel}
        onClose={() => { setDialogRel(false); setEditRel(null); }}
        onSave={handleSaveRelevamiento}
        initial={editRel}
        beneSearch={beneSearch}
        setBeneSearch={setBeneSearch}
        beneOptions={beneOptions}
        beneLoading={beneLoading}
        isMobile={isMobile}
      />

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* DIALOG: PROGRAMA */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <ProgramaDialog
        open={dialogProg}
        onClose={() => { setDialogProg(false); setEditProg(null); }}
        onSave={handleSavePrograma}
        initial={editProg}
        beneSearch={beneSearch}
        setBeneSearch={setBeneSearch}
        beneOptions={beneOptions}
        beneLoading={beneLoading}
        isMobile={isMobile}
      />

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* DIALOG: ACTIVIDAD */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <ActividadDialog
        open={dialogAct}
        onClose={() => { setDialogAct(false); setActProgId(null); }}
        onSave={handleSaveActividad}
        isMobile={isMobile}
      />

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* DIALOG: CONFIRMAR ELIMINACIÓN */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Dialog open={!!deleteDialog} onClose={() => { setDeleteDialog(null); setDeleteCode(''); }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ bgcolor: '#e53935', color: '#fff' }}>
          Eliminar {deleteDialog?.type === 'relevamiento' ? 'relevamiento' : 'programa'}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Esta acción no se puede deshacer. {deleteDialog?.type === 'programa' ? 'Se eliminarán también todas las actividades asociadas.' : ''}
          </Alert>
          <TextField
            fullWidth
            label="Código de seguridad"
            value={deleteCode}
            onChange={(e) => setDeleteCode(e.target.value)}
            placeholder="Ingresá el código para confirmar"
            autoFocus
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setDeleteDialog(null); setDeleteCode(''); }}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleteCode !== '6409'}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// DIALOG: RELEVAMIENTO NUTRICIONAL
// ═════════════════════════════════════════════════════════════════════════════

function RelevamientoDialog({ open, onClose, onSave, initial, setBeneSearch, beneOptions, beneLoading, isMobile }: any) {
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [selectedBene, setSelectedBene] = useState<Beneficiario | null>(null);

  const emptyForm = () => ({
    poblacionInfantil05: '', poblacionInfantil612: '', poblacionAdolescente: '', poblacionAdulta: '',
    modalidad: '', tieneCocina: false, aguaPotable: false, tieneHeladera: false, aguaCorriente: false,
    estadoGeneral: '', necesidades: '', observaciones: '',
    enfermedadesCronicas: [] as string[],
    asistenciasEspeciales: [] as string[],
    asistenciasEspecialesDetalle: '',
    recibeOtraRed: false, otraRedDetalle: '',
    alimentosIntegrar: '', alimentosModificar: '',
  });

  useEffect(() => {
    if (open) {
      if (initial) {
        setForm({
          poblacionInfantil05: initial.poblacionInfantil05 ?? '',
          poblacionInfantil612: initial.poblacionInfantil612 ?? '',
          poblacionAdolescente: initial.poblacionAdolescente ?? '',
          poblacionAdulta: initial.poblacionAdulta ?? '',
          modalidad: initial.modalidad ?? '',
          tieneCocina: initial.tieneCocina ?? false,
          aguaPotable: initial.aguaPotable ?? false,
          tieneHeladera: initial.tieneHeladera ?? false,
          aguaCorriente: initial.aguaCorriente ?? false,
          estadoGeneral: initial.estadoGeneral ?? '',
          necesidades: initial.necesidades ?? '',
          observaciones: initial.observaciones ?? '',
          enfermedadesCronicas: initial.enfermedadesCronicas ?? [],
          asistenciasEspeciales: initial.asistenciasEspeciales ?? [],
          asistenciasEspecialesDetalle: initial.asistenciasEspecialesDetalle ?? '',
          recibeOtraRed: initial.recibeOtraRed ?? false,
          otraRedDetalle: initial.otraRedDetalle ?? '',
          alimentosIntegrar: initial.alimentosIntegrar ?? '',
          alimentosModificar: initial.alimentosModificar ?? '',
        });
        setSelectedBene(initial.beneficiario);
      } else {
        setForm(emptyForm());
        setSelectedBene(null);
      }
    }
  }, [open, initial]);

  const toggleArr = (field: string, key: string) => {
    setForm((f: any) => {
      const arr: string[] = f[field] ?? [];
      return { ...f, [field]: arr.includes(key) ? arr.filter((x: string) => x !== key) : [...arr, key] };
    });
  };

  const handleSubmit = async () => {
    if (!initial && !selectedBene) return;
    setSaving(true);
    try {
      await onSave({
        ...form,
        beneficiarioId: initial ? initial.beneficiarioId : selectedBene!.id,
        poblacionInfantil05: form.poblacionInfantil05 !== '' ? +form.poblacionInfantil05 : null,
        poblacionInfantil612: form.poblacionInfantil612 !== '' ? +form.poblacionInfantil612 : null,
        poblacionAdolescente: form.poblacionAdolescente !== '' ? +form.poblacionAdolescente : null,
        poblacionAdulta: form.poblacionAdulta !== '' ? +form.poblacionAdulta : null,
        modalidad: form.modalidad || null,
        estadoGeneral: form.estadoGeneral || null,
        necesidades: form.necesidades || null,
        observaciones: form.observaciones || null,
        asistenciasEspecialesDetalle: form.asistenciasEspecialesDetalle || null,
        otraRedDetalle: form.otraRedDetalle || null,
        alimentosIntegrar: form.alimentosIntegrar || null,
        alimentosModificar: form.alimentosModificar || null,
      });
    } catch { /* ignore */ }
    setSaving(false);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth fullScreen={isMobile}>
      <DialogTitle sx={{ bgcolor: '#2e7d32', color: '#fff' }}>
        {initial ? 'Editar relevamiento' : 'Nuevo relevamiento nutricional'}
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        {/* Seleccionar beneficiario */}
        {!initial && (
          <Autocomplete
            options={beneOptions}
            getOptionLabel={(o: Beneficiario) => `${o.nombre} ${o.direccion ? `— ${o.direccion}` : ''}`}
            value={selectedBene}
            onChange={(_, v) => setSelectedBene(v)}
            onInputChange={(_, v) => setBeneSearch(v)}
            loading={beneLoading}
            renderInput={(params) => <TextField {...params} label="Buscar espacio / beneficiario" fullWidth sx={{ mt: 1, mb: 2 }} />}
            noOptionsText="Escribí para buscar..."
          />
        )}
        {initial && (
          <Alert severity="info" sx={{ mb: 2 }}>Espacio: <b>{initial.beneficiario.nombre}</b></Alert>
        )}

        {/* Población */}
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>Población</Typography>
        <Grid container spacing={2}>
          <Grid item xs={6} sm={3}>
            <TextField label="Infantil 0-5" type="number" fullWidth size="small"
              value={form.poblacionInfantil05} onChange={e => setForm({ ...form, poblacionInfantil05: e.target.value })} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <TextField label="Infantil 6-12" type="number" fullWidth size="small"
              value={form.poblacionInfantil612} onChange={e => setForm({ ...form, poblacionInfantil612: e.target.value })} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <TextField label="Adolescente" type="number" fullWidth size="small"
              value={form.poblacionAdolescente} onChange={e => setForm({ ...form, poblacionAdolescente: e.target.value })} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <TextField label="Adulta" type="number" fullWidth size="small"
              value={form.poblacionAdulta} onChange={e => setForm({ ...form, poblacionAdulta: e.target.value })} />
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* Modalidad e infraestructura */}
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>Modalidad alimentaria e infraestructura</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField select label="Modalidad alimentaria" fullWidth size="small"
              value={form.modalidad} onChange={e => setForm({ ...form, modalidad: e.target.value })}>
              <MenuItem value="">Sin especificar</MenuItem>
              <MenuItem value="RETIRAN_ALIMENTOS">Retiran alimentos</MenuItem>
              <MenuItem value="COMEN_EN_LUGAR">Comen en el lugar</MenuItem>
              <MenuItem value="MIXTO">Mixto</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField select label="Estado general" fullWidth size="small"
              value={form.estadoGeneral} onChange={e => setForm({ ...form, estadoGeneral: e.target.value })}>
              <MenuItem value="">Sin especificar</MenuItem>
              <MenuItem value="BUENO">Bueno</MenuItem>
              <MenuItem value="REGULAR">Regular</MenuItem>
              <MenuItem value="MALO">Malo</MenuItem>
            </TextField>
          </Grid>
        </Grid>
        <Stack direction="row" flexWrap="wrap" sx={{ mt: 1.5, gap: 0 }}>
          <FormControlLabel control={<Checkbox checked={form.tieneCocina} onChange={e => setForm({ ...form, tieneCocina: e.target.checked })} size="small" />} label="Cocina" />
          <FormControlLabel control={<Checkbox checked={form.aguaPotable} onChange={e => setForm({ ...form, aguaPotable: e.target.checked })} size="small" />} label="Agua potable" />
          <FormControlLabel control={<Checkbox checked={form.aguaCorriente} onChange={e => setForm({ ...form, aguaCorriente: e.target.checked })} size="small" />} label="Agua corriente" />
          <FormControlLabel control={<Checkbox checked={form.tieneHeladera} onChange={e => setForm({ ...form, tieneHeladera: e.target.checked })} size="small" />} label="Heladera" />
        </Stack>

        <Divider sx={{ my: 2 }} />

        {/* Enfermedades crónicas */}
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
          <EnfermedadIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle', color: '#c62828' }} />
          Enfermedades crónicas reportadas en el espacio
        </Typography>
        <Grid container>
          {ENFERMEDADES.map(e => (
            <Grid item xs={6} sm={4} key={e.key}>
              <FormControlLabel
                control={<Checkbox size="small" checked={(form.enfermedadesCronicas ?? []).includes(e.key)} onChange={() => toggleArr('enfermedadesCronicas', e.key)} />}
                label={<Typography variant="body2">{e.label}</Typography>}
              />
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* Asistencias especiales */}
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>Asistencias especiales que recibe el espacio</Typography>
        <Stack direction="row" flexWrap="wrap" sx={{ gap: 0 }}>
          {ASISTENCIAS_ESPECIALES.map(a => (
            <FormControlLabel key={a.key}
              control={<Checkbox size="small" checked={(form.asistenciasEspeciales ?? []).includes(a.key)} onChange={() => toggleArr('asistenciasEspeciales', a.key)} />}
              label={<Typography variant="body2">{a.label}</Typography>}
            />
          ))}
        </Stack>
        {(form.asistenciasEspeciales ?? []).includes('OTRO') && (
          <TextField label="Especificar otra asistencia" fullWidth size="small" sx={{ mt: 1 }}
            value={form.asistenciasEspecialesDetalle} onChange={e => setForm({ ...form, asistenciasEspecialesDetalle: e.target.value })} />
        )}

        <Divider sx={{ my: 2 }} />

        {/* Otras redes */}
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
          <RedesIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle', color: '#e65100' }} />
          Otras redes alimentarias
        </Typography>
        <FormControlLabel
          control={<Checkbox checked={form.recibeOtraRed} onChange={e => setForm({ ...form, recibeOtraRed: e.target.checked })} size="small" />}
          label="Recibe alimentos de otra red / programa"
        />
        {form.recibeOtraRed && (
          <TextField label="¿Cuál red o programa?" fullWidth size="small" sx={{ mt: 1 }}
            value={form.otraRedDetalle} onChange={e => setForm({ ...form, otraRedDetalle: e.target.value })} />
        )}

        <Divider sx={{ my: 2 }} />

        {/* Sugerencias de alimentos */}
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>Sugerencias nutricionales</Typography>
        <TextField label="Alimentos a integrar" multiline rows={2} fullWidth size="small" sx={{ mb: 2 }}
          placeholder="Ej: incorporar legumbres, frutas de estación..."
          value={form.alimentosIntegrar} onChange={e => setForm({ ...form, alimentosIntegrar: e.target.value })} />
        <TextField label="Alimentos a modificar / reemplazar" multiline rows={2} fullWidth size="small" sx={{ mb: 2 }}
          placeholder="Ej: reducir harinas refinadas, reemplazar aceite por..."
          value={form.alimentosModificar} onChange={e => setForm({ ...form, alimentosModificar: e.target.value })} />

        <Divider sx={{ my: 2 }} />

        {/* Observaciones */}
        <TextField label="Necesidades detectadas" multiline rows={2} fullWidth sx={{ mb: 2 }}
          value={form.necesidades} onChange={e => setForm({ ...form, necesidades: e.target.value })} />
        <TextField label="Observaciones generales" multiline rows={2} fullWidth
          value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} />
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" color="success" onClick={handleSubmit} disabled={saving || (!initial && !selectedBene)}>
          {saving ? <CircularProgress size={20} /> : (initial ? 'Guardar cambios' : 'Crear relevamiento')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// DIALOG: PROGRAMA DE TERRENO
// ═════════════════════════════════════════════════════════════════════════════

function ProgramaDialog({ open, onClose, onSave, initial, setBeneSearch, beneOptions, beneLoading, isMobile }: any) {
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [selectedBene, setSelectedBene] = useState<Beneficiario | null>(null);

  useEffect(() => {
    if (open) {
      if (initial) {
        setForm({
          tipo: initial.tipo ?? 'HUERTA',
          nombre: initial.nombre ?? '',
          descripcion: initial.descripcion ?? '',
          fechaInicio: initial.fechaInicio ? initial.fechaInicio.slice(0, 10) : '',
          fechaFin: initial.fechaFin ? initial.fechaFin.slice(0, 10) : '',
          duracionSemanas: initial.duracionSemanas ?? '',
          estado: initial.estado ?? 'PLANIFICADO',
        });
        setSelectedBene(initial.beneficiario);
      } else {
        setForm({
          tipo: 'HUERTA', nombre: '', descripcion: '',
          fechaInicio: new Date().toISOString().slice(0, 10), fechaFin: '', duracionSemanas: 4,
        });
        setSelectedBene(null);
      }
    }
  }, [open, initial]);

  const handleSubmit = async () => {
    if (!initial && !selectedBene) return;
    setSaving(true);
    try {
      const payload: any = {
        ...form,
        beneficiarioId: initial ? initial.beneficiarioId : selectedBene!.id,
        duracionSemanas: form.duracionSemanas !== '' ? +form.duracionSemanas : null,
        fechaFin: form.fechaFin || null,
      };
      if (initial) payload.estado = form.estado;
      await onSave(payload);
    } catch { /* ignore */ }
    setSaving(false);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
      <DialogTitle sx={{ bgcolor: '#1565c0', color: '#fff' }}>
        {initial ? 'Editar programa de terreno' : 'Nuevo programa de terreno'}
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        {!initial && (
          <Autocomplete
            options={beneOptions}
            getOptionLabel={(o: Beneficiario) => `${o.nombre} ${o.direccion ? `— ${o.direccion}` : ''}`}
            value={selectedBene}
            onChange={(_, v) => setSelectedBene(v)}
            onInputChange={(_, v) => setBeneSearch(v)}
            loading={beneLoading}
            renderInput={(params) => <TextField {...params} label="Buscar espacio / beneficiario" fullWidth sx={{ mt: 1, mb: 2 }} />}
            noOptionsText="Escribí para buscar..."
          />
        )}
        {initial && (
          <Alert severity="info" sx={{ mb: 2 }}>Espacio: <b>{initial.beneficiario.nombre}</b></Alert>
        )}

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField select label="Tipo" fullWidth size="small" value={form.tipo}
              onChange={e => setForm({ ...form, tipo: e.target.value })}>
              {Object.entries(TIPO_PROGRAMA_LABELS).map(([k, v]) => (
                <MenuItem key={k} value={k}>{v}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Nombre (opcional)" fullWidth size="small"
              value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej: Huerta primavera 2026" />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Descripción" multiline rows={2} fullWidth size="small"
              value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Fecha inicio" type="date" fullWidth size="small" InputLabelProps={{ shrink: true }}
              value={form.fechaInicio} onChange={e => setForm({ ...form, fechaInicio: e.target.value })} />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Fecha fin (opcional)" type="date" fullWidth size="small" InputLabelProps={{ shrink: true }}
              value={form.fechaFin} onChange={e => setForm({ ...form, fechaFin: e.target.value })} />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Duración (semanas)" type="number" fullWidth size="small"
              value={form.duracionSemanas} onChange={e => setForm({ ...form, duracionSemanas: e.target.value })} />
          </Grid>
          {initial && (
            <Grid item xs={6}>
              <TextField select label="Estado" fullWidth size="small"
                value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                {Object.entries(ESTADO_PROGRAMA_LABELS).map(([k, v]) => (
                  <MenuItem key={k} value={k}>{v}</MenuItem>
                ))}
              </TextField>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving || (!initial && !selectedBene)}>
          {saving ? <CircularProgress size={20} /> : (initial ? 'Guardar cambios' : 'Crear programa')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// DIALOG: NUEVA ACTIVIDAD
// ═════════════════════════════════════════════════════════════════════════════

function ActividadDialog({ open, onClose, onSave, isMobile }: any) {
  const [form, setForm] = useState({ descripcion: '', asistentes: '', observaciones: '', fecha: new Date().toISOString().slice(0, 10) });
  const [saving, setSaving] = useState(false);
  const [documentos, setDocumentos] = useState<{ url: string; nombre: string; tipo: string }[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ descripcion: '', asistentes: '', observaciones: '', fecha: new Date().toISOString().slice(0, 10) });
      setDocumentos([]);
    }
  }, [open]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/nutricionista/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const tipo = file.type.startsWith('image/') ? 'foto' : file.type === 'application/pdf' ? 'pdf' : 'documento';
      setDocumentos(prev => [...prev, { url: data.url, nombre: file.name, tipo }]);
    } catch { /* ignore */ }
    setUploading(false);
    e.target.value = '';
  };

  const removeDoc = (idx: number) => setDocumentos(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (!form.descripcion.trim()) return;
    setSaving(true);
    try {
      await onSave({
        descripcion: form.descripcion,
        asistentes: form.asistentes ? +form.asistentes : null,
        observaciones: form.observaciones || null,
        fecha: form.fecha,
        documentos: documentos.length ? documentos : undefined,
      });
    } catch { /* ignore */ }
    setSaving(false);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
      <DialogTitle sx={{ bgcolor: '#2e7d32', color: '#fff' }}>Nueva actividad</DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        <TextField label="Fecha" type="date" fullWidth size="small" sx={{ mb: 2 }} InputLabelProps={{ shrink: true }}
          value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} />
        <TextField label="Descripción de la actividad" multiline rows={3} fullWidth sx={{ mb: 2 }}
          value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })}
          placeholder="Ej: Preparación de suelo y siembra de hortalizas" />
        <TextField label="Cantidad de asistentes" type="number" fullWidth size="small" sx={{ mb: 2 }}
          value={form.asistentes} onChange={e => setForm({ ...form, asistentes: e.target.value })} />
        <TextField label="Observaciones" multiline rows={2} fullWidth sx={{ mb: 2 }}
          value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} />

        {/* Documentación adjunta */}
        <Divider sx={{ mb: 2 }} />
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
          <AttachIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
          Documentación adjunta
        </Typography>
        <Button
          component="label"
          variant="outlined"
          size="small"
          startIcon={uploading ? <CircularProgress size={14} /> : <AttachIcon />}
          disabled={uploading}
          sx={{ mb: 1.5 }}
        >
          {uploading ? 'Subiendo...' : 'Adjuntar archivo (foto, PDF, etc.)'}
          <input type="file" hidden accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" onChange={handleFileUpload} />
        </Button>
        {documentos.length > 0 && (
          <Stack spacing={0.5}>
            {documentos.map((doc, i) => (
              <Chip
                key={i}
                size="small"
                icon={doc.tipo === 'pdf' ? <PdfIcon /> : doc.tipo === 'foto' ? <ImageIcon /> : <FileIcon />}
                label={doc.nombre.length > 35 ? doc.nombre.slice(0, 35) + '...' : doc.nombre}
                onDelete={() => removeDoc(i)}
                sx={{ justifyContent: 'flex-start', bgcolor: doc.tipo === 'pdf' ? '#ffebee' : '#e8f5e9' }}
              />
            ))}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" color="success" onClick={handleSubmit} disabled={saving || !form.descripcion.trim()}>
          {saving ? <CircularProgress size={20} /> : 'Registrar actividad'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
