import { useEffect, useState, useCallback, useRef } from 'react';
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
  Dialog,
  DialogContent,
  TextField,
  InputAdornment,
  CircularProgress,
  Tooltip,
  Tab,
  Tabs,
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
  Search as SearchIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  CheckCircle as EntregaOkIcon,
  History as HistoryIcon,
  DoneAll as MarcarTodasIcon,
  Restaurant as NutricionIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../stores/authStore';
import { useColorMode } from '../theme/ColorModeContext';
import { puedeAcceder, ROL_LABELS, Rol } from '../utils/permisos';
import api from '../services/api';
import NewsTicker from './NewsTicker';

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
  { text: 'Nutrición',          icon: <NutricionIcon />,           path: '/nutricionista',      seccion: 'nutricionista' },
];

// Menú restringido para usuarios de depósito (LOGISTICA + depositoId)
const menuDeposito = [
  { text: 'Remitos de Hoy',     icon: <DepositoIcon />,  path: '/deposito',           seccion: 'deposito' },
  { text: 'Artículos',          icon: <ArticleIcon />,   path: '/articulos',          seccion: 'articulos' },
  { text: 'Stock',              icon: <InventoryIcon />, path: '/stock',              seccion: 'stock' },
  { text: 'Historial Entregas', icon: <TareasIcon />,    path: '/historial-entregas', seccion: 'historial-entregas' },
  { text: 'Mis Casos',          icon: <MisCasosIcon />,  path: '/mis-casos',          seccion: 'mis-casos' },
];

// Menú restringido para choferes (reparto a domicilio)
const menuChofer = [
  { text: 'Mis Entregas',  icon: <DepositoIcon />,  path: '/mis-entregas',  seccion: 'mis-entregas' },
];

// Menú para nutricionistas
const menuNutricionista = [
  { text: 'Nutrición',      icon: <NutricionIcon />,  path: '/nutricionista',  seccion: 'nutricionista' },
  { text: 'Beneficiarios',  icon: <PeopleIcon />,     path: '/beneficiarios',  seccion: 'beneficiarios' },
];

const ESTADO_CHIP: Record<string, string> = {
  PENDIENTE: '#fb8c00', EN_REVISION: '#1e88e5', APROBADO: '#43a047', RECHAZADO: '#e53935', RESUELTO: '#546e7a',
  BORRADOR: '#9e9e9e', CONFIRMADO: '#1e88e5', ENVIADO: '#00acc1', ENTREGADO: '#43a047',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [bellAnchor, setBellAnchor] = useState<null | HTMLElement>(null);
  const [bellTab, setBellTab] = useState(0);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [entregas, setEntregas] = useState<any[]>([]);
  const [tareasPendientes, setTareasPendientes] = useState<any[]>([]);
  const [leidasIds, setLeidasIds] = useState<Set<number>>(new Set());
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [updateBanner, setUpdateBanner] = useState<{ msg: string; tipo: string } | null>(null);
  const { user, logout } = useAuthStore();
  const { mode, toggle: toggleColorMode } = useColorMode();
  const navigate = useNavigate();

  // Clave de localStorage por usuario — cargamos las leídas cuando user está listo
  const leidasKey = `sigam_leidas_${user?.id ?? 'anon'}`;
  useEffect(() => {
    try {
      const raw = localStorage.getItem(leidasKey);
      if (raw) setLeidasIds(new Set(JSON.parse(raw)));
    } catch { /* ignorar */ }
  }, [leidasKey]);
  const location = useLocation();

  // Búsqueda global
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setSearchResults(null); return; }
    setSearchLoading(true);
    try {
      const res = await api.get('/reportes/busqueda', { params: { q: q.trim() } });
      setSearchResults(res.data);
    } catch { setSearchResults(null); }
    finally { setSearchLoading(false); }
  }, []);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => doSearch(searchQ), 400);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [searchQ, doSearch]);

  // Ctrl+K / Cmd+K abre búsqueda
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleSearchClose = () => { setSearchOpen(false); setSearchQ(''); setSearchResults(null); };
  const handleNavigate = (path: string) => { handleSearchClose(); navigate(path); };

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
    let retryDelay = 5000; // backoff exponencial: 5s, 10s, 20s, 40s… max 60s

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
        es = new EventSource(`${API_BASE}/api/events/stream?ticket=${encodeURIComponent(data.ticket)}`);

        es.onmessage = (e) => {
          try {
            const payload = JSON.parse(e.data);
            if (payload.tipo && payload.tipo !== 'ping') {
              setUpdateBanner({ msg: buildMsg(payload), tipo: payload.tipo });
              // Si es una entrega, recargar la lista de entregas recientes
              if (payload.tipo === 'remito:entregado') {
                api.get('/reportes/entregas-recientes', { params: { horas: 72 } })
                  .then(r => setEntregas(r.data ?? []))
                  .catch(() => {});
              }
            }
            window.dispatchEvent(new CustomEvent('sigam:update', { detail: payload }));
          } catch { /* ignorar mensajes malformados */ }
        };

        es.onopen = () => {
          retryDelay = 5000; // conexión exitosa: resetear backoff
        };

        es.onerror = () => {
          es?.close();
          if (!cancelled) {
            setTimeout(conectar, retryDelay);
            retryDelay = Math.min(retryDelay * 2, 60000); // backoff: 5s → 10s → 20s → 40s → 60s max
          }
        };
      } catch {
        // Backend no disponible: reintentar con backoff
        if (!cancelled) {
          setTimeout(conectar, retryDelay);
          retryDelay = Math.min(retryDelay * 2, 60000);
        }
      }
    };

    conectar();
    return () => { cancelled = true; es?.close(); };
  }, [user]);

  // Cargar notificaciones cada 2 minutos (no para chofer ni nutricionista)
  useEffect(() => {
    const rolSinNotifs = user && (user.rol === 'CHOFER' || user.rol === 'NUTRICIONISTA');
    if (rolSinNotifs) return;
    const esDeliveryRole = user && !user.depositoId && ['ADMIN', 'OPERADOR_PROGRAMA', 'TRABAJADORA_SOCIAL', 'VISOR'].includes(user.rol);
    const fetchNotifs = () => {
      api.get('/reportes/notificaciones').then(r => setNotifs(r.data.notificaciones ?? [])).catch(() => {});
      if (esDeliveryRole) {
        api.get('/reportes/entregas-recientes', { params: { horas: 72 } })
          .then(r => setEntregas(r.data ?? []))
          .catch(() => {});
      }
      api.get('/tareas', { params: { estado: 'PENDIENTE,EN_PROGRESO' } })
        .then(r => setTareasPendientes(r.data ?? []))
        .catch(() => {});
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  // Marcar entrega como leída
  const marcarLeida = (remitoId: number) => {
    setLeidasIds(prev => {
      const next = new Set(prev);
      next.add(remitoId);
      try { localStorage.setItem(leidasKey, JSON.stringify([...next])); } catch { /* ignorar */ }
      return next;
    });
  };

  const marcarTodasLeidas = () => {
    setLeidasIds(prev => {
      const next = new Set(prev);
      entregas.forEach(e => next.add(e.remitoId));
      try { localStorage.setItem(leidasKey, JSON.stringify([...next])); } catch { /* ignorar */ }
      return next;
    });
  };

  const entregasNoLeidas = entregas.filter(e => !leidasIds.has(e.remitoId));

  const rolLabel = user?.rol ? ROL_LABELS[user.rol as Rol] ?? user.rol : '';
  // Usuarios de depósito físico: LOGISTICA con depositoId asignado
  const esDeposito = !!(user?.depositoId);

  const esChofer = user?.rol === 'CHOFER';
  const esNutricionista = user?.rol === 'NUTRICIONISTA';
  // Si es usuario de depósito, menú restringido; si no, filtrar por rol
  const visibleItems = esChofer
    ? menuChofer
    : esNutricionista
      ? menuNutricionista
      : esDeposito
        ? menuDeposito
        : menuItems.filter((item) => puedeAcceder(user?.rol, item.seccion));

  const drawer = (
    <div>
      <Toolbar sx={{ bgcolor: 'primary.main', color: 'white', flexDirection: 'column', alignItems: 'flex-start', py: 1.5 }}>
        <Typography variant="h6" fontWeight="bold">Gestor Municipal</Typography>
        <Typography variant="caption" sx={{ opacity: 0.8 }}>
          {esChofer
            ? 'Reparto a domicilio'
            : esDeposito
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
                onClick={() => setMobileOpen(false)}
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
        sx={esChofer
          ? { width: '100%', bgcolor: '#e65100' }
          : { width: { sm: `calc(100% - ${drawerWidth}px)` }, ml: { sm: `${drawerWidth}px` } }
        }
      >
        <Toolbar>
          {!esChofer && (
            <IconButton
              color="inherit"
              edge="start"
              onClick={() => setMobileOpen(!mobileOpen)}
              sx={{ mr: 2, display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" noWrap sx={{ flexGrow: 1, fontSize: { xs: '0.95rem', sm: '1.25rem' } }}>
            {esChofer ? 'SIGAM — Reparto' : esNutricionista ? 'SIGAM — Nutrición' : 'Sistema de Gestión Alimentaria'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: esChofer ? 0.5 : 1.5 }}>
            {!esChofer && (
              <>
                <Chip
                  label={rolLabel}
                  size="small"
                  sx={{ display: { xs: 'none', sm: 'flex' }, bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontSize: '0.7rem' }}
                />
                <Tooltip title="Buscar (Ctrl+K)">
                  <IconButton color="inherit" size="small" onClick={() => setSearchOpen(true)}>
                    <SearchIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title={mode === 'dark' ? 'Modo claro' : 'Modo oscuro'}>
                  <IconButton color="inherit" size="small" onClick={toggleColorMode}>
                    {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
                  </IconButton>
                </Tooltip>
                {!esNutricionista && (
                  <IconButton color="inherit" size="small" onClick={(e) => setBellAnchor(e.currentTarget)}>
                    <Badge badgeContent={(notifs.length + entregasNoLeidas.length + tareasPendientes.length) || null} color="error" max={9}>
                      <BellIcon />
                    </Badge>
                  </IconButton>
                )}
                <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>{user?.nombre}</Typography>
              </>
            )}
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} size="small">
              <Avatar sx={{ width: 32, height: 32, bgcolor: esChofer ? '#bf360c' : 'secondary.main' }}>
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
        <Paper sx={{ width: { xs: 'calc(100vw - 32px)', sm: 380 }, maxHeight: 520, display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <Box sx={{ px: 2, pt: 1.5, pb: 0, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle1" fontWeight="bold">Notificaciones</Typography>
              {bellTab === 1 && entregasNoLeidas.length > 0 && (
                <Tooltip title="Marcar todas como leídas">
                  <IconButton size="small" onClick={marcarTodasLeidas}>
                    <MarcarTodasIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
            <Tabs value={bellTab} onChange={(_, v) => setBellTab(v)} sx={{ minHeight: 36 }}>
              <Tab
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    Alertas
                    {notifs.length > 0 && (
                      <Chip label={notifs.length} size="small" color="error" sx={{ height: 16, fontSize: '0.6rem' }} />
                    )}
                  </Box>
                }
                sx={{ minHeight: 36, py: 0, fontSize: '0.8rem' }}
              />
              <Tab
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    Entregas
                    {entregasNoLeidas.length > 0 && (
                      <Chip label={entregasNoLeidas.length} size="small" color="success" sx={{ height: 16, fontSize: '0.6rem' }} />
                    )}
                  </Box>
                }
                sx={{ minHeight: 36, py: 0, fontSize: '0.8rem' }}
              />
              <Tab
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    Tareas
                    {tareasPendientes.length > 0 && (
                      <Chip label={tareasPendientes.length} size="small" color="warning" sx={{ height: 16, fontSize: '0.6rem' }} />
                    )}
                  </Box>
                }
                sx={{ minHeight: 36, py: 0, fontSize: '0.8rem' }}
              />
            </Tabs>
          </Box>

          {/* Cuerpo con scroll */}
          <Box sx={{ overflow: 'auto', flex: 1 }}>

            {/* ── Tab Alertas (persistentes) ── */}
            {bellTab === 0 && (
              notifs.length === 0 ? (
                <Box sx={{ px: 2, py: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Sin alertas activas</Typography>
                </Box>
              ) : (
                <List disablePadding>
                  {notifs.map((n: any, i: number) => (
                    <ListItem
                      key={i} divider
                      onClick={() => { setBellAnchor(null); navigate(n.link); }}
                      sx={{ alignItems: 'flex-start', py: 1.5, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
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
              )
            )}

            {/* ── Tab Entregas (efímeras) ── */}
            {bellTab === 1 && (
              entregas.length === 0 ? (
                <Box sx={{ px: 2, py: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Sin entregas en las últimas 72 hs</Typography>
                </Box>
              ) : (
                <List disablePadding>
                  {entregas.map((e: any) => {
                    const leida = leidasIds.has(e.remitoId);
                    return (
                      <ListItem
                        key={e.remitoId}
                        divider
                        onClick={() => { marcarLeida(e.remitoId); setBellAnchor(null); navigate(e.link); }}
                        sx={{
                          alignItems: 'flex-start', py: 1.5, cursor: 'pointer',
                          bgcolor: leida ? 'transparent' : 'success.50',
                          '&:hover': { bgcolor: leida ? 'action.hover' : 'success.100' },
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}>
                          <EntregaOkIcon color={leida ? 'disabled' : 'success'} fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography variant="body2" fontWeight={leida ? 'normal' : 'bold'} color={leida ? 'text.secondary' : 'text.primary'}>
                              {e.titulo}
                            </Typography>
                          }
                          secondary={
                            <Box>
                              {e.descripcion && <Typography variant="caption" color="text.secondary">{e.descripcion}</Typography>}
                              <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>
                                {e.fecha ? new Date(e.fecha).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                                {e.numero ? ` · ${e.numero}` : ''}
                              </Typography>
                            </Box>
                          }
                        />
                        {!leida && <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main', mt: 1.5, flexShrink: 0 }} />}
                      </ListItem>
                    );
                  })}
                </List>
              )
            )}

            {/* ── Tab Tareas pendientes ── */}
            {bellTab === 2 && (
              tareasPendientes.length === 0 ? (
                <Box sx={{ px: 2, py: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">No hay tareas pendientes</Typography>
                </Box>
              ) : (
                <List disablePadding>
                  {tareasPendientes.map((t: any) => {
                    const prioridadColor: Record<string, string> = { ALTA: '#e53935', MEDIA: '#fb8c00', BAJA: '#43a047' };
                    const estadoLabel: Record<string, string> = { PENDIENTE: 'Pendiente', EN_PROGRESO: 'En progreso' };
                    const vencida = t.vencimiento && new Date(t.vencimiento) < new Date();
                    return (
                      <ListItem
                        key={t.id}
                        divider
                        onClick={() => { setBellAnchor(null); navigate('/tareas'); }}
                        sx={{
                          alignItems: 'flex-start', py: 1.5, cursor: 'pointer',
                          borderLeft: `3px solid ${prioridadColor[t.prioridad] ?? '#fb8c00'}`,
                          '&:hover': { bgcolor: 'action.hover' },
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}>
                          <TareasIcon sx={{ color: t.estado === 'EN_PROGRESO' ? '#1e88e5' : '#fb8c00' }} fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography variant="body2" fontWeight="bold">
                              {t.titulo}
                            </Typography>
                          }
                          secondary={
                            <Box>
                              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.3 }}>
                                <Chip
                                  label={estadoLabel[t.estado] ?? t.estado}
                                  size="small"
                                  sx={{ height: 18, fontSize: '0.65rem', bgcolor: t.estado === 'EN_PROGRESO' ? '#e3f2fd' : '#fff3e0', color: t.estado === 'EN_PROGRESO' ? '#1565c0' : '#e65100' }}
                                />
                                <Chip
                                  label={t.prioridad}
                                  size="small"
                                  sx={{ height: 18, fontSize: '0.65rem', bgcolor: prioridadColor[t.prioridad] ?? '#fb8c00', color: 'white' }}
                                />
                                {t.programa?.nombre && (
                                  <Chip label={t.programa.nombre} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />
                                )}
                              </Box>
                              {t.asignadoA && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.3 }}>
                                  Asignado a: {t.asignadoA}
                                </Typography>
                              )}
                              {t.vencimiento && (
                                <Typography variant="caption" sx={{ display: 'block', mt: 0.2, color: vencida ? 'error.main' : 'text.disabled', fontWeight: vencida ? 'bold' : 'normal' }}>
                                  {vencida ? 'Vencida: ' : 'Vence: '}
                                  {new Date(t.vencimiento).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                    );
                  })}
                </List>
              )
            )}
          </Box>

          {/* Footer — historial / tareas */}
          {bellTab === 1 && (
            <Box sx={{ borderTop: '1px solid', borderColor: 'divider', p: 1 }}>
              <Button
                fullWidth size="small" startIcon={<HistoryIcon />}
                onClick={() => { setBellAnchor(null); navigate('/historial-entregas'); }}
              >
                Ver historial completo de entregas
              </Button>
            </Box>
          )}
          {bellTab === 2 && (
            <Box sx={{ borderTop: '1px solid', borderColor: 'divider', p: 1 }}>
              <Button
                fullWidth size="small" startIcon={<TareasIcon />}
                onClick={() => { setBellAnchor(null); navigate('/tareas'); }}
              >
                Ver todas las tareas
              </Button>
            </Box>
          )}
        </Paper>
      </Popover>

      {/* Chofer: sin sidebar, layout limpio mobile-first */}
      {esChofer ? (
        <Box component="main" sx={{ flexGrow: 1, width: '100%', mt: 8, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ p: { xs: 1.5, sm: 3 }, flex: 1 }}>
            {children}
          </Box>
        </Box>
      ) : (
        <>
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

          <Box component="main" sx={{ flexGrow: 1, width: { sm: `calc(100% - ${drawerWidth}px)` }, mt: 8, display: 'flex', flexDirection: 'column' }}>
            <NewsTicker />
            <Box sx={{ p: { xs: 1.5, sm: 3 }, flex: 1 }}>
              {children}
            </Box>
          </Box>
        </>
      )}

      {/* ── Diálogo de búsqueda global ── */}
      <Dialog open={searchOpen} onClose={handleSearchClose} maxWidth="sm" fullWidth PaperProps={{ sx: { mt: '80px', verticalAlign: 'top' } }}>
        <DialogContent sx={{ p: 0 }}>
          <TextField
            fullWidth autoFocus
            placeholder="Buscar beneficiario, caso, remito... (mín. 2 caracteres)"
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>,
              endAdornment: searchLoading ? <InputAdornment position="end"><CircularProgress size={18} /></InputAdornment> : null,
              sx: { px: 2, py: 1.5, fontSize: '1rem' },
            }}
            variant="standard"
            sx={{ '& .MuiInput-underline:before': { borderBottom: '1px solid', borderColor: 'divider' }, px: 0 }}
          />
          {searchResults && (
            <Box sx={{ maxHeight: 460, overflow: 'auto' }}>
              {/* Beneficiarios */}
              {searchResults.beneficiarios?.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 0.5, display: 'block', bgcolor: 'grey.50', fontWeight: 600 }}>
                    BENEFICIARIOS ({searchResults.beneficiarios.length})
                  </Typography>
                  <List dense disablePadding>
                    {searchResults.beneficiarios.map((b: any) => (
                      <ListItemButton key={b.id} onClick={() => handleNavigate(`/beneficiarios`)} sx={{ px: 2, py: 0.8 }}>
                        <ListItemIcon sx={{ minWidth: 36 }}><PeopleIcon fontSize="small" color="primary" /></ListItemIcon>
                        <ListItemText
                          primary={<Typography variant="body2" fontWeight="bold">{b.nombre}</Typography>}
                          secondary={`${b.tipo} · ${b.localidad ?? ''} · DNI: ${b.responsableDNI ?? '—'} · ${b.programa?.nombre ?? ''}`}
                        />
                      </ListItemButton>
                    ))}
                  </List>
                  <Divider />
                </Box>
              )}
              {/* Casos */}
              {searchResults.casos?.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 0.5, display: 'block', bgcolor: 'grey.50', fontWeight: 600 }}>
                    CASOS PARTICULARES ({searchResults.casos.length})
                  </Typography>
                  <List dense disablePadding>
                    {searchResults.casos.map((c: any) => (
                      <ListItemButton key={c.id} onClick={() => handleNavigate('/casos-particulares')} sx={{ px: 2, py: 0.8 }}>
                        <ListItemIcon sx={{ minWidth: 36 }}><CasosParticularesIcon fontSize="small" color="warning" /></ListItemIcon>
                        <ListItemText
                          primary={<Typography variant="body2" fontWeight="bold">{c.nombreSolicitante}</Typography>}
                          secondary={
                            <Box component="span" sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                              <span>{c.tipo}</span>
                              <Chip label={c.estado} size="small" sx={{ height: 16, fontSize: '0.65rem', bgcolor: ESTADO_CHIP[c.estado] ?? '#9e9e9e', color: 'white' }} />
                              {c.dni && <span>· DNI: {c.dni}</span>}
                            </Box>
                          }
                        />
                      </ListItemButton>
                    ))}
                  </List>
                  <Divider />
                </Box>
              )}
              {/* Remitos */}
              {searchResults.remitos?.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 0.5, display: 'block', bgcolor: 'grey.50', fontWeight: 600 }}>
                    REMITOS ({searchResults.remitos.length})
                  </Typography>
                  <List dense disablePadding>
                    {searchResults.remitos.map((r: any) => (
                      <ListItemButton key={r.id} onClick={() => handleNavigate('/remitos')} sx={{ px: 2, py: 0.8 }}>
                        <ListItemIcon sx={{ minWidth: 36 }}><ReceiptIcon fontSize="small" color="success" /></ListItemIcon>
                        <ListItemText
                          primary={<Typography variant="body2" fontWeight="bold">{r.numero} — {r.beneficiario?.nombre ?? '—'}</Typography>}
                          secondary={
                            <Box component="span" sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                              <Chip label={r.estado} size="small" sx={{ height: 16, fontSize: '0.65rem', bgcolor: ESTADO_CHIP[r.estado] ?? '#9e9e9e', color: 'white' }} />
                              <span>{r.totalKg ? `${r.totalKg} kg` : ''}</span>
                            </Box>
                          }
                        />
                      </ListItemButton>
                    ))}
                  </List>
                </Box>
              )}
              {/* Sin resultados */}
              {searchResults.beneficiarios?.length === 0 && searchResults.casos?.length === 0 && searchResults.remitos?.length === 0 && (
                <Box sx={{ px: 2, py: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Sin resultados para "{searchQ}"</Typography>
                </Box>
              )}
            </Box>
          )}
          {!searchResults && searchQ.trim().length >= 2 && !searchLoading && (
            <Box sx={{ px: 2, py: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">Escribí para buscar...</Typography>
            </Box>
          )}
          <Box sx={{ px: 2, py: 1, bgcolor: 'grey.50', borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary">
              Busca en beneficiarios, casos particulares y remitos · Esc para cerrar
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>

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
