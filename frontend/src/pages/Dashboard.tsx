import { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import {
  People as PeopleIcon,
  Receipt as ReceiptIcon,
  Category as CategoryIcon,
} from '@mui/icons-material';
import api from '../services/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await api.get('/reportes/dashboard');
      setData(response.data);
    } catch (error) {
      console.error('Error cargando dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  const cards = [
    {
      title: 'Beneficiarios Activos',
      value: data?.beneficiariosActivos || 0,
      icon: <PeopleIcon sx={{ fontSize: 40 }} />,
      color: '#1976d2',
    },
    {
      title: 'Remitos del Mes',
      value: data?.remitosDelMes || 0,
      icon: <ReceiptIcon sx={{ fontSize: 40 }} />,
      color: '#388e3c',
    },
    {
      title: 'Programas Activos',
      value: data?.programasActivos || 0,
      icon: <CategoryIcon sx={{ fontSize: 40 }} />,
      color: '#f57c00',
    },
  ];

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'CONFIRMADO':
        return 'success';
      case 'ENVIADO':
        return 'info';
      case 'PENDIENTE':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        Dashboard
      </Typography>
      
      {/* Tarjetas de resumen */}
      <Grid container spacing={3} mt={1}>
        {cards.map((card, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card elevation={2}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      {card.title}
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {card.value}
                    </Typography>
                  </Box>
                  <Box sx={{ color: card.color }}>{card.icon}</Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Remitos del día */}
      <Box mt={4}>
        <Typography variant="h6" gutterBottom fontWeight="bold">
          Remitos del Día - {format(new Date(), "EEEE d/M", { locale: es })}
        </Typography>
        <TableContainer component={Paper} elevation={2}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nº Remito</TableCell>
                <TableCell>Beneficiario</TableCell>
                <TableCell>Programa</TableCell>
                <TableCell align="right">Peso (kg)</TableCell>
                <TableCell align="center">Estado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(!data?.remitosDelDia || data.remitosDelDia.length === 0) ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography variant="body2" color="text.secondary">
                      No hay remitos para hoy
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                data.remitosDelDia.map((remito: any) => (
                  <TableRow key={remito.id} hover>
                    <TableCell>{remito.numero}</TableCell>
                    <TableCell>{remito.beneficiario}</TableCell>
                    <TableCell>{remito.programa}</TableCell>
                    <TableCell align="right">{remito.totalKg.toFixed(2)}</TableCell>
                    <TableCell align="center">
                      <Chip 
                        label={remito.estado} 
                        size="small" 
                        color={getEstadoColor(remito.estado)}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Programas */}
      <Box mt={4}>
        <Typography variant="h6" gutterBottom fontWeight="bold">
          Programas Alimentarios
        </Typography>
        <Grid container spacing={2}>
          {(!data?.programas || data.programas.length === 0) ? (
            <Grid item xs={12}>
              <Paper elevation={1} sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No hay programas activos
                </Typography>
              </Paper>
            </Grid>
          ) : (
            data.programas.map((programa: any) => (
              <Grid item xs={12} sm={6} md={4} key={programa.id}>
                <Card elevation={2}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary" fontWeight="bold">
                      {programa.nombre}
                    </Typography>
                    <Box display="flex" justifyContent="space-between" mt={2}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Beneficiarios
                        </Typography>
                        <Typography variant="h5" fontWeight="bold">
                          {programa.beneficiarios}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Remitos
                        </Typography>
                        <Typography variant="h5" fontWeight="bold">
                          {programa.remitos}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      </Box>

      <Box mt={4}>
        <Typography variant="body2" color="text.secondary">
          SIGAM - Sistema Integral de Gestión Alimentaria Municipal<br />
          Secretaría de Desarrollo Social
        </Typography>
      </Box>
    </Box>
  );
}
