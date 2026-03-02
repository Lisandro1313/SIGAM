import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { Map as MapIcon, List as ListIcon } from '@mui/icons-material';
import api from '../services/api';
import BeneficiarioMap from '../components/BeneficiarioMap';

export default function MapaPage() {
  const [beneficiarios, setBeneficiarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'map' | 'list'>('map');

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
          Mapa de Beneficiarios
        </Typography>
        <ToggleButtonGroup
          value={view}
          exclusive
          onChange={(_, newView) => newView && setView(newView)}
          size="small"
        >
          <ToggleButton value="map">
            <MapIcon sx={{ mr: 1 }} />
            Mapa
          </ToggleButton>
          <ToggleButton value="list">
            <ListIcon sx={{ mr: 1 }} />
            Lista
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {view === 'map' ? (
        <BeneficiarioMap beneficiarios={beneficiarios} />
      ) : (
        <Typography variant="body2" color="text.secondary">
          Vista de lista (implementar según necesidad)
        </Typography>
      )}
    </Box>
  );
}
