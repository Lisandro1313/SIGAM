import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Chip, Button, Stack, Skeleton,
  IconButton, Tooltip, Alert, ToggleButtonGroup, ToggleButton, Divider,
  LinearProgress, Paper, useTheme, Snackbar,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  AutoAwesome as AutoAwesomeIcon,
  TrendingDown as TrendingDownIcon,
  AcUnit as AcUnitIcon,
  LocationOff as LocationOffIcon,
  Warning as WarningIcon,
  Inventory2 as Inventory2Icon,
  EventBusy as EventBusyIcon,
  PersonOff as PersonOffIcon,
  PriorityHigh as PriorityHighIcon,
  CompareArrows as CompareArrowsIcon,
  DonutLarge as DonutLargeIcon,
  FactCheck as FactCheckIcon,
  PendingActions as PendingActionsIcon,
  ArrowForward as ArrowForwardIcon,
  Lightbulb as LightbulbIcon,
  Done as DoneIcon,
  NotInterested as DismissIcon,
} from '@mui/icons-material';
import api from '../services/api';

interface Sugerencia {
  id: string;
  titulo: string;
  nivel: 'alta' | 'media' | 'baja';
  categoria: string;
  descripcion: string;
  detalle?: string;
  datos?: any;
  accion?: { label: string; link: string };
  icono: string;
}

interface Respuesta {
  generadoEn: string;
  total: number;
  sugerencias: Sugerencia[];
}

const ICONOS: Record<string, JSX.Element> = {
  trending_down: <TrendingDownIcon />,
  ac_unit: <AcUnitIcon />,
  location_off: <LocationOffIcon />,
  warning: <WarningIcon />,
  inventory_2: <Inventory2Icon />,
  event_busy: <EventBusyIcon />,
  person_off: <PersonOffIcon />,
  priority_high: <PriorityHighIcon />,
  compare_arrows: <CompareArrowsIcon />,
  donut_large: <DonutLargeIcon />,
  fact_check: <FactCheckIcon />,
  pending_actions: <PendingActionsIcon />,
};

const NIVELES = {
  alta:  { label: 'Alta',  color: '#e53935', bg: '#ffebee' },
  media: { label: 'Media', color: '#fb8c00', bg: '#fff3e0' },
  baja:  { label: 'Baja',  color: '#1e88e5', bg: '#e3f2fd' },
};

export default function SugerenciasPage() {
  const [data, setData] = useState<Respuesta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroNivel, setFiltroNivel] = useState<'todas' | 'alta' | 'media' | 'baja'>('todas');
  const [filtroCat, setFiltroCat] = useState<string>('todas');
  const [accionEnCurso, setAccionEnCurso] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const navigate = useNavigate();
  const theme = useTheme();

  const cargar = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/sugerencias');
      setData(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'No se pudieron cargar las sugerencias.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const marcarAccion = async (clave: string, accion: 'HECHA' | 'DESCARTADA') => {
    setAccionEnCurso(clave);
    try {
      await api.post(`/sugerencias/${encodeURIComponent(clave)}/accion`, { accion });
      setData((prev) => prev ? { ...prev, sugerencias: prev.sugerencias.filter((s) => s.id !== clave), total: prev.total - 1 } : prev);
      setMensaje(accion === 'HECHA' ? 'Marcada como hecha. Se oculta por 14 días.' : 'Descartada. Se oculta por 30 días.');
    } catch (e: any) {
      setMensaje(e?.response?.data?.message ?? 'No se pudo actualizar la sugerencia.');
    } finally {
      setAccionEnCurso(null);
    }
  };

  const categorias = useMemo(() => {
    if (!data) return [];
    const set = new Set(data.sugerencias.map((s) => s.categoria));
    return Array.from(set);
  }, [data]);

  const sugerenciasFiltradas = useMemo(() => {
    if (!data) return [];
    return data.sugerencias.filter((s) => {
      if (filtroNivel !== 'todas' && s.nivel !== filtroNivel) return false;
      if (filtroCat !== 'todas' && s.categoria !== filtroCat) return false;
      return true;
    });
  }, [data, filtroNivel, filtroCat]);

  const conteos = useMemo(() => {
    if (!data) return { alta: 0, media: 0, baja: 0 };
    return data.sugerencias.reduce(
      (acc, s) => ({ ...acc, [s.nivel]: acc[s.nivel] + 1 }),
      { alta: 0, media: 0, baja: 0 } as Record<'alta' | 'media' | 'baja', number>,
    );
  }, [data]);

  return (
    <Box>
      {/* Header con gradiente */}
      <Paper
        elevation={0}
        sx={{
          p: 3, mb: 3,
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
          color: 'white',
          borderRadius: 2,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ position: 'absolute', right: -20, top: -20, opacity: 0.15 }}>
          <AutoAwesomeIcon sx={{ fontSize: 200 }} />
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={2}>
          <Box>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <AutoAwesomeIcon sx={{ fontSize: 32 }} />
              <Typography variant="h5" fontWeight="bold">Sugerencias inteligentes</Typography>
            </Stack>
            <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.95, maxWidth: 720 }}>
              Análisis automático de los datos del sistema. Detecta anomalías, oportunidades de mejora y acciones recomendadas.
            </Typography>
            {data && (
              <Typography variant="caption" sx={{ mt: 1, display: 'block', opacity: 0.8 }}>
                Última actualización: {new Date(data.generadoEn).toLocaleString('es-AR')}
              </Typography>
            )}
          </Box>
          <Tooltip title="Recalcular">
            <IconButton onClick={cargar} disabled={loading} sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Paper>

      {loading && (
        <Box>
          <LinearProgress sx={{ mb: 2 }} />
          {[1, 2, 3].map((i) => (
            <Card key={i} sx={{ mb: 2 }}>
              <CardContent>
                <Skeleton variant="text" width="60%" height={30} />
                <Skeleton variant="text" width="100%" />
                <Skeleton variant="text" width="80%" />
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!loading && data && (
        <>
          {/* Resumen de niveles */}
          <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}>
            {(['alta', 'media', 'baja'] as const).map((n) => (
              <Card
                key={n}
                onClick={() => setFiltroNivel(filtroNivel === n ? 'todas' : n)}
                sx={{
                  flex: 1, minWidth: 140, cursor: 'pointer',
                  border: filtroNivel === n ? `2px solid ${NIVELES[n].color}` : '2px solid transparent',
                  transition: 'all 0.2s',
                  '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 },
                }}
              >
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h3" sx={{ color: NIVELES[n].color, fontWeight: 'bold' }}>
                    {conteos[n]}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Prioridad {NIVELES[n].label.toLowerCase()}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Stack>

          {/* Filtros */}
          {categorias.length > 1 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Filtrar por categoría:
              </Typography>
              <ToggleButtonGroup
                value={filtroCat}
                exclusive
                size="small"
                onChange={(_, v) => v && setFiltroCat(v)}
                sx={{ flexWrap: 'wrap' }}
              >
                <ToggleButton value="todas">Todas</ToggleButton>
                {categorias.map((c) => (
                  <ToggleButton key={c} value={c}>{c}</ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>
          )}

          {/* Sin resultados */}
          {sugerenciasFiltradas.length === 0 && (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 6 }}>
                <LightbulbIcon sx={{ fontSize: 64, color: 'success.light', mb: 1 }} />
                <Typography variant="h6">¡Todo en orden!</Typography>
                <Typography variant="body2" color="text.secondary">
                  {data.total === 0
                    ? 'No detectamos anomalías ni oportunidades de mejora en este momento.'
                    : 'No hay sugerencias que coincidan con los filtros aplicados.'}
                </Typography>
              </CardContent>
            </Card>
          )}

          {/* Lista de sugerencias */}
          <Stack spacing={2}>
            {sugerenciasFiltradas.map((s) => (
              <Card
                key={s.id}
                sx={{
                  borderLeft: `4px solid ${NIVELES[s.nivel].color}`,
                  transition: 'all 0.2s',
                  '&:hover': { boxShadow: 4 },
                }}
              >
                <CardContent>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <Box
                      sx={{
                        width: 56, height: 56, borderRadius: 2,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        bgcolor: NIVELES[s.nivel].bg, color: NIVELES[s.nivel].color, flexShrink: 0,
                      }}
                    >
                      {ICONOS[s.icono] ?? <LightbulbIcon />}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} spacing={1} sx={{ mb: 1 }}>
                        <Typography variant="subtitle1" fontWeight="bold" sx={{ flex: 1 }}>
                          {s.titulo}
                        </Typography>
                        <Stack direction="row" spacing={0.5}>
                          <Chip
                            label={NIVELES[s.nivel].label}
                            size="small"
                            sx={{ bgcolor: NIVELES[s.nivel].color, color: 'white', fontWeight: 'bold' }}
                          />
                          <Chip label={s.categoria} size="small" variant="outlined" />
                        </Stack>
                      </Stack>
                      <Typography variant="body2" color="text.primary" sx={{ mb: s.detalle ? 1 : 0 }}>
                        {s.descripcion}
                      </Typography>
                      {s.detalle && (
                        <>
                          <Divider sx={{ my: 1 }} />
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', whiteSpace: 'pre-wrap' }}>
                            {s.detalle}
                          </Typography>
                        </>
                      )}
                      <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', gap: 1 }}>
                        {s.accion && (
                          <Button
                            size="small"
                            variant="outlined"
                            endIcon={<ArrowForwardIcon />}
                            onClick={() => navigate(s.accion!.link)}
                          >
                            {s.accion.label}
                          </Button>
                        )}
                        <Button
                          size="small"
                          variant="outlined"
                          color="success"
                          startIcon={<DoneIcon />}
                          disabled={accionEnCurso === s.id}
                          onClick={() => marcarAccion(s.id, 'HECHA')}
                        >
                          Marcar hecha
                        </Button>
                        <Button
                          size="small"
                          variant="text"
                          color="inherit"
                          startIcon={<DismissIcon />}
                          disabled={accionEnCurso === s.id}
                          onClick={() => marcarAccion(s.id, 'DESCARTADA')}
                        >
                          Descartar
                        </Button>
                      </Stack>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>

          {/* Footer */}
          <Box sx={{ mt: 4, p: 2, bgcolor: 'action.hover', borderRadius: 2, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Estas sugerencias se generan a partir de reglas heurísticas que cruzan datos reales del sistema (entregas, stock, casos, beneficiarios).
              Se actualizan al recargar y no requieren intervención manual.
            </Typography>
          </Box>
        </>
      )}

      <Snackbar
        open={!!mensaje}
        autoHideDuration={3000}
        onClose={() => setMensaje(null)}
        message={mensaje}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
