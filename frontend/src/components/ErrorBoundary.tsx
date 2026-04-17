import { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button } from '@mui/material';
import InventoryIcon from '@mui/icons-material/Inventory2';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isChunkError: boolean;
}

function isChunkLoadError(error: Error): boolean {
  const msg = error?.message ?? '';
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('ChunkLoadError') ||
    error?.name === 'ChunkLoadError'
  );
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, isChunkError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, isChunkError: isChunkLoadError(error) };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // ChunkLoadError: nueva versión desplegada → recargar automáticamente
    if (isChunkLoadError(error)) {
      // Marcar en sessionStorage para no entrar en loop infinito de recargas
      const ya = sessionStorage.getItem('chunkReloadCount');
      const count = parseInt(ya ?? '0', 10);
      if (count < 2) {
        sessionStorage.setItem('chunkReloadCount', String(count + 1));
        window.location.reload();
        return;
      }
    }
    console.error('ErrorBoundary:', error, info);
  }

  componentDidMount() {
    // Limpiar el contador de recargas cuando la app carga bien
    sessionStorage.removeItem('chunkReloadCount');
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.state.isChunkError) {
      // Mientras recarga automáticamente, mostrar pantalla suave
      return (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="100vh"
          gap={2}
          p={4}
          sx={{ background: 'linear-gradient(135deg, #e3f2fd 0%, #ffffff 100%)' }}
        >
          <InventoryIcon sx={{ fontSize: 72, color: '#1565C0', opacity: 0.7 }} />
          <Typography variant="h6" color="text.primary" fontWeight={600}>
            Actualizando la aplicación...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Hay una versión nueva disponible. La página se recargará en un momento.
          </Typography>
          <Button variant="contained" onClick={() => window.location.reload()} sx={{ mt: 1 }}>
            Recargar ahora
          </Button>
        </Box>
      );
    }

    // Error genérico (no chunk): pantalla amigable sin texto rojo
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        gap={2}
        p={4}
        sx={{ background: 'linear-gradient(135deg, #e3f2fd 0%, #ffffff 100%)' }}
      >
        <InventoryIcon sx={{ fontSize: 72, color: '#1565C0', opacity: 0.7 }} />
        <Typography variant="h6" color="text.primary" fontWeight={600}>
          Algo salió mal
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center" maxWidth={420}>
          Hubo un problema al cargar esta sección. Podés recargar la página o volver al inicio.
        </Typography>
        <Box display="flex" gap={2} mt={1}>
          <Button variant="outlined" onClick={() => { window.location.href = '/'; }}>
            Ir al inicio
          </Button>
          <Button variant="contained" onClick={() => window.location.reload()}>
            Recargar página
          </Button>
        </Box>
      </Box>
    );
  }
}

export default ErrorBoundary;
