import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Grid,
  Chip,
  IconButton,
  Paper,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon } from '@mui/icons-material';
import api from '../services/api';
import ProgramaForm from '../components/ProgramaForm';
import SearchBar from '../components/SearchBar';

export default function ProgramasPage() {
  const [programas, setProgramas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedPrograma, setSelectedPrograma] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadProgramas();
  }, []);

  const loadProgramas = async () => {
    try {
      const response = await api.get('/programas');
      setProgramas(response.data);
    } catch (error) {
      console.error('Error cargando programas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (programa: any) => {
    setSelectedPrograma(programa);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setSelectedPrograma(null);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  const filteredProgramas = programas.filter((p) =>
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          Programas
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormOpen(true)}>
          Nuevo Programa
        </Button>
      </Box>

      <Box mb={3} maxWidth={400}>
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Buscar programas..."
        />
      </Box>

      <Grid container spacing={3}>
        {filteredProgramas.length === 0 ? (
          <Grid item xs={12}>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                No se encontraron programas
              </Typography>
            </Paper>
          </Grid>
        ) : (
          filteredProgramas.map((programa) => (
          <Grid item xs={12} md={6} key={programa.id}>
            <Card elevation={2}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box flex={1}>
                    <Typography variant="h6" gutterBottom>
                      {programa.nombre}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Tipo: {programa.tipo}
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={() => handleEdit(programa)}>
                    <EditIcon />
                  </IconButton>
                </Box>
                <Box mt={2} display="flex" gap={1} flexWrap="wrap">
                  {programa.usaCronograma && (
                    <Chip label="Usa Cronograma" size="small" color="primary" />
                  )}
                  {programa.usaPlantilla && (
                    <Chip label="Usa Plantilla" size="small" color="secondary" />
                  )}
                  {programa.descuentaStock && (
                    <Chip label="Descuenta Stock" size="small" color="info" />
                  )}
                  <Chip
                    label={programa.activo ? 'Activo' : 'Inactivo'}
                    size="small"
                    color={programa.activo ? 'success' : 'default'}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))
        )}
      </Grid>

      <ProgramaForm
        open={formOpen}
        onClose={handleCloseForm}
        onSuccess={() => {
          loadProgramas();
          handleCloseForm();
        }}
        programa={selectedPrograma}
      />
    </Box>
  );
}
