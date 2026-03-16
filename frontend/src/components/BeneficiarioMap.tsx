import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Tooltip, Polygon, useMapEvents } from 'react-leaflet';
import { divIcon, LatLng } from 'leaflet';
import { Box, Paper, Typography, Chip } from '@mui/material';

// Centroides aproximados de localidades del partido de La Plata
export const LOCALIDAD_CENTROIDES: Record<string, [number, number]> = {
  'La Plata':               [-34.9214, -57.9544],
  'Los Hornos':             [-34.9650, -57.9750],
  'San Carlos':             [-34.9350, -57.9780],
  'Romero':                 [-34.9847, -58.0231],
  'Olmos':                  [-35.0181, -58.0144],
  'Lisandro Olmos':         [-35.0181, -58.0144],
  'Villa Elvira':           [-34.9256, -57.8969],
  'Tolosa':                 [-34.9022, -57.9589],
  'Altos de San Lorenzo':   [-34.9444, -57.9494],
  'City Bell':              [-34.8683, -58.0644],
  'Gonnet':                 [-34.8775, -57.9994],
  'Manuel B. Gonnet':       [-34.8775, -57.9994],
  'Villa Elisa':            [-34.8514, -58.0719],
  'Ringuelet':              [-34.8986, -57.9769],
  'Ensenada':               [-34.8631, -57.9144],
  'Berisso':                [-34.8703, -57.8883],
  'El Peligro':             [-35.0831, -58.0294],
  'Arturo Seguí':           [-34.8381, -58.0044],
  'Arana':                  [-34.9956, -57.8894],
  'Abasto':                 [-35.0031, -57.9644],
  'Villa Garibaldi':        [-34.9456, -57.8769],
  'Melchor Romero':         [-34.9647, -58.0131],
};

export const TIPO_LABELS: Record<string, string> = {
  ESPACIO:          'Espacio',
  ORGANIZACION:     'Organización',
  CASO_PARTICULAR:  'Caso Particular',
  COMEDOR:          'Comedor',
  MERENDERO:        'Merendero',
};

export const TIPO_COLORS: Record<string, string> = {
  ESPACIO:          '#3498db',
  ORGANIZACION:     '#2ecc71',
  CASO_PARTICULAR:  '#f39c12',
  COMEDOR:          '#e74c3c',
  MERENDERO:        '#9b59b6',
};

const LOCALIDAD_PALETTE = [
  '#e53935', '#1e88e5', '#43a047', '#fb8c00', '#8e24aa',
  '#00acc1', '#e91e63', '#00897b', '#f4511e', '#3949ab',
  '#7cb342', '#c0ca33', '#039be5', '#d81b60', '#6d4c41',
  '#546e7a', '#fdd835', '#00e676', '#ff6d00', '#aa00ff',
];

export interface ZonaData {
  id?: number;
  nombre: string;
  color: string;
  geojson: string; // JSON: [{lat,lng},...]
}

interface BeneficiarioMapProps {
  beneficiarios: any[];
  localidadColors: Record<string, string>;
  center?: [number, number];
  zoom?: number;
  localidadSeleccionada?: string | null;
  // Zonas
  zonas?: ZonaData[];
  drawingPoints?: [number, number][];
  drawingMode?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  onZonaClick?: (zona: ZonaData) => void;
}

function coloredMarkerIcon(color: string) {
  return divIcon({
    html: `<div style="
      background:${color};
      width:14px;height:14px;
      border-radius:50%;
      border:2.5px solid white;
      box-shadow:0 1px 4px rgba(0,0,0,0.5);
    "></div>`,
    className: '',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -12],
  });
}

// Lookup insensible a mayúsculas/minúsculas y acentos
export function getCentroide(loc: string): [number, number] | undefined {
  if (!loc || loc === 'Sin localidad') return [-34.9214, -57.9544];
  const normalizado = loc.trim().toLowerCase();
  const entrada = Object.entries(LOCALIDAD_CENTROIDES).find(
    ([k]) => k.toLowerCase() === normalizado
  );
  return entrada?.[1] ?? [-34.9214, -57.9544];
}

export function buildLocalidadColors(beneficiarios: any[]): Record<string, string> {
  const localidades = [...new Set(beneficiarios.map((b) => b.localidad).filter(Boolean))].sort();
  const colors: Record<string, string> = {};
  localidades.forEach((loc, i) => {
    colors[loc] = LOCALIDAD_PALETTE[i % LOCALIDAD_PALETTE.length];
  });
  return colors;
}

// Ray-casting point-in-polygon
export function pointInPolygon(lat: number, lng: number, polygon: [number, number][]): boolean {
  const n = polygon.length;
  if (n < 3) return false;
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [yi, xi] = polygon[i];
    const [yj, xj] = polygon[j];
    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export function countBenInZona(beneficiarios: any[], geojson: string): number {
  try {
    const pts: { lat: number; lng: number }[] = JSON.parse(geojson);
    const poly: [number, number][] = pts.map(p => [p.lat, p.lng]);
    return beneficiarios.filter(b => {
      // Si tiene coordenadas exactas
      if (b.lat && b.lng) return pointInPolygon(b.lat, b.lng, poly);
      // Si no, usar centroide de la localidad
      const c = getCentroide(b.localidad);
      if (c) return pointInPolygon(c[0], c[1], poly);
      return false;
    }).length;
  } catch {
    return 0;
  }
}

// Componente interno para capturar clicks en el mapa
function MapClickHandler({ onMapClick }: { onMapClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e: { latlng: LatLng }) {
      if (onMapClick) onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function BeneficiarioMap({
  beneficiarios,
  localidadColors,
  center = [-34.9214, -57.9544],
  zoom = 12,
  localidadSeleccionada,
  zonas = [],
  drawingPoints = [],
  drawingMode = false,
  onMapClick,
  onZonaClick,
}: BeneficiarioMapProps) {
  const conUbicacion = beneficiarios.filter((b) => b.latitud && b.longitud);
  const sinUbicacion  = beneficiarios.filter((b) => !b.latitud || !b.longitud);

  const resumenLocalidad: Record<string, { count: number; tipos: Record<string, number> }> = {};
  sinUbicacion.forEach((b) => {
    const loc = b.localidad || 'Sin localidad';
    if (!resumenLocalidad[loc]) resumenLocalidad[loc] = { count: 0, tipos: {} };
    resumenLocalidad[loc].count++;
    resumenLocalidad[loc].tipos[b.tipo] = (resumenLocalidad[loc].tipos[b.tipo] || 0) + 1;
  });

  const marcadores = localidadSeleccionada
    ? conUbicacion.filter((b) => b.localidad === localidadSeleccionada)
    : conUbicacion;

  return (
    <Paper elevation={2} sx={{ height: '100%', overflow: 'hidden', position: 'relative' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%', cursor: drawingMode ? 'crosshair' : 'grab' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickHandler onMapClick={onMapClick} />

        {/* Zonas guardadas */}
        {zonas.map((zona, i) => {
          let pts: [number, number][] = [];
          try { pts = JSON.parse(zona.geojson).map((p: any) => [p.lat, p.lng]); } catch { return null; }
          if (pts.length < 3) return null;
          const count = countBenInZona(beneficiarios, zona.geojson);
          const centroLat = pts.reduce((s, p) => s + p[0], 0) / pts.length;
          const centroLng = pts.reduce((s, p) => s + p[1], 0) / pts.length;
          return (
            <Polygon
              key={zona.id ?? i}
              positions={pts}
              pathOptions={{
                color: zona.color,
                fillColor: zona.color,
                fillOpacity: 0.18,
                weight: 2,
              }}
              eventHandlers={{ click: () => onZonaClick?.(zona) }}
            >
              <Tooltip permanent direction="center" opacity={0.9}>
                <Box textAlign="center">
                  <Typography variant="caption" fontWeight="bold" display="block">{zona.nombre}</Typography>
                  <Typography variant="caption">{count} benef.</Typography>
                </Box>
              </Tooltip>
            </Polygon>
          );
          // centroLat and centroLng calculated but not used - Tooltip is inside Polygon
          void centroLat; void centroLng;
        })}

        {/* Polígono en construcción */}
        {drawingPoints.length >= 2 && (
          <Polygon
            positions={drawingPoints}
            pathOptions={{ color: '#ff6d00', fillColor: '#ff6d00', fillOpacity: 0.15, dashArray: '6,4', weight: 2 }}
          />
        )}
        {/* Puntos del polígono en construcción */}
        {drawingPoints.map((pt, i) => (
          <CircleMarker
            key={i}
            center={pt}
            radius={5}
            pathOptions={{ color: '#ff6d00', fillColor: '#ff6d00', fillOpacity: 1, weight: 2 }}
          />
        ))}

        {/* Marcadores individuales con GPS exacto */}
        {marcadores.map((b) => {
          const color = localidadColors[b.localidad] || '#607d8b';
          return (
            <Marker
              key={b.id}
              position={[b.latitud, b.longitud]}
              icon={coloredMarkerIcon(color)}
            >
              <Popup>
                <Box sx={{ minWidth: 200 }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    {b.nombre}
                  </Typography>
                  {b.direccion && (
                    <Typography variant="body2" color="text.secondary">
                      {b.direccion}
                    </Typography>
                  )}
                  {b.localidad && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {b.localidad}
                    </Typography>
                  )}
                  <Box mt={1} display="flex" gap={1} flexWrap="wrap">
                    <Chip
                      label={TIPO_LABELS[b.tipo] || b.tipo}
                      size="small"
                      sx={{ bgcolor: TIPO_COLORS[b.tipo] || '#607d8b', color: 'white' }}
                    />
                    {b.programa && (
                      <Chip label={b.programa.nombre} size="small" color="secondary" />
                    )}
                  </Box>
                  {b.responsableNombre && (
                    <Typography variant="caption" display="block" mt={1}>
                      Resp: {b.responsableNombre}
                    </Typography>
                  )}
                  {b.telefono && (
                    <Typography variant="caption" display="block">
                      Tel: {b.telefono}
                    </Typography>
                  )}
                </Box>
              </Popup>
            </Marker>
          );
        })}

        {/* Círculos de resumen para localidades sin coordenadas individuales */}
        {Object.entries(resumenLocalidad).map(([loc, info]) => {
          const centroide = getCentroide(loc);
          const color = localidadColors[loc] || '#607d8b';
          if (!centroide) return null;
          if (localidadSeleccionada && localidadSeleccionada !== loc) return null;
          const radius = Math.max(20, Math.min(50, 12 + info.count * 3));
          return (
            <CircleMarker
              key={`res-${loc}`}
              center={centroide}
              radius={radius}
              pathOptions={{ fillColor: color, fillOpacity: 0.75, color: 'white', weight: 2 }}
            >
              <Tooltip permanent direction="center" opacity={1}>
                <span style={{ fontWeight: 'bold', fontSize: 13 }}>{info.count}</span>
              </Tooltip>
              <Popup>
                <Box sx={{ minWidth: 170 }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    {loc}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                    {info.count} beneficiario{info.count !== 1 ? 's' : ''}
                  </Typography>
                  {Object.entries(info.tipos).map(([tipo, cnt]) => (
                    <Box key={tipo} display="flex" alignItems="center" gap={1} mb={0.5}>
                      <Box
                        sx={{
                          width: 10, height: 10, borderRadius: '50%',
                          bgcolor: TIPO_COLORS[tipo] || '#607d8b', flexShrink: 0,
                        }}
                      />
                      <Typography variant="caption">
                        {TIPO_LABELS[tipo] || tipo}: <strong>{cnt as number}</strong>
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Leyenda de localidades sobre el mapa */}
      {Object.keys(localidadColors).length > 0 && (
        <Paper
          elevation={4}
          sx={{
            position: 'absolute', bottom: 30, right: 10, zIndex: 1000,
            p: 1.5, maxHeight: 220, overflowY: 'auto', minWidth: 175,
            bgcolor: 'rgba(255,255,255,0.95)',
          }}
        >
          <Typography variant="caption" fontWeight="bold" display="block" mb={0.5}>
            Localidades
          </Typography>
          {Object.entries(localidadColors).map(([loc, color]) => (
            <Box key={loc} display="flex" alignItems="center" gap={1} mb={0.4}>
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
              <Typography variant="caption">{loc}</Typography>
            </Box>
          ))}
        </Paper>
      )}

      {/* Instrucción cuando está dibujando */}
      {drawingMode && (
        <Paper
          elevation={4}
          sx={{
            position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
            zIndex: 1000, px: 2, py: 1, bgcolor: 'rgba(255,109,0,0.92)',
          }}
        >
          <Typography variant="caption" color="white" fontWeight="bold">
            Hacé clic para agregar puntos al polígono · {drawingPoints.length} punto{drawingPoints.length !== 1 ? 's' : ''}
          </Typography>
        </Paper>
      )}
    </Paper>
  );
}
