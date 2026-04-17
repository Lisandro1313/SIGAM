import { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Paper, Tabs, Tab, Card, CardContent, CardActions,
  Button, Stack, Chip, TextField, InputAdornment, Table, TableBody,
  TableCell, TableHead, TableRow, TableContainer, IconButton, Tooltip,
  useTheme, Alert,
} from '@mui/material';
import {
  Description as DescIcon,
  Print as PrintIcon,
  Search as SearchIcon,
  AssignmentTurnedIn as ListIcon,
  Receipt as ReceiptIcon,
  Inventory2 as Inventory2Icon,
  ContactMail as ContactMailIcon,
  Restaurant as RestaurantIcon,
  CheckCircle as CheckIcon,
  Schedule as ScheduleIcon,
  CloudOff as CloudOffIcon,
} from '@mui/icons-material';
import api from '../services/api';

interface Modelo {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  icono: JSX.Element;
  color: string;
  generar: () => string;
}

const HOY = () => new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const HEADER_LP = `
  <div style="display:flex; align-items:center; justify-content:space-between; border-bottom:2px solid #1976d2; padding-bottom:8px; margin-bottom:16px;">
    <div>
      <div style="font-size:14px; font-weight:bold; color:#1976d2;">MUNICIPALIDAD DE LA PLATA</div>
      <div style="font-size:11px; color:#555;">Secretaría de Desarrollo Social — Política Alimentaria</div>
    </div>
    <div style="text-align:right; font-size:11px; color:#666;">Fecha: ${HOY()}</div>
  </div>
`;

const FOOTER = `
  <div style="margin-top:48px; border-top:1px dashed #aaa; padding-top:8px; font-size:10px; color:#888; text-align:center;">
    Generado por SIGAM — Sistema Integral de Gestión Alimentaria Municipal
  </div>
`;

function imprimir(html: string, titulo: string) {
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) {
    alert('No se pudo abrir la ventana de impresión. Habilitá los pop-ups.');
    return;
  }
  w.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8"/>
        <title>${titulo}</title>
        <style>
          @page { margin: 18mm 14mm; size: A4 portrait; }
          body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color:#222; }
          h1 { font-size: 18px; margin: 0 0 4px 0; }
          h2 { font-size: 14px; margin: 16px 0 6px 0; color:#1976d2; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; vertical-align: top; }
          th { background: #f0f4f8; font-size: 11px; }
          .firma-box { display:inline-block; width:48%; border-top:1px solid #333; padding-top:4px; text-align:center; margin-top:48px; }
          .obs { min-height:60px; border:1px solid #999; padding:6px; }
          .small { font-size: 10px; color:#666; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        ${html}
        ${FOOTER}
        <div class="no-print" style="margin-top:24px; text-align:center;">
          <button onclick="window.print()" style="padding:10px 20px; font-size:14px; background:#1976d2; color:white; border:none; border-radius:4px; cursor:pointer;">Imprimir</button>
        </div>
      </body>
    </html>
  `);
  w.document.close();
}

function modeloListaRetiro(beneficiarios: any[]): string {
  const filas = beneficiarios.length === 0
    ? `<tr><td colspan="6" style="text-align:center; padding:18px; color:#888;">— sin beneficiarios cargados —</td></tr>`
    : beneficiarios.slice(0, 50).map((b: any, i: number) => `
        <tr>
          <td>${i + 1}</td>
          <td>${b.nombre ?? ''}</td>
          <td>${b.localidad ?? ''}</td>
          <td>${b.responsableNombre ?? ''}</td>
          <td>${b.responsableDNI ?? ''}</td>
          <td style="height:32px;"></td>
        </tr>`).join('');
  return `
    ${HEADER_LP}
    <h1>Lista de retiro mensual</h1>
    <div class="small">Programa: _____________________ &nbsp;&nbsp; Mes: _____________________</div>
    <table>
      <thead>
        <tr>
          <th style="width:30px;">#</th>
          <th>Beneficiario / Espacio</th>
          <th>Localidad</th>
          <th>Responsable</th>
          <th>DNI</th>
          <th style="width:140px;">Firma</th>
        </tr>
      </thead>
      <tbody>${filas}</tbody>
    </table>
    <div class="small" style="margin-top:14px;">Total: ${beneficiarios.length} beneficiarios.</div>
    <div style="margin-top:32px;">
      <div class="firma-box">Responsable de entrega</div>
      &nbsp;&nbsp;&nbsp;
      <div class="firma-box">Responsable del depósito</div>
    </div>
  `;
}

function modeloActaEntrega(): string {
  return `
    ${HEADER_LP}
    <h1>Acta de entrega de mercadería</h1>
    <p>En la ciudad de La Plata, a los <b>____</b> días del mes de <b>______________</b> del año <b>______</b>,
    se realiza la entrega de mercadería al beneficiario detallado a continuación:</p>

    <h2>Datos del beneficiario / espacio</h2>
    <table>
      <tr><th style="width:30%;">Nombre</th><td></td></tr>
      <tr><th>Tipo</th><td>☐ Espacio &nbsp;&nbsp; ☐ Comedor &nbsp;&nbsp; ☐ Caso particular</td></tr>
      <tr><th>Dirección</th><td></td></tr>
      <tr><th>Responsable del retiro</th><td></td></tr>
      <tr><th>DNI</th><td></td></tr>
      <tr><th>Programa</th><td></td></tr>
    </table>

    <h2>Detalle de la entrega</h2>
    <table>
      <thead>
        <tr><th>Artículo</th><th style="width:80px;">Cantidad</th><th style="width:80px;">Peso (kg)</th></tr>
      </thead>
      <tbody>
        ${Array.from({ length: 8 }).map(() => '<tr><td></td><td></td><td></td></tr>').join('')}
      </tbody>
    </table>

    <h2>Observaciones</h2>
    <div class="obs"></div>

    <div style="margin-top:32px;">
      <div class="firma-box">Firma del responsable</div>
      &nbsp;&nbsp;&nbsp;
      <div class="firma-box">Firma de quien entrega</div>
    </div>
  `;
}

function modeloRelevamiento(): string {
  return `
    ${HEADER_LP}
    <h1>Planilla de relevamiento de espacio</h1>
    <div class="small">Para uso en territorio por nutricionistas / trabajadoras sociales</div>

    <h2>Datos generales</h2>
    <table>
      <tr><th style="width:30%;">Nombre del espacio</th><td></td></tr>
      <tr><th>Dirección</th><td></td></tr>
      <tr><th>Localidad / barrio</th><td></td></tr>
      <tr><th>Responsable</th><td></td></tr>
      <tr><th>Teléfono de contacto</th><td></td></tr>
      <tr><th>Fecha de visita</th><td></td></tr>
    </table>

    <h2>Población asistida</h2>
    <table>
      <tr>
        <th>Niños 0-5</th><th>Niños 6-12</th><th>Adolescentes</th><th>Adultos</th><th>Total</th>
      </tr>
      <tr><td></td><td></td><td></td><td></td><td></td></tr>
    </table>

    <h2>Modalidad e infraestructura</h2>
    <p>
      Modalidad: ☐ Retiran alimentos &nbsp;&nbsp; ☐ Comen en el lugar &nbsp;&nbsp; ☐ Mixto<br/>
      Tiene cocina: ☐ Sí ☐ No &nbsp;&nbsp; Agua potable: ☐ Sí ☐ No &nbsp;&nbsp; Heladera: ☐ Sí ☐ No
    </p>

    <h2>Estado general y necesidades</h2>
    <p>Estado general: ☐ Bueno ☐ Regular ☐ Malo</p>
    <div class="obs"></div>

    <h2>Asistencias especiales detectadas</h2>
    <p>☐ Celiaquía &nbsp;&nbsp; ☐ Diabetes &nbsp;&nbsp; ☐ Discapacidad &nbsp;&nbsp; ☐ Otro: _______________</p>

    <div style="margin-top:32px;">
      <div class="firma-box">Firma del relevador</div>
    </div>
  `;
}

function modeloCartaSolicitud(): string {
  return `
    ${HEADER_LP}
    <h1>Solicitud de asistencia alimentaria</h1>
    <p style="margin-top:24px;">La Plata, ____ de ______________ de _______.</p>
    <p style="margin-top:18px;">A la Secretaría de Desarrollo Social<br/>Dirección de Política Alimentaria<br/>S / D</p>

    <p style="margin-top:24px; line-height:1.7;">
      Por medio de la presente, quien suscribe <b>_____________________________________________</b>,
      DNI N° <b>____________________</b>, con domicilio en <b>__________________________________</b>,
      barrio/localidad <b>____________________</b>, teléfono <b>____________________</b>,
      solicita ser incorporado/a como beneficiario/a del programa de asistencia alimentaria municipal
      por los siguientes motivos:
    </p>
    <div class="obs" style="min-height:120px;"></div>

    <p style="margin-top:18px;">Composición del grupo familiar:</p>
    <table>
      <thead>
        <tr><th>Nombre</th><th>DNI</th><th>Edad</th><th>Vínculo</th></tr>
      </thead>
      <tbody>
        ${Array.from({ length: 6 }).map(() => '<tr><td></td><td></td><td></td><td></td></tr>').join('')}
      </tbody>
    </table>

    <p style="margin-top:24px;">Sin otro particular, saluda atentamente.</p>

    <div style="margin-top:48px;">
      <div class="firma-box">Firma del solicitante</div>
    </div>
  `;
}

function modeloVacioRendicion(): string {
  return `
    ${HEADER_LP}
    <h1>Rendición — Detalle de espacios</h1>
    <div class="small">Período: del ____/____/____ al ____/____/____</div>

    <table style="margin-top:18px;">
      <thead>
        <tr>
          <th style="width:30px;">#</th>
          <th>Espacio</th>
          <th>Localidad</th>
          <th>Kg entregados</th>
          <th>Fecha entrega</th>
          <th>Responsable</th>
          <th style="width:120px;">Firma</th>
        </tr>
      </thead>
      <tbody>
        ${Array.from({ length: 25 }).map((_, i) => `<tr><td>${i + 1}</td><td></td><td></td><td></td><td></td><td></td><td style="height:28px;"></td></tr>`).join('')}
      </tbody>
    </table>

    <h2 style="margin-top:24px;">Resumen</h2>
    <table>
      <tr><th>Total kg distribuidos</th><td></td></tr>
      <tr><th>Total beneficiarios atendidos</th><td></td></tr>
      <tr><th>Observaciones</th><td><div class="obs" style="border:none;"></div></td></tr>
    </table>

    <div style="margin-top:48px;">
      <div class="firma-box">Responsable de programa</div>
      &nbsp;&nbsp;&nbsp;
      <div class="firma-box">Director/a</div>
    </div>
  `;
}

interface EspacioTracking {
  id: number;
  nombre: string;
  localidad?: string;
  ultimaEntrega?: string;
  diasSinRetiro: number | null;
  estado: 'ok' | 'pendiente' | 'vencido';
}

export default function DocumentacionPage() {
  const theme = useTheme();
  const [tab, setTab] = useState(0);
  const [busqueda, setBusqueda] = useState('');
  const [beneficiarios, setBeneficiarios] = useState<any[]>([]);
  const [tracking, setTracking] = useState<EspacioTracking[]>([]);
  const [loadingTrack, setLoadingTrack] = useState(false);

  useEffect(() => {
    api.get('/beneficiarios').then((r) => setBeneficiarios(r.data ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (tab !== 1) return;
    setLoadingTrack(true);
    api
      .get('/beneficiarios')
      .then(async (r) => {
        const all = (r.data ?? []) as any[];
        const espacios = all.filter((b) => b.activo && (b.tipo === 'ESPACIO' || b.tipo === 'COMEDOR' || b.tipo === 'ORGANIZACION'));
        // Para cada espacio, tomamos la última entrega del payload (si la API la incluye en remitos)
        const data: EspacioTracking[] = espacios.map((b) => {
          const ultima = b.remitos?.[0]?.fecha ?? null;
          const dias = ultima ? Math.floor((Date.now() - new Date(ultima).getTime()) / 86400000) : null;
          let estado: EspacioTracking['estado'] = 'ok';
          if (!ultima) estado = 'pendiente';
          else if (dias != null && dias > 35) estado = 'vencido';
          return {
            id: b.id,
            nombre: b.nombre,
            localidad: b.localidad,
            ultimaEntrega: ultima ? new Date(ultima).toLocaleDateString('es-AR') : undefined,
            diasSinRetiro: dias,
            estado,
          };
        });
        setTracking(data.sort((a, b) => (b.diasSinRetiro ?? 999) - (a.diasSinRetiro ?? 999)));
      })
      .catch(() => {})
      .finally(() => setLoadingTrack(false));
  }, [tab]);

  const modelos: Modelo[] = useMemo(() => [
    {
      id: 'lista-retiro',
      titulo: 'Lista de retiro mensual',
      descripcion: 'Planilla con los beneficiarios cargados, lista para llevar a campo y firmar al momento del retiro.',
      categoria: 'Operativo',
      icono: <ListIcon />,
      color: '#1976d2',
      generar: () => modeloListaRetiro(beneficiarios),
    },
    {
      id: 'acta-entrega',
      titulo: 'Acta de entrega individual',
      descripcion: 'Comprobante imprimible de entrega para casos particulares o entregas puntuales fuera de cronograma.',
      categoria: 'Remitos',
      icono: <ReceiptIcon />,
      color: '#43a047',
      generar: modeloActaEntrega,
    },
    {
      id: 'relevamiento',
      titulo: 'Planilla de relevamiento de espacio',
      descripcion: 'Para visitas a espacios y comedores: población asistida, infraestructura, modalidad y necesidades detectadas.',
      categoria: 'Beneficiarios',
      icono: <RestaurantIcon />,
      color: '#fb8c00',
      generar: modeloRelevamiento,
    },
    {
      id: 'carta-solicitud',
      titulo: 'Carta de solicitud de asistencia',
      descripcion: 'Modelo para que el solicitante presente formalmente el pedido de incorporación al programa.',
      categoria: 'Beneficiarios',
      icono: <ContactMailIcon />,
      color: '#8e24aa',
      generar: modeloCartaSolicitud,
    },
    {
      id: 'rendicion',
      titulo: 'Hoja de rendición en blanco',
      descripcion: 'Planilla para completar a mano cuando se rinden entregas a campo (espacios, fechas, kg, firmas).',
      categoria: 'Remitos',
      icono: <Inventory2Icon />,
      color: '#00897b',
      generar: modeloVacioRendicion,
    },
  ], [beneficiarios]);

  const modelosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return modelos;
    const q = busqueda.toLowerCase();
    return modelos.filter((m) => m.titulo.toLowerCase().includes(q) || m.descripcion.toLowerCase().includes(q) || m.categoria.toLowerCase().includes(q));
  }, [modelos, busqueda]);

  return (
    <Box>
      <Paper
        elevation={0}
        sx={{
          p: 3, mb: 3,
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
          color: 'white',
          borderRadius: 2,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ position: 'absolute', right: -20, top: -20, opacity: 0.15 }}>
          <DescIcon sx={{ fontSize: 200 }} />
        </Box>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <DescIcon sx={{ fontSize: 32 }} />
          <Typography variant="h5" fontWeight="bold">Documentación</Typography>
        </Stack>
        <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.95, maxWidth: 720 }}>
          Modelos imprimibles listos para usar y seguimiento de entregas a espacios. Todo se genera localmente, sin servicios externos.
        </Typography>
      </Paper>

      <Paper sx={{ borderRadius: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tab label="Modelos imprimibles" icon={<PrintIcon />} iconPosition="start" />
          <Tab label="Tracking de espacios" icon={<CheckIcon />} iconPosition="start" />
        </Tabs>

        {tab === 0 && (
          <Box sx={{ p: 3 }}>
            <TextField
              fullWidth size="small" placeholder="Buscar modelo..." value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
              sx={{ mb: 3, maxWidth: 400 }}
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
              {modelosFiltrados.map((m) => (
                <Card key={m.id} sx={{ display: 'flex', flexDirection: 'column', borderTop: `4px solid ${m.color}`, transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 } }}>
                  <CardContent sx={{ flex: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                      <Box sx={{ width: 40, height: 40, borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: `${m.color}20`, color: m.color }}>
                        {m.icono}
                      </Box>
                      <Chip label={m.categoria} size="small" variant="outlined" />
                    </Stack>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>{m.titulo}</Typography>
                    <Typography variant="body2" color="text.secondary">{m.descripcion}</Typography>
                  </CardContent>
                  <CardActions>
                    <Button fullWidth variant="contained" startIcon={<PrintIcon />} onClick={() => imprimir(m.generar(), m.titulo)} sx={{ bgcolor: m.color, '&:hover': { bgcolor: m.color, opacity: 0.9 } }}>
                      Generar e imprimir
                    </Button>
                  </CardActions>
                </Card>
              ))}
              {modelosFiltrados.length === 0 && (
                <Box sx={{ gridColumn: '1 / -1', textAlign: 'center', py: 6 }}>
                  <CloudOffIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography color="text.secondary">No hay modelos que coincidan con la búsqueda.</Typography>
                </Box>
              )}
            </Box>
            <Alert severity="info" sx={{ mt: 3 }}>
              Los modelos abren en una ventana nueva con un botón "Imprimir". Funciona offline y no se envía nada a servicios externos.
            </Alert>
          </Box>
        )}

        {tab === 1 && (
          <Box sx={{ p: 3 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={1} sx={{ mb: 2 }}>
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">Seguimiento de entregas a espacios</Typography>
                <Typography variant="body2" color="text.secondary">
                  Quién recibió y quién está pendiente. Marcado en rojo si pasaron más de 35 días sin retiro.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Chip icon={<CheckIcon />} label={`OK: ${tracking.filter((t) => t.estado === 'ok').length}`} color="success" size="small" />
                <Chip icon={<ScheduleIcon />} label={`Pendiente: ${tracking.filter((t) => t.estado === 'pendiente').length}`} color="warning" size="small" />
                <Chip icon={<ScheduleIcon />} label={`Vencido: ${tracking.filter((t) => t.estado === 'vencido').length}`} color="error" size="small" />
              </Stack>
            </Stack>

            {loadingTrack ? (
              <Typography color="text.secondary">Cargando...</Typography>
            ) : tracking.length === 0 ? (
              <Alert severity="info">No hay espacios cargados todavía.</Alert>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Espacio</TableCell>
                      <TableCell>Localidad</TableCell>
                      <TableCell>Última entrega</TableCell>
                      <TableCell align="right">Días sin retirar</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell align="right">Acción</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tracking.slice(0, 100).map((t) => (
                      <TableRow key={t.id} hover>
                        <TableCell sx={{ fontWeight: 500 }}>{t.nombre}</TableCell>
                        <TableCell>{t.localidad ?? '—'}</TableCell>
                        <TableCell>{t.ultimaEntrega ?? '—'}</TableCell>
                        <TableCell align="right">{t.diasSinRetiro ?? '—'}</TableCell>
                        <TableCell>
                          {t.estado === 'ok' && <Chip label="OK" size="small" color="success" />}
                          {t.estado === 'pendiente' && <Chip label="Sin retiros" size="small" color="warning" />}
                          {t.estado === 'vencido' && <Chip label="Vencido" size="small" color="error" />}
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Imprimir acta para este espacio">
                            <IconButton size="small" onClick={() => imprimir(modeloActaEntrega(), `Acta - ${t.nombre}`)}>
                              <PrintIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}
      </Paper>
    </Box>
  );
}
