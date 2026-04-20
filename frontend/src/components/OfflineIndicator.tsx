import { useEffect, useState } from 'react';
import { Alert, Snackbar, Button, Box } from '@mui/material';
import { WifiOff as WifiOffIcon, CloudSync as UpdateIcon } from '@mui/icons-material';

/**
 * Muestra:
 * 1) Banner permanente cuando navigator.onLine es false — se ve cache de la API (NetworkFirst).
 * 2) Snackbar cuando vuelve la conexion.
 * 3) Snackbar cuando hay una nueva version del service worker disponible.
 */
export default function OfflineIndicator() {
  const [online, setOnline] = useState(navigator.onLine);
  const [justReconnected, setJustReconnected] = useState(false);
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updateSW, setUpdateSW] = useState<((reloadPage?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      setJustReconnected(true);
    };
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // Registrar el SW con callback de actualizacion disponible.
    // El import dinamico evita fallar en builds que no inyectan este modulo virtual.
    let cancelled = false;
    (async () => {
      try {
        const mod = await import(/* @vite-ignore */ 'virtual:pwa-register');
        if (cancelled) return;
        const update = mod.registerSW({
          onNeedRefresh() { setNeedRefresh(true); },
        });
        setUpdateSW(() => update);
      } catch {
        // En dev o cuando el modulo virtual no existe — silencioso.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      {!online && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: (t) => t.zIndex.snackbar + 2,
          }}
        >
          <Alert
            severity="warning"
            icon={<WifiOffIcon />}
            sx={{ borderRadius: 0, justifyContent: 'center', '& .MuiAlert-message': { textAlign: 'center' } }}
          >
            Sin conexión — mostrando últimos datos guardados. Los cambios no se guardarán hasta que vuelva internet.
          </Alert>
        </Box>
      )}

      <Snackbar
        open={justReconnected}
        autoHideDuration={3500}
        onClose={() => setJustReconnected(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" onClose={() => setJustReconnected(false)}>
          Conexión restablecida
        </Alert>
      </Snackbar>

      <Snackbar
        open={needRefresh}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity="info"
          variant="filled"
          icon={<UpdateIcon />}
          action={
            <Button
              size="small"
              color="inherit"
              onClick={() => { if (updateSW) updateSW(true); }}
              sx={{ fontWeight: 600 }}
            >
              Actualizar
            </Button>
          }
        >
          Nueva versión de SIGAM disponible
        </Alert>
      </Snackbar>
    </>
  );
}
