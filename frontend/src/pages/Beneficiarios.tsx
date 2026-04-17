import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Tabs,
  Tab,
  Card,
  CardContent,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Assignment as RelevamientoIcon,
  AttachFile as DocsIcon,
  Delete as DeleteIcon,
  CheckCircle as AprobadoIcon,
  Cancel as RechazadoIcon,
  HourglassEmpty as PendienteIcon,
  CloudUpload as UploadIcon,
  OpenInNew as OpenIcon,
  InfoOutlined as InfoIcon,
  LocalShipping as EntregaIcon,
  PhotoCamera as FotoIcon,
  CompareArrows as CruceIcon,
  Group as IntegrantesIcon,
  Restaurant as NutricionTabIcon,
} from '@mui/icons-material';
import { format, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../services/api';
import BeneficiarioForm from '../components/BeneficiarioForm';
import SearchBar from '../components/SearchBar';
import ExportExcelButton from '../components/ExportExcelButton';
import TableSkeleton from '../components/TableSkeleton';
import { useAuthStore } from '../stores/authStore';
import { puedeHacer } from '../utils/permisos';
import { useNotificationStore } from '../stores/notificationStore';

const TIPOS_DOC = ['DNI', 'INFORME', 'FOTO', 'RELEVAMIENTO', 'RENDICION', 'CONTRATO', 'OTRO'];
const COL_SM = { display: { xs: 'none', sm: 'table-cell' } } as const;
const COL_MD = { display: { xs: 'none', md: 'table-cell' } } as const;

const ESTADO_COLOR: Record<string, 'warning' | 'success' | 'error'> = {
  PENDIENTE: 'warning',
  APROBADO: 'success',
  RECHAZADO: 'error',
};

const EstadoIcon = ({ estado }: { estado: string }) => {
  if (estado === 'APROBADO') return <AprobadoIcon fontSize="small" color="success" />;
  if (estado === 'RECHAZADO') return <RechazadoIcon fontSize="small" color="error" />;
  return <PendienteIcon fontSize="small" color="warning" />;
};

export default function BeneficiariosPage() {
  const navigate = useNavigate();
  const [beneficiarios, setBeneficiarios] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedBeneficiario, setSelectedBeneficiario] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroLocalidad, setFiltroLocalidad] = useState('');
  const [filtroProgramaId, setFiltroProgramaId] = useState('');
  const [programasLista, setProgramasLista] = useState<any[]>([]);
  const [localidadesLista, setLocalidadesLista] = useState<string[]>([]);

  // Relevamiento
  const [relevamientoOpen, setRelevamientoOpen] = useState(false);
  const [relevamientoTarget, setRelevamientoTarget] = useState<any>(null);
  const [observaciones, setObservaciones] = useState('');
  const [savingRelevamiento, setSavingRelevamiento] = useState(false);

  // Desactivar (baja)
  const [bajaOpen, setBajaOpen]             = useState(false);
  const [bajaBeneficiario, setBajaBeneficiario] = useState<any>(null);
  const [motivoBaja, setMotivoBaja]         = useState('');
  const [notaBaja, setNotaBaja]             = useState('');
  const [guardandoBaja, setGuardandoBaja]   = useState(false);

  // Documentos
  const [docsOpen, setDocsOpen] = useState(false);
  const [docsTarget, setDocsTarget] = useState<any>(null);
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docNombre, setDocNombre] = useState('');
  const [docTipo, setDocTipo] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detalle beneficiario
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [detalleData, setDetalleData] = useState<any>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [tabDetalle, setTabDetalle] = useState(0);

  // Cruce de programas
  const [cruceData, setCruceData] = useState<any>(null);
  const [loadingCruce, setLoadingCruce] = useState(false);

  // Próxima entrega
  const [proximaEntrega, setProximaEntrega] = useState<any>(null);
  const [docsPreview, setDocsPreview] = useState<any[]>([]);

  // Historial de cambios (auditoria)
  const [historial, setHistorial] = useState<any[] | null>(null);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  // Integrantes de espacio/comedor
  const [integrantes, setIntegrantes] = useState<any[]>([]);
  const [loadingIntegrantes, setLoadingIntegrantes] = useState(false);

  // Nutrición (relevamientos + programas de terreno)
  const [nutricionData, setNutricionData] = useState<{ relevamientos: any[]; programas: any[] } | null>(null);
  const [loadingNutricion, setLoadingNutricion] = useState(false);
  const [integranteForm, setIntegranteForm] = useState({ nombre: '', dni: '', direccion: '', grupoFamiliar: '', menores: '' });
  const [addingIntegrante, setAddingIntegrante] = useState(false);
  const [importingCsv, setImportingCsv] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const TIPOS_ESPACIO = ['ESPACIO', 'COMEDOR', 'ORGANIZACION'];

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const resolveUrl = (url: string) =>
    url?.startsWith('http') ? url : `${API_BASE}/${(url ?? '').replace(/^\//, '')}`;

  const { user } = useAuthStore();
  const { showNotification } = useNotificationStore();
  const puedeEditar = user ? puedeHacer(user.rol, 'beneficiarios.editar') : false;
  const puedeCrear  = user ? puedeHacer(user.rol, 'beneficiarios.crear')  : false;
  const puedeRelevamiento = user ? puedeHacer(user.rol, 'beneficiarios.relevamiento') : false;
  const puedeSubirDocs  = user ? ['ADMIN', 'OPERADOR_PROGRAMA', 'TRABAJADORA_SOCIAL'].includes(user.rol) : false;
  const puedeEliminar   = user ? puedeHacer(user.rol, 'beneficiarios.eliminar') : false;
  const puedeVerHistorial = ['ADMIN', 'OPERADOR_PROGRAMA'].includes(user?.rol ?? '');

  useEffect(() => {
    const t = setTimeout(() => { loadBeneficiarios(0, rowsPerPage, searchTerm); setPage(0); }, 350);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  useEffect(() => { loadBeneficiarios(page, rowsPerPage, searchTerm); }, [page, rowsPerPage]);

  // Recargar cuando cambian los filtros
  useEffect(() => {
    loadBeneficiarios(0, rowsPerPage, searchTerm);
    setPage(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroTipo, filtroLocalidad, filtroProgramaId]);

  // Cargar listas de filtros (programas + localidades) al montar
  useEffect(() => {
    api.get('/programas').then(r => setProgramasLista(r.data ?? [])).catch(() => {});
    api.get('/beneficiarios/localidades').then(r => setLocalidadesLista(r.data ?? [])).catch(() => {});
  }, []);

  const loadBeneficiarios = async (pg = page, lim = rowsPerPage, buscar = searchTerm) => {
    setLoading(true);
    try {
      const params: any = { page: pg + 1, limit: lim };
      if (buscar) params.buscar = buscar;
      if (filtroTipo) params.tipo = filtroTipo;
      if (filtroLocalidad) params.localidad = filtroLocalidad;
      if (filtroProgramaId) params.programaId = filtroProgramaId;
      const response = await api.get('/beneficiarios', { params });
      setBeneficiarios(response.data.data);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Error cargando beneficiarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const limpiarFiltros = () => {
    setFiltroTipo('');
    setFiltroLocalidad('');
    setFiltroProgramaId('');
  };
  const hayFiltrosActivos = !!(filtroTipo || filtroLocalidad || filtroProgramaId);

  const handleAbrirBaja = (beneficiario: any) => {
    setBajaBeneficiario(beneficiario);
    setMotivoBaja('');
    setNotaBaja('');
    setBajaOpen(true);
  };

  const handleConfirmarBaja = async () => {
    if (!bajaBeneficiario || !motivoBaja) return;
    setGuardandoBaja(true);
    try {
      await api.patch(`/beneficiarios/${bajaBeneficiario.id}`, { activo: false, motivoBaja, notaBaja: notaBaja || null });
      showNotification(`${bajaBeneficiario.nombre} desactivado correctamente`, 'success');
      setBajaOpen(false);
      loadBeneficiarios();
    } catch {
      showNotification('Error al desactivar el beneficiario', 'error');
    } finally {
      setGuardandoBaja(false);
    }
  };

  const handleEdit = (beneficiario: any) => {
    setSelectedBeneficiario(beneficiario);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setSelectedBeneficiario(null);
  };

  const handleAbrirRelevamiento = (beneficiario: any) => {
    setRelevamientoTarget(beneficiario);
    setObservaciones(beneficiario.observaciones || '');
    setRelevamientoOpen(true);
  };

  const handleGuardarRelevamiento = async () => {
    if (!relevamientoTarget) return;
    setSavingRelevamiento(true);
    try {
      await api.patch(`/beneficiarios/${relevamientoTarget.id}/relevamiento`, { observaciones });
      setRelevamientoOpen(false);
      loadBeneficiarios();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingRelevamiento(false);
    }
  };

  // ── Documentos ──────────────────────────────────────────────────────────────

  const handleAbrirDocs = async (beneficiario: any) => {
    setDocsTarget(beneficiario);
    setDocsOpen(true);
    setLoadingDocs(true);
    setDocNombre('');
    setDocTipo('');
    try {
      const res = await api.get(`/beneficiarios/${beneficiario.id}/documentos`);
      setDocumentos(res.data);
    } catch {
      showNotification('Error cargando documentos', 'error');
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleUploadDoc = async (file: File) => {
    if (!docsTarget) return;
    setUploadingDoc(true);
    try {
      const form = new FormData();
      form.append('archivo', file);
      form.append('nombre', docNombre || file.name);
      if (docTipo) form.append('tipo', docTipo);
      const res = await api.post(`/beneficiarios/${docsTarget.id}/documentos`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDocumentos(prev => [res.data, ...prev]);
      setDocNombre('');
      setDocTipo('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      showNotification('Documento subido correctamente', 'success');
    } catch {
      showNotification('Error al subir documento', 'error');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleEstadoDoc = async (docId: number, estado: string) => {
    try {
      const res = await api.patch(`/beneficiarios/${docsTarget.id}/documentos/${docId}`, { estado });
      setDocumentos(prev => prev.map(d => d.id === docId ? { ...d, estado: res.data.estado } : d));
    } catch {
      showNotification('Error actualizando estado', 'error');
    }
  };

  const handleDeleteDoc = async (docId: number) => {
    if (!confirm('¿Eliminar este documento?')) return;
    try {
      await api.delete(`/beneficiarios/${docsTarget.id}/documentos/${docId}`);
      setDocumentos(prev => prev.filter(d => d.id !== docId));
      showNotification('Documento eliminado', 'info');
    } catch {
      showNotification('Error eliminando documento', 'error');
    }
  };

  // ── Detalle ──────────────────────────────────────────────────────────────────

  const handleAbrirDetalle = async (beneficiario: any) => {
    setDetalleOpen(true);
    setDetalleData(null);
    setLoadingDetalle(true);
    setTabDetalle(0);
    setCruceData(null);
    setIntegrantes([]);
    setHistorial(null);
    setNutricionData(null);
    setProximaEntrega(null);
    setDocsPreview([]);
    setIntegranteForm({ nombre: '', dni: '', direccion: '', grupoFamiliar: '', menores: '' });
    try {
      const [res, proxRes, docsRes] = await Promise.all([
        api.get(`/beneficiarios/${beneficiario.id}`),
        api.get(`/beneficiarios/${beneficiario.id}/proxima-entrega`).catch(() => null),
        api.get(`/beneficiarios/${beneficiario.id}/documentos`).catch(() => null),
      ]);
      setDetalleData(res.data);
      if (proxRes) setProximaEntrega(proxRes.data);
      if (docsRes) setDocsPreview(docsRes.data ?? []);
    } catch {
      showNotification('Error cargando datos del beneficiario', 'error');
      setDetalleOpen(false);
    } finally {
      setLoadingDetalle(false);
    }
  };

  // ── Integrantes handlers ─────────────────────────────────────────────────────

  const handleAddIntegrante = async () => {
    if (!detalleData || !integranteForm.nombre.trim()) return;
    setAddingIntegrante(true);
    try {
      const payload = {
        nombre: integranteForm.nombre,
        dni: integranteForm.dni || undefined,
        direccion: integranteForm.direccion || undefined,
        grupoFamiliar: integranteForm.grupoFamiliar ? Number(integranteForm.grupoFamiliar) : undefined,
        menores: integranteForm.menores ? Number(integranteForm.menores) : undefined,
      };
      const res = await api.post(`/beneficiarios/${detalleData.id}/integrantes`, payload);
      setIntegrantes(prev => [...prev, res.data]);
      setIntegranteForm({ nombre: '', dni: '', direccion: '', grupoFamiliar: '', menores: '' });
    } catch {
      showNotification('Error al agregar integrante', 'error');
    } finally {
      setAddingIntegrante(false);
    }
  };

  const handleRemoveIntegrante = async (integranteId: number) => {
    if (!detalleData) return;
    try {
      await api.delete(`/beneficiarios/${detalleData.id}/integrantes/${integranteId}`);
      setIntegrantes(prev => prev.filter((i: any) => i.id !== integranteId));
    } catch {
      showNotification('Error al eliminar integrante', 'error');
    }
  };

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !detalleData) return;
    e.target.value = '';
    setImportingCsv(true);
    try {
      const text = await file.text();
      const lineas = text.split(/\r?\n/).filter(l => l.trim());
      // Detectar si la primera línea es encabezado
      const primeraCelda = lineas[0]?.split(',')[0]?.toLowerCase().trim();
      const inicio = ['nombre', 'name', 'apellido'].includes(primeraCelda) ? 1 : 0;
      const filas = lineas.slice(inicio).map(l => {
        const cols = l.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        return {
          nombre: cols[0] || '',
          dni: cols[1] || '',
          direccion: cols[2] || '',
          grupoFamiliar: cols[3] ? Number(cols[3]) : undefined,
          menores: cols[4] ? Number(cols[4]) : undefined,
        };
      }).filter(f => f.nombre);

      if (filas.length === 0) { showNotification('No se encontraron filas válidas en el archivo', 'warning'); return; }

      const res = await api.post(`/beneficiarios/${detalleData.id}/integrantes/bulk`, { integrantes: filas });
      setIntegrantes(prev => [...prev, ...res.data.integrantes]);
      showNotification(`${res.data.count} integrantes importados`, 'success');
    } catch {
      showNotification('Error al importar el archivo', 'error');
    } finally {
      setImportingCsv(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────────────

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} flexDirection={{ xs: 'column', sm: 'row' }} gap={1} mb={3}>
        <Typography variant="h4" fontWeight="bold" fontSize={{ xs: '1.5rem', sm: '2.125rem' }}>Beneficiarios</Typography>
        <Box display="flex" gap={1} flexWrap="wrap">
          {puedeEditar && (
            <ExportExcelButton
              onExport={async () => {
                const res = await api.get('/beneficiarios', {
                  params: {
                    limit: 10000,
                    ...(searchTerm ? { buscar: searchTerm } : {}),
                    ...(filtroTipo ? { tipo: filtroTipo } : {}),
                    ...(filtroLocalidad ? { localidad: filtroLocalidad } : {}),
                    ...(filtroProgramaId ? { programaId: filtroProgramaId } : {}),
                  },
                });
                return (res.data.data ?? res.data).map((b: any) => ({
                  id: b.id,
                  nombre: b.nombre,
                  tipo: b.tipo,
                  localidad: b.localidad ?? '',
                  direccion: b.direccion ?? '',
                  telefono: b.telefono ?? '',
                  responsable: b.responsableNombre ?? '',
                  dni_responsable: b.responsableDNI ?? '',
                  programa: b.programa?.nombre ?? '',
                  frecuencia_entrega: b.frecuenciaEntrega ?? '',
                  kilos_habitual: b.kilosHabitual ?? '',
                  activo: b.activo ? 'Sí' : 'No',
                  observaciones: b.observaciones ?? '',
                }));
              }}
              fileName={`beneficiarios${searchTerm || hayFiltrosActivos ? '-filtrado' : ''}`}
              sheetName="Beneficiarios"
              label={`Exportar todos (${total})`}
            />
          )}
          {puedeCrear && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormOpen(true)}>
              Nuevo Beneficiario
            </Button>
          )}
        </Box>
      </Box>

      <Box mb={2} display="flex" flexWrap="wrap" gap={1.5} alignItems="center">
        <Box minWidth={260} flex="1 1 280px" maxWidth={400}>
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Buscar por nombre, DNI, responsable, localidad..."
          />
        </Box>

        <TextField
          select
          size="small"
          label="Tipo"
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="">Todos</MenuItem>
          <MenuItem value="ESPACIO">Espacio</MenuItem>
          <MenuItem value="COMEDOR">Comedor</MenuItem>
          <MenuItem value="MERENDERO">Merendero</MenuItem>
          <MenuItem value="ORGANIZACION">Organización</MenuItem>
          <MenuItem value="CASO_PARTICULAR">Caso particular</MenuItem>
        </TextField>

        <TextField
          select
          size="small"
          label="Localidad"
          value={filtroLocalidad}
          onChange={(e) => setFiltroLocalidad(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">Todas</MenuItem>
          {localidadesLista.map((loc) => (
            <MenuItem key={loc} value={loc}>{loc}</MenuItem>
          ))}
        </TextField>

        <TextField
          select
          size="small"
          label="Programa"
          value={filtroProgramaId}
          onChange={(e) => setFiltroProgramaId(e.target.value)}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">Todos</MenuItem>
          {programasLista.map((p: any) => (
            <MenuItem key={p.id} value={String(p.id)}>{p.nombre}</MenuItem>
          ))}
        </TextField>

        {hayFiltrosActivos && (
          <Button size="small" onClick={limpiarFiltros} sx={{ textTransform: 'none' }}>
            Limpiar filtros
          </Button>
        )}

        <Box flex={1} />
        <Chip
          size="small"
          label={`${total} resultado${total === 1 ? '' : 's'}`}
          color={hayFiltrosActivos ? 'primary' : 'default'}
          variant={hayFiltrosActivos ? 'filled' : 'outlined'}
        />
      </Box>

      <TableContainer component={Paper} elevation={2} sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell sx={COL_SM}>Tipo</TableCell>
              <TableCell sx={COL_MD}>Localidad</TableCell>
              <TableCell sx={COL_SM}>Programa</TableCell>
              <TableCell sx={COL_MD}>Frecuencia</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableSkeleton rows={rowsPerPage > 10 ? 8 : rowsPerPage} columns={6} />
            ) : beneficiarios.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body2" color="text.secondary">No se encontraron beneficiarios</Typography>
                </TableCell>
              </TableRow>
            ) : (
              beneficiarios.map((beneficiario) => (
                <TableRow key={beneficiario.id} hover>
                  <TableCell>
                    <Box
                      component="span"
                      sx={{ cursor: 'pointer', color: 'primary.main', fontWeight: 'bold', '&:hover': { textDecoration: 'underline' } }}
                      onClick={() => handleAbrirDetalle(beneficiario)}
                    >
                      {beneficiario.nombre}
                    </Box>
                    {beneficiario.responsableDNI && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        DNI: {beneficiario.responsableDNI}
                        {beneficiario.responsableNombre ? ` · ${beneficiario.responsableNombre}` : ''}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={COL_SM}>
                    <Chip label={beneficiario.tipo} size="small" />
                  </TableCell>
                  <TableCell sx={COL_MD}>{beneficiario.localidad}</TableCell>
                  <TableCell sx={COL_SM}>{beneficiario.programa?.nombre || '—'}</TableCell>
                  <TableCell sx={COL_MD}>
                    <Chip
                      label={beneficiario.frecuenciaEntrega}
                      size="small"
                      color={
                        beneficiario.frecuenciaEntrega === 'MENSUAL' ? 'primary'
                        : beneficiario.frecuenciaEntrega === 'BIMESTRAL' ? 'secondary'
                        : 'default'
                      }
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Documentos">
                      <IconButton size="small" color="info" onClick={() => handleAbrirDocs(beneficiario)}>
                        <DocsIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {puedeEditar && (
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => handleEdit(beneficiario)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {puedeRelevamiento && !puedeEditar && (
                      <Tooltip title="Cargar relevamiento">
                        <IconButton size="small" color="primary" onClick={() => handleAbrirRelevamiento(beneficiario)}>
                          <RelevamientoIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {puedeEliminar && (
                      <Tooltip title="Desactivar beneficiario">
                        <IconButton size="small" color="error" onClick={() => handleAbrirBaja(beneficiario)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={total}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_e, p) => setPage(p)}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          labelRowsPerPage="Filas por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
      </TableContainer>

      <BeneficiarioForm
        open={formOpen}
        onClose={handleCloseForm}
        onSuccess={() => { loadBeneficiarios(); handleCloseForm(); }}
        beneficiario={selectedBeneficiario}
      />

      {/* Dialog desactivar / baja */}
      <Dialog open={bajaOpen} onClose={() => setBajaOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Desactivar beneficiario</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <Typography variant="body2">
            ¿Desactivar a <strong>{bajaBeneficiario?.nombre}</strong>? Esta acción se puede revertir editando el registro.
          </Typography>
          <TextField
            select fullWidth label="Motivo de baja *"
            value={motivoBaja} onChange={(e) => setMotivoBaja(e.target.value)}
          >
            <MenuItem value="FALLECIDO">Fallecido/a</MenuItem>
            <MenuItem value="MUDANZA">Se mudó fuera del área</MenuItem>
            <MenuItem value="SUPERO_CRITERIOS">Superó criterios de elegibilidad</MenuItem>
            <MenuItem value="SOLICITUD_PROPIA">Solicitud propia</MenuItem>
            <MenuItem value="OTRO">Otro</MenuItem>
          </TextField>
          <TextField
            fullWidth label="Nota adicional (opcional)" multiline rows={2}
            value={notaBaja} onChange={(e) => setNotaBaja(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBajaOpen(false)}>Cancelar</Button>
          <Button variant="contained" color="error" disabled={!motivoBaja || guardandoBaja} onClick={handleConfirmarBaja}>
            {guardandoBaja ? <CircularProgress size={20} /> : 'Desactivar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog relevamiento */}
      <Dialog open={relevamientoOpen} onClose={() => setRelevamientoOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Relevamiento — {relevamientoTarget?.nombre}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Actualizar observaciones y datos de relevamiento del beneficiario.
          </Typography>
          <TextField
            fullWidth multiline rows={5}
            label="Observaciones"
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Situación habitacional, necesidades, novedades..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRelevamientoOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleGuardarRelevamiento} disabled={savingRelevamiento}>
            {savingRelevamiento ? <CircularProgress size={24} /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog detalle beneficiario */}
      <Dialog open={detalleOpen} onClose={() => setDetalleOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <InfoIcon color="primary" />
            {detalleData?.nombre || 'Cargando...'}
            {detalleData && (
              <Chip label={detalleData.tipo} size="small" sx={{ ml: 1 }} />
            )}
          </Box>
        </DialogTitle>

        {detalleData && (() => {
          const tieneIntegrantes = TIPOS_ESPACIO.includes(detalleData?.tipo);
          let nextIdx = 3;
          const tabIntegrantes = tieneIntegrantes ? nextIdx++ : -1;
          const tabNutricion = nextIdx++;
          const tabHistorial = puedeVerHistorial ? nextIdx++ : -1;
          return (
            <Tabs
              value={tabDetalle}
              onChange={(_, v) => {
                setTabDetalle(v);
                if (v === 2 && !cruceData && detalleData) {
                  setLoadingCruce(true);
                  api.get(`/beneficiarios/${detalleData.id}/cruce-programas`)
                    .then(r => setCruceData(r.data))
                    .catch(() => setCruceData({ error: true }))
                    .finally(() => setLoadingCruce(false));
                }
                if (v === tabIntegrantes && integrantes.length === 0 && detalleData) {
                  setLoadingIntegrantes(true);
                  api.get(`/beneficiarios/${detalleData.id}/integrantes`)
                    .then(r => setIntegrantes(r.data))
                    .catch(() => {})
                    .finally(() => setLoadingIntegrantes(false));
                }
                if (v === tabNutricion && !nutricionData && detalleData) {
                  setLoadingNutricion(true);
                  Promise.all([
                    api.get(`/nutricionista/relevamientos/beneficiario/${detalleData.id}`),
                    api.get(`/nutricionista/programas-terreno/beneficiario/${detalleData.id}`),
                  ])
                    .then(([relRes, progRes]) => setNutricionData({ relevamientos: relRes.data, programas: progRes.data }))
                    .catch(() => setNutricionData({ relevamientos: [], programas: [] }))
                    .finally(() => setLoadingNutricion(false));
                }
                if (v === tabHistorial && historial === null && puedeVerHistorial) {
                  setLoadingHistorial(true);
                  api.get('/auditoria', { params: { buscar: `/beneficiarios/${detalleData.id}` } })
                    .then(r => setHistorial(Array.isArray(r.data) ? r.data : (r.data.data ?? [])))
                    .catch(() => setHistorial([]))
                    .finally(() => setLoadingHistorial(false));
                }
              }}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}
            >
              <Tab label="Datos" />
              <Tab
                label={`Historial de Entregas (${detalleData.remitos?.filter((r: any) => r.estado === 'ENTREGADO').length ?? 0})`}
                icon={<EntregaIcon fontSize="small" />}
                iconPosition="start"
              />
              <Tab
                label="Otras Asistencias"
                icon={<CruceIcon fontSize="small" />}
                iconPosition="start"
              />
              {tieneIntegrantes && (
                <Tab
                  label={`Integrantes${integrantes.length > 0 ? ` (${integrantes.length})` : ''}`}
                  icon={<IntegrantesIcon fontSize="small" />}
                  iconPosition="start"
                />
              )}
              <Tab
                label={`Nutrición${nutricionData ? ` (${nutricionData.relevamientos.length})` : ''}`}
                icon={<NutricionTabIcon fontSize="small" />}
                iconPosition="start"
              />
              {puedeVerHistorial && <Tab label="Cambios" />}
            </Tabs>
          );
        })()}

        <DialogContent>
          {loadingDetalle ? (
            <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
          ) : detalleData ? (
            <>
              {/* ── TAB 0: Datos ── */}
              {tabDetalle === 0 && (
                <Box display="flex" flexDirection="column" gap={2} pt={1}>
                  <Box display="grid" gridTemplateColumns="1fr 1fr" gap={1.5}>
                    {[
                      { label: 'Tipo', value: detalleData.tipo },
                      { label: 'Programa', value: detalleData.programa?.nombre || '—' },
                      { label: 'Dirección', value: detalleData.direccion || '—' },
                      { label: 'Localidad', value: detalleData.localidad || '—' },
                      { label: 'Teléfono', value: detalleData.telefono || '—' },
                      { label: 'Frecuencia entrega', value: detalleData.frecuenciaEntrega || '—' },
                      { label: 'Responsable', value: detalleData.responsableNombre || '—' },
                      { label: 'DNI responsable', value: detalleData.responsableDNI || '—' },
                    ].map(({ label, value }) => (
                      <Box key={label}>
                        <Typography variant="caption" color="text.secondary">{label}</Typography>
                        <Typography variant="body2" fontWeight="medium">{value}</Typography>
                      </Box>
                    ))}
                  </Box>

                  {/* Próxima entrega / última entrega */}
                  {proximaEntrega && (
                    <Box>
                      <Divider sx={{ mb: 1.5 }} />
                      <Box display="grid" gridTemplateColumns="1fr 1fr" gap={1.5}>
                        <Box sx={{ p: 1.5, bgcolor: proximaEntrega.proxima ? 'primary.50' : 'grey.100', borderRadius: 1, border: '1px solid', borderColor: proximaEntrega.proxima ? 'primary.200' : 'grey.300' }}>
                          <Typography variant="caption" color="text.secondary">Próxima entrega programada</Typography>
                          {proximaEntrega.proxima ? (
                            <>
                              <Typography variant="body2" fontWeight="bold" color="primary.main">
                                {format(new Date(proximaEntrega.proxima.fechaProgramada), "dd/MM/yyyy", { locale: es })}
                                {proximaEntrega.proxima.hora ? ` — ${proximaEntrega.proxima.hora}` : ''}
                              </Typography>
                              <Chip label={proximaEntrega.proxima.estado} size="small" sx={{ mt: 0.5, height: 18, fontSize: '0.65rem' }} color={proximaEntrega.proxima.estado === 'GENERADA' ? 'info' : 'default'} />
                            </>
                          ) : (
                            <Typography variant="body2" color="text.secondary">Sin entrega programada</Typography>
                          )}
                        </Box>
                        <Box sx={{ p: 1.5, bgcolor: proximaEntrega.ultimaEntrega ? 'success.50' : 'grey.100', borderRadius: 1, border: '1px solid', borderColor: proximaEntrega.ultimaEntrega ? 'success.200' : 'grey.300' }}>
                          <Typography variant="caption" color="text.secondary">Última entrega efectiva</Typography>
                          {proximaEntrega.ultimaEntrega ? (
                            <>
                              <Typography variant="body2" fontWeight="bold" color="success.dark">
                                {format(new Date(proximaEntrega.ultimaEntrega.entregadoAt), "dd/MM/yyyy", { locale: es })}
                              </Typography>
                              {proximaEntrega.ultimaEntrega.totalKg && (
                                <Typography variant="caption" color="text.secondary">{proximaEntrega.ultimaEntrega.totalKg} kg</Typography>
                              )}
                            </>
                          ) : (
                            <Typography variant="body2" color="text.secondary">Sin entregas registradas</Typography>
                          )}
                        </Box>
                      </Box>
                    </Box>
                  )}

                  {detalleData.observaciones && (
                    <Box>
                      <Divider sx={{ mb: 1.5 }} />
                      <Typography variant="caption" color="text.secondary">Observaciones</Typography>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>{detalleData.observaciones}</Typography>
                    </Box>
                  )}

                  {/* Resumen de documentos adjuntos */}
                  {docsPreview.length > 0 && (
                    <Box>
                      <Divider sx={{ mb: 1.5 }} />
                      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                        <Typography variant="caption" color="text.secondary">
                          Documentos adjuntos ({docsPreview.length})
                        </Typography>
                        <Button
                          size="small"
                          startIcon={<DocsIcon fontSize="small" />}
                          sx={{ textTransform: 'none' }}
                          onClick={() => {
                            setDetalleOpen(false);
                            if (detalleData) handleAbrirDocs(detalleData);
                          }}
                        >
                          Ver todos
                        </Button>
                      </Box>
                      {/* Chips por tipo */}
                      <Box display="flex" flexWrap="wrap" gap={0.5} mb={1}>
                        {Object.entries(
                          docsPreview.reduce((acc: Record<string, number>, d: any) => {
                            const k = d.tipo || 'OTRO';
                            acc[k] = (acc[k] || 0) + 1;
                            return acc;
                          }, {})
                        ).map(([tipo, count]) => (
                          <Chip
                            key={tipo}
                            label={`${tipo} · ${count}`}
                            size="small"
                            variant="outlined"
                            color={tipo === 'FOTO' ? 'info' : tipo === 'RELEVAMIENTO' ? 'success' : tipo === 'RENDICION' ? 'warning' : 'default'}
                          />
                        ))}
                      </Box>
                      {/* Mini galería de fotos (máx 4) */}
                      {(() => {
                        const fotos = docsPreview.filter((d: any) => d.tipo === 'FOTO').slice(0, 4);
                        if (fotos.length === 0) return null;
                        return (
                          <Box display="flex" gap={0.75} mt={0.5}>
                            {fotos.map((f: any) => (
                              <Box
                                key={f.id}
                                component="a"
                                href={resolveUrl(f.url)}
                                target="_blank"
                                rel="noopener"
                                sx={{
                                  display: 'block',
                                  width: 64, height: 64,
                                  borderRadius: 1,
                                  overflow: 'hidden',
                                  border: '1px solid',
                                  borderColor: 'divider',
                                  cursor: 'zoom-in',
                                  '&:hover': { borderColor: 'primary.main' },
                                }}
                                title={f.nombre}
                              >
                                <img
                                  src={resolveUrl(f.url)}
                                  alt={f.nombre}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              </Box>
                            ))}
                          </Box>
                        );
                      })()}
                    </Box>
                  )}
                </Box>
              )}

              {/* ── TAB 1: Historial de Entregas ── */}
              {/* ── TAB 2: Otras Asistencias ── */}
              {tabDetalle === 2 && (
                <Box pt={1}>
                  {loadingCruce ? (
                    <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
                  ) : cruceData?.error ? (
                    <Typography color="error" textAlign="center" py={3}>Error al cargar el cruce</Typography>
                  ) : !cruceData?.dni ? (
                    <Box textAlign="center" py={4}>
                      <CruceIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        Este beneficiario no tiene DNI responsable registrado.<br />Agregá el DNI para habilitar el cruce de programas.
                      </Typography>
                    </Box>
                  ) : (
                    <>
                      <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                        Cruce por DNI: <strong>{cruceData.dni}</strong>
                      </Typography>

                      {/* ── Otros programas ── */}
                      <Typography variant="subtitle2" fontWeight="bold" mb={1}>
                        Otros programas ({cruceData.beneficiarios?.length ?? 0})
                      </Typography>
                      {cruceData.beneficiarios?.length === 0 ? (
                        <Typography variant="body2" color="text.secondary" mb={2}>
                          No aparece en otros programas.
                        </Typography>
                      ) : (
                        <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{ bgcolor: 'grey.50' }}>
                                <TableCell>Nombre</TableCell>
                                <TableCell>Programa</TableCell>
                                <TableCell>Secretaría</TableCell>
                                <TableCell>Tipo</TableCell>
                                <TableCell align="right">Entregas</TableCell>
                                <TableCell align="right">Kg total</TableCell>
                                <TableCell>Última entrega</TableCell>
                                <TableCell>Estado</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {cruceData.beneficiarios.map((b: any) => (
                                <TableRow key={b.id} hover>
                                  <TableCell><strong>{b.nombre}</strong></TableCell>
                                  <TableCell>{b.programa?.nombre ?? '—'}</TableCell>
                                  <TableCell>
                                    <Chip
                                      label={b.programa?.secretaria ?? '—'}
                                      size="small"
                                      color={b.programa?.secretaria === 'AC' ? 'warning' : 'primary'}
                                      variant="outlined"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="caption">{b.tipo}</Typography>
                                  </TableCell>
                                  <TableCell align="right">{b.cantidadEntregas}</TableCell>
                                  <TableCell align="right">{b.totalKg > 0 ? `${b.totalKg.toFixed(1)} kg` : '—'}</TableCell>
                                  <TableCell>
                                    <Typography variant="caption">
                                      {b.ultimaEntrega ? format(new Date(b.ultimaEntrega), 'dd/MM/yyyy', { locale: es }) : '—'}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Chip
                                      label={b.activo ? 'Activo' : 'Baja'}
                                      size="small"
                                      color={b.activo ? 'success' : 'default'}
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}

                      {/* ── Casos particulares ── */}
                      <Typography variant="subtitle2" fontWeight="bold" mb={1}>
                        Casos particulares ({cruceData.casos?.length ?? 0})
                      </Typography>
                      {cruceData.casos?.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                          No tiene casos particulares registrados.
                        </Typography>
                      ) : (
                        <TableContainer component={Paper} variant="outlined">
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{ bgcolor: 'grey.50' }}>
                                <TableCell>Solicitante</TableCell>
                                <TableCell>Tipo</TableCell>
                                <TableCell>Estado</TableCell>
                                <TableCell>Prioridad</TableCell>
                                <TableCell>Creado por</TableCell>
                                <TableCell>Fecha</TableCell>
                                <TableCell>Remito generado</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {cruceData.casos.map((c: any) => (
                                <TableRow key={c.id} hover>
                                  <TableCell><strong>{c.nombreSolicitante}</strong></TableCell>
                                  <TableCell><Typography variant="caption">{c.tipo}</Typography></TableCell>
                                  <TableCell>
                                    <Chip
                                      label={c.estado}
                                      size="small"
                                      color={
                                        c.estado === 'APROBADO' || c.estado === 'RESUELTO' ? 'success'
                                        : c.estado === 'RECHAZADO' ? 'error'
                                        : c.estado === 'EN_REVISION' ? 'info'
                                        : 'warning'
                                      }
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Chip
                                      label={c.prioridad}
                                      size="small"
                                      color={c.prioridad === 'URGENTE' ? 'error' : c.prioridad === 'ALTA' ? 'warning' : 'default'}
                                      variant="outlined"
                                    />
                                  </TableCell>
                                  <TableCell><Typography variant="caption">{c.creadoPorNombre}</Typography></TableCell>
                                  <TableCell>
                                    <Typography variant="caption">
                                      {format(new Date(c.createdAt), 'dd/MM/yyyy', { locale: es })}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    {c.remito ? (
                                      <Typography variant="caption" color="success.main">
                                        {c.remito.numero} ({c.remito.totalKg?.toFixed(1)} kg)
                                      </Typography>
                                    ) : (
                                      <Typography variant="caption" color="text.disabled">—</Typography>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                    </>
                  )}
                </Box>
              )}

              {/* ── TAB 3: Integrantes ── */}
              {tabDetalle === 3 && TIPOS_ESPACIO.includes(detalleData?.tipo) && (
                <Box pt={1}>
                  {/* Formulario agregar uno */}
                  <Box display="flex" gap={1} mb={2} flexWrap="wrap" alignItems="flex-start">
                    <TextField
                      size="small" label="Nombre *" value={integranteForm.nombre}
                      onChange={e => setIntegranteForm(f => ({ ...f, nombre: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && handleAddIntegrante()}
                      sx={{ flex: 2, minWidth: 180 }}
                    />
                    <TextField
                      size="small" label="DNI (opcional)" value={integranteForm.dni}
                      onChange={e => setIntegranteForm(f => ({ ...f, dni: e.target.value }))}
                      sx={{ flex: 1, minWidth: 120 }}
                    />
                    <TextField
                      size="small" label="Dirección (opcional)" value={integranteForm.direccion}
                      onChange={e => setIntegranteForm(f => ({ ...f, direccion: e.target.value }))}
                      sx={{ flex: 2, minWidth: 160 }}
                    />
                    <TextField
                      size="small" label="Grupo familiar" value={integranteForm.grupoFamiliar}
                      onChange={e => setIntegranteForm(f => ({ ...f, grupoFamiliar: e.target.value }))}
                      type="number" inputProps={{ min: 0 }}
                      sx={{ flex: 1, minWidth: 110 }}
                    />
                    <TextField
                      size="small" label="Menores (opcional)" value={integranteForm.menores}
                      onChange={e => setIntegranteForm(f => ({ ...f, menores: e.target.value }))}
                      type="number" inputProps={{ min: 0 }}
                      sx={{ flex: 1, minWidth: 120 }}
                    />
                    <Button
                      variant="contained" size="small"
                      disabled={!integranteForm.nombre.trim() || addingIntegrante}
                      onClick={handleAddIntegrante}
                      startIcon={<AddIcon />}
                    >
                      Agregar
                    </Button>
                    <Tooltip title="Importar CSV — formato: nombre,dni,direccion,grupoFamiliar,menores (una persona por fila, encabezado opcional)">
                      <Button
                        variant="outlined" size="small"
                        onClick={() => csvInputRef.current?.click()}
                        disabled={importingCsv}
                        startIcon={<UploadIcon />}
                      >
                        {importingCsv ? 'Importando…' : 'Importar CSV'}
                      </Button>
                    </Tooltip>
                    <input ref={csvInputRef} type="file" accept=".csv,.txt" hidden onChange={handleImportCsv} />
                  </Box>

                  {loadingIntegrantes ? (
                    <Box display="flex" justifyContent="center" py={3}><CircularProgress size={28} /></Box>
                  ) : integrantes.length === 0 ? (
                    <Box textAlign="center" py={4}>
                      <IntegrantesIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        Sin integrantes registrados.<br />
                        Podés agregar uno por uno o importar un CSV con el formato: nombre, DNI, dirección, grupo familiar, menores.
                      </Typography>
                    </Box>
                  ) : (
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: 'grey.50' }}>
                            <TableCell>Nombre</TableCell>
                            <TableCell>DNI</TableCell>
                            <TableCell>Dirección</TableCell>
                            <TableCell>Grupo familiar</TableCell>
                            <TableCell>Menores</TableCell>
                            <TableCell align="right" />
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {integrantes.map((i: any) => (
                            <TableRow key={i.id} hover>
                              <TableCell><strong>{i.nombre}</strong></TableCell>
                              <TableCell>{i.dni || <Typography variant="caption" color="text.disabled">—</Typography>}</TableCell>
                              <TableCell>{i.direccion || <Typography variant="caption" color="text.disabled">—</Typography>}</TableCell>
                              <TableCell>{i.grupoFamiliar ?? <Typography variant="caption" color="text.disabled">—</Typography>}</TableCell>
                              <TableCell>{i.menores ?? <Typography variant="caption" color="text.disabled">—</Typography>}</TableCell>
                              <TableCell align="right">
                                <Tooltip title="Eliminar integrante">
                                  <IconButton size="small" color="error" onClick={() => handleRemoveIntegrante(i.id)}>
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>
              )}

              {/* ── TAB Nutrición ── */}
              {(() => {
                const tieneInt = TIPOS_ESPACIO.includes(detalleData?.tipo);
                const tabN = tieneInt ? 4 : 3;
                if (tabDetalle !== tabN) return null;
                return (
                  <Box pt={1}>
                    {loadingNutricion ? (
                      <Box display="flex" justifyContent="center" py={4}><CircularProgress size={28} /></Box>
                    ) : !nutricionData || (nutricionData.relevamientos.length === 0 && nutricionData.programas.length === 0) ? (
                      <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
                        No hay datos nutricionales registrados para este espacio
                      </Typography>
                    ) : (
                      <Box>
                        {/* Relevamientos */}
                        {nutricionData.relevamientos.length > 0 && (
                          <Box mb={3}>
                            <Typography variant="subtitle2" fontWeight={600} mb={1}>
                              Relevamientos nutricionales ({nutricionData.relevamientos.length})
                            </Typography>
                            <TableContainer component={Paper} variant="outlined">
                              <Table size="small">
                                <TableHead>
                                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                                    <TableCell>Fecha</TableCell>
                                    <TableCell>Nutricionista</TableCell>
                                    <TableCell>Estado gral.</TableCell>
                                    <TableCell>Modalidad</TableCell>
                                    <TableCell>Población</TableCell>
                                    <TableCell>Infraestructura</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {nutricionData.relevamientos.map((r: any) => (
                                    <TableRow key={r.id} hover>
                                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                        {new Date(r.fecha).toLocaleDateString('es-AR')}
                                      </TableCell>
                                      <TableCell>{r.nutricionista?.nombre ?? '—'}</TableCell>
                                      <TableCell>
                                        {r.estadoGeneral ? (
                                          <Chip
                                            label={r.estadoGeneral}
                                            size="small"
                                            sx={{
                                              bgcolor: r.estadoGeneral === 'BUENO' ? '#43a047' : r.estadoGeneral === 'REGULAR' ? '#fb8c00' : '#e53935',
                                              color: '#fff',
                                              fontSize: '0.7rem',
                                            }}
                                          />
                                        ) : '—'}
                                      </TableCell>
                                      <TableCell sx={{ fontSize: '0.8rem' }}>
                                        {r.modalidad === 'RETIRAN_ALIMENTOS' ? 'Retiran' : r.modalidad === 'COMEN_EN_LUGAR' ? 'En lugar' : r.modalidad === 'MIXTO' ? 'Mixto' : '—'}
                                      </TableCell>
                                      <TableCell sx={{ fontSize: '0.8rem' }}>
                                        {[r.poblacionInfantil05 && `0-5: ${r.poblacionInfantil05}`, r.poblacionInfantil612 && `6-12: ${r.poblacionInfantil612}`, r.poblacionAdolescente && `Adol: ${r.poblacionAdolescente}`, r.poblacionAdulta && `Adult: ${r.poblacionAdulta}`].filter(Boolean).join(', ') || '—'}
                                      </TableCell>
                                      <TableCell sx={{ fontSize: '0.8rem' }}>
                                        {[r.tieneCocina && 'Cocina', r.aguaPotable && 'Agua', r.tieneHeladera && 'Heladera'].filter(Boolean).join(', ') || '—'}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          </Box>
                        )}

                        {/* Programas de terreno */}
                        {nutricionData.programas.length > 0 && (
                          <Box>
                            <Typography variant="subtitle2" fontWeight={600} mb={1}>
                              Programas de terreno ({nutricionData.programas.length})
                            </Typography>
                            <TableContainer component={Paper} variant="outlined">
                              <Table size="small">
                                <TableHead>
                                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                                    <TableCell>Programa</TableCell>
                                    <TableCell>Tipo</TableCell>
                                    <TableCell>Estado</TableCell>
                                    <TableCell>Inicio</TableCell>
                                    <TableCell>Actividades</TableCell>
                                    <TableCell>Nutricionista</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {nutricionData.programas.map((p: any) => (
                                    <TableRow key={p.id} hover>
                                      <TableCell><strong>{p.nombre || p.tipo}</strong></TableCell>
                                      <TableCell sx={{ fontSize: '0.8rem' }}>
                                        {({'HUERTA':'Huerta','MANIPULACION_ALIMENTOS':'Manip. alimentos','NUTRICION_INFANTIL':'Nutr. infantil','CAPACITACION':'Capacitación','OTRO':'Otro'} as any)[p.tipo] || p.tipo}
                                      </TableCell>
                                      <TableCell>
                                        <Chip
                                          label={({'PLANIFICADO':'Planificado','EN_CURSO':'En curso','FINALIZADO':'Finalizado','CANCELADO':'Cancelado'} as any)[p.estado] || p.estado}
                                          size="small"
                                          sx={{
                                            bgcolor: ({'PLANIFICADO':'#1e88e5','EN_CURSO':'#43a047','FINALIZADO':'#546e7a','CANCELADO':'#e53935'} as any)[p.estado] || '#9e9e9e',
                                            color: '#fff',
                                            fontSize: '0.7rem',
                                          }}
                                        />
                                      </TableCell>
                                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{new Date(p.fechaInicio).toLocaleDateString('es-AR')}</TableCell>
                                      <TableCell>{p._count?.actividades ?? 0}</TableCell>
                                      <TableCell>{p.nutricionista?.nombre ?? '—'}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          </Box>
                        )}
                      </Box>
                    )}
                  </Box>
                );
              })()}

              {/* ── TAB Historial de Cambios ── */}
              {puedeVerHistorial && (() => {
                const tieneInt = TIPOS_ESPACIO.includes(detalleData?.tipo);
                const tabH = tieneInt ? 5 : 4;
                if (tabDetalle !== tabH) return null;
                return (
                  <Box pt={1}>
                    <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                      Últimas 100 acciones sobre este beneficiario
                    </Typography>
                    {loadingHistorial ? (
                      <Box display="flex" justifyContent="center" py={4}><CircularProgress size={28} /></Box>
                    ) : !Array.isArray(historial) || historial.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
                        Sin registros de cambios
                      </Typography>
                    ) : (
                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ bgcolor: 'grey.50' }}>
                              <TableCell>Fecha</TableCell>
                              <TableCell>Usuario</TableCell>
                              <TableCell>Acción</TableCell>
                              <TableCell>Descripción</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {historial.map((log: any) => (
                              <TableRow key={log.id} hover>
                                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                  <Typography variant="caption">
                                    {format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="caption">{log.usuarioNombre ?? '—'}</Typography>
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={log.metodo}
                                    size="small"
                                    color={log.metodo === 'DELETE' ? 'error' : log.metodo === 'POST' ? 'success' : 'primary'}
                                    variant="outlined"
                                    sx={{ fontSize: '0.65rem', height: 18 }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Typography variant="caption" color="text.secondary">
                                    {log.descripcion ?? log.ruta}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </Box>
                );
              })()}

              {tabDetalle === 1 && (() => {
                const entregados = detalleData.remitos?.filter((r: any) => r.estado === 'ENTREGADO') ?? [];
                const totalKg = entregados.reduce((s: number, r: any) => s + (r.totalKg || 0), 0);
                const ultimaEntrega = entregados[0]?.entregadoAt;
                const freq = detalleData.frecuenciaEntrega;
                const mesesFreq: Record<string, number> = { MENSUAL: 1, BIMESTRAL: 2 };
                let proximaEntregaStr = '—';
                let proximaVencida = false;
                if (freq === 'EVENTUAL') {
                  proximaEntregaStr = 'Eventual';
                } else if (ultimaEntrega && mesesFreq[freq]) {
                  const proxima = addMonths(new Date(ultimaEntrega), mesesFreq[freq]);
                  proximaEntregaStr = format(proxima, 'dd/MM/yyyy', { locale: es });
                  proximaVencida = proxima < new Date();
                }
                return (
                  <Box pt={1}>
                    {/* Stats */}
                    <Box display="grid" gridTemplateColumns="repeat(4, 1fr)" gap={2} mb={2}>
                      {[
                        { label: 'ENTREGAS TOTALES', value: entregados.length, color: 'primary.main' },
                        { label: 'KG ACUMULADOS', value: `${totalKg.toFixed(1)} kg`, color: 'success.main' },
                        { label: 'ÚLTIMA ENTREGA', value: ultimaEntrega ? format(new Date(ultimaEntrega), 'dd/MM/yyyy', { locale: es }) : '—', color: 'text.primary' },
                        { label: 'PRÓXIMA ENTREGA', value: proximaEntregaStr, color: proximaVencida ? 'error.main' : 'warning.main' },
                      ].map((s) => (
                        <Card variant="outlined" key={s.label} sx={s.label === 'PRÓXIMA ENTREGA' && proximaVencida ? { borderColor: 'error.main' } : {}}>
                          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                            <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                            <Typography variant="h6" fontWeight="bold" color={s.color}>{s.value}</Typography>
                            {s.label === 'PRÓXIMA ENTREGA' && proximaVencida && (
                              <Typography variant="caption" color="error">¡Entrega atrasada!</Typography>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </Box>

                    {/* Tabla */}
                    {entregados.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
                        Sin entregas registradas
                      </Typography>
                    ) : (
                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ bgcolor: 'grey.50' }}>
                              <TableCell>N° Remito</TableCell>
                              <TableCell>Fecha entrega</TableCell>
                              <TableCell>Depósito</TableCell>
                              <TableCell align="right">Kg</TableCell>
                              <TableCell>Quién retiró</TableCell>
                              <TableCell>Artículos</TableCell>
                              <TableCell align="center">Foto</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {entregados.map((r: any) => (
                              <TableRow key={r.id} hover>
                                <TableCell>
                                  <Typography
                                    variant="body2"
                                    fontWeight="bold"
                                    sx={{ color: 'primary.main', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                                    onClick={() => {
                                      setDetalleOpen(false);
                                      navigate(`/historial-entregas?busqueda=${encodeURIComponent(r.numero)}`);
                                    }}
                                  >
                                    {r.numero}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  {r.entregadoAt
                                    ? format(new Date(r.entregadoAt), 'dd/MM/yyyy HH:mm', { locale: es })
                                    : format(new Date(r.fecha), 'dd/MM/yyyy', { locale: es })}
                                </TableCell>
                                <TableCell>
                                  <Typography variant="caption">{r.deposito?.nombre || '—'}</Typography>
                                </TableCell>
                                <TableCell align="right"><strong>{r.totalKg?.toFixed(1)}</strong></TableCell>
                                <TableCell>
                                  <Typography variant="caption" color={r.entregadoNota ? 'text.primary' : 'text.disabled'}>
                                    {r.entregadoNota || '—'}
                                  </Typography>
                                </TableCell>
                                <TableCell sx={{ maxWidth: 180 }}>
                                  <Typography variant="caption" color="text.secondary" noWrap>
                                    {r.items?.map((i: any) => `${i.articulo?.nombre} ×${i.cantidad}`).join(', ') || '—'}
                                  </Typography>
                                </TableCell>
                                <TableCell align="center">
                                  {r.entregadoFoto ? (
                                    <Tooltip title="Ver foto firmada">
                                      <IconButton
                                        size="small"
                                        color="success"
                                        onClick={() => window.open(resolveUrl(r.entregadoFoto), '_blank', 'noopener,noreferrer')}
                                      >
                                        <FotoIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  ) : (
                                    <Typography variant="caption" color="text.disabled">—</Typography>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </Box>
                );
              })()}
            </>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button
            startIcon={<DocsIcon />}
            onClick={() => {
              setDetalleOpen(false);
              if (detalleData) handleAbrirDocs(detalleData);
            }}
          >
            Documentos
          </Button>
          {puedeEditar && detalleData && (
            <Button
              startIcon={<EditIcon />}
              onClick={() => {
                setDetalleOpen(false);
                handleEdit(detalleData);
              }}
            >
              Editar
            </Button>
          )}
          <Button onClick={() => setDetalleOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog documentos */}
      <Dialog open={docsOpen} onClose={() => setDocsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={1}>
              <DocsIcon color="info" />
              Documentos — {docsTarget?.nombre}
            </Box>
            {documentos.length > 0 && (
              <Box display="flex" gap={0.5}>
                {(['PENDIENTE','APROBADO','RECHAZADO'] as const).map(est => {
                  const count = documentos.filter(d => d.estado === est).length;
                  if (!count) return null;
                  return <Chip key={est} label={`${count} ${est.toLowerCase()}`} size="small" color={ESTADO_COLOR[est]} />;
                })}
              </Box>
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          {/* Subir nuevo documento */}
          {puedeSubirDocs && (
            <Box sx={{ mb: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>Subir documento</Typography>
              <Box display="flex" gap={1} mb={1}>
                <TextField
                  size="small" fullWidth
                  label="Nombre del documento"
                  value={docNombre}
                  onChange={(e) => setDocNombre(e.target.value)}
                  placeholder="Ej: DNI frente, Informe social..."
                />
                <TextField
                  select size="small" sx={{ minWidth: 130 }}
                  label="Tipo"
                  value={docTipo}
                  onChange={(e) => setDocTipo(e.target.value)}
                >
                  <MenuItem value="">Sin tipo</MenuItem>
                  {TIPOS_DOC.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </TextField>
              </Box>
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: 'none' }}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadDoc(f); }}
              />
              <Button
                variant="outlined"
                size="small"
                startIcon={uploadingDoc ? <CircularProgress size={16} /> : <UploadIcon />}
                disabled={uploadingDoc}
                onClick={() => fileInputRef.current?.click()}
                fullWidth
              >
                {uploadingDoc ? 'Subiendo...' : 'Seleccionar archivo'}
              </Button>
            </Box>
          )}

          <Divider sx={{ mb: 1 }} />

          {/* Alerta documentos pendientes */}
          {puedeEditar && documentos.filter(d => d.estado === 'PENDIENTE').length > 0 && (
            <Box sx={{ mb: 1.5, p: 1, bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.main', borderRadius: 1 }}>
              <Typography variant="caption" color="warning.dark" fontWeight="bold">
                ⚠ {documentos.filter(d => d.estado === 'PENDIENTE').length} documento(s) pendiente(s) de revisión
              </Typography>
            </Box>
          )}

          {/* Lista de documentos */}
          {loadingDocs ? (
            <Box display="flex" justifyContent="center" py={3}><CircularProgress /></Box>
          ) : documentos.length === 0 ? (
            <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
              Sin documentos adjuntos
            </Typography>
          ) : (
            <List dense disablePadding>
              {documentos.map((doc) => (
                <ListItem
                  key={doc.id}
                  divider
                  sx={{ pr: 14 }}
                >
                  <Box display="flex" alignItems="center" gap={1} mr={1}>
                    <EstadoIcon estado={doc.estado} />
                  </Box>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body2" fontWeight="medium">{doc.nombre}</Typography>
                        {doc.tipo && <Chip label={doc.tipo} size="small" variant="outlined" sx={{ fontSize: 10 }} />}
                      </Box>
                    }
                    secondary={
                      <Chip
                        label={doc.estado}
                        size="small"
                        color={ESTADO_COLOR[doc.estado] ?? 'default'}
                        sx={{ fontSize: 10, mt: 0.3 }}
                      />
                    }
                  />
                  <ListItemSecondaryAction>
                    <Tooltip title="Abrir archivo">
                      <IconButton
                        size="small"
                        onClick={() => {
                          const base = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                          const url = doc.url.startsWith('http') ? doc.url : `${base}/${doc.url}`;
                          window.open(url, '_blank', 'noopener,noreferrer');
                        }}
                      >
                        <OpenIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {puedeEditar && doc.estado !== 'APROBADO' && (
                      <Tooltip title="Aprobar">
                        <IconButton size="small" color="success" onClick={() => handleEstadoDoc(doc.id, 'APROBADO')}>
                          <AprobadoIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {puedeEditar && doc.estado !== 'RECHAZADO' && (
                      <Tooltip title="Rechazar">
                        <IconButton size="small" color="error" onClick={() => handleEstadoDoc(doc.id, 'RECHAZADO')}>
                          <RechazadoIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {puedeEditar && doc.estado !== 'PENDIENTE' && (
                      <Tooltip title="Volver a Pendiente">
                        <IconButton size="small" color="warning" onClick={() => handleEstadoDoc(doc.id, 'PENDIENTE')}>
                          <PendienteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {puedeEditar && (
                      <Tooltip title="Eliminar">
                        <IconButton size="small" onClick={() => handleDeleteDoc(doc.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDocsOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
