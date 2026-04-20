import { useEffect, useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Paper, Chip, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Divider, Tooltip, IconButton, LinearProgress,
} from '@mui/material';
import {
  FolderSpecialOutlined as CasosIcon,
  HourglassTopOutlined as PendienteIcon,
  CheckCircleOutline as AprobadoIcon,
  PriorityHigh as UrgenteIcon,
  TrendingUp as TrendingIcon,
  LocationCity as BarrioIcon,
  AccessTime as TiempoIcon,
  Refresh as RefreshIcon,
  WarningAmber as CruceIcon,
} from '@mui/icons-material';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, Legend,
  BarChart, Bar, XAxis, YAxis,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import LoadingPage from '../components/LoadingPage';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type ResumenData = {
  total: number;
  ultimos30dias: number;
  ultimos7dias: number;
  hoy: number;
  tiempoPromedioResolucion: number;
  pendientes: number;
  enRevision: number;
  aprobados: number;
  rechazados: number;
  resueltos: number;
};

type DashboardSocialData = {
  resumen: ResumenData;
  porEstado: { estado: string; cantidad: number }[];
  porPrioridad: { prioridad: string; cantidad: number }[];
  porTipo: { tipo: string; cantidad: number }[];
  porBarrio: { barrio: string; cantidad: number }[];
  evolucionMensual: { mesNombre: string; anio: number; creados: number; resueltos: number }[];
  casosRecientes: any[];
  casosUrgentes: any[];
};

const COLOR_ESTADO: Record<string, string> = {
  PENDIENTE: '#ed6c02',
  EN_REVISION: '#0288d1',
  APROBADO: '#2e7d32',
  RECHAZADO: '#d32f2f',
  RESUELTO: '#7b1fa2',
};

const COLOR_PRIORIDAD: Record<string, string> = {
  NORMAL: '#0288d1',
  ALTA: '#ed6c02',
  URGENTE: '#d32f2f',
};

const COLOR_TIPO: Record<string, string> = {
  ALIMENTARIO: '#2e7d32',
  MERCADERIA: '#1976d2',
  MIXTO: '#7b1fa2',
};

const CHIP_COLOR: Record<string, any> = {
  PENDIENTE: 'warning',
  EN_REVISION: 'info',
  APROBADO: 'success',
  RECHAZADO: 'error',
  RESUELTO: 'secondary',
  NORMAL: 'default',
  ALTA: 'warning',
  URGENTE: 'error',
};

export default function DashboardSocial() {
  const [data, setData] = useState<DashboardSocialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  const cargar = async () => {
    try {
      const resp = await api.get('/reportes/dashboard-social');
      setData(resp.data);
    } catch (err) {
      console.error('Error cargando dashboard social', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    cargar();
  };

  if (loading || !data) return <LoadingPage />;

  const { resumen, porEstado, porPrioridad, porTipo, porBarrio, evolucionMensual, casosRecientes, casosUrgentes } = data;

  const maxBarrio = porBarrio.length ? Math.max(...porBarrio.map((b) => b.cantidad)) : 0;

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2.5}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Dashboard Social</Typography>
          <Typography variant="body2" color="text.secondary">
            Seguimiento de casos particulares, prioridades y tiempos de resolución
          </Typography>
        </Box>
        <Tooltip title="Actualizar">
          <IconButton onClick={handleRefresh} disabled={refreshing}>
            <RefreshIcon sx={{ transform: refreshing ? 'rotate(180deg)' : 'none', transition: 'transform .4s' }} />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* KPIs principales */}
      <Grid container spacing={2} mb={2}>
        <Grid item xs={6} md={3}>
          <Card sx={{ borderLeft: '4px solid #1976d2' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <CasosIcon color="primary" />
                <Box>
                  <Typography variant="caption" color="text.secondary">Total casos</Typography>
                  <Typography variant="h4" fontWeight={700}>{resumen.total}</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ borderLeft: '4px solid #ed6c02' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <PendienteIcon sx={{ color: '#ed6c02' }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">Pendientes</Typography>
                  <Typography variant="h4" fontWeight={700}>{resumen.pendientes + resumen.enRevision}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {resumen.pendientes} pend · {resumen.enRevision} en rev.
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ borderLeft: '4px solid #2e7d32' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <AprobadoIcon sx={{ color: '#2e7d32' }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">Resueltos</Typography>
                  <Typography variant="h4" fontWeight={700}>{resumen.aprobados + resumen.resueltos}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {resumen.aprobados} aprob · {resumen.resueltos} resuel.
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ borderLeft: '4px solid #7b1fa2' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <TiempoIcon sx={{ color: '#7b1fa2' }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">Tiempo prom. resolución</Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {resumen.tiempoPromedioResolucion} <Typography component="span" variant="body2" color="text.secondary">días</Typography>
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* KPIs secundarios */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} md={3}>
          <Paper sx={{ p: 1.5, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">Hoy</Typography>
            <Typography variant="h5" fontWeight={700}>{resumen.hoy}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} md={3}>
          <Paper sx={{ p: 1.5, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">Últimos 7 días</Typography>
            <Typography variant="h5" fontWeight={700}>{resumen.ultimos7dias}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} md={3}>
          <Paper sx={{ p: 1.5, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">Últimos 30 días</Typography>
            <Typography variant="h5" fontWeight={700}>{resumen.ultimos30dias}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} md={3}>
          <Paper sx={{ p: 1.5, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">Rechazados</Typography>
            <Typography variant="h5" fontWeight={700} color="error.main">{resumen.rechazados}</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        {/* Pie: por estado */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: 320 }}>
            <Typography variant="subtitle1" fontWeight={600} mb={1}>Casos por estado</Typography>
            {porEstado.length === 0 ? (
              <Typography variant="body2" color="text.secondary">Sin datos</Typography>
            ) : (
              <ResponsiveContainer width="100%" height="90%">
                <PieChart>
                  <Pie
                    data={porEstado}
                    dataKey="cantidad"
                    nameKey="estado"
                    outerRadius={90}
                    label={(e) => `${e.estado}: ${e.cantidad}`}
                  >
                    {porEstado.map((e) => (
                      <Cell key={e.estado} fill={COLOR_ESTADO[e.estado] || '#999'} />
                    ))}
                  </Pie>
                  <ReTooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* Pie: prioridad */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: 320 }}>
            <Typography variant="subtitle1" fontWeight={600} mb={1}>Por prioridad</Typography>
            {porPrioridad.length === 0 ? (
              <Typography variant="body2" color="text.secondary">Sin datos</Typography>
            ) : (
              <ResponsiveContainer width="100%" height="90%">
                <PieChart>
                  <Pie
                    data={porPrioridad}
                    dataKey="cantidad"
                    nameKey="prioridad"
                    outerRadius={90}
                    label={(e) => `${e.prioridad}: ${e.cantidad}`}
                  >
                    {porPrioridad.map((p) => (
                      <Cell key={p.prioridad} fill={COLOR_PRIORIDAD[p.prioridad] || '#999'} />
                    ))}
                  </Pie>
                  <ReTooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* Pie: tipo */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: 320 }}>
            <Typography variant="subtitle1" fontWeight={600} mb={1}>Por tipo</Typography>
            {porTipo.length === 0 ? (
              <Typography variant="body2" color="text.secondary">Sin datos</Typography>
            ) : (
              <ResponsiveContainer width="100%" height="90%">
                <PieChart>
                  <Pie
                    data={porTipo}
                    dataKey="cantidad"
                    nameKey="tipo"
                    outerRadius={90}
                    label={(e) => `${e.tipo}: ${e.cantidad}`}
                  >
                    {porTipo.map((t) => (
                      <Cell key={t.tipo} fill={COLOR_TIPO[t.tipo] || '#999'} />
                    ))}
                  </Pie>
                  <ReTooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* Evolución mensual */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, height: 340 }}>
            <Stack direction="row" alignItems="center" spacing={1} mb={1}>
              <TrendingIcon fontSize="small" color="primary" />
              <Typography variant="subtitle1" fontWeight={600}>Evolución mensual (creados vs resueltos)</Typography>
            </Stack>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={evolucionMensual} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <XAxis dataKey="mesNombre" fontSize={12} />
                <YAxis fontSize={12} />
                <ReTooltip />
                <Legend />
                <Bar dataKey="creados" name="Creados" fill="#1976d2" />
                <Bar dataKey="resueltos" name="Resueltos" fill="#2e7d32" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Top barrios */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: 340, display: 'flex', flexDirection: 'column' }}>
            <Stack direction="row" alignItems="center" spacing={1} mb={1}>
              <BarrioIcon fontSize="small" color="primary" />
              <Typography variant="subtitle1" fontWeight={600}>Barrios con más casos</Typography>
            </Stack>
            <Box sx={{ flex: 1, overflowY: 'auto' }}>
              {porBarrio.length === 0 ? (
                <Typography variant="body2" color="text.secondary">Sin datos de barrios</Typography>
              ) : porBarrio.map((b) => (
                <Box key={b.barrio} mb={1.2}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" noWrap sx={{ maxWidth: '70%' }}>{b.barrio}</Typography>
                    <Typography variant="body2" fontWeight={600}>{b.cantidad}</Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={maxBarrio > 0 ? (b.cantidad / maxBarrio) * 100 : 0}
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        {/* Casos urgentes */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1} mb={1}>
              <UrgenteIcon color="error" />
              <Typography variant="subtitle1" fontWeight={600}>Casos urgentes pendientes</Typography>
            </Stack>
            <Divider sx={{ mb: 1 }} />
            {casosUrgentes.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No hay casos urgentes pendientes.</Typography>
            ) : (
              <TableContainer sx={{ maxHeight: 320 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Solicitante</TableCell>
                      <TableCell>Prioridad</TableCell>
                      <TableCell>Tipo</TableCell>
                      <TableCell>Barrio</TableCell>
                      <TableCell>Hace</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {casosUrgentes.map((c: any) => {
                      const dias = Math.floor((Date.now() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                      return (
                        <TableRow
                          key={c.id}
                          hover
                          onClick={() => navigate('/casos-particulares')}
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell>{c.nombreSolicitante}</TableCell>
                          <TableCell>
                            <Chip size="small" label={c.prioridad} color={CHIP_COLOR[c.prioridad]} />
                          </TableCell>
                          <TableCell>{c.tipo}</TableCell>
                          <TableCell>{c.barrio || '—'}</TableCell>
                          <TableCell>{dias}d</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>

        {/* Casos recientes */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} mb={1}>Casos recientes</Typography>
            <Divider sx={{ mb: 1 }} />
            {casosRecientes.length === 0 ? (
              <Typography variant="body2" color="text.secondary">Sin casos registrados.</Typography>
            ) : (
              <TableContainer sx={{ maxHeight: 320 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Solicitante</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell>Prioridad</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {casosRecientes.map((c: any) => (
                      <TableRow
                        key={c.id}
                        hover
                        onClick={() => navigate('/casos-particulares')}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          {format(new Date(c.createdAt), 'dd/MM', { locale: es })}
                        </TableCell>
                        <TableCell>{c.nombreSolicitante}</TableCell>
                        <TableCell>
                          <Chip size="small" label={c.estado} color={CHIP_COLOR[c.estado]} />
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={c.prioridad} color={CHIP_COLOR[c.prioridad]} variant="outlined" />
                        </TableCell>
                        <TableCell>
                          {c.alertaCruce && (
                            <Tooltip title="Alerta de cruce con otro programa">
                              <CruceIcon fontSize="small" color="warning" />
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
