import { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Tab, Tabs, Select, MenuItem, FormControl, InputLabel, Button,
  Chip, LinearProgress, Tooltip, TextField, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  Legend, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
  Refresh as RefreshIcon,
  TrendingUp, Group, Inventory, Assignment,
  CalendarMonth as MesIcon,
  DateRange as RangoIcon,
} from '@mui/icons-material';
import api from '../services/api';
import ExportExcelButton from '../components/ExportExcelButton';
import LoadingPage from '../components/LoadingPage';

const MESES_NOMBRE = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const COLORES_PIE = ['#1565C0','#2E7D32','#6A1B9A','#00695C','#E65100','#AD1457','#283593','#00838F','#4527A0'];
const ESTADO_COLORS: Record<string, string> = {
  PENDIENTE: '#fb8c00', GENERADA: '#1e88e5', ENTREGADA: '#43a047',
  CANCELADA: '#e53935', BORRADOR: '#9e9e9e', CONFIRMADO: '#1e88e5',
  ENVIADO: '#00acc1', ENTREGADO: '#43a047',
};

const hoy = new Date();

export default function ReportesPage() {
  const [tabIdx, setTabIdx] = useState(0);
  const [loading, setLoading] = useState(false);

  // Filtros globales
  const [modoFiltro, setModoFiltro] = useState<'mes' | 'rango'>('mes');
  const [mes, setMes]   = useState(hoy.getMonth() + 1);
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [fechaDesde, setFechaDesde] = useState(
    new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10)
  );
  const [fechaHasta, setFechaHasta] = useState(hoy.toISOString().slice(0, 10));
  const [programaId, setProgramaId] = useState<number | ''>('');
  const [programas, setProgramas] = useState<any[]>([]);

  // Datos
  const [kilosPorMes, setKilosPorMes]                 = useState<any[]>([]);
  const [topArticulos, setTopArticulos]               = useState<any[]>([]);
  const [entregasPorPrograma, setEntregasPorPrograma] = useState<any[]>([]);
  const [stockBajo, setStockBajo]                     = useState<any[]>([]);
  const [benefPorProg, setBenefPorProg]               = useState<any[]>([]);
  const [remitosDetalle, setRemitosDetalle]           = useState<any[]>([]);
  const [resumenEntregas, setResumenEntregas]         = useState<any>(null);
  const [entregasPorLocalidad, setEntregasPorLocalidad] = useState<any[]>([]);
  const [crucesMasivos, setCrucesMasivos]             = useState<any[] | null>(null);
  const [loadingCruces, setLoadingCruces]             = useState(false);
  const [sinEntrega, setSinEntrega]                   = useState<any | null>(null);
  const [loadingSinEntrega, setLoadingSinEntrega]     = useState(false);

  // ── Rendición ──────────────────────────────────────────────────────────────
  const BIMESTRES = [
    { label: 'Ene - Feb', desde: '01-01', hasta: '02-28' },
    { label: 'Mar - Abr', desde: '03-01', hasta: '04-30' },
    { label: 'May - Jun', desde: '05-01', hasta: '06-30' },
    { label: 'Jul - Ago', desde: '07-01', hasta: '08-31' },
    { label: 'Sep - Oct', desde: '09-01', hasta: '10-31' },
    { label: 'Nov - Dic', desde: '11-01', hasta: '12-31' },
  ];
  // Bimestre anterior al mes actual como default
  const bimestreDefault = Math.max(0, Math.floor(hoy.getMonth() / 2) - 1);
  const [bimestreIdx, setBimestreIdx]         = useState(bimestreDefault === 0 && hoy.getMonth() < 2 ? 5 : bimestreDefault);
  const [anioRendicion, setAnioRendicion]     = useState(hoy.getFullYear());
  const [programaRendicion, setProgramaRendicion] = useState<number | ''>('');
  const [rendicion, setRendicion]             = useState<any | null>(null);
  const [loadingRendicion, setLoadingRendicion] = useState(false);

  useEffect(() => {
    api.get('/programas').then(r => setProgramas(r.data.filter((p: any) => p.activo))).catch(() => {});
    loadBase();
  }, []);

  async function loadBase() {
    try {
      const [stock, bpp] = await Promise.all([
        api.get('/reportes/stock-bajo'),
        api.get('/reportes/beneficiarios-por-programa'),
      ]);
      setStockBajo(stock.data);
      setBenefPorProg(bpp.data);
    } catch { /* silent */ }
  }

  const loadFiltrados = useCallback(async () => {
    setLoading(true);
    try {
      // Construir params según modo
      const paramsMes = `mes=${mes}&anio=${anio}`;
      const paramsRango = `fechaDesde=${fechaDesde}&fechaHasta=${fechaHasta}`;
      const params = modoFiltro === 'rango' ? paramsRango : paramsMes;
      const pId = programaId ? `&programaId=${programaId}` : '';

      const [kilosRes, artRes, progRes, remRes, entRes, locRes] = await Promise.all([
        api.get(`/reportes/kilos-por-mes?${modoFiltro === 'mes' ? paramsMes : ''}`),
        api.get(`/reportes/articulos-mas-distribuidos?${params}`),
        api.get(`/reportes/entregas-por-programa?${params}`),
        api.get(`/reportes/remitos-detalle?${params}${pId}`),
        api.get(`/reportes/resumen-entregas-mes?${params}`),
        api.get(`/reportes/entregas-por-localidad?${params}`),
      ]);
      setKilosPorMes(kilosRes.data);
      setTopArticulos(artRes.data.slice(0, 15));
      setEntregasPorPrograma(progRes.data);
      setRemitosDetalle(remRes.data);
      setResumenEntregas(entRes.data);
      setEntregasPorLocalidad(locRes.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [mes, anio, fechaDesde, fechaHasta, modoFiltro, programaId]);

  useEffect(() => { loadFiltrados(); }, [loadFiltrados]);

  const anios = Array.from({ length: 5 }, (_, i) => hoy.getFullYear() - i);
  const labelPeriodo = modoFiltro === 'rango'
    ? `${fechaDesde} al ${fechaHasta}`
    : `${MESES_NOMBRE[mes - 1]} ${anio}`;

  const pieData = entregasPorPrograma
    .filter(p => p.totalKilos > 0)
    .map(p => ({ name: p.programa, value: parseFloat((p.totalKilos || 0).toFixed(1)) }));

  const totalKgMes = remitosDetalle.reduce((s, r) => s + (r.totalKg ?? 0), 0);

  if (loading && kilosPorMes.length === 0 && remitosDetalle.length === 0) {
    return <LoadingPage />;
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Typography variant="h4" fontWeight="bold">Reportes</Typography>
        <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
          <ToggleButtonGroup
            value={modoFiltro}
            exclusive
            onChange={(_, v) => { if (v) setModoFiltro(v); }}
            size="small"
          >
            <ToggleButton value="mes"><MesIcon sx={{ mr: 0.5, fontSize: 18 }} />Por mes</ToggleButton>
            <ToggleButton value="rango"><RangoIcon sx={{ mr: 0.5, fontSize: 18 }} />Rango</ToggleButton>
          </ToggleButtonGroup>

          {modoFiltro === 'mes' ? (
            <>
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <InputLabel>Mes</InputLabel>
                <Select value={mes} label="Mes" onChange={e => setMes(Number(e.target.value))}>
                  {MESES_NOMBRE.map((m, i) => <MenuItem key={i+1} value={i+1}>{m}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 90 }}>
                <InputLabel>Año</InputLabel>
                <Select value={anio} label="Año" onChange={e => setAnio(Number(e.target.value))}>
                  {anios.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
                </Select>
              </FormControl>
            </>
          ) : (
            <>
              <TextField
                size="small" type="date" label="Desde" value={fechaDesde}
                onChange={e => setFechaDesde(e.target.value)}
                InputLabelProps={{ shrink: true }} sx={{ minWidth: 150 }}
              />
              <TextField
                size="small" type="date" label="Hasta" value={fechaHasta}
                onChange={e => setFechaHasta(e.target.value)}
                InputLabelProps={{ shrink: true }} sx={{ minWidth: 150 }}
              />
            </>
          )}

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Programa</InputLabel>
            <Select value={programaId} label="Programa" onChange={e => setProgramaId(e.target.value as number | '')}>
              <MenuItem value="">Todos</MenuItem>
              {programas.map(p => <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>)}
            </Select>
          </FormControl>
          <Button variant="outlined" startIcon={<RefreshIcon />} size="small" onClick={loadFiltrados}>
            Actualizar
          </Button>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 1 }} />}

      {/* KPI cards */}
      <Grid container spacing={2} mb={2}>
        {[
          { label: 'Remitos del mes', value: remitosDetalle.length, icon: <Assignment />, color: '#1565C0' },
          { label: 'Kg distribuidos', value: `${totalKgMes.toFixed(0)} kg`, icon: <TrendingUp />, color: '#2E7D32' },
          { label: 'Entregas cronograma', value: resumenEntregas?.total ?? '—', icon: <Inventory />, color: '#6A1B9A' },
          { label: 'Beneficiarios activos', value: benefPorProg.reduce((s, p) => s + p.total, 0), icon: <Group />, color: '#E65100' },
        ].map((kpi, i) => (
          <Grid item xs={6} sm={3} key={i}>
            <Card elevation={2}>
              <CardContent sx={{ p: '12px !important' }}>
                <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                  <Box sx={{ color: kpi.color }}>{kpi.icon}</Box>
                  <Typography variant="caption" color="text.secondary">{kpi.label}</Typography>
                </Box>
                <Typography variant="h5" fontWeight="bold" sx={{ color: kpi.color }}>{kpi.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabIdx} onChange={(_, v) => {
          setTabIdx(v);
          if (v === 7 && crucesMasivos === null) {
            setLoadingCruces(true);
            api.get('/reportes/cruces-masivos')
              .then(r => setCrucesMasivos(r.data))
              .catch(() => setCrucesMasivos([]))
              .finally(() => setLoadingCruces(false));
          }
          if (v === 8 && sinEntrega === null) {
            setLoadingSinEntrega(true);
            api.get('/reportes/sin-entrega')
              .then(r => setSinEntrega(r.data))
              .catch(() => setSinEntrega({ total: 0, sinEntregaNunca: 0, detalle: [] }))
              .finally(() => setLoadingSinEntrega(false));
          }
        }} variant="scrollable" scrollButtons="auto">
          <Tab label="Distribución" />
          <Tab label="Por Localidad" />
          <Tab label="Cronograma" />
          <Tab label="Beneficiarios" />
          <Tab label="Artículos" />
          <Tab label="Remitos" />
          <Tab label="Stock" />
          <Tab label="Cruces DNI" />
          <Tab label="Sin Entrega" />
          <Tab label="Rendición" />
        </Tabs>
      </Box>

      {/* ── Tab 0: Distribución mensual ── */}
      {tabIdx === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Kilos distribuidos — {labelPeriodo}</Typography>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={kilosPorMes}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mesNombre" />
                  <YAxis />
                  <RTooltip formatter={(v: any) => [`${Number(v).toFixed(1)} kg`]} />
                  <Legend />
                  <Bar dataKey="totalKilos" fill="#1976d2" name="Total Kg" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Kg por programa</Typography>
              {pieData.length === 0
                ? <Typography color="text.secondary">Sin datos</Typography>
                : (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                        {pieData.map((_, i) => <Cell key={i} fill={COLORES_PIE[i % COLORES_PIE.length]} />)}
                      </Pie>
                      <RTooltip formatter={(v: any) => [`${v} kg`]} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="h6">Por programa</Typography>
                <ExportExcelButton data={entregasPorPrograma} fileName={`por-programa-${labelPeriodo.replace(/ /g,'_')}`} sheetName="Programas" label="Exportar" />
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                      <TableCell>Programa</TableCell>
                      <TableCell align="right">Remitos</TableCell>
                      <TableCell align="right">Kg</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {entregasPorPrograma.map((p, i) => (
                      <TableRow key={i} hover>
                        <TableCell>{p.programa}</TableCell>
                        <TableCell align="right">{p.cantidadRemitos}</TableCell>
                        <TableCell align="right"><strong>{(p.totalKilos || 0).toFixed(1)}</strong></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* ── Tab 1: Por Localidad ── */}
      {tabIdx === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={5}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Kg por localidad — {labelPeriodo}</Typography>
              {entregasPorLocalidad.length === 0
                ? <Typography color="text.secondary">Sin datos para el período</Typography>
                : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={entregasPorLocalidad.slice(0, 10)}
                        dataKey="totalKilos"
                        nameKey="localidad"
                        cx="50%" cy="50%"
                        outerRadius={100}
                        label={({ name, percent }) => percent > 0.04 ? `${(percent * 100).toFixed(0)}%` : ''}
                        labelLine={false}
                      >
                        {entregasPorLocalidad.slice(0, 10).map((_: any, i: number) => (
                          <Cell key={i} fill={COLORES_PIE[i % COLORES_PIE.length]} />
                        ))}
                      </Pie>
                      <RTooltip formatter={(v: any, name: any) => [`${Number(v).toFixed(0)} kg`, name]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
            </Paper>
          </Grid>
          <Grid item xs={12} md={7}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Detalle por localidad</Typography>
                <ExportExcelButton
                  data={entregasPorLocalidad.map((l: any) => ({
                    Localidad: l.localidad,
                    Remitos: l.cantidadRemitos,
                    KilosTotales: l.totalKilos.toFixed(1),
                  }))}
                  fileName={`localidad-${labelPeriodo.replace(/ /g,'_')}`}
                  sheetName="Localidades"
                  label="Exportar"
                />
              </Box>
              {entregasPorLocalidad.length === 0
                ? <Typography color="text.secondary">Sin datos para el período</Typography>
                : (
                  <>
                    {/* Totales */}
                    <Box display="flex" gap={3} mb={2} flexWrap="wrap">
                      <Box>
                        <Typography variant="caption" color="text.secondary">TOTAL KG</Typography>
                        <Typography variant="h5" fontWeight="bold" color="primary.main">
                          {entregasPorLocalidad.reduce((s: number, l: any) => s + l.totalKilos, 0).toFixed(0)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">TOTAL ASISTENCIAS</Typography>
                        <Typography variant="h5" fontWeight="bold" color="success.main">
                          {entregasPorLocalidad.reduce((s: number, l: any) => s + l.cantidadRemitos, 0)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">LOCALIDADES</Typography>
                        <Typography variant="h5" fontWeight="bold" color="text.primary">
                          {entregasPorLocalidad.length}
                        </Typography>
                      </Box>
                    </Box>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                            <TableCell>Localidad</TableCell>
                            <TableCell align="right">Asistencias</TableCell>
                            <TableCell align="right">Kg totales</TableCell>
                            <TableCell align="right">Kg promedio</TableCell>
                            <TableCell sx={{ width: 100 }}>% del total</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {entregasPorLocalidad.map((loc: any, i: number) => {
                            const totalKg = entregasPorLocalidad.reduce((s: number, l: any) => s + l.totalKilos, 0);
                            const pct = totalKg > 0 ? (loc.totalKilos / totalKg) * 100 : 0;
                            return (
                              <TableRow key={loc.localidad} hover>
                                <TableCell>
                                  <Box display="flex" alignItems="center" gap={1}>
                                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: COLORES_PIE[i % COLORES_PIE.length], flexShrink: 0 }} />
                                    <strong>{loc.localidad}</strong>
                                  </Box>
                                </TableCell>
                                <TableCell align="right">{loc.cantidadRemitos}</TableCell>
                                <TableCell align="right"><strong>{loc.totalKilos.toFixed(0)}</strong></TableCell>
                                <TableCell align="right">{loc.cantidadRemitos > 0 ? (loc.totalKilos / loc.cantidadRemitos).toFixed(0) : '—'}</TableCell>
                                <TableCell>
                                  <Box display="flex" alignItems="center" gap={0.5}>
                                    <Box sx={{ flex: 1, height: 6, bgcolor: 'grey.200', borderRadius: 1, overflow: 'hidden' }}>
                                      <Box sx={{ width: `${pct}%`, height: '100%', bgcolor: COLORES_PIE[i % COLORES_PIE.length], borderRadius: 1 }} />
                                    </Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ width: 32, textAlign: 'right' }}>
                                      {pct.toFixed(0)}%
                                    </Typography>
                                  </Box>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </>
                )}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* ── Tab 2: Cronograma del mes ── */}
      {tabIdx === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Entregas del cronograma — {labelPeriodo}</Typography>
                {resumenEntregas && (
                  <ExportExcelButton data={resumenEntregas.detalle} fileName={`entregas-${labelPeriodo.replace(/ /g,'_')}`} sheetName="Entregas" label="Exportar" />
                )}
              </Box>
              {resumenEntregas ? (
                <>
                  <Box display="flex" gap={2} flexWrap="wrap" mb={2}>
                    {[
                      { label: 'Total', value: resumenEntregas.total, color: '#607d8b' },
                      { label: 'Pendientes', value: resumenEntregas.pendientes, color: ESTADO_COLORS.PENDIENTE },
                      { label: 'Generadas', value: resumenEntregas.generadas, color: ESTADO_COLORS.GENERADA },
                      { label: 'Entregadas', value: resumenEntregas.entregadas, color: ESTADO_COLORS.ENTREGADA },
                      { label: 'Canceladas', value: resumenEntregas.canceladas, color: ESTADO_COLORS.CANCELADA },
                      { label: 'Kg programados', value: `${(resumenEntregas.kgProgramado || 0).toFixed(0)} kg`, color: '#1565C0' },
                    ].map((s, i) => (
                      <Box key={i} sx={{ textAlign: 'center', minWidth: 90 }}>
                        <Typography variant="h5" fontWeight="bold" sx={{ color: s.color }}>{s.value}</Typography>
                        <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                      </Box>
                    ))}
                  </Box>
                  <TableContainer sx={{ maxHeight: 400 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>Beneficiario</TableCell>
                          <TableCell>Programa</TableCell>
                          <TableCell>Localidad</TableCell>
                          <TableCell>Fecha</TableCell>
                          <TableCell align="right">Kg</TableCell>
                          <TableCell>Estado</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {resumenEntregas.detalle.map((e: any, i: number) => (
                          <TableRow key={i} hover>
                            <TableCell>{e.beneficiario}</TableCell>
                            <TableCell>{e.programa}</TableCell>
                            <TableCell>{e.localidad}</TableCell>
                            <TableCell>{e.fechaProgramada}</TableCell>
                            <TableCell align="right">{e.kilos}</TableCell>
                            <TableCell>
                              <Chip label={e.estado} size="small" sx={{ bgcolor: ESTADO_COLORS[e.estado]||'#607d8b', color:'white', fontSize:10 }} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              ) : <Typography color="text.secondary">Sin datos</Typography>}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* ── Tab 3: Beneficiarios ── */}
      {tabIdx === 3 && (
        <Paper elevation={2} sx={{ p: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Beneficiarios activos por programa</Typography>
            <ExportExcelButton data={benefPorProg} fileName="beneficiarios-por-programa" sheetName="Beneficiarios" label="Exportar" />
          </Box>
          <Grid container spacing={2}>
            {benefPorProg.map((p, i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <Card variant="outlined">
                  <CardContent sx={{ p: '12px !important' }}>
                    <Typography variant="subtitle2" fontWeight="bold" noWrap>{p.programa}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block">{p.tipo}</Typography>
                    <Box display="flex" justifyContent="space-between" mt={1}>
                      <Box textAlign="center">
                        <Typography variant="h6" fontWeight="bold" color="primary">{p.total}</Typography>
                        <Typography variant="caption">beneficiarios</Typography>
                      </Box>
                      <Box textAlign="center">
                        <Typography variant="h6" fontWeight="bold" color="success.main">{(p.kgHabitualTotal||0).toFixed(0)}</Typography>
                        <Typography variant="caption">kg/entrega</Typography>
                      </Box>
                    </Box>
                    <Box mt={1} display="flex" gap={0.5} flexWrap="wrap">
                      {Object.entries(p.porTipo || {}).map(([tipo, cnt]) => (
                        <Chip key={tipo} label={`${tipo}: ${cnt}`} size="small" sx={{ fontSize: 10 }} />
                      ))}
                    </Box>
                    <Box mt={0.5} display="flex" gap={0.5} flexWrap="wrap">
                      {Object.entries(p.porFrecuencia || {}).map(([frec, cnt]) => (
                        <Chip key={frec} label={`${frec}: ${cnt}`} size="small" variant="outlined" sx={{ fontSize: 10 }} />
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* ── Tab 4: Artículos ── */}
      {tabIdx === 4 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="h6">Artículos más distribuidos — {labelPeriodo}</Typography>
                <ExportExcelButton data={topArticulos} fileName={`articulos-${labelPeriodo.replace(/ /g,'_')}`} sheetName="Artículos" label="Exportar" />
              </Box>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={topArticulos.slice(0, 10)} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="articulo" width={150} tick={{ fontSize: 12 }} />
                  <RTooltip formatter={(v: any) => [v, 'Cantidad']} />
                  <Bar dataKey="cantidadTotal" fill="#43a047" name="Cantidad" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          <Grid item xs={12} md={5}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Tabla completa</Typography>
              <TableContainer sx={{ maxHeight: 350 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>#</TableCell>
                      <TableCell>Artículo</TableCell>
                      <TableCell align="right">Cant.</TableCell>
                      <TableCell align="right">Kg</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {topArticulos.map((a, i) => (
                      <TableRow key={i} hover>
                        <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>{i+1}</TableCell>
                        <TableCell>{a.articulo}</TableCell>
                        <TableCell align="right"><strong>{a.cantidadTotal}</strong></TableCell>
                        <TableCell align="right">{(a.pesoTotal || 0).toFixed(1)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* ── Tab 5: Remitos ── */}
      {tabIdx === 5 && (
        <Paper elevation={2} sx={{ p: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Remitos — {labelPeriodo}
              {programaId ? ` · ${programas.find(p=>p.id===programaId)?.nombre}` : ''}
            </Typography>
            <ExportExcelButton data={remitosDetalle} fileName={`remitos-${labelPeriodo.replace(/ /g,'_')}`} sheetName="Remitos" label={`Exportar (${remitosDetalle.length})`} />
          </Box>
          <TableContainer sx={{ maxHeight: 500 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Nro</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Beneficiario</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Localidad</TableCell>
                  <TableCell>Programa</TableCell>
                  <TableCell align="right">Kg</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Artículos</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {remitosDetalle.map((r, i) => (
                  <TableRow key={i} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{r.numero}</TableCell>
                    <TableCell>{r.fecha}</TableCell>
                    <TableCell>{r.beneficiario}</TableCell>
                    <TableCell><Chip label={r.tipoBeneficiario} size="small" sx={{ fontSize: 10 }} /></TableCell>
                    <TableCell>{r.localidad}</TableCell>
                    <TableCell>{r.programa}</TableCell>
                    <TableCell align="right"><strong>{(r.totalKg||0).toFixed(1)}</strong></TableCell>
                    <TableCell>
                      <Chip label={r.estado} size="small" sx={{ bgcolor: ESTADO_COLORS[r.estado]||'#607d8b', color:'white', fontSize:10 }} />
                    </TableCell>
                    <TableCell>
                      <Tooltip title={r.items} arrow>
                        <Typography variant="caption" sx={{ cursor:'default' }} noWrap>
                          {r.cantidadItems} ítem{r.cantidadItems!==1?'s':''}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {remitosDetalle.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      <Typography color="text.secondary" py={2}>Sin remitos para el filtro seleccionado</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* ── Tab 6: Stock ── */}
      {tabIdx === 6 && (
        <Paper elevation={2} sx={{ p: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" color="warning.main">Artículos con stock bajo</Typography>
            <ExportExcelButton data={stockBajo} fileName="stock-bajo" sheetName="Stock Bajo" label="Exportar" />
          </Box>
          {stockBajo.length === 0 ? (
            <Typography variant="body2" color="success.main">✓ Todos los artículos tienen stock suficiente</Typography>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#fff3e0' }}>
                    <TableCell>Artículo</TableCell>
                    <TableCell>Depósito</TableCell>
                    <TableCell align="right">Stock actual</TableCell>
                    <TableCell align="right">Stock mínimo</TableCell>
                    <TableCell align="right">Diferencia</TableCell>
                    <TableCell>Nivel</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stockBajo.map((item, i) => {
                    const pct = Math.min(100, (item.stockActual / item.stockMinimo) * 100);
                    return (
                      <TableRow key={i} hover>
                        <TableCell><strong>{item.articulo}</strong></TableCell>
                        <TableCell>{item.deposito}</TableCell>
                        <TableCell align="right" sx={{ color: 'error.main', fontWeight: 'bold' }}>{item.stockActual}</TableCell>
                        <TableCell align="right">{item.stockMinimo}</TableCell>
                        <TableCell align="right" sx={{ color: 'error.main' }}>-{item.diferencia}</TableCell>
                        <TableCell sx={{ minWidth: 120 }}>
                          <LinearProgress variant="determinate" value={pct} color={pct < 50 ? 'error' : 'warning'} sx={{ height: 8, borderRadius: 4 }} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}
      {/* ── Tab 7: Cruces DNI ── */}
      {tabIdx === 7 && (
        <Paper elevation={2} sx={{ p: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box>
              <Typography variant="h6">Cruces por DNI</Typography>
              <Typography variant="body2" color="text.secondary">
                DNIs de responsable registrados en más de un beneficiario / programa
              </Typography>
            </Box>
            {crucesMasivos && crucesMasivos.length > 0 && (
              <ExportExcelButton
                data={crucesMasivos.flatMap((c: any) => c.registros.map((r: any) => ({
                  dni: c.dni,
                  id: r.id,
                  nombre: r.nombre,
                  tipo: r.tipo,
                  programa: r.programa?.nombre ?? '—',
                  secretaria: r.programa?.secretaria ?? '—',
                  activo: r.activo ? 'Sí' : 'No',
                })))}
                fileName="cruces-dni"
                sheetName="Cruces"
                label="Exportar"
              />
            )}
          </Box>
          {loadingCruces ? (
            <LinearProgress />
          ) : !crucesMasivos ? null
          : crucesMasivos.length === 0 ? (
            <Typography variant="body2" color="success.main">✓ No se detectaron DNIs duplicados entre programas</Typography>
          ) : (
            <>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                {crucesMasivos.length} DNI{crucesMasivos.length !== 1 ? 's' : ''} aparece{crucesMasivos.length === 1 ? '' : 'n'} en más de un registro
              </Typography>
              {crucesMasivos.map((c: any) => (
                <Box key={c.dni} sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Chip label={`DNI ${c.dni}`} color="warning" size="small" />
                    <Typography variant="caption" color="text.secondary">{c.registros.length} registros</Typography>
                  </Box>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                          <TableCell>#</TableCell>
                          <TableCell>Nombre</TableCell>
                          <TableCell>Tipo</TableCell>
                          <TableCell>Programa</TableCell>
                          <TableCell>Secretaría</TableCell>
                          <TableCell>Estado</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {c.registros.map((r: any) => (
                          <TableRow key={r.id} hover>
                            <TableCell>{r.id}</TableCell>
                            <TableCell><strong>{r.nombre}</strong></TableCell>
                            <TableCell><Typography variant="caption">{r.tipo}</Typography></TableCell>
                            <TableCell>{r.programa?.nombre ?? '—'}</TableCell>
                            <TableCell>
                              {r.programa?.secretaria && (
                                <Chip label={r.programa.secretaria} size="small" color={r.programa.secretaria === 'AC' ? 'warning' : 'primary'} variant="outlined" />
                              )}
                            </TableCell>
                            <TableCell>
                              <Chip label={r.activo ? 'Activo' : 'Baja'} size="small" color={r.activo ? 'success' : 'default'} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              ))}
            </>
          )}
        </Paper>
      )}
      {/* ── Tab 8: Sin Entrega ── */}
      {tabIdx === 8 && (
        <Paper elevation={2} sx={{ p: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
            <Box>
              <Typography variant="h6">Beneficiarios con entrega vencida</Typography>
              <Typography variant="caption" color="text.secondary">
                Activos con frecuencia MENSUAL o BIMESTRAL cuya próxima entrega ya pasó
              </Typography>
            </Box>
            <Box display="flex" gap={1} alignItems="center">
              <Button
                size="small" variant="outlined" startIcon={<RefreshIcon />}
                onClick={() => {
                  setLoadingSinEntrega(true);
                  api.get('/reportes/sin-entrega')
                    .then(r => setSinEntrega(r.data))
                    .catch(() => {})
                    .finally(() => setLoadingSinEntrega(false));
                }}
              >
                Actualizar
              </Button>
              {sinEntrega && sinEntrega.detalle.length > 0 && (
                <ExportExcelButton
                  data={sinEntrega.detalle.map((r: any) => ({
                    id: r.id, nombre: r.nombre, localidad: r.localidad ?? '',
                    programa: r.programa, frecuencia: r.frecuencia,
                    ultima_entrega: r.ultimaEntrega ?? 'Nunca',
                    proxima_entrega: r.proximaEntrega ?? '—',
                    dias_atraso: r.diasAtraso,
                  }))}
                  fileName="sin-entrega"
                  sheetName="Sin Entrega"
                  label="Exportar"
                />
              )}
            </Box>
          </Box>

          {loadingSinEntrega ? (
            <LinearProgress />
          ) : !sinEntrega ? null : (
            <>
              <Grid container spacing={2} mb={3}>
                {[
                  { label: 'Total con entrega vencida', value: sinEntrega.total, color: '#E65100' },
                  { label: 'Nunca recibieron', value: sinEntrega.sinEntregaNunca, color: '#c62828' },
                  { label: 'Con atraso', value: sinEntrega.total - sinEntrega.sinEntregaNunca, color: '#f57c00' },
                ].map((stat, i) => (
                  <Grid item xs={12} sm={4} key={i}>
                    <Card elevation={1} sx={{ borderLeft: `4px solid ${stat.color}` }}>
                      <CardContent sx={{ p: '12px !important' }}>
                        <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
                        <Typography variant="h5" fontWeight="bold" sx={{ color: stat.color }}>{stat.value}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              {sinEntrega.detalle.length === 0 ? (
                <Typography variant="body2" color="success.main">✓ Todos los beneficiarios tienen su entrega al día</Typography>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.50' }}>
                        <TableCell>Beneficiario</TableCell>
                        <TableCell>Programa</TableCell>
                        <TableCell>Frecuencia</TableCell>
                        <TableCell>Última entrega</TableCell>
                        <TableCell>Próxima (venció)</TableCell>
                        <TableCell align="right">Días de atraso</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sinEntrega.detalle.map((r: any) => (
                        <TableRow key={r.id} hover sx={r.sinEntregaNunca ? { bgcolor: 'error.50' } : {}}>
                          <TableCell>
                            <Typography variant="body2" fontWeight="bold">{r.nombre}</Typography>
                            {r.localidad && <Typography variant="caption" color="text.secondary">{r.localidad}</Typography>}
                          </TableCell>
                          <TableCell>{r.programa || '—'}</TableCell>
                          <TableCell>
                            <Chip label={r.frecuencia} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>
                            {r.sinEntregaNunca
                              ? <Chip label="Nunca" size="small" color="error" />
                              : r.ultimaEntrega}
                          </TableCell>
                          <TableCell sx={{ color: 'error.main', fontWeight: 'bold' }}>
                            {r.proximaEntrega ?? '—'}
                          </TableCell>
                          <TableCell align="right">
                            {r.sinEntregaNunca ? '—' : (
                              <Chip
                                label={`${r.diasAtraso}d`}
                                size="small"
                                color={r.diasAtraso > 30 ? 'error' : 'warning'}
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </>
          )}
        </Paper>
      )}
      {/* ── Tab 9: Rendición ANEXO VI ── */}
      {tabIdx === 9 && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" fontWeight="bold" mb={2}>Rendición — ANEXO VI</Typography>

          {/* Selectores */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Bimestre</InputLabel>
              <Select value={bimestreIdx} label="Bimestre" onChange={e => { setBimestreIdx(e.target.value as number); setRendicion(null); }}>
                {BIMESTRES.map((b, i) => <MenuItem key={i} value={i}>{b.label}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Año</InputLabel>
              <Select value={anioRendicion} label="Año" onChange={e => { setAnioRendicion(e.target.value as number); setRendicion(null); }}>
                {[hoy.getFullYear(), hoy.getFullYear() - 1, hoy.getFullYear() - 2].map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Programa</InputLabel>
              <Select value={programaRendicion} label="Programa" onChange={e => { setProgramaRendicion(e.target.value as number | ''); setRendicion(null); }}>
                <MenuItem value="">Todos</MenuItem>
                {programas.map(p => <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>)}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              disabled={loadingRendicion}
              onClick={async () => {
                setLoadingRendicion(true);
                setRendicion(null);
                try {
                  const bim = BIMESTRES[bimestreIdx];
                  const desde = `${anioRendicion}-${bim.desde}`;
                  const hasta = `${anioRendicion}-${bim.hasta}`;
                  const params: any = { desde, hasta };
                  if (programaRendicion) params.programaId = programaRendicion;
                  const r = await api.get('/reportes/rendicion', { params });
                  setRendicion(r.data);
                } catch { /* silent */ }
                finally { setLoadingRendicion(false); }
              }}
            >
              Consultar
            </Button>
          </Box>

          {loadingRendicion && <LinearProgress sx={{ mb: 2 }} />}

          {rendicion && (
            <>
              {/* Resumen */}
              <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                <Chip label={`${rendicion.totalBeneficiarios} familias retiraron`} color="primary" />
                <Chip label={`${BIMESTRES[bimestreIdx].label} ${anioRendicion}`} variant="outlined" />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    import('xlsx').then(XLSX => {
                      const bim = BIMESTRES[bimestreIdx];
                      const periodo = `${bim.label} ${anioRendicion}`;
                      const hoja = 1;
                      const total = Math.ceil(rendicion.filas.length / 25) || 1;

                      const aoa: any[][] = [
                        ['MUNICIPALIDAD DE LA PLATA - ANEXO VI', '', '', '', ''],
                        [`Período: ${periodo}`, '', `Hoja ${hoja} de ${total}`, '', ''],
                        [],
                        ['Apellido', 'Nombre', 'DNI', 'Grupo', 'Dirección'],
                        ...rendicion.filas.map((f: any) => [f.apellido, f.nombre, f.dni, f.grupo, f.direccion]),
                        [],
                        ['Firma del responsable:', '', '', 'Aclaración:', ''],
                      ];

                      const ws = XLSX.utils.aoa_to_sheet(aoa);
                      ws['!cols'] = [{ wch: 22 }, { wch: 20 }, { wch: 13 }, { wch: 7 }, { wch: 45 }];
                      ws['!merges'] = [
                        { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, // título
                      ];
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, 'ANEXO VI');

                      // Hoja de ingresos si hay datos
                      if (rendicion.ingresos?.length > 0) {
                        const aoaIng: any[][] = [
                          ['Ingresos de Mercadería', '', '', '', ''],
                          [`Período: ${periodo}`, '', '', '', ''],
                          [],
                          ['Fecha', 'Artículo', 'Cantidad', 'Unidad', 'Depósito', 'Observaciones'],
                          ...rendicion.ingresos.map((m: any) => [
                            new Date(m.fecha).toLocaleDateString('es-AR'),
                            m.articulo, m.cantidad, m.categoria, m.deposito, m.obs,
                          ]),
                        ];
                        const wsIng = XLSX.utils.aoa_to_sheet(aoaIng);
                        wsIng['!cols'] = [{ wch: 14 }, { wch: 28 }, { wch: 10 }, { wch: 10 }, { wch: 20 }, { wch: 30 }];
                        wsIng['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];
                        XLSX.utils.book_append_sheet(wb, wsIng, 'Ingresos');
                      }

                      XLSX.writeFile(wb, `ANEXO_VI_${periodo.replace(/ /g, '_')}.xlsx`);
                    });
                  }}
                >
                  Descargar ANEXO VI (.xlsx)
                </Button>
              </Box>

              {/* Tabla preview */}
              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 450 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                      <TableCell><strong>Apellido</strong></TableCell>
                      <TableCell><strong>Nombre</strong></TableCell>
                      <TableCell><strong>DNI</strong></TableCell>
                      <TableCell align="center"><strong>Grupo</strong></TableCell>
                      <TableCell><strong>Dirección</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rendicion.filas.map((f: any, i: number) => (
                      <TableRow key={i} hover>
                        <TableCell>{f.apellido}</TableCell>
                        <TableCell>{f.nombre}</TableCell>
                        <TableCell>{f.dni || '—'}</TableCell>
                        <TableCell align="center">{f.grupo}</TableCell>
                        <TableCell>{f.direccion || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Ingresos */}
              {rendicion.ingresos?.length > 0 && (
                <Box mt={3}>
                  <Typography variant="subtitle1" fontWeight="bold" mb={1}>
                    Ingresos de mercadería del período ({rendicion.ingresos.length})
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                          <TableCell>Fecha</TableCell>
                          <TableCell>Artículo</TableCell>
                          <TableCell align="right">Cantidad</TableCell>
                          <TableCell>Unidad</TableCell>
                          <TableCell>Depósito</TableCell>
                          <TableCell>Observaciones</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rendicion.ingresos.map((m: any, i: number) => (
                          <TableRow key={i} hover>
                            <TableCell>{new Date(m.fecha).toLocaleDateString('es-AR')}</TableCell>
                            <TableCell>{m.articulo}</TableCell>
                            <TableCell align="right">{m.cantidad}</TableCell>
                            <TableCell>{m.categoria || '—'}</TableCell>
                            <TableCell>{m.deposito}</TableCell>
                            <TableCell>{m.obs || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </>
          )}
        </Paper>
      )}
    </Box>
  );
}
