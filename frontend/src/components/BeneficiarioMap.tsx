import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import { Box, Paper, Typography, Chip } from '@mui/material';
import { LocationOn as LocationIcon } from '@mui/icons-material';

// Fix para iconos de Leaflet en Vite/React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = new Icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface BeneficiarioMapProps {
  beneficiarios: any[];
  center?: [number, number];
  zoom?: number;
}

export default function BeneficiarioMap({
  beneficiarios,
  center = [-34.9214, -57.9544], // La Plata, Buenos Aires
  zoom = 13,
}: BeneficiarioMapProps) {
  const beneficiariosConUbicacion = beneficiarios.filter(
    (b) => b.latitud && b.longitud
  );

  if (beneficiariosConUbicacion.length === 0) {
    return (
      <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
        <LocationIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          No hay beneficiarios con ubicación geográfica
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={1}>
          Agregá coordenadas GPS al crear o editar beneficiarios
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={2} sx={{ height: 600, overflow: 'hidden' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {beneficiariosConUbicacion.map((beneficiario) => (
          <Marker
            key={beneficiario.id}
            position={[beneficiario.latitud, beneficiario.longitud]}
            icon={DefaultIcon}
          >
            <Popup>
              <Box sx={{ minWidth: 200 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  {beneficiario.nombre}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {beneficiario.direccion}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {beneficiario.localidad}
                </Typography>
                <Box mt={1} display="flex" gap={1} flexWrap="wrap">
                  <Chip label={beneficiario.tipo} size="small" color="primary" />
                  {beneficiario.programa && (
                    <Chip
                      label={beneficiario.programa.nombre}
                      size="small"
                      color="secondary"
                    />
                  )}
                </Box>
                {beneficiario.responsableNombre && (
                  <Typography variant="caption" display="block" mt={1}>
                    Responsable: {beneficiario.responsableNombre}
                  </Typography>
                )}
                {beneficiario.telefono && (
                  <Typography variant="caption" display="block">
                    Tel: {beneficiario.telefono}
                  </Typography>
                )}
              </Box>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </Paper>
  );
}
