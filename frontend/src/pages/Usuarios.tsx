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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  PersonOff as DeactivateIcon,
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

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [usuariosRes, programasRes, depositosRes] = await Promise.all([
        api.get('/usuarios'),
        api.get('/programas'),
        api.get('/depositos'),
      ]);
      setUsuarios(usuariosRes.data);
      setProgramas(programasRes.data.filter((p: any) => p.activo));
      setDepositos(depositosRes.data.filter((d: any) => d.activo));
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
      if (programaId) payload.programaId = parseInt(programaId);
      if (depositoId) payload.depositoId = parseInt(depositoId);
      else if (selected) payload.depositoId = null; // desasignar si se borra
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

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">Usuarios</Typography>
          <Typography variant="body2" color="text.secondary">
            Gestión de accesos por rol
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => openForm()}>
          Nuevo Usuario
        </Button>
      </Box>

      {/* Referencia de roles */}
      <Paper elevation={1} sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
        <Typography variant="subtitle2" gutterBottom>Roles disponibles:</Typography>
        <Box display="flex" flexWrap="wrap" gap={1}>
          {ROLES.map((r) => (
            <Chip
              key={r}
              label={ROL_LABELS[r]}
              size="small"
              color={ROL_COLOR[r]}
              variant="outlined"
            />
          ))}
        </Box>
        <Typography variant="caption" color="text.secondary" mt={1} display="block">
          • <strong>Políticas Alimentarias (ADMIN)</strong>: acceso total &nbsp;
          • <strong>Logística</strong>: stock y remitos &nbsp;
          • <strong>Operador de Programa</strong>: beneficiarios y remitos de su programa &nbsp;
          • <strong>Trabajadora Social</strong>: solo relevamiento de beneficiarios &nbsp;
          • <strong>Asistencia Crítica</strong>: solo sus remitos (chapas, materiales) &nbsp;
          • <strong>Visor</strong>: solo lectura
        </Typography>
      </Paper>

      <TableContainer component={Paper} elevation={2}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Rol</TableCell>
              <TableCell>Programa</TableCell>
              <TableCell align="center">Estado</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {usuarios.map((usuario) => (
              <TableRow key={usuario.id} hover sx={{ opacity: usuario.activo ? 1 : 0.6 }}>
                <TableCell><strong>{usuario.nombre}</strong></TableCell>
                <TableCell>{usuario.email}</TableCell>
                <TableCell>
                  <Chip
                    label={ROL_LABELS[usuario.rol as Rol] ?? usuario.rol}
                    size="small"
                    color={ROL_COLOR[usuario.rol as Rol] ?? 'default'}
                  />
                </TableCell>
                <TableCell>{usuario.programa?.nombre || '-'}</TableCell>
                <TableCell align="center">
                  <Chip
                    label={usuario.activo ? 'Activo' : 'Inactivo'}
                    size="small"
                    color={usuario.activo ? 'success' : 'default'}
                  />
                </TableCell>
                <TableCell align="center">
                  <IconButton size="small" onClick={() => openForm(usuario)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    color={usuario.activo ? 'warning' : 'success'}
                    onClick={() => handleToggle(usuario)}
                    title={usuario.activo ? 'Desactivar' : 'Activar'}
                  >
                    <DeactivateIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{selected ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
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
            fullWidth label={selected ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
            type="password"
            value={password} onChange={(e) => setPassword(e.target.value)}
            margin="normal"
            required={!selected}
          />
          <TextField
            select fullWidth label="Rol"
            value={rol} onChange={(e) => setRol(e.target.value as Rol)}
            margin="normal" required
            helperText="Define qué secciones puede ver y qué acciones puede realizar"
          >
            {ROLES.map((r) => (
              <MenuItem key={r} value={r}>
                <Chip label={ROL_LABELS[r]} size="small" color={ROL_COLOR[r]} sx={{ mr: 1 }} />
                {ROL_LABELS[r]}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select fullWidth label="Programa (opcional)"
            value={programaId} onChange={(e) => setProgramaId(e.target.value)}
            margin="normal"
            helperText="Asociar a un programa específico (para Operador de Programa)"
          >
            <MenuItem value="">Sin programa</MenuItem>
            {programas.map((p) => (
              <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
            ))}
          </TextField>
          <TextField
            select fullWidth label="Depósito asignado (opcional)"
            value={depositoId} onChange={(e) => setDepositoId(e.target.value)}
            margin="normal"
            helperText="Para rol LOGÍSTICA: solo verá remitos de este depósito"
          >
            <MenuItem value="">Sin depósito</MenuItem>
            {depositos.map((d) => (
              <MenuItem key={d.id} value={d.id}>{d.nombre}</MenuItem>
            ))}
          </TextField>
          {selected && (
            <FormControlLabel
              control={<Switch checked={activo} onChange={(e) => setActivo(e.target.checked)} />}
              label="Usuario activo"
              sx={{ mt: 1 }}
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
