import { useState } from 'react';
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
} from '@mui/icons-material';
import { useAuthStore } from '../stores/authStore';
import { puedeAcceder, ROL_LABELS, Rol } from '../utils/permisos';

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
  { text: 'Auditoría',     icon: <AuditIcon />,      path: '/auditoria',              seccion: 'auditoria' },
  { text: 'Usuarios',      icon: <UsersIcon />,      path: '/usuarios',               seccion: 'usuarios' },
];

// Menú restringido para usuarios de depósito (LOGISTICA + depositoId)
const menuDeposito = [
  { text: 'Remitos de Hoy',     icon: <DepositoIcon />,  path: '/deposito',           seccion: 'deposito' },
  { text: 'Artículos',          icon: <ArticleIcon />,   path: '/articulos',          seccion: 'articulos' },
  { text: 'Stock',              icon: <InventoryIcon />, path: '/stock',              seccion: 'stock' },
  { text: 'Historial Entregas', icon: <TareasIcon />,    path: '/historial-entregas', seccion: 'historial-entregas' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const rolLabel = user?.rol ? ROL_LABELS[user.rol as Rol] ?? user.rol : '';
  // Usuarios de depósito físico (LOGISTICA con depositoId) O Asistencia Crítica (CITA)
  const esDeposito = !!(user?.depositoId) || user?.rol === 'ASISTENCIA_CRITICA';

  // Si es usuario de depósito, menú restringido; si no, filtrar por rol
  const visibleItems = esDeposito
    ? menuDeposito
    : menuItems.filter((item) => puedeAcceder(user?.rol, item.seccion));

  const drawer = (
    <div>
      <Toolbar sx={{ bgcolor: 'primary.main', color: 'white', flexDirection: 'column', alignItems: 'flex-start', py: 1.5 }}>
        <Typography variant="h6" fontWeight="bold">SIGAM</Typography>
        <Typography variant="caption" sx={{ opacity: 0.8 }}>
          {esDeposito ? (user?.deposito?.nombre || 'Depósito') : 'Gestión Alimentaria Municipal'}
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
    </Box>
  );
}
