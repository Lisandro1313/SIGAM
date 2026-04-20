import { useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Tabs, Tab, Button, Stack, Chip, IconButton, Tooltip,
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Checkbox, LinearProgress, Alert, Paper, InputAdornment, MenuItem,
  Snackbar, Divider, LinearProgress as ProgressBar, useMediaQuery, useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as DuplicarIcon,
  Search as SearchIcon,
  Print as PrintIcon,
  GroupAdd as GroupAddIcon,
  Notes as NotesIcon,
  Inbox as InboxIcon,
  Check as CheckIcon,
  FileDownload as DownloadIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import api from '../services/api';

interface ColumnaDef { clave: string; etiqueta: string; color?: string; }

interface ListaLite {
  id: number;
  nombre: string;
  descripcion?: string;
  color: string;
  icono: string;
  columnas: ColumnaDef[];
  totalItems: number;
  orden: number;
  creadoPorNombre?: string;
}

interface BeneficiarioMin {
  id: number; nombre: string; tipo?: string; localidad?: string; direccion?: string;
  responsableNombre?: string; responsableDNI?: string; telefono?: string; activo?: boolean;
}

interface ItemDetalle {
  id: number;
  beneficiarioId: number;
  beneficiario: BeneficiarioMin | null;
  valores: Record<string, { v: boolean; fecha?: string; usuario?: string }>;
  notas?: string;
  actualizadoEn?: string;
  actualizadoPor?: string;
}

interface ListaDetalle extends ListaLite {
  items: ItemDetalle[];
}

interface Plantilla { id: number; titulo: string; contenido: string; color?: string; [key: string]: any; }

interface Props {
  plantillas: Plantilla[];
  puedeEditar: boolean;
  userNombre?: string;
  onImprimir: (plantilla: Plantilla, titulo: string, espacios: BeneficiarioMin[]) => void;
}

const COLORES = ['#1976d2', '#43a047', '#fb8c00', '#8e24aa', '#00897b', '#e53935', '#5e35b1', '#546e7a'];

export default function ListasSeguimientoTab({ plantillas, puedeEditar, userNombre, onImprimir }: Props) {
  const theme = useTheme();
  const esMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [listas, setListas] = useState<ListaLite[]>([]);
  const [loadingListas, setLoadingListas] = useState(false);
  const [activa, setActiva] = useState<number | null>(null);
  const [detalle, setDetalle] = useState<ListaDetalle | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [snack, setSnack] = useState<string | null>(null);

  // selección dentro de la lista activa
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set());

  // filtro de items ("todos" | "pend:<clave>" | "ok:<clave>")
  const [filtro, setFiltro] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState('');

  // diálogos
  const [listaDialogOpen, setListaDialogOpen] = useState(false);
  const [editandoLista, setEditandoLista] = useState<ListaLite | null>(null);
  const [addBeneOpen, setAddBeneOpen] = useState(false);
  const [rendirOpen, setRendirOpen] = useState(false);
  const [notasItem, setNotasItem] = useState<ItemDetalle | null>(null);
  const [duplicarOpen, setDuplicarOpen] = useState(false);
  const [duplicarNombre, setDuplicarNombre] = useState('');
  const [duplicarConItems, setDuplicarConItems] = useState(true);
  const [duplicando, setDuplicando] = useState(false);

  const cargarListas = async () => {
    setLoadingListas(true);
    try {
      const { data } = await api.get('/listas-seguimiento');
      setListas(data ?? []);
      if (data?.length && activa == null) setActiva(data[0].id);
      if (activa != null && !data.find((l: ListaLite) => l.id === activa)) {
        setActiva(data[0]?.id ?? null);
      }
    } catch (e: any) {
      setSnack(e?.response?.data?.message ?? 'Error cargando listas');
    } finally { setLoadingListas(false); }
  };

  const cargarDetalle = async (id: number) => {
    setLoadingDetalle(true);
    try {
      const { data } = await api.get(`/listas-seguimiento/${id}`);
      setDetalle(data);
      setSeleccionados(new Set());
    } catch (e: any) {
      setSnack(e?.response?.data?.message ?? 'Error cargando detalle');
    } finally { setLoadingDetalle(false); }
  };

  useEffect(() => { cargarListas(); }, []);
  useEffect(() => {
    if (activa != null) { cargarDetalle(activa); setFiltro('todos'); setBusqueda(''); }
    else setDetalle(null);
  }, [activa]);

  const allItems = detalle?.items ?? [];
  const columnas = detalle?.columnas ?? [];

  // items filtrados por búsqueda + estado de columna
  const items = useMemo(() => {
    let arr = allItems;
    if (filtro.startsWith('pend:')) {
      const k = filtro.slice(5);
      arr = arr.filter((it) => !it.valores?.[k]?.v);
    } else if (filtro.startsWith('ok:')) {
      const k = filtro.slice(3);
      arr = arr.filter((it) => !!it.valores?.[k]?.v);
    }
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      arr = arr.filter((it) => {
        const b = it.beneficiario;
        return (
          (b?.nombre ?? '').toLowerCase().includes(q) ||
          (b?.tipo ?? '').toLowerCase().includes(q) ||
          (b?.localidad ?? '').toLowerCase().includes(q) ||
          (b?.responsableNombre ?? '').toLowerCase().includes(q) ||
          (b?.responsableDNI ?? '').toLowerCase().includes(q) ||
          (it.notas ?? '').toLowerCase().includes(q)
        );
      });
    }
    return arr;
  }, [allItems, filtro, busqueda]);

  // progreso por columna (sobre todos los items, no los filtrados)
  const progresoColumnas = useMemo(() => {
    if (!detalle || allItems.length === 0) return [];
    return columnas.map((c) => {
      const total = allItems.length;
      const completos = allItems.filter((it) => !!it.valores?.[c.clave]?.v).length;
      return { ...c, completos, total, pct: total > 0 ? (completos / total) * 100 : 0 };
    });
  }, [detalle, allItems, columnas]);

  const toggleCheck = async (item: ItemDetalle, claveCol: string) => {
    const actualVal = item.valores?.[claveCol]?.v ?? false;
    const nuevo = {
      ...item.valores,
      [claveCol]: { v: !actualVal, fecha: new Date().toISOString(), usuario: userNombre },
    };
    // optimistic
    setDetalle((d) => d ? {
      ...d,
      items: d.items.map((it) => it.id === item.id ? { ...it, valores: nuevo, actualizadoEn: new Date().toISOString(), actualizadoPor: userNombre } : it),
    } : d);
    try {
      await api.patch(`/listas-seguimiento/${detalle!.id}/items/${item.id}`, { valores: nuevo });
    } catch (e: any) {
      setSnack(e?.response?.data?.message ?? 'No se pudo guardar');
      if (activa != null) cargarDetalle(activa);
    }
  };

  const guardarNotas = async (texto: string) => {
    if (!notasItem) return;
    try {
      await api.patch(`/listas-seguimiento/${detalle!.id}/items/${notasItem.id}`, { notas: texto });
      setDetalle((d) => d ? {
        ...d,
        items: d.items.map((it) => it.id === notasItem.id ? { ...it, notas: texto } : it),
      } : d);
      setNotasItem(null);
    } catch (e: any) {
      setSnack(e?.response?.data?.message ?? 'No se pudieron guardar las notas');
    }
  };

  const quitarItem = async (itemId: number) => {
    if (!detalle) return;
    if (!confirm('¿Quitar este espacio de la lista?')) return;
    try {
      await api.delete(`/listas-seguimiento/${detalle.id}/items/${itemId}`);
      setDetalle((d) => d ? { ...d, items: d.items.filter((it) => it.id !== itemId) } : d);
      cargarListas();
    } catch (e: any) { setSnack(e?.response?.data?.message ?? 'Error'); }
  };

  const quitarSeleccionados = async () => {
    if (!detalle || seleccionados.size === 0) return;
    if (!confirm(`¿Quitar ${seleccionados.size} espacio(s) de la lista?`)) return;
    try {
      await api.post(`/listas-seguimiento/${detalle.id}/items/bulk-delete`, { itemIds: Array.from(seleccionados) });
      setDetalle((d) => d ? { ...d, items: d.items.filter((it) => !seleccionados.has(it.id)) } : d);
      setSeleccionados(new Set());
      cargarListas();
    } catch (e: any) { setSnack(e?.response?.data?.message ?? 'Error'); }
  };

  const toggleSel = (itemId: number) => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId); else next.add(itemId);
      return next;
    });
  };

  const toggleTodos = () => {
    const todosCheck = items.every((it) => seleccionados.has(it.id));
    setSeleccionados(todosCheck ? new Set() : new Set(items.map((it) => it.id)));
  };

  const abrirCrearLista = () => { setEditandoLista(null); setListaDialogOpen(true); };
  const abrirEditarLista = () => { if (detalle) { setEditandoLista(detalle); setListaDialogOpen(true); } };

  const eliminarLista = async () => {
    if (!detalle) return;
    if (!confirm(`¿Eliminar la lista "${detalle.nombre}"? Se pierden todos sus items (pero los beneficiarios siguen existiendo).`)) return;
    try {
      await api.delete(`/listas-seguimiento/${detalle.id}`);
      setActiva(null);
      setDetalle(null);
      cargarListas();
    } catch (e: any) { setSnack(e?.response?.data?.message ?? 'Error'); }
  };

  const abrirDuplicar = () => {
    if (!detalle) return;
    setDuplicarNombre(`${detalle.nombre} (copia)`);
    setDuplicarConItems(true);
    setDuplicarOpen(true);
  };

  const confirmarDuplicar = async () => {
    if (!detalle) return;
    if (!duplicarNombre.trim()) { setSnack('Ingresá un nombre'); return; }
    setDuplicando(true);
    try {
      const resp = await api.post(`/listas-seguimiento/${detalle.id}/duplicar`, {
        nombre: duplicarNombre.trim(),
        copiarItems: duplicarConItems,
      });
      setDuplicarOpen(false);
      await cargarListas();
      if (resp.data?.id) setActiva(resp.data.id);
      setSnack(`Lista duplicada${duplicarConItems ? ' con sus items' : ' (sin items)'}`);
    } catch (e: any) {
      setSnack(e?.response?.data?.message ?? 'Error duplicando lista');
    } finally {
      setDuplicando(false);
    }
  };

  const espaciosSeleccionados: BeneficiarioMin[] = useMemo(
    () => items.filter((it) => seleccionados.has(it.id) && it.beneficiario).map((it) => it.beneficiario!),
    [items, seleccionados],
  );

  const exportarExcel = () => {
    if (!detalle) return;
    const rows = allItems.map((it) => {
      const fila: Record<string, any> = {
        Espacio: it.beneficiario?.nombre ?? `#${it.beneficiarioId}`,
        Tipo: it.beneficiario?.tipo ?? '',
        Localidad: it.beneficiario?.localidad ?? '',
        Dirección: it.beneficiario?.direccion ?? '',
        Responsable: it.beneficiario?.responsableNombre ?? '',
        DNI: it.beneficiario?.responsableDNI ?? '',
        Teléfono: it.beneficiario?.telefono ?? '',
      };
      columnas.forEach((c) => {
        const val = it.valores?.[c.clave];
        fila[c.etiqueta] = val?.v ? 'Sí' : 'No';
        if (val?.v && val.fecha) {
          fila[`${c.etiqueta} — fecha`] = new Date(val.fecha).toLocaleDateString('es-AR');
        }
      });
      fila.Notas = it.notas ?? '';
      return fila;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    const safe = detalle.nombre.replace(/[^\w\s-]/g, '').slice(0, 30) || 'Lista';
    XLSX.utils.book_append_sheet(wb, ws, safe);
    const fname = `lista-${detalle.nombre.replace(/[^a-zA-Z0-9]/g, '_')}-${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fname);
  };

  return (
    <Box>
      {/* ── Header + tabs de listas ─────────────────────────────── */}
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={1.5} sx={{ mb: 2 }}>
        <Box>
          <Typography variant="subtitle1" fontWeight="bold">Listas de seguimiento</Typography>
          <Typography variant="body2" color="text.secondary">
            Agrupá espacios por programa, asistencia o tarea (FAP, Orgas, VITAP, A relevar...). Marcá checkboxes personalizados para llevar control.
          </Typography>
        </Box>
        {puedeEditar && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={abrirCrearLista}>Nueva lista</Button>
        )}
      </Stack>

      {loadingListas && <LinearProgress sx={{ mb: 1 }} />}

      {listas.length === 0 && !loadingListas ? (
        <Paper sx={{ textAlign: 'center', py: 6, px: 3, bgcolor: 'action.hover', borderRadius: 2 }}>
          <InboxIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
          <Typography variant="h6" gutterBottom>Todavía no hay listas</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 500, mx: 'auto' }}>
            Creá tu primera lista para agrupar espacios. Por ejemplo: <b>"FAP"</b>, <b>"Orgas"</b>, <b>"A relevar"</b>, <b>"Rendición 2026"</b>.
          </Typography>
          {puedeEditar && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={abrirCrearLista}>Crear primera lista</Button>
          )}
        </Paper>
      ) : (
        <>
          <Paper sx={{ mb: 2 }}>
            <Tabs
              value={activa ?? false}
              onChange={(_, v) => setActiva(v)}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              {listas.map((l) => (
                <Tab
                  key={l.id}
                  value={l.id}
                  label={
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: l.color }} />
                      <span>{l.nombre}</span>
                      <Chip size="small" label={l.totalItems} sx={{ height: 18, fontSize: '0.65rem', ml: 0.5 }} />
                    </Stack>
                  }
                />
              ))}
            </Tabs>
          </Paper>

          {/* ── Detalle de lista activa ─────────────────────────── */}
          {loadingDetalle && <LinearProgress sx={{ mb: 1 }} />}
          {detalle && (
            <Box>
              {/* cabecera de la lista */}
              <Paper sx={{ p: 2, mb: 2, borderLeft: `4px solid ${detalle.color}` }}>
                <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} justifyContent="space-between" spacing={1}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="h6" fontWeight="bold" sx={{ color: detalle.color }}>
                      {detalle.nombre}
                    </Typography>
                    {detalle.descripcion && (
                      <Typography variant="body2" color="text.secondary">{detalle.descripcion}</Typography>
                    )}
                    {detalle.creadoPorNombre && (
                      <Typography variant="caption" color="text.disabled">Creada por {detalle.creadoPorNombre}</Typography>
                    )}
                  </Box>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Tooltip title="Exportar lista a Excel">
                      <Button size="small" startIcon={<DownloadIcon />} onClick={exportarExcel} disabled={allItems.length === 0}>
                        Excel
                      </Button>
                    </Tooltip>
                    {puedeEditar && (
                      <>
                        <Button size="small" startIcon={<GroupAddIcon />} variant="contained" onClick={() => setAddBeneOpen(true)}>
                          Agregar espacios
                        </Button>
                        <Tooltip title="Editar lista y columnas">
                          <IconButton size="small" onClick={abrirEditarLista}><EditIcon fontSize="small" /></IconButton>
                        </Tooltip>
                        <Tooltip title="Duplicar lista">
                          <IconButton size="small" onClick={abrirDuplicar}><DuplicarIcon fontSize="small" /></IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar lista">
                          <IconButton size="small" color="error" onClick={eliminarLista}><DeleteIcon fontSize="small" /></IconButton>
                        </Tooltip>
                      </>
                    )}
                  </Stack>
                </Stack>

                {/* barras de progreso */}
                {progresoColumnas.length > 0 && items.length > 0 && (
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}>
                    {progresoColumnas.map((c) => (
                      <Box key={c.clave} sx={{ flex: 1, minWidth: 180 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.3 }}>
                          <Typography variant="caption" sx={{ color: c.color ?? 'text.secondary', fontWeight: 500 }}>
                            {c.etiqueta}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {c.completos}/{c.total}
                          </Typography>
                        </Stack>
                        <ProgressBar
                          variant="determinate"
                          value={c.pct}
                          sx={{
                            height: 6, borderRadius: 3,
                            '& .MuiLinearProgress-bar': { bgcolor: c.color ?? theme.palette.primary.main },
                          }}
                        />
                      </Box>
                    ))}
                  </Stack>
                )}
              </Paper>

              {/* filtros + búsqueda dentro de la lista */}
              {allItems.length > 0 && (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} sx={{ mb: 2 }}>
                  <TextField
                    size="small"
                    placeholder="Buscar en esta lista..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    sx={{ flex: 1, minWidth: 220 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
                      ),
                    }}
                  />
                  <TextField
                    select
                    size="small"
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value)}
                    sx={{ minWidth: 240 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start"><FilterIcon fontSize="small" /></InputAdornment>
                      ),
                    }}
                  >
                    <MenuItem value="todos">Todos los espacios</MenuItem>
                    {columnas.flatMap((c) => [
                      <MenuItem key={`pend:${c.clave}`} value={`pend:${c.clave}`}>Pendientes en "{c.etiqueta}"</MenuItem>,
                      <MenuItem key={`ok:${c.clave}`} value={`ok:${c.clave}`}>Completados en "{c.etiqueta}"</MenuItem>,
                    ])}
                  </TextField>
                  {(filtro !== 'todos' || busqueda) && (
                    <Chip
                      size="small"
                      label={`${items.length} de ${allItems.length}`}
                      color="primary"
                      onDelete={() => { setFiltro('todos'); setBusqueda(''); }}
                    />
                  )}
                </Stack>
              )}

              {/* acciones de selección */}
              {seleccionados.size > 0 && (
                <Paper sx={{ p: 1.5, mb: 2, bgcolor: 'action.selected', display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="body2" sx={{ flex: 1, minWidth: 160 }}>
                    {seleccionados.size} espacio(s) seleccionado(s)
                  </Typography>
                  <Button size="small" startIcon={<PrintIcon />} variant="contained" onClick={() => setRendirOpen(true)}>
                    Generar planilla
                  </Button>
                  {puedeEditar && (
                    <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={quitarSeleccionados}>
                      Quitar de la lista
                    </Button>
                  )}
                  <Button size="small" onClick={() => setSeleccionados(new Set())}>Limpiar</Button>
                </Paper>
              )}

              {/* tabla de items */}
              {items.length === 0 ? (
                <Alert severity="info" action={
                  puedeEditar ? <Button size="small" onClick={() => setAddBeneOpen(true)}>Agregar espacios</Button> : null
                }>
                  Esta lista está vacía. Agregá beneficiarios o espacios para empezar a seguirlos.
                </Alert>
              ) : (
                <TableContainer component={Paper} sx={{ maxHeight: { xs: 'none', md: 600 } }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox" sx={{ bgcolor: 'background.paper' }}>
                          <Checkbox
                            checked={items.length > 0 && items.every((it) => seleccionados.has(it.id))}
                            indeterminate={seleccionados.size > 0 && !items.every((it) => seleccionados.has(it.id))}
                            onChange={toggleTodos}
                          />
                        </TableCell>
                        <TableCell sx={{ bgcolor: 'background.paper', fontWeight: 'bold', minWidth: 180 }}>Espacio</TableCell>
                        {!esMobile && <TableCell sx={{ bgcolor: 'background.paper' }}>Localidad</TableCell>}
                        {!esMobile && <TableCell sx={{ bgcolor: 'background.paper' }}>Responsable</TableCell>}
                        {columnas.map((c) => (
                          <TableCell key={c.clave} align="center" sx={{ bgcolor: 'background.paper', fontWeight: 'bold', color: c.color }}>
                            {c.etiqueta}
                          </TableCell>
                        ))}
                        <TableCell align="center" sx={{ bgcolor: 'background.paper' }}>Notas</TableCell>
                        {puedeEditar && <TableCell sx={{ bgcolor: 'background.paper' }} />}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {items.map((it) => (
                        <TableRow key={it.id} hover selected={seleccionados.has(it.id)}>
                          <TableCell padding="checkbox">
                            <Checkbox checked={seleccionados.has(it.id)} onChange={() => toggleSel(it.id)} />
                          </TableCell>
                          <TableCell sx={{ fontWeight: 500 }}>
                            {it.beneficiario?.nombre ?? `#${it.beneficiarioId}`}
                            {it.beneficiario?.tipo && (
                              <Chip size="small" label={it.beneficiario.tipo} sx={{ ml: 1, height: 18, fontSize: '0.65rem' }} />
                            )}
                          </TableCell>
                          {!esMobile && <TableCell>{it.beneficiario?.localidad ?? '—'}</TableCell>}
                          {!esMobile && <TableCell>{it.beneficiario?.responsableNombre ?? '—'}</TableCell>}
                          {columnas.map((c) => {
                            const val = it.valores?.[c.clave];
                            return (
                              <TableCell key={c.clave} align="center">
                                <Tooltip title={val?.v && val.fecha ? `Marcado ${new Date(val.fecha).toLocaleDateString('es-AR')} por ${val.usuario ?? '—'}` : 'Marcar'}>
                                  <Checkbox
                                    checked={!!val?.v}
                                    onChange={() => toggleCheck(it, c.clave)}
                                    disabled={!puedeEditar}
                                    sx={{ color: c.color, '&.Mui-checked': { color: c.color ?? theme.palette.primary.main } }}
                                  />
                                </Tooltip>
                              </TableCell>
                            );
                          })}
                          <TableCell align="center">
                            <Tooltip title={it.notas || 'Agregar nota'}>
                              <IconButton size="small" onClick={() => setNotasItem(it)}>
                                <NotesIcon fontSize="small" color={it.notas ? 'primary' : 'disabled'} />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                          {puedeEditar && (
                            <TableCell>
                              <Tooltip title="Quitar de la lista">
                                <IconButton size="small" color="error" onClick={() => quitarItem(it.id)}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}
        </>
      )}

      {/* ── Dialog: crear/editar lista con columnas ─────────────── */}
      <ListaDialog
        open={listaDialogOpen}
        onClose={() => setListaDialogOpen(false)}
        lista={editandoLista}
        onSaved={() => { setListaDialogOpen(false); cargarListas(); if (activa) cargarDetalle(activa); }}
        setSnack={setSnack}
      />

      {/* ── Dialog: agregar beneficiarios ───────────────────────── */}
      {detalle && (
        <AgregarBeneficiariosDialog
          open={addBeneOpen}
          onClose={() => setAddBeneOpen(false)}
          listaId={detalle.id}
          existentes={new Set(detalle.items.map((it) => it.beneficiarioId))}
          onAdded={(n) => {
            setAddBeneOpen(false);
            setSnack(`${n} espacio(s) agregado(s)`);
            if (activa) cargarDetalle(activa);
            cargarListas();
          }}
          setSnack={setSnack}
        />
      )}

      {/* ── Dialog: notas del item ──────────────────────────────── */}
      <NotasDialog
        item={notasItem}
        onClose={() => setNotasItem(null)}
        onSave={guardarNotas}
      />

      {/* ── Dialog: duplicar lista ──────────────────────────────── */}
      <Dialog open={duplicarOpen} onClose={() => !duplicando && setDuplicarOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Duplicar lista</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              autoFocus
              fullWidth
              label="Nombre de la nueva lista"
              value={duplicarNombre}
              onChange={(e) => setDuplicarNombre(e.target.value)}
              disabled={duplicando}
            />
            <Stack direction="row" alignItems="center" spacing={1}>
              <Checkbox
                checked={duplicarConItems}
                onChange={(e) => setDuplicarConItems(e.target.checked)}
                disabled={duplicando}
              />
              <Box>
                <Typography variant="body2">Copiar también los espacios (items)</Typography>
                <Typography variant="caption" color="text.secondary">
                  Se copiarán los beneficiarios con sus valores de checklist y notas actuales.
                </Typography>
              </Box>
            </Stack>
            <Alert severity="info" variant="outlined">
              Se copiarán las columnas, color e ícono de la lista original.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDuplicarOpen(false)} disabled={duplicando}>Cancelar</Button>
          <Button variant="contained" onClick={confirmarDuplicar} disabled={duplicando || !duplicarNombre.trim()}>
            {duplicando ? 'Duplicando...' : 'Duplicar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog: generar rendición ───────────────────────────── */}
      <Dialog open={rendirOpen} onClose={() => setRendirOpen(false)} maxWidth="sm" fullWidth fullScreen={esMobile}>
        <DialogTitle>Generar planilla con {espaciosSeleccionados.length} espacios</DialogTitle>
        <DialogContent dividers>
          {plantillas.filter((p) => p.contenido.includes('{{LISTA_SELECCIONADOS}}')).length === 0 ? (
            <Alert severity="warning">
              No hay modelos con la variable <code>{'{{LISTA_SELECCIONADOS}}'}</code>. Andá a la pestaña Modelos y creá uno, o usá los predefinidos.
            </Alert>
          ) : (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                Elegí un modelo para generar el documento con la lista de espacios seleccionados.
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                {espaciosSeleccionados.slice(0, 12).map((e) => (
                  <Chip key={e.id} label={e.nombre} size="small" />
                ))}
                {espaciosSeleccionados.length > 12 && (
                  <Chip label={`+${espaciosSeleccionados.length - 12} más`} size="small" variant="outlined" />
                )}
              </Stack>
              <Divider />
              <Stack spacing={1}>
                {plantillas
                  .filter((p) => p.contenido.includes('{{LISTA_SELECCIONADOS}}'))
                  .map((p) => (
                    <Button
                      key={p.id}
                      variant="outlined"
                      startIcon={<PrintIcon />}
                      onClick={() => {
                        onImprimir(p, `${p.titulo} — ${espaciosSeleccionados.length} espacios`, espaciosSeleccionados);
                        setRendirOpen(false);
                      }}
                      sx={{ justifyContent: 'flex-start', borderColor: p.color, color: p.color }}
                    >
                      {p.titulo}
                    </Button>
                  ))}
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRendirOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snack}
        autoHideDuration={3000}
        onClose={() => setSnack(null)}
        message={snack}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}

// ═════════════════════════════════════════════════════════════════
// Dialog: crear / editar lista (incluye editor de columnas)
// ═════════════════════════════════════════════════════════════════
function ListaDialog({
  open, onClose, lista, onSaved, setSnack,
}: {
  open: boolean;
  onClose: () => void;
  lista: ListaLite | null;
  onSaved: () => void;
  setSnack: (s: string) => void;
}) {
  const theme = useTheme();
  const esMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [color, setColor] = useState('#1976d2');
  const [columnas, setColumnas] = useState<ColumnaDef[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setNombre(lista?.nombre ?? '');
      setDescripcion(lista?.descripcion ?? '');
      setColor(lista?.color ?? '#1976d2');
      setColumnas(lista?.columnas?.length ? lista.columnas : [
        { clave: 'doc_enviada', etiqueta: 'Doc. enviada', color: '#1976d2' },
        { clave: 'doc_presentada', etiqueta: 'Doc. presentada', color: '#43a047' },
      ]);
    }
  }, [open, lista]);

  const agregarColumna = () => {
    setColumnas((prev) => [...prev, { clave: `col_${Date.now()}`, etiqueta: 'Nueva columna', color: COLORES[prev.length % COLORES.length] }]);
  };

  const guardar = async () => {
    if (!nombre.trim()) { setSnack('Nombre requerido'); return; }
    if (columnas.some((c) => !c.etiqueta.trim())) { setSnack('Todas las columnas necesitan etiqueta'); return; }
    setSaving(true);
    try {
      const payload = { nombre, descripcion, color, columnas };
      if (lista) await api.patch(`/listas-seguimiento/${lista.id}`, payload);
      else await api.post('/listas-seguimiento', payload);
      onSaved();
    } catch (e: any) { setSnack(e?.response?.data?.message ?? 'Error al guardar'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="md" fullWidth fullScreen={esMobile}>
      <DialogTitle>{lista ? 'Editar lista' : 'Nueva lista de seguimiento'}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Nombre" fullWidth required autoFocus
            value={nombre} onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: FAP, Orgas, VITAP, A relevar..."
          />
          <TextField
            label="Descripción (opcional)" fullWidth multiline rows={2}
            value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
          />
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Color</Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              {COLORES.map((c) => (
                <Box
                  key={c}
                  onClick={() => setColor(c)}
                  sx={{
                    width: 32, height: 32, borderRadius: '50%', bgcolor: c, cursor: 'pointer',
                    border: color === c ? '3px solid #000' : '2px solid #fff',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                  }}
                />
              ))}
            </Stack>
          </Box>
          <Divider />
          <Box>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="subtitle2" fontWeight="bold">Columnas (checkboxes)</Typography>
              <Button size="small" startIcon={<AddIcon />} onClick={agregarColumna}>Agregar</Button>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Cada columna será un checkbox en la tabla. Ej: "Documentación enviada", "Foto tomada", "Relevamiento hecho".
            </Typography>
            <Stack spacing={1}>
              {columnas.map((c, i) => (
                <Stack key={i} direction="row" spacing={1} alignItems="center">
                  <TextField
                    size="small" fullWidth placeholder="Etiqueta de la columna"
                    value={c.etiqueta}
                    onChange={(e) => setColumnas((prev) => prev.map((x, idx) => idx === i ? { ...x, etiqueta: e.target.value } : x))}
                  />
                  <TextField
                    select size="small" value={c.color ?? '#1976d2'} sx={{ minWidth: 90 }}
                    onChange={(e) => setColumnas((prev) => prev.map((x, idx) => idx === i ? { ...x, color: e.target.value } : x))}
                    InputProps={{ startAdornment: <InputAdornment position="start"><Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: c.color ?? '#1976d2' }} /></InputAdornment> }}
                  >
                    {COLORES.map((col) => (
                      <MenuItem key={col} value={col}>
                        <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: col, display: 'inline-block', mr: 1 }} />
                        {col}
                      </MenuItem>
                    ))}
                  </TextField>
                  <IconButton size="small" color="error" onClick={() => setColumnas((prev) => prev.filter((_, idx) => idx !== i))}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
              {columnas.length === 0 && (
                <Alert severity="info">Sin columnas: la lista sólo mostrará los espacios sin checklist. Agregá al menos una para hacer tracking.</Alert>
              )}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button variant="contained" onClick={guardar} disabled={saving} startIcon={<CheckIcon />}>
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ═════════════════════════════════════════════════════════════════
// Dialog: agregar beneficiarios a la lista
// ═════════════════════════════════════════════════════════════════
function AgregarBeneficiariosDialog({
  open, onClose, listaId, existentes, onAdded, setSnack,
}: {
  open: boolean;
  onClose: () => void;
  listaId: number;
  existentes: Set<number>;
  onAdded: (n: number) => void;
  setSnack: (s: string) => void;
}) {
  const theme = useTheme();
  const esMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [todos, setTodos] = useState<BeneficiarioMin[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [tipo, setTipo] = useState<string>('todos');
  const [localidad, setLocalidad] = useState<string>('todas');
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSel(new Set());
    setSearch('');
    setTipo('todos');
    setLocalidad('todas');
    setLoading(true);
    api.get('/beneficiarios', { params: { limit: 5000 } }).then((r) => {
      // El endpoint puede devolver { data: [...], total, page } (paginado) o un array plano.
      const lista = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
      setTodos(lista.filter((b: any) => b.activo));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [open]);

  const disponibles = useMemo(() => {
    const q = search.trim().toLowerCase();
    return todos.filter((b) => {
      if (existentes.has(b.id)) return false;
      if (tipo !== 'todos' && b.tipo !== tipo) return false;
      if (localidad !== 'todas' && b.localidad !== localidad) return false;
      if (!q) return true;
      return (
        b.nombre?.toLowerCase().includes(q) ||
        b.responsableNombre?.toLowerCase().includes(q) ||
        b.responsableDNI?.toLowerCase().includes(q) ||
        b.localidad?.toLowerCase().includes(q)
      );
    });
  }, [todos, existentes, search, tipo, localidad]);

  const localidades = useMemo(() => {
    const set = new Set(todos.map((b) => b.localidad).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [todos]);
  const tipos = useMemo(() => {
    const set = new Set(todos.map((b) => b.tipo).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [todos]);

  const toggle = (id: number) => setSel((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleTodosVisibles = () => {
    const todosCheck = disponibles.every((b) => sel.has(b.id));
    setSel(todosCheck ? new Set() : new Set([...sel, ...disponibles.map((b) => b.id)]));
  };

  const guardar = async () => {
    if (sel.size === 0) { setSnack('Seleccioná al menos uno'); return; }
    setSaving(true);
    try {
      const { data } = await api.post(`/listas-seguimiento/${listaId}/items`, { beneficiarioIds: Array.from(sel) });
      onAdded(data?.creados ?? sel.size);
    } catch (e: any) { setSnack(e?.response?.data?.message ?? 'Error'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="md" fullWidth fullScreen={esMobile}>
      <DialogTitle>Agregar espacios a la lista</DialogTitle>
      <DialogContent dividers>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
          <TextField
            size="small" fullWidth placeholder="Buscar por nombre, DNI, responsable, localidad..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
          />
          <TextField select size="small" label="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} sx={{ minWidth: 140 }}>
            <MenuItem value="todos">Todos</MenuItem>
            {tipos.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Localidad" value={localidad} onChange={(e) => setLocalidad(e.target.value)} sx={{ minWidth: 160 }}>
            <MenuItem value="todas">Todas</MenuItem>
            {localidades.map((l) => <MenuItem key={l} value={l}>{l}</MenuItem>)}
          </TextField>
        </Stack>
        {loading ? <LinearProgress /> : (
          <>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {disponibles.length} disponibles · {sel.size} seleccionado(s)
              </Typography>
              <Button size="small" onClick={toggleTodosVisibles}>
                {disponibles.every((b) => sel.has(b.id)) && disponibles.length > 0 ? 'Deseleccionar todos' : 'Seleccionar todos visibles'}
              </Button>
            </Stack>
            <TableContainer sx={{ maxHeight: 420 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" />
                    <TableCell>Nombre</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Localidad</TableCell>
                    <TableCell>Responsable</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {disponibles.slice(0, 500).map((b) => (
                    <TableRow key={b.id} hover selected={sel.has(b.id)} onClick={() => toggle(b.id)} sx={{ cursor: 'pointer' }}>
                      <TableCell padding="checkbox">
                        <Checkbox checked={sel.has(b.id)} />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{b.nombre}</TableCell>
                      <TableCell>{b.tipo ?? '—'}</TableCell>
                      <TableCell>{b.localidad ?? '—'}</TableCell>
                      <TableCell>{b.responsableNombre ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                  {disponibles.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                        {existentes.size > 0 ? 'Todos los beneficiarios ya están en la lista o no coinciden con los filtros.' : 'No hay beneficiarios que coincidan.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            {disponibles.length > 500 && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Mostrando primeros 500. Refiná la búsqueda para ver más.
              </Typography>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button variant="contained" onClick={guardar} disabled={saving || sel.size === 0} startIcon={<GroupAddIcon />}>
          {saving ? 'Agregando...' : `Agregar ${sel.size}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ═════════════════════════════════════════════════════════════════
// Dialog: editar notas del item
// ═════════════════════════════════════════════════════════════════
function NotasDialog({ item, onClose, onSave }: { item: ItemDetalle | null; onClose: () => void; onSave: (s: string) => void }) {
  const [texto, setTexto] = useState('');
  useEffect(() => { setTexto(item?.notas ?? ''); }, [item]);
  return (
    <Dialog open={!!item} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Notas — {item?.beneficiario?.nombre ?? 'Espacio'}</DialogTitle>
      <DialogContent dividers>
        <TextField
          autoFocus fullWidth multiline rows={5}
          placeholder="Observaciones, pendientes, comentarios sobre este espacio..."
          value={texto} onChange={(e) => setTexto(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={() => onSave(texto)}>Guardar</Button>
      </DialogActions>
    </Dialog>
  );
}
