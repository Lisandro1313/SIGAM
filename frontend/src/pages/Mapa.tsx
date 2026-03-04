import { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Paper,
  Chip,
  Divider,
  ButtonBase,
  Tooltip,
  Grid,
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  Place as PlaceIcon,
  FilterAlt as FilterIcon,
} from '@mui/icons-material';
import api from '../services/api';
import BeneficiarioMap, { buildLocalidadColors, TIPO_COLORS, TIPO_LABELS } from '../components/BeneficiarioMap';

export default function MapaPage() {
  const [beneficiarios, setBeneficiarios] = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [selLocalidad, setSelLocalidad]   = useState<string | null>(null);

  useEffect(() => {
    api.get('/beneficiarios').then((r) => setBeneficiarios(r.data)).finally(() => setLoading(false));
  }, []);

  const localidadColors = useMemo(() => buildLocalidadColors(beneficiarios), [beneficiarios]);

  // Estadísticas agrupadas por localidad
  const stats = useMemo(() => {
    const map: Record<string, { color: string; total: number; tipos: Record<string, number> }> = {};
    beneficiarios.forEach((b) => {
      const loc = b.localidad || 'Sin localidad';
      if (!map[loc]) map[loc] = { color: localidadColors[loc] || '#607d8b', total: 0, tipos: {} };
      map[loc].total++;
      map[loc].tipos[b.tipo] = (map[loc].tipos[b.tipo] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [beneficiarios, localidadColors]);

  const totalPorTipo = useMemo(() => {
    const acc: Record<string, number> = {};
    beneficiarios.forEach((b) => {
      acc[b.tipo] = (acc[b.tipo] || 0) + 1;
    });
    return acc;
  }, [beneficiarios]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={6}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h4" fontWeight="bold">
          Mapa de Beneficiarios — La Plata
        </Typography>
        <Box display="flex" gap={1} flexWrap="wrap">
          {Object.entries(totalPorTipo).map(([tipo, cnt]) => (
            <Chip
              key={tipo}
              label={`${TIPO_LABELS[tipo] || tipo}: ${cnt}`}
              size="small"
              sx={{ bgcolor: TIPO_COLORS[tipo] || '#607d8b', color: 'white', fontWeight: 'bold' }}
            />
          ))}
        </Box>
      </Box>

      {/* Cuerpo: panel izquierdo + mapa */}
      <Box sx={{ flex: 1, display: 'flex', gap: 2, overflow: 'hidden' }}>

        {/* Panel lateral de localidades */}
        <Paper
          elevation={2}
          sx={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
          <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" fontWeight="bold" display="flex" alignItems="center" gap={0.5}>
              <PlaceIcon fontSize="small" />
              Por localidad
              {selLocalidad && (
                <Chip
                  label="Limpiar filtro"
                  size="small"
                  icon={<FilterIcon />}
                  onDelete={() => setSelLocalidad(null)}
                  sx={{ ml: 'auto', fontSize: 10 }}
                />
              )}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {beneficiarios.length} beneficiarios en {stats.length} localidades
            </Typography>
          </Box>

          <Box sx={{ overflowY: 'auto', flex: 1 }}>
            {stats.map(([loc, info]) => {
              const selected = selLocalidad === loc;
              return (
                <ButtonBase
                  key={loc}
                  onClick={() => setSelLocalidad(selected ? null : loc)}
                  sx={{
                    width: '100%',
                    textAlign: 'left',
                    p: 1.5,
                    display: 'block',
                    bgcolor: selected ? 'action.selected' : 'transparent',
                    borderLeft: selected ? `4px solid ${info.color}` : '4px solid transparent',
                    '&:hover': { bgcolor: 'action.hover' },
                    transition: 'all 0.15s',
                  }}
                >
                  {/* Nombre + total */}
                  <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                    <Box
                      sx={{
                        width: 11, height: 11, borderRadius: '50%',
                        bgcolor: info.color, flexShrink: 0,
                      }}
                    />
                    <Typography variant="body2" fontWeight={selected ? 'bold' : 'normal'} noWrap sx={{ flex: 1 }}>
                      {loc}
                    </Typography>
                    <Typography variant="body2" fontWeight="bold" color="text.secondary">
                      {info.total}
                    </Typography>
                  </Box>

                  {/* Barra de tipos */}
                  <Box display="flex" gap={0.5} flexWrap="wrap">
                    {Object.entries(info.tipos).map(([tipo, cnt]) => (
                      <Tooltip key={tipo} title={`${TIPO_LABELS[tipo] || tipo}: ${cnt}`} arrow>
                        <Box
                          sx={{
                            px: 0.8, py: 0.2, borderRadius: 1, fontSize: 10, fontWeight: 'bold',
                            bgcolor: TIPO_COLORS[tipo] || '#607d8b',
                            color: 'white', cursor: 'default',
                          }}
                        >
                          {cnt}
                        </Box>
                      </Tooltip>
                    ))}
                  </Box>
                </ButtonBase>
              );
            })}

            {stats.length === 0 && (
              <Box p={2} textAlign="center">
                <LocationIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  No hay beneficiarios cargados
                </Typography>
              </Box>
            )}
          </Box>

          {/* Leyenda de tipos */}
          <Divider />
          <Box sx={{ p: 1.5 }}>
            <Typography variant="caption" fontWeight="bold" display="block" mb={0.5}>
              Tipos
            </Typography>
            <Grid container spacing={0.5}>
              {Object.entries(TIPO_LABELS).map(([tipo, label]) => (
                <Grid item xs={6} key={tipo}>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: TIPO_COLORS[tipo], flexShrink: 0 }} />
                    <Typography variant="caption" noWrap>{label}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Paper>

        {/* Mapa */}
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <BeneficiarioMap
            beneficiarios={beneficiarios}
            localidadColors={localidadColors}
            localidadSeleccionada={selLocalidad}
          />
        </Box>
      </Box>
    </Box>
  );
}

