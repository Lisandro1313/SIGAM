import { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
} from '@mui/material';
import {
  People as PeopleIcon,
  Receipt as ReceiptIcon,
  Inventory as InventoryIcon,
  Category as CategoryIcon,
} from '@mui/icons-material';
import api from '../services/api';

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
    {
      title: 'Stock Total',
      value: data?.stockTotal || 0,
      icon: <InventoryIcon sx={{ fontSize: 40 }} />,
      color: '#7b1fa2',
    },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        Dashboard
      </Typography>
      <Grid container spacing={3} mt={2}>
        {cards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
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

      <Box mt={3}>
        <Typography variant="h6" gutterBottom>
          Bienvenido a SIGAM
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Sistema Integral de Gestión Alimentaria Municipal - Secretaría de Desarrollo Social
        </Typography>
      </Box>
    </Box>
  );
}
