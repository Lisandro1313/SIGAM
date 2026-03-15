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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Block as DeactivateIcon,
  CheckCircleOutline as ActivateIcon,
  Key as PasswordIcon,
} from '@mui/icons-material';
import api from '../services/api';
import { useNotificationStore } from '../stores/notificationStore';
import { ROL_LABELS, Rol } from '../utils/permisos';

const ROLES: Rol[] = [
  'ADMIN',
  'LOGISTICA',
  'OPERADOR_PROGRAMA',
  'TRABAJADORA_SOCIAL',
  'ASISTENCIA_CRITICA',
  'VISOR',
];

const ROL_COLOR: Record<Rol, 'error' | 'warning' | 'primary' | 'success' | 'secondary' | 'default'> = {
  ADMIN:              'error',
  LOGISTICA:          'warning',
  OPERADOR_PROGRAMA:  'primary',
  TRABAJADORA_SOCIAL: 'success',
  ASISTENCIA_CRITICA: 'secondary',
  VISOR:              'default',
};

const ROL_DESC: Record<Rol, string> = {
  ADMIN:              'Acceso total. Gestión de usuarios, programas y configuración.',
  LOGISTICA:          'Gestiona stock, depósitos e ingresos. Requiere depósito asignado.',
  OPERADOR_PROGRAMA:  'Gestiona beneficiarios y remitos de su programa asignado.',
  TRABAJADORA_SOCIAL: 'Solo puede cargar y editar el relevamiento de beneficiarios.',
  ASISTENCIA_CRITICA: 'Solo puede crear y ver sus propios remitos (chapas, materiales, etc.).',
  VISOR:              'Acceso de solo lectura al dashboard, beneficiarios y reportes.',
};

export default function UsuariosPage() {
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
      const [uRes, pRes, dRes] = await Promise.all([
        api.get('/usuarios'),
        api.get('/programas'),
        api.get('/depositos'),
      ]);
      setUsuarios(uRes.data);
      setProgramas(pRes.data.filter((p: any) => p.activo));
      setDepositos(dRes.data.filter((d: any) => d.activo));
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

  // Al cambiar rol, limpiar campos que no corresponden
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
      const payload: any = { nombre, email, rol, activo };
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
        <Box>
          <Typography variant="h4" fontWeight="bold">Usuarios</Typography>
          <Typography variant="body2" color="text.secondary">
            {activos.length} activos · {inactivos.length} inactivos
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => openForm()}>
          Nuevo Usuario
        </Button>
      </Box>

      {/* Usuarios activos */}
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
                      <Typography variant="caption" color="text.disabled">—</Typography>
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

      {/* Usuarios inactivos */}
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

          {/* Depósito — solo para LOGISTICA */}
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

          {/* Programa — solo para OPERADOR_PROGRAMA */}
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

          {/* Alertas informativas */}
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
