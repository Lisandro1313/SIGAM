import { useEffect, useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, CircularProgress,
  Paper, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Chip, Divider, LinearProgress,
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  ScaleOutlined as KgIcon,
  CalendarMonth as CronogramaIcon,
  History as HistoryIcon,
  TodayOutlined as TodayIcon,
} from '@mui/icons-material';
import api from '../services/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const TIPS = [
  'Verificando que los fideos estén bien contados...',
  'Consultando el stock de yerba...',
  'Calculando los kilos del mes...',
  'Revisando el cronograma de entregas...',
  'Preguntándole a la base de datos...',
  'Ordenando los remitos por fecha...',
  'Contando los beneficiarios activos...',
  'Buscando los programas disponibles...',
  'Sincronizando con el depósito...',
  'Preparando el resumen operativo...',
  'Chequeando el aceite y el arroz...',
  'Cargando la información del mes...',
];

function LoadingDashboard() {
  const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * TIPS.length));

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex(i => (i + 1) % TIPS.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="60vh" gap={3}>
      <CircularProgress size={48} />
      <LinearProgress sx={{ width: 320, borderRadius: 4 }} />
      <Typography variant="body1" color="text.secondary" sx={{ fontStyle: 'italic', textAlign: 'center', maxWidth: 360 }}>
        {TIPS[tipIndex]}
      </Typography>
    </Box>
  );
}

const ESTADO_COLOR: Record<string, any> = {
  BORRADOR: 'default',
  CONFIRMADO: 'success',
  ENVIADO: 'info',
  ENTREGADO: 'success',
  PENDIENTE_STOCK: 'warning',
  PENDIENTE: 'warning',
  GENERADA: 'info',
  CANCELADA: 'error',
};

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    api.get('/reportes/dashboard')
      .then(r => setData(r.data))
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <LoadingDashboard />;
  }

  const hoy = format(new Date(), "EEEE d 'de' MMMM", { locale: es });

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3} sx={{ textTransform: 'capitalize' }}>
        {hoy}
      </Typography>

      {/* Resumen del mes */}
      <Grid container spacing={2} mb={4}>
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
                    {(data?.resumenMes?.kg ?? 0).toFixed(0)}
                  </Typography>
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

      <Grid container spacing={3}>
        {/* Remitos del día */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <TodayIcon color="primary" />
              <Typography variant="h6" fontWeight="bold">Remitos de hoy</Typography>
            </Box>
            <Divider sx={{ mb: 1 }} />
            {(!data?.remitosDelDia || data.remitosDelDia.length === 0) ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                No hay remitos generados hoy
              </Typography>
            ) : (
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
                    {data.remitosDelDia.map((r: any) => (
                      <TableRow key={r.id} hover>
                        <TableCell><strong>{r.numero}</strong></TableCell>
                        <TableCell sx={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
            )}
          </Paper>
        </Grid>

        {/* Cronograma próximos 7 días */}
        <Grid item xs={12} md={6}>
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
                      <TableCell>Programa</TableCell>
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
                        <TableCell>
                          <Typography variant="caption">{e.programa}</Typography>
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

        {/* Últimos remitos */}
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <HistoryIcon color="action" />
              <Typography variant="h6" fontWeight="bold">Remitos anteriores</Typography>
            </Box>
            <Divider sx={{ mb: 1 }} />
            {(!data?.remitosRecientes || data.remitosRecientes.length === 0) ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                No hay remitos anteriores
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
                    {data.remitosRecientes.map((r: any) => (
                      <TableRow key={r.id} hover>
                        <TableCell><strong>{r.numero}</strong></TableCell>
                        <TableCell>{format(new Date(r.fecha), 'dd/MM/yyyy', { locale: es })}</TableCell>
                        <TableCell>{r.beneficiario}</TableCell>
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
        </Grid>
      </Grid>
    </Box>
  );
}
