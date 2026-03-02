import { useEffect, useState } from 'react';
import {
  Box,
  Button,
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
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  PictureAsPdf as PdfIcon,
  Email as EmailIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../services/api';
import RemitoForm from '../components/RemitoForm';

export default function RemitosPage() {
  const [remitos, setRemitos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    loadRemitos();
  }, []);

  const loadRemitos = async () => {
    try {
      const response = await api.get('/remitos');
      setRemitos(response.data);
    } catch (error) {
      console.error('Error cargando remitos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmar = async (id: number) => {
    try {
      await api.patch(`/remitos/${id}/confirmar`);
      loadRemitos();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al confirmar remito');
    }
  };

  const handleDescargarPdf = async (id: number) => {
    try {
      const response = await api.get(`/remitos/${id}/pdf`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `remito-${id}.pdf`;
      link.click();
    } catch (error) {
      alert('Error al descargar PDF');
    }
  };

  const handleEnviarEmail = async (id: number) => {
    try {
      await api.post(`/remitos/${id}/enviar`);
      alert('Email enviado correctamente');
      loadRemitos();
    } catch (error) {
      alert('Error al enviar email');
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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          Remitos
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormOpen(true)}>
          Nuevo Remito
        </Button>
      </Box>

      <TableContainer component={Paper} elevation={2}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Número</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell>Beneficiario</TableCell>
              <TableCell>Depósito</TableCell>
              <TableCell align="right">Total Kg</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {remitos.map((remito) => (
              <TableRow key={remito.id} hover>
                <TableCell>
                  <strong>{remito.numeroRemito || 'BORRADOR'}</strong>
                </TableCell>
                <TableCell>
                  {format(new Date(remito.fecha), 'dd/MM/yyyy', { locale: es })}
                </TableCell>
                <TableCell>{remito.beneficiario?.nombre}</TableCell>
                <TableCell>{remito.deposito?.nombre}</TableCell>
                <TableCell align="right">
                  <strong>{remito.totalKg.toFixed(2)}</strong>
                </TableCell>
                <TableCell>
                  <Chip
                    label={remito.estado}
                    size="small"
                    color={
                      remito.estado === 'CONFIRMADO'
                        ? 'success'
                        : remito.estado === 'ENVIADO'
                        ? 'info'
                        : remito.estado === 'PENDIENTE_STOCK'
                        ? 'warning'
                        : 'default'
                    }
                  />
                </TableCell>
                <TableCell align="center">
                  {remito.estado === 'BORRADOR' && (
                    <Tooltip title="Confirmar">
                      <IconButton
                        size="small"
                        color="success"
                        onClick={() => handleConfirmar(remito.id)}
                      >
                        <CheckIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                  {(remito.estado === 'CONFIRMADO' || remito.estado === 'ENVIADO') && (
                    <>
                      <Tooltip title="Descargar PDF">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleDescargarPdf(remito.id)}
                        >
                          <PdfIcon />
                        </IconButton>
                      </Tooltip>
                      {remito.estado === 'CONFIRMADO' && (
                        <Tooltip title="Enviar por Email">
                          <IconButton
                            size="small"
                            color="secondary"
                            onClick={() => handleEnviarEmail(remito.id)}
                          >
                            <EmailIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <RemitoForm open={formOpen} onClose={() => setFormOpen(false)} onSuccess={loadRemitos} />
    </Box>
  );
}
