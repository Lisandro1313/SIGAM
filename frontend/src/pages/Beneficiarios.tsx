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
  Badge,
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
} from '@mui/icons-material';
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

  // Documentos
  const [docsOpen, setDocsOpen] = useState(false);
  const [docsTarget, setDocsTarget] = useState<any>(null);
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docNombre, setDocNombre] = useState('');
  const [docTipo, setDocTipo] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { user } = useAuthStore();
  const { showNotification } = useNotificationStore();
  const puedeEditar = user ? puedeHacer(user.rol, 'beneficiarios.editar') : false;
  const puedeCrear  = user ? puedeHacer(user.rol, 'beneficiarios.crear')  : false;
  const puedeRelevamiento = user ? puedeHacer(user.rol, 'beneficiarios.relevamiento') : false;
  const puedeSubirDocs = user ? ['ADMIN', 'OPERADOR_PROGRAMA', 'TRABAJADORA_SOCIAL'].includes(user.rol) : false;

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
      (b.direccion && b.direccion.toLowerCase().includes(searchTerm.toLowerCase()))
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
          placeholder="Buscar por nombre, localidad o dirección..."
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
                  <TableCell><strong>{beneficiario.nombre}</strong></TableCell>
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
                      <IconButton size="small" href={doc.url} target="_blank" rel="noopener noreferrer">
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
