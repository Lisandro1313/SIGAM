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
  TablePagination,
} from '@mui/material';
import { Add as AddIcon, LocationOn as LocationIcon, Edit as EditIcon } from '@mui/icons-material';
import api from '../services/api';
import BeneficiarioForm from '../components/BeneficiarioForm';
import SearchBar from '../components/SearchBar';
import ExportExcelButton from '../components/ExportExcelButton';

export default function BeneficiariosPage() {
  const [beneficiarios, setBeneficiarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedBeneficiario, setSelectedBeneficiario] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    loadBeneficiarios();
  }, []);

  const loadBeneficiarios = async () => {
    try {
      const response = await api.get('/beneficiarios');
      setBeneficiarios(response.data);
    } catch (error) {
      console.error('Error cargando beneficiarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (beneficiario: any) => {
    setSelectedBeneficiario(beneficiario);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setSelectedBeneficiario(null);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  const filteredBeneficiarios = beneficiarios.filter(
    (b) =>
      b.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.localidad && b.localidad.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (b.direccion && b.direccion.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  const paginatedBeneficiarios = filteredBeneficiarios.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          Beneficiarios
        </Typography>
        <Box display="flex" gap={2}>
          <ExportExcelButton
            data={beneficiarios.map((b) => ({
              nombre: b.nombre,
              tipo: b.tipo,
              localidad: b.localidad,
              direccion: b.direccion,
              telefono: b.telefono,
              programa: b.programa?.nombre || '-',
              frecuencia: b.frecuenciaEntrega,
            }))}
            fileName="beneficiarios"
            sheetName="Beneficiarios"
            label="Exportar"
          />
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormOpen(true)}>
            Nuevo Beneficiario
          </Button>
        </Box>
      </Box>

      <Box mb={3} maxWidth={400}>
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Buscar por nombre, localidad o dirección..."
        />
      </Box>

      <TableContainer component={Paper} elevation={2}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Localidad</TableCell>
              <TableCell>Programa</TableCell>
              <TableCell>Frecuencia</TableCell>
              <TableCell align="center">Ubicación</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedBeneficiarios.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body2" color="text.secondary">
                    {filteredBeneficiarios.length === 0
                      ? 'No se encontraron beneficiarios'
                      : 'No hay beneficiarios en esta página'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedBeneficiarios.map((beneficiario) => (
              <TableRow key={beneficiario.id} hover>
                <TableCell>{beneficiario.nombre}</TableCell>
                <TableCell>
                  <Chip label={beneficiario.tipo} size="small" />
                </TableCell>
                <TableCell>{beneficiario.localidad}</TableCell>
                <TableCell>{beneficiario.programa?.nombre || '-'}</TableCell>
                <TableCell>
                  <Chip
                    label={beneficiario.frecuenciaEntrega}
                    size="small"
                    color={
                      beneficiario.frecuenciaEntrega === 'MENSUAL'
                        ? 'primary'
                        : beneficiario.frecuenciaEntrega === 'BIMESTRAL'
                        ? 'secondary'
                        : 'default'
                    }
                  />
                </TableCell>
                <TableCell align="center">
                  {beneficiario.latitud && beneficiario.longitud ? (
                    <LocationIcon color="success" />
                  ) : (
                    <LocationIcon color="disabled" />
                  )}
                </TableCell>
                <TableCell align="center">
                  <IconButton size="small" onClick={() => handleEdit(beneficiario)}>
                    <EditIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filteredBeneficiarios.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Filas por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
      </TableContainer>

      <BeneficiarioForm
        open={formOpen}
        onClose={handleCloseForm}
        onSuccess={() => {
          loadBeneficiarios();
          handleCloseForm();
        }}
        beneficiario={selectedBeneficiario}
      />
    </Box>
  );
}
