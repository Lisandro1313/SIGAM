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
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon } from '@mui/icons-material';
import api from '../services/api';
import ArticuloForm from '../components/ArticuloForm';
import SearchBar from '../components/SearchBar';
import ExportExcelButton from '../components/ExportExcelButton';

export default function ArticulosPage() {
  const [articulos, setArticulos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedArticulo, setSelectedArticulo] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadArticulos();
  }, []);

  const loadArticulos = async () => {
    try {
      const response = await api.get('/articulos');
      setArticulos(response.data);
    } catch (error) {
      console.error('Error cargando artículos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (articulo: any) => {
    setSelectedArticulo(articulo);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setSelectedArticulo(null);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  const filteredArticulos = articulos.filter(
    (articulo) =>
      articulo.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      articulo.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          Artículos
        </Typography>
        <Box display="flex" gap={2}>
          <ExportExcelButton
            data={articulos}
            fileName="articulos"
            sheetName="Artículos"
            label="Exportar"
          />
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormOpen(true)}>
            Nuevo Artículo
          </Button>
        </Box>
      </Box>

      <Box mb={3} maxWidth={400}>
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Buscar por código o descripción..."
        />
      </Box>

      <TableContainer component={Paper} elevation={2}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Código</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell>Unidad</TableCell>
              <TableCell align="right">Peso Unit. (kg)</TableCell>
              <TableCell align="right">Stock Mínimo</TableCell>
              <TableCell align="center">Estado</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredArticulos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No se encontraron artículos
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredArticulos.map((articulo) => (
              <TableRow key={articulo.id} hover>
                <TableCell>{articulo.codigo}</TableCell>
                <TableCell>{articulo.descripcion}</TableCell>
                <TableCell>{articulo.unidadMedida}</TableCell>
                <TableCell align="right">{articulo.pesoUnitarioKg.toFixed(2)}</TableCell>
                <TableCell align="right">{articulo.stockMinimo}</TableCell>
                <TableCell align="center">
                  <Chip
                    label={articulo.activo ? 'Activo' : 'Inactivo'}
                    size="small"
                    color={articulo.activo ? 'success' : 'default'}
                  />
                </TableCell>
                <TableCell align="center">
                  <IconButton size="small" onClick={() => handleEdit(articulo)}>
                    <EditIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <ArticuloForm
        open={formOpen}
        onClose={handleCloseForm}
        onSuccess={() => {
          loadArticulos();
          handleCloseForm();
        }}
        articulo={selectedArticulo}
      />
    </Box>
  );
}
