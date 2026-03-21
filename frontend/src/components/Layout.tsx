import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Chip,
  Badge,
  Popover,
  Paper,
  Snackbar,
  Button,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Category as CategoryIcon,
  People as PeopleIcon,
  Inventory as InventoryIcon,
  Receipt as ReceiptIcon,
  CalendarMonth as CalendarIcon,
  Map as MapIcon,
  Assessment as ReportIcon,
  Logout as LogoutIcon,
  Folder as PlantillaIcon,
  Assignment as ArticleIcon,
  ManageAccounts as UsersIcon,
  LocalShipping as DepositoIcon,
  Security as AuditIcon,
  CheckCircle as TareasIcon,
  ContactSupport as MisCasosIcon,
  FolderSpecial as CasosParticularesIcon,
  Notifications as BellIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  GetApp as InstallIcon,
  Close as CloseIcon,
  Badge as BadgeIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../stores/authStore';
import { puedeAcceder, ROL_LABELS, Rol } from '../utils/permisos';
import api from '../services/api';

const drawerWidth = 260;

// Menú normal (todos los roles)
const menuItems = [
  { text: 'Dashboard',     icon: <DashboardIcon />,  path: '/',              seccion: 'dashboard' },
  { text: 'Programas',     icon: <CategoryIcon />,   path: '/programas',     seccion: 'programas' },
  { text: 'Plantillas',    icon: <PlantillaIcon />,  path: '/plantillas',    seccion: 'plantillas' },
  { text: 'Beneficiarios', icon: <PeopleIcon />,     path: '/beneficiarios', seccion: 'beneficiarios' },
  { text: 'Artículos',     icon: <ArticleIcon />,    path: '/articulos',     seccion: 'articulos' },
  { text: 'Stock',         icon: <InventoryIcon />,  path: '/stock',         seccion: 'stock' },
  { text: 'Remitos',       icon: <ReceiptIcon />,    path: '/remitos',       seccion: 'remitos' },
  { text: 'Cronograma',    icon: <CalendarIcon />,   path: '/cronograma',    seccion: 'cronograma' },
  { text: 'Mapa',          icon: <MapIcon />,        path: '/mapa',          seccion: 'mapa' },
  { text: 'Reportes',      icon: <ReportIcon />,     path: '/reportes',               seccion: 'reportes' },
  { text: 'Historial Entregas', icon: <DepositoIcon />, path: '/historial-entregas',   seccion: 'historial-entregas' },
  { text: 'Tareas',        icon: <TareasIcon />,     path: '/tareas',                 seccion: 'tareas' },
  { text: 'Auditoría',          icon: <AuditIcon />,               path: '/auditoria',          seccion: 'auditoria' },
  { text: 'Usuarios',           icon: <UsersIcon />,               path: '/usuarios',           seccion: 'usuarios' },
  { text: 'Casos Particulares', icon: <CasosParticularesIcon />,   path: '/casos-particulares', seccion: 'casos-particulares' },
  { text: 'Mis Casos',          icon: <MisCasosIcon />,            path: '/mis-casos',          seccion: 'mis-casos' },
  { text: 'Búsqueda por DNI',   icon: <BadgeIcon />,               path: '/busqueda-dni',       seccion: 'busqueda-dni' },
];

// Menú restringido para usuarios de depósito (LOGISTICA + depositoId)
const menuDeposito = [
  { text: 'Remitos de Hoy',     icon: <DepositoIcon />,  path: '/deposito',           seccion: 'deposito' },
  { text: 'Artículos',          icon: <ArticleIcon />,   path: '/articulos',          seccion: 'articulos' },
  { text: 'Stock',              icon: <InventoryIcon />, path: '/stock',              seccion: 'stock' },
  { text: 'Historial Entregas', icon: <TareasIcon />,    path: '/historial-entregas', seccion: 'historial-entregas' },
  { text: 'Mis Casos',          icon: <MisCasosIcon />,  path: '/mis-casos',          seccion: 'mis-casos' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [bellAnchor, setBellAnchor] = useState<null | HTMLElement>(null);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [updateBanner, setUpdateBanner] = useState<{ msg: string; tipo: string } | null>(null);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Capturar el evento de instalación PWA
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
      setShowInstallBanner(false);
    }
  };

  // SSE: actualizaciones en tiempo real (ticket efímero para no exponer JWT en URL)
  useEffect(() => {
    if (!user) return;
    let es: EventSource | null = null;
    let cancelled = false;

    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    const buildMsg = (payload: any): string => {
      const { tipo, numero, nombre, beneficiario, programa, estado } = payload;
      switch (tipo) {
        case 'remito:nuevo':      return `Nuevo remito ${numero ?? ''}${beneficiario ? ` — ${beneficiario}` : ''}`;
        case 'remito:confirmado': return `Remito confirmado${numero ? ` ${numero}` : ''}`;
        case 'remito:entregado':  return `Entrega registrada${beneficiario ? ` — ${beneficiario}` : ''}`;
        case 'caso:nuevo':        return `Nuevo caso: ${nombre ?? ''}${programa ? ` (${programa})` : ''}`;
        case 'caso:actualizado':  return `Caso actualizado${estado ? ` → ${estado}` : ''}`;
        default: return tipo;
      }
    };

    const conectar = async () => {
      try {
        // 1. Obtener ticket efímero vía POST autenticado (Bearer en header, no en URL)
        const { data } = await api.post('/events/ticket');
        if (cancelled) return;

        // 2. Abrir SSE con el ticket de un solo uso
        es = new EventSource(`${API_BASE}/events/stream?ticket=${encodeURIComponent(data.ticket)}`);

        es.onmessage = (e) => {
          try {
            const payload = JSON.parse(e.data);
            if (payload.tipo && payload.tipo !== 'ping') {
              setUpdateBanner({ msg: buildMsg(payload), tipo: payload.tipo });
            }
            window.dispatchEvent(new CustomEvent('sigam:update', { detail: payload }));
          } catch { /* ignorar mensajes malformados */ }
        };

        es.onerror = () => {
          // EventSource reconecta automáticamente; al reconectar necesita nuevo ticket
          es?.close();
          if (!cancelled) setTimeout(conectar, 5000);
        };
      } catch { /* silencioso si el backend no está disponible */ }
    };

    conectar();
    return () => { cancelled = true; es?.close(); };
  }, [user]);

  // Cargar notificaciones cada 2 minutos
  useEffect(() => {
    const fetchNotifs = () => {
      api.get('/reportes/notificaciones').then(r => setNotifs(r.data.notificaciones ?? [])).catch(() => {});
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const rolLabel = user?.rol ? ROL_LABELS[user.rol as Rol] ?? user.rol : '';
  // Usuarios de depósito físico: LOGISTICA con depositoId asignado
  const esDeposito = !!(user?.depositoId);

  // Si es usuario de depósito, menú restringido; si no, filtrar por rol
  const visibleItems = esDeposito
    ? menuDeposito
    : menuItems.filter((item) => puedeAcceder(user?.rol, item.seccion));

  const drawer = (
    <div>
      <Toolbar sx={{ bgcolor: 'primary.main', color: 'white', flexDirection: 'column', alignItems: 'flex-start', py: 1.5 }}>
        <Typography variant="h6" fontWeight="bold">Gestor Municipal</Typography>
        <Typography variant="caption" sx={{ opacity: 0.8 }}>
          {esDeposito
            ? (user?.deposito?.nombre || 'Depósito')
            : user?.rol === 'ASISTENCIA_CRITICA'
              ? 'Dirección de Asistencia Crítica'
              : 'Secretaría de Desarrollo Social'}
        </Typography>
      </Toolbar>
      <Divider />
      <List sx={{ pt: 1 }}>
        {visibleItems.map((item) => {
          const active =
            location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                component={Link}
                to={item.path}
                selected={active}
                sx={{
                  mx: 1,
                  borderRadius: 1,
                  mb: 0.5,
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'white',
                    '& .MuiListItemIcon-root': { color: 'white' },
                    '&:hover': { bgcolor: 'primary.dark' },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{ width: { sm: `calc(100% - ${drawerWidth}px)` }, ml: { sm: `${drawerWidth}px` } }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen(!mobileOpen)}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
            Sistema de Gestión Alimentaria
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Chip
              label={rolLabel}
              size="small"
              sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontSize: '0.7rem' }}
            />
            <IconButton color="inherit" size="small" onClick={(e) => setBellAnchor(e.currentTarget)}>
              <Badge badgeContent={notifs.length || null} color="error" max={9}>
                <BellIcon />
              </Badge>
            </IconButton>
            <Typography variant="body2">{user?.nombre}</Typography>
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} size="small">
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                {user?.nombre?.[0]?.toUpperCase()}
              </Avatar>
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="body2" fontWeight="bold">{user?.nombre}</Typography>
          <Typography variant="caption" color="text.secondary">{rolLabel}</Typography>
        </Box>
        <Divider />
        <MenuItem onClick={() => { logout(); navigate('/'); setAnchorEl(null); }}>
          <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
          Cerrar Sesión
        </MenuItem>
      </Menu>

      {/* Popover de notificaciones */}
      <Popover
        open={Boolean(bellAnchor)}
        anchorEl={bellAnchor}
        onClose={() => setBellAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Paper sx={{ width: 360, maxHeight: 480, overflow: 'auto' }}>
          <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle1" fontWeight="bold">Notificaciones</Typography>
          </Box>
          {notifs.length === 0 ? (
            <Box sx={{ px: 2, py: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">Sin alertas activas</Typography>
            </Box>
          ) : (
            <List disablePadding>
              {notifs.map((n: any, i: number) => (
                <ListItem
                  key={i}
                  divider
                  button
                  onClick={() => { setBellAnchor(null); navigate(n.link); }}
                  sx={{ alignItems: 'flex-start', py: 1.5, cursor: 'pointer' }}
                >
                  <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}>
                    {n.nivel === 'error'
                      ? <ErrorIcon color="error" fontSize="small" />
                      : <WarningIcon color="warning" fontSize="small" />
                    }
                  </ListItemIcon>
                  <ListItemText
                    primary={<Typography variant="body2" fontWeight="bold">{n.titulo}</Typography>}
                    secondary={<Typography variant="caption" color="text.secondary">{n.descripcion}</Typography>}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
      </Popover>

      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { width: drawerWidth } }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{ display: { xs: 'none', sm: 'block' }, '& .MuiDrawer-paper': { width: drawerWidth } }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` }, mt: 8 }}>
        {children}
      </Box>

      {/* Toast de actualizaciones en tiempo real */}
      <Snackbar
        open={!!updateBanner}
        autoHideDuration={5000}
        onClose={() => setUpdateBanner(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Paper elevation={4} sx={{
          display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.2,
          borderLeft: '4px solid',
          borderColor: updateBanner?.tipo?.startsWith('caso') ? 'warning.main' : 'success.main',
          minWidth: 240, maxWidth: 380,
        }}>
          <Box sx={{
            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
            bgcolor: updateBanner?.tipo?.startsWith('caso') ? 'warning.main' : 'success.main',
            animation: 'pulse 1s ease-in-out',
          }} />
          <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>
            {updateBanner?.msg}
          </Typography>
          <IconButton size="small" onClick={() => setUpdateBanner(null)} sx={{ p: 0.25 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Paper>
      </Snackbar>

      {/* Banner de instalación PWA */}
      <Snackbar
        open={showInstallBanner}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ bottom: { xs: 16, sm: 24 } }}
      >
        <Paper elevation={6} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5, borderLeft: '4px solid', borderColor: 'primary.main', maxWidth: 380 }}>
          <InstallIcon color="primary" />
          <Box flex={1}>
            <Typography variant="body2" fontWeight="bold">Instalar SIGAM</Typography>
            <Typography variant="caption" color="text.secondary">Agregá la app a tu pantalla de inicio para usarla sin internet.</Typography>
          </Box>
          <Button size="small" variant="contained" onClick={handleInstall} sx={{ whiteSpace: 'nowrap' }}>
            Instalar
          </Button>
          <IconButton size="small" onClick={() => setShowInstallBanner(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Paper>
      </Snackbar>
    </Box>
  );
}
