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
  Alert,
  Tooltip,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, VisibilityOutlined as ViewIcon, Warning as WarnIcon, PhotoCamera as FotoIcon } from '@mui/icons-material';
import { differenceInDays, isPast } from 'date-fns';
import api from '../services/api';
import ArticuloForm from '../components/ArticuloForm';
import SearchBar from '../components/SearchBar';
import ExportExcelButton from '../components/ExportExcelButton';
import { useAuthStore } from '../stores/authStore';

export default function ArticulosPage() {
  const { user } = useAuthStore();
  const soloLectura = !!(user?.depositoId);

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
      articulo.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      articulo.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      articulo.categoria?.toLowerCase().includes(searchTerm.toLowerCase())
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
          {!soloLectura && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormOpen(true)}>
              Nuevo Artículo
            </Button>
          )}
        </Box>
      </Box>

      {soloLectura && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Vista de solo lectura
        </Alert>
      )}

      <Box mb={3} maxWidth={400}>
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Buscar por nombre, descripción o categoría..."
        />
      </Box>

      <TableContainer component={Paper} elevation={2}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell>Categoría</TableCell>
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
                  <Typography variant="body2" color="text.secondary">No se encontraron artículos</Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredArticulos.map((articulo) => {
                const lotesVenciendo = (articulo.lotes || []).filter((l: any) => {
                  const dias = differenceInDays(new Date(l.fechaVencimiento), new Date());
                  return isPast(new Date(l.fechaVencimiento)) || dias <= 30;
                });
                const hayVencido = lotesVenciendo.some((l: any) => isPast(new Date(l.fechaVencimiento)));
                return (
                  <TableRow key={articulo.id} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {articulo.fotoUrl ? (
                          <Box component="img" src={articulo.fotoUrl} alt={articulo.nombre}
                            sx={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 0.5, border: '1px solid #eee', flexShrink: 0 }} />
                        ) : (
                          <Box sx={{ width: 36, height: 36, bgcolor: 'grey.100', borderRadius: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <FotoIcon sx={{ fontSize: 16, color: 'grey.400' }} />
                          </Box>
                        )}
                        <Box>
                          <strong>{articulo.nombre}</strong>
                          {lotesVenciendo.length > 0 && (
                            <Tooltip title={hayVencido ? 'Tiene lotes vencidos' : `${lotesVenciendo.length} lote(s) próximos a vencer`}>
                              <WarnIcon sx={{ ml: 0.5, fontSize: 14, color: hayVencido ? 'error.main' : 'warning.main', verticalAlign: 'middle' }} />
                            </Tooltip>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{articulo.descripcion || '-'}</TableCell>
                    <TableCell>{articulo.categoria || '-'}</TableCell>
                    <TableCell align="right">{articulo.pesoUnitarioKg?.toFixed(2) || '0.00'}</TableCell>
                    <TableCell align="right">{articulo.stockMinimo || 0}</TableCell>
                    <TableCell align="center">
                      <Chip label={articulo.activo ? 'Activo' : 'Inactivo'} size="small"
                        color={articulo.activo ? 'success' : 'default'} />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton size="small" onClick={() => handleEdit(articulo)} title={soloLectura ? 'Ver detalle' : 'Editar'}>
                        {soloLectura ? <ViewIcon fontSize="small" /> : <EditIcon fontSize="small" />}
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <ArticuloForm
        open={formOpen}
        onClose={handleCloseForm}
        onSuccess={() => {
          if (!soloLectura) loadArticulos();
          handleCloseForm();
        }}
        articulo={selectedArticulo}
        readOnly={soloLectura}
      />
    </Box>
  );
}
