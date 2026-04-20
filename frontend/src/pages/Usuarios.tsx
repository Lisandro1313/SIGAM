import { useEffect, useState } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Switch,
  FormControlLabel,
  Tooltip,
  Alert,
  Divider,
  Tabs,
  Tab,
  Stack,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Block as DeactivateIcon,
  CheckCircleOutline as ActivateIcon,
  Key as PasswordIcon,
  Phone as PhoneIcon,
  WhatsApp as WhatsAppIcon,
  People as PeopleIcon,
  Badge as BadgeIcon,
  NotificationsActive as NotifIcon,
  NotificationsOff as NotifOffIcon,
  Cake as CumpleanosIcon,
  Event as EventoIcon,
  EmojiEvents as SocialTabIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import api from '../services/api';
import { getProgramas, getDepositos } from '../utils/staticCache';
import { useNotificationStore } from '../stores/notificationStore';
import { ROL_LABELS, Rol } from '../utils/permisos';

const ROLES: Rol[] = [
  'ADMIN',
  'LOGISTICA',
  'OPERADOR_PROGRAMA',
  'TRABAJADORA_SOCIAL',
  'ASISTENCIA_CRITICA',
  'VISOR',
  'CHOFER',
  'NUTRICIONISTA',
];

const ROL_COLOR: Record<Rol, 'error' | 'warning' | 'primary' | 'success' | 'secondary' | 'default'> = {
  ADMIN:              'error',
  LOGISTICA:          'warning',
  OPERADOR_PROGRAMA:  'primary',
  TRABAJADORA_SOCIAL: 'success',
  ASISTENCIA_CRITICA: 'secondary',
  VISOR:              'default',
  CHOFER:             'warning',
  NUTRICIONISTA:      'success',
};

const ROL_DESC: Record<Rol, string> = {
  ADMIN:              'Acceso total. Gestión de usuarios, programas y configuración.',
  LOGISTICA:          'Gestiona stock, depósitos e ingresos. Requiere depósito asignado.',
  OPERADOR_PROGRAMA:  'Gestiona beneficiarios y remitos de su programa asignado.',
  TRABAJADORA_SOCIAL: 'Solo puede cargar y editar el relevamiento de beneficiarios.',
  ASISTENCIA_CRITICA: 'Solo puede crear y ver sus propios remitos (chapas, materiales, etc.).',
  VISOR:              'Acceso de solo lectura al dashboard, beneficiarios y reportes.',
  CHOFER:             'Reparto a domicilio. Solo ve y gestiona sus entregas asignadas.',
  NUTRICIONISTA:      'Visita espacios, hace relevamientos nutricionales y gestiona programas de terreno.',
};

// ============================================================================
// Tab Personal
// ============================================================================
function PersonalTab() {
  const [personal, setPersonal] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const { showNotification } = useNotificationStore();

  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [cargo, setCargo] = useState('');
  const [email, setEmail] = useState('');
  const [activo, setActivo] = useState(true);
  const [subscribingId, setSubscribingId] = useState<number | null>(null);

  useEffect(() => { loadPersonal(); }, []);

  const loadPersonal = async () => {
    try {
      const res = await api.get('/personal?includeInactive=true');
      setPersonal(res.data);
    } catch {
      showNotification('Error al cargar personal', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openForm = (p?: any) => {
    if (p) {
      setSelected(p);
      setNombre(p.nombre);
      setTelefono(p.telefono || '');
      setCargo(p.cargo || '');
      setEmail(p.email || '');
      setActivo(p.activo);
    } else {
      setSelected(null);
      setNombre('');
      setTelefono('');
      setCargo('');
      setEmail('');
      setActivo(true);
    }
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!nombre) {
      showNotification('El nombre es requerido', 'warning');
      return;
    }
    setSaving(true);
    try {
      const payload: any = { nombre, telefono: telefono || null, cargo: cargo || null, email: email || null };
      if (selected) payload.activo = activo;

      if (selected) {
        await api.patch(`/personal/${selected.id}`, payload);
        showNotification('Personal actualizado', 'success');
      } else {
        await api.post('/personal', payload);
        showNotification('Personal agregado', 'success');
      }
      setFormOpen(false);
      loadPersonal();
    } catch (error: any) {
      showNotification(error.response?.data?.message || 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (p: any) => {
    try {
      await api.patch(`/personal/${p.id}`, { activo: !p.activo });
      showNotification(`${p.nombre} ${p.activo ? 'desactivado' : 'activado'}`, 'info');
      loadPersonal();
    } catch {
      showNotification('Error al cambiar estado', 'error');
    }
  };

  const activarNotificaciones = async (p: any) => {
    setSubscribingId(p.id);
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        showNotification('Este navegador no soporta notificaciones push', 'error');
        return;
      }

      const permiso = await Notification.requestPermission();
      if (permiso !== 'granted') {
        showNotification('Permiso de notificaciones denegado', 'warning');
        return;
      }

      // Registrar service worker (forzar actualización)
      const registration = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
      // Esperar a que esté activo
      if (registration.installing) {
        await new Promise<void>((resolve) => {
          registration.installing!.addEventListener('statechange', (e) => {
            if ((e.target as ServiceWorker).state === 'activated') resolve();
          });
        });
      } else if (!registration.active) {
        await navigator.serviceWorker.ready;
      }

      // Obtener VAPID key del backend
      const { data: vapidData } = await api.get('/personal/push/vapid-key');
      if (!vapidData.publicKey) {
        showNotification('Push notifications no configuradas en el servidor', 'warning');
        return;
      }

      // Suscribirse
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidData.publicKey,
      });

      // Guardar suscripción en el backend
      await api.post(`/personal/${p.id}/push-subscription`, {
        subscription: JSON.stringify(subscription),
      });

      showNotification(`Notificaciones activadas para ${p.nombre}`, 'success');
      loadPersonal();
    } catch (err: any) {
      showNotification(`Error: ${err.message}`, 'error');
    } finally {
      setSubscribingId(null);
    }
  };

  const testPush = async (p: any) => {
    try {
      const { data } = await api.post(`/personal/${p.id}/test-push`);
      showNotification(data.message, data.ok ? 'success' : 'warning');
      if (!data.ok && data.message.includes('expiró')) loadPersonal();
    } catch {
      showNotification('Error al enviar push de prueba', 'error');
    }
  };

  if (loading) {
    return <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>;
  }

  const activos = personal.filter(p => p.activo);
  const inactivos = personal.filter(p => !p.activo);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="body2" color="text.secondary">
          {activos.length} activos · {inactivos.length} inactivos
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => openForm()}>
          Agregar
        </Button>
      </Box>

      <TableContainer component={Paper} elevation={2} sx={{ mb: 4 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell><strong>Nombre</strong></TableCell>
              <TableCell><strong>Cargo</strong></TableCell>
              <TableCell><strong>Teléfono</strong></TableCell>
              <TableCell><strong>Email</strong></TableCell>
              <TableCell align="center"><strong>Acciones</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {activos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No hay personal cargado. Hacé clic en "Agregar" para empezar.
                </TableCell>
              </TableRow>
            ) : (
              activos.map((p) => (
                <TableRow key={p.id} hover>
                  <TableCell><strong>{p.nombre}</strong></TableCell>
                  <TableCell>
                    {p.cargo ? (
                      <Chip label={p.cargo} size="small" variant="outlined" />
                    ) : (
                      <Typography variant="caption" color="text.disabled">--</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {p.telefono ? (
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <PhoneIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="body2">{p.telefono}</Typography>
                        <Tooltip title="Enviar WhatsApp">
                          <IconButton
                            size="small"
                            color="success"
                            href={`https://wa.me/${p.telefono.replace(/\D/g, '')}`}
                            target="_blank"
                          >
                            <WhatsAppIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.disabled">--</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">{p.email || '--'}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title={p.pushSubscription ? 'Enviar push de prueba' : 'Activar notificaciones en este dispositivo'}>
                      <IconButton
                        size="small"
                        color={p.pushSubscription ? 'success' : 'default'}
                        onClick={() => p.pushSubscription ? testPush(p) : activarNotificaciones(p)}
                        disabled={subscribingId === p.id}
                      >
                        {subscribingId === p.id ? (
                          <CircularProgress size={18} />
                        ) : p.pushSubscription ? (
                          <NotifIcon fontSize="small" />
                        ) : (
                          <NotifOffIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => openForm(p)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Desactivar">
                      <IconButton size="small" color="warning" onClick={() => handleToggle(p)}>
                        <DeactivateIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {inactivos.length > 0 && (
        <>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Inactivos ({inactivos.length})
          </Typography>
          <TableContainer component={Paper} elevation={1} sx={{ opacity: 0.65 }}>
            <Table size="small">
              <TableBody>
                {inactivos.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell sx={{ color: 'text.disabled' }}>{p.nombre}</TableCell>
                    <TableCell sx={{ color: 'text.disabled' }}>{p.cargo || '--'}</TableCell>
                    <TableCell sx={{ color: 'text.disabled' }}>{p.telefono || '--'}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Reactivar">
                        <IconButton size="small" color="success" onClick={() => handleToggle(p)}>
                          <ActivateIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* Dialog crear/editar personal */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{selected ? `Editar: ${selected.nombre}` : 'Agregar Personal'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth label="Nombre completo"
            value={nombre} onChange={(e) => setNombre(e.target.value)}
            margin="normal" required
          />
          <TextField
            fullWidth label="Cargo / Rol"
            value={cargo} onChange={(e) => setCargo(e.target.value)}
            margin="normal"
            placeholder="Ej: Chofer, Coordinador, Nutricionista..."
          />
          <TextField
            fullWidth label="Teléfono"
            value={telefono} onChange={(e) => setTelefono(e.target.value)}
            margin="normal"
            placeholder="Ej: 5491112345678"
            helperText="Con código de país para WhatsApp (ej: 549...)"
          />
          <TextField
            fullWidth label="Email"
            type="email"
            value={email} onChange={(e) => setEmail(e.target.value)}
            margin="normal"
          />
          {selected && (
            <FormControlLabel
              control={<Switch checked={activo} onChange={(e) => setActivo(e.target.checked)} color="success" />}
              label={activo ? 'Activo' : 'Inactivo'}
              sx={{ mt: 2 }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)} disabled={saving}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={24} /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ============================================================================
// Tab Usuarios (código original)
// ============================================================================
function UsuariosTab() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [programas, setProgramas] = useState<any[]>([]);
  const [depositos, setDepositos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const { showNotification } = useNotificationStore();

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState<Rol>('VISOR');
  const [programaId, setProgramaId] = useState('');
  const [depositoId, setDepositoId] = useState('');
  const [activo, setActivo] = useState(true);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const [uRes, progs, deps] = await Promise.all([
        api.get('/usuarios'),
        getProgramas(),
        getDepositos(),
      ]);
      setUsuarios(uRes.data);
      setProgramas(progs.filter((p: any) => p.activo));
      setDepositos(deps.filter((d: any) => d.activo));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openForm = (usuario?: any) => {
    if (usuario) {
      setSelected(usuario);
      setNombre(usuario.nombre);
      setEmail(usuario.email);
      setPassword('');
      setRol(usuario.rol);
      setProgramaId(usuario.programaId ? String(usuario.programaId) : '');
      setDepositoId(usuario.depositoId ? String(usuario.depositoId) : '');
      setActivo(usuario.activo);
    } else {
      setSelected(null);
      setNombre('');
      setEmail('');
      setPassword('');
      setRol('VISOR');
      setProgramaId('');
      setDepositoId('');
      setActivo(true);
    }
    setFormOpen(true);
  };

  const handleRolChange = (nuevoRol: Rol) => {
    setRol(nuevoRol);
    if (nuevoRol !== 'OPERADOR_PROGRAMA') setProgramaId('');
    if (nuevoRol !== 'LOGISTICA') setDepositoId('');
  };

  const handleSave = async () => {
    if (!nombre || !email) {
      showNotification('Nombre y email son requeridos', 'warning');
      return;
    }
    if (!selected && !password) {
      showNotification('La contraseña es requerida para usuarios nuevos', 'warning');
      return;
    }
    setSaving(true);
    try {
      const payload: any = { nombre, email, rol };
      if (selected) payload.activo = activo;
      payload.programaId = rol === 'OPERADOR_PROGRAMA' && programaId ? parseInt(programaId) : null;
      payload.depositoId = rol === 'LOGISTICA' && depositoId ? parseInt(depositoId) : null;
      if (password) payload.password = password;

      if (selected) {
        await api.patch(`/usuarios/${selected.id}`, payload);
        showNotification('Usuario actualizado', 'success');
      } else {
        await api.post('/usuarios', payload);
        showNotification('Usuario creado correctamente', 'success');
      }
      setFormOpen(false);
      loadAll();
    } catch (error: any) {
      showNotification(error.response?.data?.message || 'Error al guardar usuario', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (usuario: any) => {
    try {
      await api.patch(`/usuarios/${usuario.id}`, { activo: !usuario.activo });
      showNotification(`Usuario ${usuario.activo ? 'desactivado' : 'activado'}`, 'info');
      loadAll();
    } catch {
      showNotification('Error al cambiar estado del usuario', 'error');
    }
  };

  if (loading) {
    return <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>;
  }

  const activos = usuarios.filter(u => u.activo);
  const inactivos = usuarios.filter(u => !u.activo);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="body2" color="text.secondary">
          {activos.length} activos · {inactivos.length} inactivos
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => openForm()}>
          Nuevo Usuario
        </Button>
      </Box>

      <TableContainer component={Paper} elevation={2} sx={{ mb: 4 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell><strong>Nombre</strong></TableCell>
              <TableCell><strong>Email</strong></TableCell>
              <TableCell><strong>Rol</strong></TableCell>
              <TableCell><strong>Asignación</strong></TableCell>
              <TableCell align="center"><strong>Acciones</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {activos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No hay usuarios activos
                </TableCell>
              </TableRow>
            ) : (
              activos.map((u) => (
                <TableRow key={u.id} hover>
                  <TableCell><strong>{u.nombre}</strong></TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>{u.email}</TableCell>
                  <TableCell>
                    <Chip
                      label={ROL_LABELS[u.rol as Rol] ?? u.rol}
                      size="small"
                      color={ROL_COLOR[u.rol as Rol] ?? 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    {u.rol === 'LOGISTICA' && u.deposito && (
                      <Chip label={u.deposito.nombre} size="small" variant="outlined" color="warning" />
                    )}
                    {u.rol === 'OPERADOR_PROGRAMA' && u.programa && (
                      <Chip label={u.programa.nombre} size="small" variant="outlined" color="primary" />
                    )}
                    {!u.deposito && !u.programa && (
                      <Typography variant="caption" color="text.disabled">--</Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => openForm(u)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Desactivar usuario">
                      <IconButton size="small" color="warning" onClick={() => handleToggle(u)}>
                        <DeactivateIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {inactivos.length > 0 && (
        <>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Inactivos ({inactivos.length})
          </Typography>
          <TableContainer component={Paper} elevation={1} sx={{ opacity: 0.65 }}>
            <Table size="small">
              <TableBody>
                {inactivos.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell sx={{ color: 'text.disabled' }}>{u.nombre}</TableCell>
                    <TableCell sx={{ color: 'text.disabled' }}>{u.email}</TableCell>
                    <TableCell>
                      <Chip label={ROL_LABELS[u.rol as Rol] ?? u.rol} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Reactivar">
                        <IconButton size="small" color="success" onClick={() => handleToggle(u)}>
                          <ActivateIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* Dialog crear/editar */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selected ? `Editar: ${selected.nombre}` : 'Nuevo Usuario'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth label="Nombre completo"
            value={nombre} onChange={(e) => setNombre(e.target.value)}
            margin="normal" required
          />
          <TextField
            fullWidth label="Email"
            type="email"
            value={email} onChange={(e) => setEmail(e.target.value)}
            margin="normal" required
            disabled={!!selected}
            helperText={selected ? 'El email no puede modificarse' : ''}
          />
          <TextField
            fullWidth
            label={selected ? 'Nueva contraseña (vacío = no cambiar)' : 'Contraseña'}
            type="password"
            value={password} onChange={(e) => setPassword(e.target.value)}
            margin="normal"
            required={!selected}
            InputProps={{
              startAdornment: <PasswordIcon sx={{ mr: 1, color: 'text.disabled', fontSize: 18 }} />,
            }}
          />

          <Divider sx={{ my: 2 }} />

          <TextField
            select fullWidth label="Rol"
            value={rol} onChange={(e) => handleRolChange(e.target.value as Rol)}
            margin="normal" required
          >
            {ROLES.map((r) => (
              <MenuItem key={r} value={r}>
                <Box>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Chip label={ROL_LABELS[r]} size="small" color={ROL_COLOR[r]} />
                  </Box>
                  <Typography variant="caption" color="text.secondary" display="block" mt={0.3}>
                    {ROL_DESC[r]}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </TextField>

          {rol === 'LOGISTICA' && (
            <TextField
              select fullWidth label="Depósito asignado *"
              value={depositoId} onChange={(e) => setDepositoId(e.target.value)}
              margin="normal"
              helperText="El usuario solo accederá al inventario y remitos de este depósito"
            >
              <MenuItem value="">Seleccionar depósito...</MenuItem>
              {depositos.map((d) => (
                <MenuItem key={d.id} value={d.id}>{d.nombre}</MenuItem>
              ))}
            </TextField>
          )}

          {rol === 'OPERADOR_PROGRAMA' && (
            <TextField
              select fullWidth label="Programa asignado *"
              value={programaId} onChange={(e) => setProgramaId(e.target.value)}
              margin="normal"
              helperText="El usuario solo podrá gestionar beneficiarios de este programa"
            >
              <MenuItem value="">Seleccionar programa...</MenuItem>
              {programas.map((p) => (
                <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
              ))}
            </TextField>
          )}

          {rol === 'ADMIN' && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              Acceso total al sistema, incluida la gestión de usuarios.
            </Alert>
          )}
          {rol === 'TRABAJADORA_SOCIAL' && (
            <Alert severity="info" sx={{ mt: 1 }}>
              Solo puede ver beneficiarios y cargar observaciones. Sin acceso a remitos ni stock.
            </Alert>
          )}
          {rol === 'VISOR' && (
            <Alert severity="info" sx={{ mt: 1 }}>
              Solo lectura. No puede crear ni modificar nada.
            </Alert>
          )}

          {selected && (
            <FormControlLabel
              control={<Switch checked={activo} onChange={(e) => setActivo(e.target.checked)} color="success" />}
              label={activo ? 'Usuario activo' : 'Usuario inactivo'}
              sx={{ mt: 2 }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)} disabled={saving}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={24} /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ============================================================================
// Tab Social — cumpleaños y eventos del equipo
// ============================================================================
const COLORES_SOCIAL = ['#e91e63','#1976d2','#43a047','#fb8c00','#8e24aa','#00897b','#f44336','#3f51b5'];

function SocialTab() {
  const { showNotification } = useNotificationStore();
  const [eventos, setEventos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<any>(null);
  const [form, setForm] = useState({ titulo: '', fecha: '', tipo: 'CUMPLEANOS', descripcion: '', color: '#e91e63', recurrente: true });
  const [saving, setSaving] = useState(false);
  const [filtro, setFiltro] = useState<'TODOS'|'CUMPLEANOS'|'EVENTO'>('TODOS');

  const cargar = async () => {
    setLoading(true);
    try { const r = await api.get('/social'); setEventos(r.data ?? []); }
    catch { showNotification('Error cargando eventos', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, []);

  const abrirNuevo = (tipo: 'CUMPLEANOS' | 'EVENTO') => {
    setEditando(null);
    setForm({ titulo: '', fecha: '', tipo, descripcion: '', color: tipo === 'CUMPLEANOS' ? '#e91e63' : '#1976d2', recurrente: tipo === 'CUMPLEANOS' });
    setDialogOpen(true);
  };

  const abrirEditar = (ev: any) => {
    setEditando(ev);
    setForm({ titulo: ev.titulo, fecha: ev.fecha, tipo: ev.tipo, descripcion: ev.descripcion ?? '', color: ev.color, recurrente: ev.recurrente });
    setDialogOpen(true);
  };

  const guardar = async () => {
    if (!form.titulo.trim() || !form.fecha) { showNotification('Completá título y fecha', 'warning'); return; }
    setSaving(true);
    try {
      if (editando) await api.patch(`/social/${editando.id}`, form);
      else await api.post('/social', form);
      setDialogOpen(false);
      cargar();
      showNotification(editando ? 'Evento actualizado' : 'Evento agregado', 'success');
    } catch { showNotification('Error guardando', 'error'); }
    finally { setSaving(false); }
  };

  const eliminar = async (id: number, titulo: string) => {
    if (!confirm(`¿Eliminar "${titulo}"?`)) return;
    try { await api.delete(`/social/${id}`); cargar(); showNotification('Eliminado', 'success'); }
    catch { showNotification('Error eliminando', 'error'); }
  };

  const eventosFiltrados = filtro === 'TODOS' ? eventos : eventos.filter(e => e.tipo === filtro);

  // Ordenar: primero por mes-día (los más próximos al día de hoy)
  const hoy = new Date();
  const sorted = [...eventosFiltrados].sort((a, b) => {
    const diaEnAnio = (fecha: string, recurrente: boolean) => {
      if (recurrente) {
        const [mm, dd] = fecha.split('-').map(Number);
        let d = new Date(hoy.getFullYear(), mm - 1, dd);
        if (d < hoy) d = new Date(hoy.getFullYear() + 1, mm - 1, dd);
        return d.getTime();
      }
      return new Date(fecha).getTime();
    };
    return diaEnAnio(a.fecha, a.recurrente) - diaEnAnio(b.fecha, b.recurrente);
  });

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={1.5} mb={2}>
        <Box>
          <Typography variant="subtitle1" fontWeight="bold">Eventos Sociales del Equipo</Typography>
          <Typography variant="body2" color="text.secondary">
            Cumpleaños del personal, eventos institucionales, fechas especiales. Aparecen en la campana de notificaciones.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<CumpleanosIcon />} onClick={() => abrirNuevo('CUMPLEANOS')} size="small" sx={{ borderColor: '#e91e63', color: '#e91e63' }}>
            Cumpleaños
          </Button>
          <Button variant="contained" startIcon={<EventoIcon />} onClick={() => abrirNuevo('EVENTO')} size="small">
            Evento
          </Button>
        </Stack>
      </Stack>

      <ToggleButtonGroup value={filtro} exclusive onChange={(_, v) => v && setFiltro(v)} size="small" sx={{ mb: 2 }}>
        <ToggleButton value="TODOS">Todos ({eventos.length})</ToggleButton>
        <ToggleButton value="CUMPLEANOS">Cumpleaños ({eventos.filter(e => e.tipo === 'CUMPLEANOS').length})</ToggleButton>
        <ToggleButton value="EVENTO">Eventos ({eventos.filter(e => e.tipo === 'EVENTO').length})</ToggleButton>
      </ToggleButtonGroup>

      {loading ? <CircularProgress size={28} /> : sorted.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'action.hover' }}>
          <SocialTabIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
          <Typography variant="h6" gutterBottom>Sin eventos cargados</Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Agregá cumpleaños del equipo o eventos institucionales para verlos en las notificaciones.
          </Typography>
          <Stack direction="row" spacing={1} justifyContent="center">
            <Button variant="outlined" startIcon={<CumpleanosIcon />} onClick={() => abrirNuevo('CUMPLEANOS')} sx={{ borderColor: '#e91e63', color: '#e91e63' }}>
              Primer cumpleaños
            </Button>
            <Button variant="contained" startIcon={<EventoIcon />} onClick={() => abrirNuevo('EVENTO')}>
              Primer evento
            </Button>
          </Stack>
        </Paper>
      ) : (
        <List disablePadding>
          {sorted.map((ev) => {
            // Calcular días que faltan
            let diasFaltan = 0;
            let fechaLabel = '';
            if (ev.recurrente) {
              const [mm, dd] = ev.fecha.split('-').map(Number);
              let d = new Date(hoy.getFullYear(), mm - 1, dd);
              if (d < hoy) d = new Date(hoy.getFullYear() + 1, mm - 1, dd);
              diasFaltan = Math.floor((d.getTime() - hoy.getTime()) / 86400000);
              fechaLabel = `${String(dd).padStart(2,'0')}/${String(mm).padStart(2,'0')} (cada año)`;
            } else {
              const [y, mm, dd] = ev.fecha.split('-').map(Number);
              const d = new Date(y, mm - 1, dd);
              diasFaltan = Math.floor((d.getTime() - hoy.getTime()) / 86400000);
              fechaLabel = `${String(dd).padStart(2,'0')}/${String(mm).padStart(2,'0')}/${y}`;
            }
            const esHoy = diasFaltan === 0;
            const esSemana = diasFaltan >= 0 && diasFaltan <= 7;

            return (
              <Paper
                key={ev.id}
                elevation={esHoy ? 3 : 1}
                sx={{ mb: 1, borderLeft: `4px solid ${ev.color}`, bgcolor: esHoy ? 'action.selected' : 'background.paper' }}
              >
                <ListItem>
                  <ListItemText
                    primary={
                      <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                        {ev.tipo === 'CUMPLEANOS'
                          ? <CumpleanosIcon sx={{ color: ev.color, fontSize: 18 }} />
                          : <EventoIcon sx={{ color: ev.color, fontSize: 18 }} />
                        }
                        <Typography variant="body1" fontWeight="bold">{ev.titulo}</Typography>
                        {esHoy && <Chip label="¡Hoy!" size="small" color="secondary" />}
                        {!esHoy && esSemana && <Chip label={`en ${diasFaltan}d`} size="small" color="primary" />}
                        {!esHoy && !esSemana && diasFaltan >= 0 && (
                          <Typography variant="caption" color="text.disabled">en {diasFaltan} días</Typography>
                        )}
                        {diasFaltan < 0 && <Chip label="Pasado" size="small" variant="outlined" />}
                      </Stack>
                    }
                    secondary={
                      <Stack direction="row" spacing={1} alignItems="center" mt={0.3}>
                        <Typography variant="caption" color="text.secondary">{fechaLabel}</Typography>
                        {ev.descripcion && <Typography variant="caption" color="text.disabled">· {ev.descripcion}</Typography>}
                      </Stack>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => abrirEditar(ev)}><EditIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton size="small" color="error" onClick={() => eliminar(ev.id, ev.titulo)}><DeleteIcon fontSize="small" /></IconButton>
                    </Tooltip>
                  </ListItemSecondaryAction>
                </ListItem>
              </Paper>
            );
          })}
        </List>
      )}

      {/* Dialog crear/editar */}
      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editando ? 'Editar evento' : form.tipo === 'CUMPLEANOS' ? 'Agregar cumpleaños' : 'Agregar evento'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label={form.tipo === 'CUMPLEANOS' ? 'Nombre (ej: Cumpleaños Alan)' : 'Título del evento'}
              fullWidth required autoFocus
              value={form.titulo}
              onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
            />
            <TextField
              label={form.recurrente ? 'Fecha (MM-DD, ej: 04-26 para 26 de abril)' : 'Fecha (YYYY-MM-DD)'}
              fullWidth required
              placeholder={form.recurrente ? 'MM-DD' : 'YYYY-MM-DD'}
              value={form.fecha}
              onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
              helperText={form.recurrente ? 'Solo mes y día — se repite cada año automáticamente' : 'Fecha específica (una sola vez)'}
            />
            <TextField
              select label="Tipo"
              value={form.tipo}
              onChange={e => {
                const t = e.target.value;
                setForm(f => ({ ...f, tipo: t, recurrente: t === 'CUMPLEANOS', color: t === 'CUMPLEANOS' ? '#e91e63' : '#1976d2' }));
              }}
            >
              <MenuItem value="CUMPLEANOS">🎂 Cumpleaños</MenuItem>
              <MenuItem value="EVENTO">📅 Evento</MenuItem>
            </TextField>
            <FormControlLabel
              control={<Switch checked={form.recurrente} onChange={e => setForm(f => ({ ...f, recurrente: e.target.checked }))} />}
              label={form.recurrente ? 'Se repite cada año (usar formato MM-DD)' : 'Fecha puntual (usar formato YYYY-MM-DD)'}
            />
            <TextField
              label="Descripción (opcional)"
              fullWidth multiline rows={2}
              value={form.descripcion}
              onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              placeholder="Ej: Manzaneras y Piqueteras, Salón Municipal..."
            />
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>Color</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {COLORES_SOCIAL.map(c => (
                  <Box
                    key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                    sx={{ width: 30, height: 30, borderRadius: '50%', bgcolor: c, cursor: 'pointer', border: form.color === c ? '3px solid #000' : '2px solid #fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
                  />
                ))}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button>
          <Button variant="contained" onClick={guardar} disabled={saving} startIcon={<SaveIcon />}>
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ============================================================================
// Página principal con Tabs
// ============================================================================
export default function UsuariosPage() {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" mb={1}>Usuarios y Personal</Typography>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab icon={<PeopleIcon />} iconPosition="start" label="Usuarios del Sistema" />
        <Tab icon={<BadgeIcon />} iconPosition="start" label="Personal / Equipo" />
        <Tab icon={<SocialTabIcon />} iconPosition="start" label="Social" />
      </Tabs>

      {tab === 0 && <UsuariosTab />}
      {tab === 1 && <PersonalTab />}
      {tab === 2 && <SocialTab />}
    </Box>
  );
}
