import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { puedeAcceder } from '../utils/permisos';
import { Box, Typography, Button } from '@mui/material';
import { Lock as LockIcon } from '@mui/icons-material';

interface ProtectedRouteProps {
  children: React.ReactNode;
  seccion: string;
}

export default function ProtectedRoute({ children, seccion }: ProtectedRouteProps) {
  const { user } = useAuthStore();

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!puedeAcceder(user.rol, seccion)) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="60vh"
        gap={2}
      >
        <LockIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
        <Typography variant="h5" color="text.secondary" fontWeight="bold">
          Acceso restringido
        </Typography>
        <Typography variant="body2" color="text.disabled">
          Tu rol (<strong>{user.rol}</strong>) no tiene permiso para acceder a esta sección.
        </Typography>
        <Button variant="outlined" onClick={() => window.history.back()}>
          Volver
        </Button>
      </Box>
    );
  }

  return <>{children}</>;
}
