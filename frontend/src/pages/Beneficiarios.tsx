import { useEffect, useRef, useState } from 'react';
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
} from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../services/api';
import BeneficiarioForm from '../components/BeneficiarioForm';
import SearchBar from '../components/SearchBar';
import ExportExcelButton from '../components/ExportExcelButton';
import { useAuthStore } from '../stores/authStore';
import { puedeHacer } from '../utils/permisos';
import { useNotificationStore } from '../stores/notificationStore';

const TIPOS_DOC = ['DNI', 'INFORME', 'FOTO', 'CONTRATO', 'OTRO'];

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
  const [beneficiarios, setBeneficiarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedBeneficiario, setSelectedBeneficiario] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

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

  useEffect(() => { loadBeneficiarios(); }, []);

  const loadBeneficiarios = async () => {
    try {
      const response = await api.get('/beneficiarios');
      setBeneficiarios(response.data);
    } catch (error) {
      console.error('Error cargando beneficiarios:', error);
    } finally {
      setLoading(false);
    }
  };

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
    try {
      const res = await api.get(`/beneficiarios/${beneficiario.id}`);
      setDetalleData(res.data);
    } catch {
      showNotification('Error cargando datos del beneficiario', 'error');
      setDetalleOpen(false);
    } finally {
      setLoadingDetalle(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  const filteredBeneficiarios = beneficiarios.filter(
    (b) =>
      b.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.localidad && b.localidad.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (b.direccion && b.direccion.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (b.responsableDNI && b.responsableDNI.includes(searchTerm)) ||
      (b.responsableNombre && b.responsableNombre.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const paginatedBeneficiarios = filteredBeneficiarios.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">Beneficiarios</Typography>
        <Box display="flex" gap={2}>
          {puedeEditar && (
            <ExportExcelButton
              data={beneficiarios.map((b) => ({
                nombre: b.nombre,
                tipo: b.tipo,
                localidad: b.localidad,
                direccion: b.direccion,
                telefono: b.telefono,
                programa: b.programa?.nombre || '-',
                frecuencia: b.frecuenciaEntrega,
              }))}
              fileName="beneficiarios"
              sheetName="Beneficiarios"
              label="Exportar"
            />
          )}
          {puedeCrear && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormOpen(true)}>
              Nuevo Beneficiario
            </Button>
          )}
        </Box>
      </Box>

      <Box mb={3} maxWidth={400}>
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Buscar por nombre, DNI, responsable, localidad..."
        />
      </Box>

      <TableContainer component={Paper} elevation={2}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Localidad</TableCell>
              <TableCell>Programa</TableCell>
              <TableCell>Frecuencia</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedBeneficiarios.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body2" color="text.secondary">
                    {filteredBeneficiarios.length === 0 ? 'No se encontraron beneficiarios' : 'No hay beneficiarios en esta página'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedBeneficiarios.map((beneficiario) => (
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
                  <TableCell>
                    <Chip label={beneficiario.tipo} size="small" />
                  </TableCell>
                  <TableCell>{beneficiario.localidad}</TableCell>
                  <TableCell>{beneficiario.programa?.nombre || '—'}</TableCell>
                  <TableCell>
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
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filteredBeneficiarios.length}
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

        {detalleData && (
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
            }}
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
          </Tabs>
        )}

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

                  {detalleData.observaciones && (
                    <Box>
                      <Divider sx={{ mb: 1.5 }} />
                      <Typography variant="caption" color="text.secondary">Observaciones</Typography>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>{detalleData.observaciones}</Typography>
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
                                      color={b.programa?.secretaria === 'CITA' ? 'warning' : 'primary'}
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

              {tabDetalle === 1 && (() => {
                const entregados = detalleData.remitos?.filter((r: any) => r.estado === 'ENTREGADO') ?? [];
                const totalKg = entregados.reduce((s: number, r: any) => s + (r.totalKg || 0), 0);
                const ultimaEntrega = entregados[0]?.entregadoAt;
                return (
                  <Box pt={1}>
                    {/* Stats */}
                    <Box display="grid" gridTemplateColumns="repeat(3, 1fr)" gap={2} mb={2}>
                      {[
                        { label: 'ENTREGAS TOTALES', value: entregados.length, color: 'primary.main' },
                        { label: 'KG ACUMULADOS', value: `${totalKg.toFixed(1)} kg`, color: 'success.main' },
                        { label: 'ÚLTIMA ENTREGA', value: ultimaEntrega ? format(new Date(ultimaEntrega), 'dd/MM/yyyy', { locale: es }) : '—', color: 'text.primary' },
                      ].map((s) => (
                        <Card variant="outlined" key={s.label}>
                          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                            <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                            <Typography variant="h6" fontWeight="bold" color={s.color}>{s.value}</Typography>
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
                                <TableCell><strong>{r.numero}</strong></TableCell>
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
          <Box display="flex" alignItems="center" gap={1}>
            <DocsIcon color="info" />
            Documentos — {docsTarget?.nombre}
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
                    {puedeEditar && (
                      <Tooltip title="Eliminar">
                        <IconButton size="small" color="error" onClick={() => handleDeleteDoc(doc.id)}>
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
