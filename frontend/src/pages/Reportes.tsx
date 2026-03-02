import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Paper,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../services/api';
import ExportExcelButton from '../components/ExportExcelButton';

export default function ReportesPage() {
  const [loading, setLoading] = useState(true);
  const [kilosPorMes, setKilosPorMes] = useState<any[]>([]);
  const [topArticulos, setTopArticulos] = useState<any[]>([]);
  const [entregasPorPrograma, setEntregasPorPrograma] = useState<any[]>([]);
  const [stockBajo, setStockBajo] = useState<any[]>([]);

  useEffect(() => {
    loadReportes();
  }, []);

  const loadReportes = async () => {
    try {
      const [kilosRes, topRes, programasRes, stockRes] = await Promise.all([
        api.get('/reportes/kilos-por-mes'),
        api.get('/reportes/articulos-mas-distribuidos'),
        api.get('/reportes/entregas-por-programa'),
        api.get('/reportes/stock-bajo'),
      ]);
      setKilosPorMes(kilosRes.data);
      setTopArticulos(topRes.data.slice(0, 10));
      setEntregasPorPrograma(programasRes.data);
      setStockBajo(stockRes.data);
    } catch (error) {
      console.error('Error cargando reportes:', error);
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

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4" fontWeight="bold">
          Reportes
        </Typography>
        <Box display="flex" gap={2}>
          <ExportExcelButton
            data={topArticulos}
            fileName="articulos-mas-distribuidos"
            sheetName="Top Artículos"
            label="Exportar Top Artículos"
          />
          <ExportExcelButton
            data={stockBajo}
            fileName="stock-bajo"
            sheetName="Stock Bajo"
            label="Exportar Stock Bajo"
          />
        </Box>
      </Box>

      {/* Kilos por Mes */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Kilos Distribuidos por Mes (Últimos 12 meses)
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={kilosPorMes}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="totalKg" fill="#1976d2" name="Total Kg" />
          </BarChart>
        </ResponsiveContainer>
      </Paper>

      <Grid container spacing={3}>
        {/* Entregas por Programa */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Entregas por Programa
            </Typography>
            {entregasPorPrograma.map((programa) => (
              <Card key={programa.programa} sx={{ mb: 2 }} variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {programa.programa}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Entregas: {programa.entregas} | Kilos: {programa.totalKg.toFixed(2)}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Paper>
        </Grid>

        {/* Top Artículos */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Artículos Más Distribuidos
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Artículo</TableCell>
                    <TableCell align="right">Cantidad</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {topArticulos.map((articulo, index) => (
                    <TableRow key={index}>
                      <TableCell>{articulo.articulo}</TableCell>
                      <TableCell align="right">
                        <strong>{articulo.totalDistribuido}</strong>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Stock Bajo */}
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom color="warning.main">
              Artículos con Stock Bajo
            </Typography>
            {stockBajo.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No hay artículos con stock bajo
              </Typography>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Código</TableCell>
                      <TableCell>Artículo</TableCell>
                      <TableCell>Depósito</TableCell>
                      <TableCell align="right">Stock Actual</TableCell>
                      <TableCell align="right">Stock Mínimo</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stockBajo.map((item, index) => (
                      <TableRow key={index} sx={{ bgcolor: 'warning.light' }}>
                        <TableCell>{item.articulo.codigo}</TableCell>
                        <TableCell>{item.articulo.descripcion}</TableCell>
                        <TableCell>{item.deposito}</TableCell>
                        <TableCell align="right">
                          <strong>{item.stockActual}</strong>
                        </TableCell>
                        <TableCell align="right">{item.stockMinimo}</TableCell>
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
