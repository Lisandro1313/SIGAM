import { useEffect, useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography,
  Paper, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Chip, Divider, List, ListItem, ListItemText, Tabs, Tab, Tooltip,
  TextField, InputAdornment, IconButton, Button,
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  ScaleOutlined as KgIcon,
  CalendarMonth as CronogramaIcon,
  History as HistoryIcon,
  TodayOutlined as TodayIcon,
  WarningAmber as StockAlertIcon,
  PriorityHigh as UrgentIcon,
  PersonOff as SinEntregaIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
  Search as SearchIcon,
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  LocationOn as LocalidadIcon,
} from '@mui/icons-material';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts';
import api from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import LoadingPage from '../components/LoadingPage';

function getSaludo(nombre: string): string {
  const hora = new Date().getHours();
  const primerNombre = nombre.split(' ')[0];
  if (hora >= 6 && hora < 12) return `¡Buenos días, ${primerNombre}!`;
  if (hora >= 12 && hora < 20) return `¡Buenas tardes, ${primerNombre}!`;
  return `¡Buenas noches, ${primerNombre}!`;
}

const ESTADO_COLOR: Record<string, any> = {
  BORRADOR: 'default',
  CONFIRMADO: 'success',
  ENVIADO: 'info',
  ENTREGADO: 'success',
  PENDIENTE_STOCK: 'warning',
  PENDIENTE: 'warning',
  EN_REVISION: 'info',
  GENERADA: 'info',
  CANCELADA: 'error',
};

const PRIORIDAD_COLOR: Record<string, any> = {
  URGENTE: 'error',
  ALTA: 'warning',
  NORMAL: 'default',
};

const COLORES_PIE = ['#1565C0','#2E7D32','#6A1B9A','#00695C','#E65100','#AD1457','#283593','#00838F','#4527A0','#558B2F','#00838F'];

const REMITOS_POR_PAGINA = 10;

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [stockAlertas, setStockAlertas] = useState<any[]>([]);
  const [tabDashPrograma, setTabDashPrograma] = useState<string>('todos');
  const [paginaRemitos, setPaginaRemitos] = useState(0);
  const [buscarRecientes, setBuscarRecientes] = useState('');
  const user = useAuthStore(s => s.user);

  const cargarDashboard = () => {
    api.get('/reportes/dashboard').then(r => setData(r.data)).catch(e => console.error(e)).finally(() => setLoading(false));
    api.get('/stock/alertas').then(r => setStockAlertas(r.data)).catch(() => {});
  };

  useEffect(() => {
    cargarDashboard();
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const { tipo } = (e as CustomEvent).detail ?? {};
      if (['remito:confirmado', 'remito:entregado', 'remito:nuevo'].includes(tipo)) {
        cargarDashboard();
      }
    };
    window.addEventListener('sigam:update', handler);
    return () => window.removeEventListener('sigam:update', handler);
  }, []);

  if (loading) return <LoadingPage />;

  const hoy = format(new Date(), "EEEE d 'de' MMMM", { locale: es });
  const saludo = getSaludo(user?.nombre ?? 'usuario');

  const kgMes = data?.resumenMes?.kg ?? 0;
  const kgAnterior = data?.resumenMes?.kgMesAnterior ?? 0;
  const variacionKg = kgAnterior > 0 ? ((kgMes - kgAnterior) / kgAnterior) * 100 : null;

  const evolucion: any[] = data?.evolucionMensual ?? [];

  // Paginación remitos del día
  const programasUnicos = ['todos', ...Array.from(new Set<string>((data?.remitosDelDia ?? []).map((r: any) => r.programa as string))).sort()];
  const remFiltrados = tabDashPrograma === 'todos'
    ? (data?.remitosDelDia ?? [])
    : (data?.remitosDelDia ?? []).filter((r: any) => r.programa === tabDashPrograma);
  const totalPaginas = Math.ceil(remFiltrados.length / REMITOS_POR_PAGINA);
  const remPagina = remFiltrados.slice(paginaRemitos * REMITOS_POR_PAGINA, (paginaRemitos + 1) * REMITOS_POR_PAGINA);

  // Buscador en remitos recientes
  const buscarQ = buscarRecientes.trim().toLowerCase();
  const recientesFiltrados = buscarQ
    ? (data?.remitosRecientes ?? []).filter((r: any) =>
        r.numero?.toLowerCase().includes(buscarQ) ||
        r.beneficiario?.toLowerCase().includes(buscarQ) ||
        r.localidad?.toLowerCase().includes(buscarQ) ||
        r.beneficiarioDNI?.includes(buscarQ) ||
        r.programa?.toLowerCase().includes(buscarQ)
      )
    : (data?.remitosRecientes ?? []);

  // Kg por localidad
  const kgLocalidad: any[] = data?.kgPorLocalidad ?? [];

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        {saludo}
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3} sx={{ textTransform: 'capitalize' }}>
        {hoy}
      </Typography>

      {/* ── 1. STAT CARDS ── */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="caption" color="text.secondary">REMITOS HOY</Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {data?.remitosDelDia?.length ?? 0}
                  </Typography>
                </Box>
                <TodayIcon sx={{ fontSize: 36, color: 'primary.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="caption" color="text.secondary">REMITOS DEL MES</Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {data?.resumenMes?.remitos ?? 0}
                  </Typography>
                </Box>
                <ReceiptIcon sx={{ fontSize: 36, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="caption" color="text.secondary">KG DEL MES</Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {kgMes.toFixed(0)}
                  </Typography>
                  {variacionKg !== null && (
                    <Box display="flex" alignItems="center" gap={0.5}>
                      {variacionKg > 2 ? (
                        <TrendingUpIcon sx={{ fontSize: 14, color: 'success.main' }} />
                      ) : variacionKg < -2 ? (
                        <TrendingDownIcon sx={{ fontSize: 14, color: 'error.main' }} />
                      ) : (
                        <TrendingFlatIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                      )}
                      <Typography
                        variant="caption"
                        color={variacionKg > 2 ? 'success.main' : variacionKg < -2 ? 'error.main' : 'text.secondary'}
                      >
                        {variacionKg > 0 ? '+' : ''}{variacionKg.toFixed(0)}% vs mes ant.
                      </Typography>
                    </Box>
                  )}
                </Box>
                <KgIcon sx={{ fontSize: 36, color: 'warning.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="caption" color="text.secondary">PRÓXIMAS ENTREGAS</Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {data?.proximasEntregas?.length ?? 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">próximos 7 días</Typography>
                </Box>
                <CronogramaIcon sx={{ fontSize: 36, color: 'info.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── 2. REMITOS HOY/MAÑANA + CRONOGRAMA ── */}
      <Grid container spacing={3} mb={3}>
        {/* Remitos del día con paginación */}
        <Grid item xs={12} md={7}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <TodayIcon color="primary" />
              <Typography variant="h6" fontWeight="bold">Remitos de hoy y mañana</Typography>
              {remFiltrados.length > 0 && (
                <Typography variant="caption" color="text.secondary" ml="auto">
                  {remFiltrados.length} remito{remFiltrados.length !== 1 ? 's' : ''}
                </Typography>
              )}
            </Box>
            {(!data?.remitosDelDia || data.remitosDelDia.length === 0) ? (
              <>
                <Divider sx={{ mb: 1 }} />
                <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                  No hay remitos generados hoy
                </Typography>
              </>
            ) : (
              <>
                <Tabs
                  value={programasUnicos.includes(tabDashPrograma) ? tabDashPrograma : 'todos'}
                  onChange={(_e, v) => { setTabDashPrograma(v); setPaginaRemitos(0); }}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{ mb: 1, minHeight: 36, '& .MuiTab-root': { minHeight: 36, py: 0.5, fontSize: '0.75rem' } }}
                >
                  {programasUnicos.map(p => (
                    <Tab key={p} label={p === 'todos' ? 'Todos' : p} value={p} />
                  ))}
                </Tabs>
                <Divider sx={{ mb: 1 }} />
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>N°</TableCell>
                        <TableCell>Beneficiario</TableCell>
                        <TableCell align="right">Kg</TableCell>
                        <TableCell align="center">Estado</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {remPagina.map((r: any) => (
                        <TableRow key={r.id} hover>
                          <TableCell><strong>{r.numero}</strong></TableCell>
                          <TableCell sx={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.beneficiario}
                          </TableCell>
                          <TableCell align="right">{r.totalKg?.toFixed(1)}</TableCell>
                          <TableCell align="center">
                            <Chip label={r.estado} size="small" color={ESTADO_COLOR[r.estado] || 'default'} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                {totalPaginas > 1 && (
                  <Box display="flex" alignItems="center" justifyContent="flex-end" mt={1} gap={0.5}>
                    <IconButton size="small" onClick={() => setPaginaRemitos(p => Math.max(0, p - 1))} disabled={paginaRemitos === 0}>
                      <PrevIcon fontSize="small" />
                    </IconButton>
                    <Typography variant="caption" color="text.secondary">
                      {paginaRemitos + 1} / {totalPaginas}
                    </Typography>
                    <IconButton size="small" onClick={() => setPaginaRemitos(p => Math.min(totalPaginas - 1, p + 1))} disabled={paginaRemitos >= totalPaginas - 1}>
                      <NextIcon fontSize="small" />
                    </IconButton>
                  </Box>
                )}
              </>
            )}
          </Paper>
        </Grid>

        {/* Cronograma próximos 7 días */}
        <Grid item xs={12} md={5}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <CronogramaIcon color="info" />
              <Typography variant="h6" fontWeight="bold">Cronograma — próximos 7 días</Typography>
            </Box>
            <Divider sx={{ mb: 1 }} />
            {(!data?.proximasEntregas || data.proximasEntregas.length === 0) ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                No hay entregas programadas
              </Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Beneficiario</TableCell>
                      <TableCell align="right">Kg est.</TableCell>
                      <TableCell align="center">Estado</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.proximasEntregas.map((e: any) => (
                      <TableRow key={e.id} hover>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          <Typography variant="body2" fontWeight="bold">
                            {format(new Date(e.fechaProgramada), 'dd/MM', { locale: es })}
                          </Typography>
                          {e.hora && (
                            <Typography variant="caption" color="text.secondary">{e.hora}</Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {e.beneficiario}
                          {e.localidad && (
                            <Typography variant="caption" color="text.secondary" display="block">{e.localidad}</Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {e.kilos ? e.kilos.toFixed(0) : '—'}
                        </TableCell>
                        <TableCell align="center">
                          <Chip label={e.estado} size="small" color={ESTADO_COLOR[e.estado] || 'default'} />
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

      {/* ── 3. STOCK BAJO MÍNIMO + SIN ENTREGA ── */}
      {(stockAlertas.length > 0 || (data?.beneficiariosSinEntrega?.total ?? 0) > 0 || (data?.casosUrgentes?.length ?? 0) > 0) && (
        <Grid container spacing={3} mb={3}>
          {stockAlertas.length > 0 && (
            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ p: 2, borderLeft: '4px solid', borderLeftColor: 'warning.main' }}>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <StockAlertIcon color="warning" />
                  <Typography variant="h6" fontWeight="bold">Stock bajo mínimo</Typography>
                  <Chip label={stockAlertas.length} size="small" color="warning" />
                </Box>
                <Divider sx={{ mb: 1 }} />
                <List dense disablePadding>
                  {stockAlertas.slice(0, 6).map((a: any) => (
                    <ListItem key={`${a.articuloId}-${a.depositoId}`} disablePadding sx={{ py: 0.3 }}>
                      <ListItemText
                        primary={<Typography variant="body2" fontWeight="bold">{a.nombre}</Typography>}
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            {a.deposito} · Stock: <strong>{a.stockActual}</strong> / Mín: {a.stockMinimo} · Falta: <strong style={{ color: '#ed6c02' }}>{a.deficit?.toFixed(0) ?? (a.stockMinimo - a.stockActual)}</strong>
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
                {stockAlertas.length > 6 && (
                  <Typography variant="caption" color="text.secondary">+{stockAlertas.length - 6} más</Typography>
                )}
              </Paper>
            </Grid>
          )}
          {(data?.beneficiariosSinEntrega?.total ?? 0) > 0 && (
            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ p: 2, borderLeft: '4px solid', borderLeftColor: 'warning.main' }}>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <SinEntregaIcon color="warning" />
                  <Typography variant="h6" fontWeight="bold">Sin entrega en 30 días</Typography>
                  <Chip label={data.beneficiariosSinEntrega.total} size="small" color="warning" />
                </Box>
                <Divider sx={{ mb: 1 }} />
                <List dense disablePadding>
                  {data.beneficiariosSinEntrega.muestra.slice(0, 6).map((b: any) => (
                    <ListItem key={b.id} disablePadding sx={{ py: 0.3 }}>
                      <ListItemText
                        primary={<Typography variant="body2" fontWeight="bold">{b.nombre}</Typography>}
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            {b.programa?.nombre ?? 'Sin programa'}{b.localidad ? ` · ${b.localidad}` : ''}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
                {data.beneficiariosSinEntrega.total > 6 && (
                  <Typography variant="caption" color="text.secondary">
                    +{data.beneficiariosSinEntrega.total - 6} más
                  </Typography>
                )}
              </Paper>
            </Grid>
          )}
          {(data?.casosUrgentes?.length ?? 0) > 0 && (
            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ p: 2, borderLeft: '4px solid', borderLeftColor: 'error.main' }}>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <UrgentIcon color="error" />
                  <Typography variant="h6" fontWeight="bold">Casos urgentes sin resolver</Typography>
                  <Chip label={data.casosUrgentes.length} size="small" color="error" />
                </Box>
                <Divider sx={{ mb: 1 }} />
                <List dense disablePadding>
                  {data.casosUrgentes.map((c: any) => (
                    <ListItem key={c.id} disablePadding sx={{ py: 0.3 }}>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body2" fontWeight="bold">{c.nombreSolicitante}</Typography>
                            <Chip label={c.prioridad} size="small" color={PRIORIDAD_COLOR[c.prioridad]} />
                          </Box>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            {c.tipo} · {c.estado} · {format(new Date(c.createdAt), 'dd/MM/yyyy', { locale: es })}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      {/* ── 4. GRÁFICO KG POR LOCALIDAD ── */}
      {kgLocalidad.length > 0 && (
        <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <LocalidadIcon color="primary" />
            <Typography variant="h6" fontWeight="bold">Kg por localidad</Typography>
            <Typography variant="caption" color="text.secondary">(mes actual)</Typography>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={5}>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={kgLocalidad.slice(0, 10)}
                    dataKey="totalKilos"
                    nameKey="localidad"
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    label={({ name, percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                    labelLine={false}
                  >
                    {kgLocalidad.slice(0, 10).map((_: any, i: number) => (
                      <Cell key={i} fill={COLORES_PIE[i % COLORES_PIE.length]} />
                    ))}
                  </Pie>
                  <ReTooltip formatter={(v: any, name: any) => [`${Number(v).toFixed(0)} kg`, name]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Grid>
            <Grid item xs={12} md={7}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell>Localidad</TableCell>
                      <TableCell align="right">Kg</TableCell>
                      <TableCell align="right">Remitos</TableCell>
                      <TableCell sx={{ width: 120 }}>%</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {kgLocalidad.slice(0, 10).map((loc: any, i: number) => {
                      const totalKg = kgLocalidad.reduce((s: number, l: any) => s + l.totalKilos, 0);
                      const pct = totalKg > 0 ? (loc.totalKilos / totalKg) * 100 : 0;
                      return (
                        <TableRow key={loc.localidad} hover>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: COLORES_PIE[i % COLORES_PIE.length], flexShrink: 0 }} />
                              <Typography variant="body2">{loc.localidad}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right"><strong>{loc.totalKilos.toFixed(0)}</strong></TableCell>
                          <TableCell align="right">{loc.cantidadRemitos}</TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <Box sx={{ flex: 1, height: 6, bgcolor: 'grey.200', borderRadius: 1, overflow: 'hidden' }}>
                                <Box sx={{ width: `${pct}%`, height: '100%', bgcolor: COLORES_PIE[i % COLORES_PIE.length], borderRadius: 1 }} />
                              </Box>
                              <Typography variant="caption" color="text.secondary" sx={{ width: 30, textAlign: 'right' }}>
                                {pct.toFixed(0)}%
                              </Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {kgLocalidad.length > 10 && (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <Typography variant="caption" color="text.secondary">+{kgLocalidad.length - 10} localidades más — ver Reportes para detalle completo</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* ── 5. EVOLUCIÓN MENSUAL ── */}
      {evolucion.length > 0 && (
        <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <KgIcon color="warning" />
            <Typography variant="h6" fontWeight="bold">Evolución mensual de kg entregados</Typography>
            <Typography variant="caption" color="text.secondary">(últimos 6 meses)</Typography>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={evolucion} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
              <XAxis dataKey="mesNombre" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <ReTooltip
                formatter={(value: any) => [`${Number(value).toFixed(0)} kg`, 'Total kg']}
                labelFormatter={(label: any) => `Mes: ${label}`}
              />
              <Bar dataKey="totalKilos" radius={[4, 4, 0, 0]}>
                {evolucion.map((_: any, index: number) => (
                  <Cell
                    key={index}
                    fill={index === evolucion.length - 1 ? '#1976d2' : '#90caf9'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <Box display="flex" justifyContent="center" gap={3} mt={1} flexWrap="wrap">
            {evolucion.map((m: any, i: number) => (
              <Tooltip key={i} title={`${m.cantidadRemitos} remitos`}>
                <Typography variant="caption" color={i === evolucion.length - 1 ? 'primary' : 'text.secondary'} fontWeight={i === evolucion.length - 1 ? 'bold' : 'normal'}>
                  {m.mesNombre}: {m.totalKilos.toFixed(0)} kg
                </Typography>
              </Tooltip>
            ))}
          </Box>
        </Paper>
      )}

      {/* ── 6. REMITOS ANTERIORES + BUSCADOR ── */}
      <Paper elevation={2} sx={{ p: 2 }}>
        <Box display="flex" alignItems="center" gap={1} mb={2} flexWrap="wrap">
          <HistoryIcon color="action" />
          <Typography variant="h6" fontWeight="bold">Remitos anteriores</Typography>
          <Box ml="auto">
            <TextField
              size="small"
              placeholder="Buscar por N°, nombre, DNI, localidad…"
              value={buscarRecientes}
              onChange={(e) => setBuscarRecientes(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{ width: 280 }}
            />
          </Box>
        </Box>
        <Divider sx={{ mb: 1 }} />
        {recientesFiltrados.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
            {buscarQ ? 'Sin resultados para esa búsqueda' : 'No hay remitos anteriores'}
          </Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>N° Remito</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Beneficiario</TableCell>
                  <TableCell>Programa</TableCell>
                  <TableCell>Depósito</TableCell>
                  <TableCell align="right">Kg</TableCell>
                  <TableCell align="center">Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recientesFiltrados.map((r: any) => (
                  <TableRow key={r.id} hover>
                    <TableCell><strong>{r.numero}</strong></TableCell>
                    <TableCell>{format(new Date(r.fecha), 'dd/MM/yyyy', { locale: es })}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{r.beneficiario}</Typography>
                      {r.localidad && <Typography variant="caption" color="text.secondary" display="block">{r.localidad}</Typography>}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{r.programa}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={r.deposito} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell align="right">{r.totalKg?.toFixed(1)}</TableCell>
                    <TableCell align="center">
                      <Chip label={r.estado} size="small" color={ESTADO_COLOR[r.estado] || 'default'} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}
