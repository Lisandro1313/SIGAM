import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Box, Typography, Paper, IconButton, Button, TextField,
  Autocomplete, Tooltip, Chip, CircularProgress, Select,
  MenuItem, FormControl, Tab, Tabs, Dialog, DialogTitle,
  DialogContent, DialogActions, Alert, InputAdornment,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  useTheme, useMediaQuery,
} from '@mui/material';
import {
  ChevronLeft, ChevronRight, Add as AddIcon, Delete as DeleteIcon,
  Receipt as ReceiptIcon, Today as TodayIcon, PlaylistAdd as PasteIcon,
  AutoAwesome as GenerarIcon, PersonAdd as PersonAddIcon,
  PictureAsPdf as PdfIcon, Email as EmailIcon,
  PlaylistAddCheck as AgregarRemitoIcon, Undo as UndoIcon, WhatsApp as WspIcon, Check as CheckIcon,
  EditNote as NotaIcon, Save as SaveIcon,
} from '@mui/icons-material';
import api from '../services/api';
import { getBeneficiarios, getDepositos, getProgramas } from '../utils/staticCache';
import { useNotificationStore } from '../stores/notificationStore';
import BeneficiarioForm from '../components/BeneficiarioForm';
import RemitoForm from '../components/RemitoForm';

interface Beneficiario {
  id: number; nombre: string; tipo: string;
  direccion?: string; localidad?: string; telefono?: string;
  responsableNombre?: string; kilosHabitual?: number;
  programa?: { id: number; nombre: string }; programaId?: number;
}
interface Deposito { id: number; codigo: string; nombre: string; direccion?: string; }
interface Programa { id: number; nombre: string; tipo: string; mensajeWhatsapp?: string; }
interface FilaData {
  id?: number; tempId: string; beneficiario: Beneficiario | null;
  hora: string; kilos: string; responsableRetiro: string;
  depositoId: number; estado?: string;
  remito?: { id: number; numero: string; estado: string } | null;
  saving?: boolean;
  avisadoWsp?: boolean;
  observacion?: string;
}
interface DiaEntry { fecha: string; filas: FilaData[]; }

const DIAS_ES = ['Domingo','Lunes','Martes','Miercoles','Jueves','Viernes','Sabado'];
const MESES_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const COLORES_DIA = ['#1565C0','#2E7D32','#6A1B9A','#00695C','#E65100','#AD1457','#283593'];
const COLORES_TAB = ['#1565C0','#2E7D32','#6A1B9A','#00695C','#E65100','#AD1457','#283593','#4527A0','#00838F'];

function toDateStr(d: Date) { return d.toISOString().slice(0, 10); }
function startOfWeek(d: Date) {
  const day = d.getDay();
  const l = new Date(d); l.setDate(d.getDate() + (day===0?-6:1-day)); l.setHours(0,0,0,0); return l;
}
function addDays(d: Date, n: number) { const r=new Date(d); r.setDate(d.getDate()+n); return r; }
function formatFechaHeader(s: string) {
  const [y,m,d] = s.split('-').map(Number);
  const dt = new Date(y,m-1,d);
  return `${DIAS_ES[dt.getDay()]} ${d} de ${MESES_ES[m-1]} ${y}`;
}
function makeTempId() { return 'tmp_'+Math.random().toString(36).slice(2); }

const COLS = [
  { label:'ESPACIO', w:160 }, { label:'REFERENTE', w:140 },
  { label:'HORA', w:55 }, { label:'DIRECCION', w:160 },
  { label:'KG', w:60 }, { label:'TELEFONO', w:105 },
  { label:'DEP.', w:80 }, { label:'RESP. RETIRO', w:150 },
  { label:'', w:120 }, { label:'OBSERVACIÓN', w:170 },
];
const GRID = COLS.map(c=>`${c.w}px`).join(' ');
const MINW = COLS.reduce((a,c)=>a+c.w,0);

interface UltimaEntrega { fecha: string; estado: string; }

export default function CronogramaPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isDark = theme.palette.mode === 'dark';
  // Colores de fila adaptados al modo (para que se vea el texto en oscuro)
  const filaBg = (tieneRemito: boolean, pendiente: boolean) =>
    isDark
      ? (tieneRemito ? 'rgba(21,101,192,0.18)' : pendiente ? 'rgba(255,193,7,0.12)' : 'background.paper')
      : (tieneRemito ? '#f0f7ff' : pendiente ? '#fffde7' : '#fff');
  const filaHoverBg = (tieneRemito: boolean) =>
    isDark
      ? (tieneRemito ? 'rgba(21,101,192,0.28)' : 'action.hover')
      : (tieneRemito ? '#e3f0fb' : '#f5f5f5');
  const { showNotification } = useNotificationStore();
  const [semanaInicio, setSemanaInicio] = useState<Date>(()=>startOfWeek(new Date()));
  const [dias, setDias] = useState<DiaEntry[]>([]);
  const [todosLosBens, setTodosLosBens] = useState<Beneficiario[]>([]);
  const [depositos, setDepositos] = useState<Deposito[]>([]);
  const [programas, setProgramas] = useState<Programa[]>([]);
  const [depDefault, setDepDefault] = useState<number>(1);
  const [tabIdx, setTabIdx] = useState(0);  // 0 = Todos, 1+ = programa
  const [loading, setLoading] = useState(false);
  const timers = useRef<Record<string,ReturnType<typeof setTimeout>>>({});

  // Generar mes dialog
  const hoy = new Date();
  const [genOpen, setGenOpen] = useState(false);
  const [genMes, setGenMes] = useState(hoy.getMonth() + 1);
  const [genAnio, setGenAnio] = useState(hoy.getFullYear());
  const [genKgPorDia, setGenKgPorDia] = useState('');
  const [genResumen, setGenResumen] = useState<{pendientes:number;yaExisten:number;totalKg:number}|null>(null);
  const [genLoadingResumen, setGenLoadingResumen] = useState(false);
  const [genGenerating, setGenGenerating] = useState(false);

  // Generar remitos semana dialog
  const [semanaGenOpen, setSemanaGenOpen] = useState(false);
  const [semanaPreview, setSemanaPreview] = useState<{pendientes:number;yaGenerados:number}|null>(null);
  const [semanaGenLoading, setSemanaGenLoading] = useState(false);
  const [semanaGenerating, setSemanaGenerating] = useState(false);

  // Últimas entregas por beneficiario
  const [ultimasEntregas, setUltimasEntregas] = useState<Record<number, UltimaEntrega>>({});

  // Bloc de notas (no controlado para no re-renderizar el componente en cada tecla)
  const notaRef = useRef<HTMLTextAreaElement>(null);
  const [notaGuardando, setNotaGuardando] = useState(false);
  const [notaGuardada, setNotaGuardada] = useState(false);
  const notaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dialog exportar cronograma
  const [exportOpen, setExportOpen] = useState(false);
  const [exportDesde, setExportDesde] = useState('');
  const [exportHasta, setExportHasta] = useState('');
  const [exportDepositoId, setExportDepositoId] = useState<number | ''>('');
  const [exportProgramaId, setExportProgramaId] = useState<number | ''>('');
  const [exportEmailExtra, setExportEmailExtra] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [exportEmailLoading, setExportEmailLoading] = useState(false);

  // Nuevo beneficiario desde cronograma
  const [openNuevoBen, setOpenNuevoBen] = useState(false);

  // RemitoForm desde cronograma
  const [remitoFormOpen, setRemitoFormOpen] = useState(false);
  const [remitoFormData, setRemitoFormData] = useState<{ fecha: string; fila: FilaData } | null>(null);
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [detalleRemito, setDetalleRemito] = useState<any>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  const semanaFin = addDays(semanaInicio, 6);
  const semanaLabel = `${semanaInicio.getDate()} ${MESES_ES[semanaInicio.getMonth()]} - ${semanaFin.getDate()} ${MESES_ES[semanaFin.getMonth()]} ${semanaFin.getFullYear()}`;

  // Programa del tab activo (null = Todos)
  const programaActivo: Programa | null = tabIdx === 0 ? null : programas[tabIdx-1] ?? null;

  // Beneficiarios filtrados por programa activo
  const bens: Beneficiario[] = programaActivo
    ? todosLosBens.filter(b => b.programaId === programaActivo.id)
    : todosLosBens;

  // Lookup O(1) para depósitos por id (usado en vista mobile)
  const depositoMap = useMemo(
    () => Object.fromEntries(depositos.map(d => [d.id, d])),
    [depositos]
  );

  useEffect(() => {
    // Datos estáticos desde caché (5min TTL) + dinámicos en paralelo
    Promise.all([
      getDepositos(),
      getBeneficiarios(500),
      getProgramas(),
      api.get('/cronograma/ultimas-entregas').then(r => r.data),
      api.get('/cronograma/nota/cronograma').then(r => r.data),
    ]).then(([deps, bens, progs, ult, nota]) => {
      setDepositos(deps);
      if (deps.length > 0) setDepDefault(deps[0].id);
      setTodosLosBens(bens);
      setProgramas(progs.filter((p:any) => p.activo));
      setUltimasEntregas(ult ?? {});
      if (notaRef.current) notaRef.current.value = nota?.contenido ?? '';
    }).catch(()=>{});
  }, []);

  function handleNotaChange() {
    setNotaGuardada(false);
    if (notaTimer.current) clearTimeout(notaTimer.current);
    notaTimer.current = setTimeout(async () => {
      const valor = notaRef.current?.value ?? '';
      setNotaGuardando(true);
      try {
        await api.patch('/cronograma/nota/cronograma', { contenido: valor });
        setNotaGuardada(true);
        setTimeout(() => setNotaGuardada(false), 2000);
      } finally {
        setNotaGuardando(false);
      }
    }, 1000);
  }

  useEffect(() => { loadPlanilla(); }, [semanaInicio, tabIdx, programas]);

  async function loadPlanilla() {
    setLoading(true);
    try {
      const desde = toDateStr(semanaInicio);
      const hasta = toDateStr(semanaFin);
      const params = new URLSearchParams({ desde, hasta });
      if (programaActivo) params.set('programaId', String(programaActivo.id));
      const r = await api.get(`/cronograma/planilla?${params}`);
      const map: Record<string,FilaData[]> = {};
      (r.data as any[]).forEach(e => {
        const fecha = e.fechaProgramada.slice(0,10);
        if (!map[fecha]) map[fecha]=[];
        map[fecha].push({
          id: e.id, tempId: String(e.id),
          beneficiario: e.beneficiario ?? null,
          hora: e.hora ?? '',
          kilos: e.kilos != null ? String(e.kilos) : (e.beneficiario?.kilosHabitual ?? ''),
          responsableRetiro: e.responsableRetiro ?? '',
          depositoId: e.depositoId ?? e.remito?.depositoId ?? depDefault, estado: e.estado, remito: e.remito ?? null, avisadoWsp: !!e.avisadoWsp, observacion: e.observaciones ?? '',
        });
      });
      const nuevoDias: DiaEntry[] = [];
      for (let i=0; i<7; i++) {
        const fecha = toDateStr(addDays(semanaInicio,i));
        nuevoDias.push({ fecha, filas: map[fecha] ?? [] });
      }
      setDias(nuevoDias);
    } catch { showNotification('Error cargando planilla','error'); }
    finally { setLoading(false); }
  }

  const setFila = useCallback((fecha:string, tid:string, partial:Partial<FilaData>) => {
    setDias(prev=>prev.map(d=>d.fecha!==fecha?d:{...d,filas:d.filas.map(f=>f.tempId!==tid?f:{...f,...partial})}));
  }, []);
  const removeFila = useCallback((fecha:string, tid:string) => {
    setDias(prev=>prev.map(d=>d.fecha!==fecha?d:{...d,filas:d.filas.filter(f=>f.tempId!==tid)}));
  }, []);

  function scheduleSave(fecha:string, fila:FilaData) {
    const key=fila.tempId;
    if (timers.current[key]) clearTimeout(timers.current[key]);
    timers.current[key]=setTimeout(()=>saveFila(fecha,fila),800);
  }
  async function saveFila(fecha:string, fila:FilaData) {
    if (!fila.beneficiario) return;
    setFila(fecha,fila.tempId,{saving:true});
    try {
      if (!fila.id) {
        const r = await api.post('/cronograma/fila',{
          beneficiarioId: fila.beneficiario.id,
          fechaProgramada: fecha,
          programaId: fila.beneficiario.programaId ?? programaActivo?.id ?? undefined,
          hora: fila.hora||undefined,
          kilos: fila.kilos?parseFloat(fila.kilos):undefined,
          responsableRetiro: fila.responsableRetiro||undefined,
          depositoId: fila.depositoId||undefined,
          observaciones: fila.observacion||undefined,
        });
        setFila(fecha,fila.tempId,{id:r.data.id,saving:false});
      } else {
        await api.patch(`/cronograma/fila/${fila.id}`,{
          hora: fila.hora||undefined,
          kilos: fila.kilos?parseFloat(fila.kilos):undefined,
          responsableRetiro: fila.responsableRetiro||undefined,
          depositoId: fila.depositoId||undefined,
          observaciones: fila.observacion ?? '',
        });
        setFila(fecha,fila.tempId,{saving:false});
      }
    } catch(e:any) {
      setFila(fecha,fila.tempId,{saving:false});
      showNotification(e.response?.data?.message??'Error guardando','error');
    }
  }

  function handleSelectBen(fecha:string, fila:FilaData, b:Beneficiario|null) {
    // Auto-fill kilos desde kilosHabitual del beneficiario
    const kilosAuto = b?.kilosHabitual ? String(b.kilosHabitual) : fila.kilos;
    const upd = {...fila, beneficiario:b, kilos:kilosAuto};
    setFila(fecha,fila.tempId,{beneficiario:b, kilos:kilosAuto});
    if (b) scheduleSave(fecha,upd);
  }
  function handleField(fecha:string, fila:FilaData, field:'hora'|'kilos'|'responsableRetiro'|'observacion', val:string) {
    const upd = {...fila,[field]:val};
    setFila(fecha,fila.tempId,{[field]:val});
    if (fila.beneficiario) scheduleSave(fecha,upd);
  }

  async function handleEliminar(fecha:string, fila:FilaData) {
    if (fila.remito){showNotification('Tiene remito, no se puede eliminar','error');return;}
    if (fila.id) {
      try { await api.delete(`/cronograma/fila/${fila.id}`); }
      catch(e:any){showNotification(e.response?.data?.message??'Error','error');return;}
    }
    removeFila(fecha,fila.tempId);
  }
  // Un clic: crea remito PREPARADO (sin artículos) y lo manda a la lista de remitos
  async function handleAgregarARemitos(fecha:string, fila:FilaData) {
    if (!fila.id){showNotification('Selecciona un beneficiario primero','warning');return;}
    if (fila.remito){showNotification(`Remito ${fila.remito.numero} ya existe`,'info');return;}
    if (!fila.beneficiario) return;
    setFila(fecha,fila.tempId,{saving:true});
    try {
      const res = await api.post('/remitos/preparar', {
        beneficiarioId: fila.beneficiario.id,
        depositoId: fila.depositoId,
        programaId: fila.beneficiario.programaId ?? programaActivo?.id ?? undefined,
        fecha,
        horaRetiro: fila.hora || '11:00',
        kilos: fila.kilos ? parseFloat(fila.kilos) : undefined,
        cronogramaEntregaId: fila.id,
      });
      setFila(fecha, fila.tempId, {
        saving: false,
        estado: 'GENERADA',
        remito: { id: res.data.id, numero: res.data.numero, estado: res.data.estado },
      });
      showNotification(`${res.data.numero} agregado a remitos. Completa los articulos desde la seccion Remitos.`, 'success');
    } catch(e:any) {
      setFila(fecha,fila.tempId,{saving:false});
      showNotification(e.response?.data?.message ?? 'Error al preparar remito', 'error');
    }
  }

  // Ver detalle de remito
  async function handleVerRemito(remitoId: number) {
    setDetalleOpen(true);
    setLoadingDetalle(true);
    try {
      const res = await api.get(`/remitos/${remitoId}`);
      setDetalleRemito(res.data);
    } catch {
      showNotification('Error al cargar detalle del remito', 'error');
      setDetalleOpen(false);
    } finally {
      setLoadingDetalle(false);
    }
  }

  // Deshacer: eliminar remito PREPARADO y volver la fila a editable
  async function handleDeshacerRemito(fecha:string, fila:FilaData) {
    if (!fila.remito) return;
    setFila(fecha,fila.tempId,{saving:true});
    try {
      await api.delete(`/remitos/${fila.remito.id}`);
      setFila(fecha,fila.tempId,{saving:false, remito:undefined, estado:'PENDIENTE'});
      showNotification('Remito deshecho. La fila vuelve a ser editable.','success');
    } catch(e:any) {
      setFila(fecha,fila.tempId,{saving:false});
      showNotification(e.response?.data?.message ?? 'Error al deshacer remito','error');
    }
  }

  // Avisar por WhatsApp
  function handleAvisarWsp(fecha: string, fila: FilaData) {
    const ben = fila.beneficiario;
    if (!ben) return;
    let tel = ben.telefono?.replace(/[^0-9]/g, '') || '';
    // Si empieza con 0 o 15, normalizar a formato argentino
    if (tel.startsWith('0')) tel = tel.slice(1);
    if (!tel.startsWith('54')) tel = '54' + tel;
    const dia = new Date(fecha + 'T12:00:00');
    const diaStr = dia.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
    const dep = depositos.find(d => d.id === fila.depositoId);
    // Buscar programa del beneficiario para obtener mensajeWhatsapp
    const progId = ben.programaId ?? ben.programa?.id;
    const prog = programas.find(p => p.id === progId);
    const numeroRemito = fila.remito?.numero ?? '';
    let msg: string;
    if (prog?.mensajeWhatsapp) {
      msg = prog.mensajeWhatsapp
        .replace(/\{nombre\}/g, ben.nombre)
        .replace(/\{fecha\}/g, diaStr)
        .replace(/\{hora\}/g, fila.hora || '')
        .replace(/\{deposito\}/g, dep ? `${dep.nombre}${dep.direccion ? ` (${dep.direccion})` : ''}` : '')
        .replace(/\{direccion\}/g, dep?.direccion || ben.direccion || '')
        .replace(/\{numero\}/g, numeroRemito);
    } else {
      const kg = fila.kilos ? `${fila.kilos} kg` : '';
      msg = `Hola! Le informamos desde Politica Alimentaria que tiene programada una entrega para el dia *${diaStr}*${kg ? ` de *${kg}*` : ''}${fila.hora ? ` a las *${fila.hora}*` : ''}. Por favor confirmar retiro. Gracias!`;
    }
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(msg)}`, '_blank');
    // Marcar como avisado en backend
    if (fila.id && !fila.avisadoWsp) {
      api.patch(`/cronograma/fila/${fila.id}/avisado-wsp`, { avisadoWsp: true }).catch(() => {});
      setFila(fecha, fila.tempId, { avisadoWsp: true });
    }
  }

  // Alternativa: abrir formulario completo de remito (para quienes prefieran cargar todo de una)
  function handleGenerarRemito(fecha:string, fila:FilaData) {
    if (!fila.id){showNotification('Selecciona un beneficiario primero','warning');return;}
    if (fila.remito){showNotification(`Remito ${fila.remito.numero} ya existe`,'info');return;}
    setRemitoFormData({ fecha, fila });
    setRemitoFormOpen(true);
  }

  function handleRemitoFormSuccess(remito: any) {
    if (!remitoFormData) return;
    const { fecha, fila } = remitoFormData;
    setFila(fecha, fila.tempId, {
      estado: 'GENERADA',
      remito: { id: remito.id, numero: remito.numero, estado: remito.estado },
    });
    setRemitoFormOpen(false);
    setRemitoFormData(null);
  }
  function handleAgregarFila(fecha:string) {
    setDias(prev=>prev.map(d=>d.fecha!==fecha?d:{...d,filas:[...d.filas,{tempId:makeTempId(),beneficiario:null,hora:'',kilos:'',responsableRetiro:'',depositoId:depDefault,estado:'PENDIENTE',remito:null,observacion:''}]}));
  }

  const colorTab = (i:number) => COLORES_TAB[i % COLORES_TAB.length];

  async function loadResumen(mes: number, anio: number) {
    setGenResumen(null);
    setGenLoadingResumen(true);
    try {
      const r = await api.get(`/cronograma/resumen-generacion?mes=${mes}&anio=${anio}`);
      setGenResumen(r.data);
    } catch { showNotification('Error cargando resumen', 'error'); }
    finally { setGenLoadingResumen(false); }
  }

  function handleOpenGen() {
    setGenOpen(true);
    loadResumen(genMes, genAnio);
  }

  async function handleConfirmarGenerar() {
    setGenGenerating(true);
    try {
      const body: any = { mes: genMes, anio: genAnio };
      if (genKgPorDia) body.kgPorDia = parseFloat(genKgPorDia);
      const r = await api.post('/cronograma/generar', body);
      showNotification(`Cronograma generado: ${r.data.entregasCreadas} entregas creadas`, 'success');
      setGenOpen(false);
      loadPlanilla();
      // Refresh últimas entregas
      api.get('/cronograma/ultimas-entregas').then(u => setUltimasEntregas(u.data ?? {})).catch(()=>{});
    } catch(e:any) {
      showNotification(e.response?.data?.message ?? 'Error generando', 'error');
    } finally { setGenGenerating(false); }
  }

  const MESES_NOMBRE = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  async function handleOpenSemanaGen() {
    setSemanaGenOpen(true);
    setSemanaPreview(null);
    setSemanaGenLoading(true);
    try {
      const desde = toDateStr(semanaInicio);
      const hasta = toDateStr(semanaFin);
      const r = await api.get(`/cronograma/preview-remitos-rango?desde=${desde}&hasta=${hasta}`);
      setSemanaPreview(r.data);
    } catch { showNotification('Error cargando preview', 'error'); }
    finally { setSemanaGenLoading(false); }
  }

  async function handleConfirmarSemanaGen() {
    setSemanaGenerating(true);
    try {
      const desde = toDateStr(semanaInicio);
      const hasta = toDateStr(semanaFin);
      const r = await api.post('/cronograma/generar-remitos-rango', { desde, hasta, depositoId: depDefault });
      const { remitosGenerados, errores, detalleErrores } = r.data;
      if (errores > 0) {
        showNotification(`${remitosGenerados} remitos generados, ${errores} errores: ${detalleErrores.map((e:any)=>e.beneficiario).join(', ')}`, 'warning');
      } else {
        showNotification(`${remitosGenerados} remitos generados correctamente`, 'success');
      }
      setSemanaGenOpen(false);
      loadPlanilla();
    } catch(e:any) {
      showNotification(e.response?.data?.message ?? 'Error generando remitos', 'error');
    } finally { setSemanaGenerating(false); }
  }

  function handleOpenExport() {
    // Pre-llenar con la semana actual
    setExportDesde(toDateStr(semanaInicio));
    setExportHasta(toDateStr(semanaFin));
    setExportDepositoId('');
    setExportProgramaId(programaActivo ? programaActivo.id : '');
    setExportEmailExtra('');
    setExportOpen(true);
  }

  async function handleDescargarPdf() {
    if (!exportDesde || !exportHasta) return;
    setExportLoading(true);
    try {
      const params = new URLSearchParams({ desde: exportDesde, hasta: exportHasta });
      if (exportDepositoId) params.set('depositoId', String(exportDepositoId));
      if (exportProgramaId) params.set('programaId', String(exportProgramaId));
      const r = await api.get(`/cronograma/exportar-pdf?${params}`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `cronograma_${exportDesde}_${exportHasta}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { showNotification('Error generando PDF', 'error'); }
    finally { setExportLoading(false); }
  }

  async function handleEnviarEmail() {
    if (!exportDesde || !exportHasta) return;
    setExportEmailLoading(true);
    try {
      const body: any = { desde: exportDesde, hasta: exportHasta };
      if (exportDepositoId) body.depositoId = exportDepositoId;
      if (exportProgramaId) body.programaId = exportProgramaId;
      if (exportEmailExtra.trim()) body.destinatarios = exportEmailExtra.split(',').map(s => s.trim()).filter(Boolean);
      await api.post('/cronograma/enviar-email', body);
      showNotification('Cronograma enviado por email', 'success');
      setExportOpen(false);
    } catch (e: any) { showNotification(e.response?.data?.message ?? 'Error enviando email', 'error'); }
    finally { setExportEmailLoading(false); }
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" mb={1} flexWrap="wrap" gap={1} flexDirection={{ xs: 'column', sm: 'row' }}>
        <Typography variant="h4" fontWeight="bold" fontSize={{ xs: '1.5rem', sm: '2.125rem' }}>Cronograma</Typography>
        <Box display="flex" alignItems="center" gap={0.5} flexWrap="wrap">
          <Tooltip title="Semana anterior"><IconButton size="small" onClick={()=>setSemanaInicio(p=>addDays(p,-7))}><ChevronLeft/></IconButton></Tooltip>
          <Typography variant="body2" fontWeight="bold" minWidth={{ xs: 160, sm: 230 }} textAlign="center" fontSize={{ xs: '0.8rem', sm: '1rem' }}>{semanaLabel}</Typography>
          <Tooltip title="Semana siguiente"><IconButton size="small" onClick={()=>setSemanaInicio(p=>addDays(p,7))}><ChevronRight/></IconButton></Tooltip>
          <Tooltip title="Hoy"><IconButton size="small" onClick={()=>setSemanaInicio(startOfWeek(new Date()))}><TodayIcon/></IconButton></Tooltip>
          {(isMobile
            ? [
                { label:'Remitos', icon:<ReceiptIcon/>, onClick:handleOpenSemanaGen, color:'success' as const },
                { label:'PDF',     icon:<PdfIcon/>,    onClick:handleOpenExport,    color:'secondary' as const },
              ]
            : [
                { label:'Exportar cronograma', icon:<PdfIcon/>,    onClick:handleOpenExport,    color:'secondary' as const },
                { label:'Remitos semana',      icon:<ReceiptIcon/>, onClick:handleOpenSemanaGen, color:'success' as const },
              ]
          ).map(b => (
            <Button key={b.label} variant="outlined" startIcon={b.icon} onClick={b.onClick} size="small" color={b.color}>
              {b.label}
            </Button>
          ))}
          <Button variant="contained" startIcon={<GenerarIcon/>} onClick={handleOpenGen} size="small" sx={{bgcolor:'#1a237e'}}>
            {isMobile ? 'Generar' : 'Generar mes'}
          </Button>
        </Box>
      </Box>

      {/* Pestañas por programa */}
      <Box sx={{ borderBottom:1, borderColor:'divider', mb:1 }}>
        <Tabs
          value={tabIdx}
          onChange={(_,v)=>setTabIdx(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': { textTransform:'none', fontWeight:'bold', minHeight:40 },
          }}
        >
          <Tab label="Todos" sx={{ color: tabIdx===0 ? '#1a237e' : undefined }} />
          {programas.map((p,i) => (
            <Tab
              key={p.id}
              label={p.nombre}
              sx={{
                color: tabIdx===i+1 ? colorTab(i) : undefined,
                '&.Mui-selected': { color: colorTab(i) },
              }}
            />
          ))}
        </Tabs>
      </Box>

      {programaActivo && (
        <Typography variant="caption" color="text.secondary" sx={{ mb:1, display:'block' }}>
          Mostrando solo beneficiarios del programa <strong>{programaActivo.nombre}</strong>. Los pedidos nuevos se asignan a este programa.
        </Typography>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" mt={6}><CircularProgress/></Box>
      ) : isMobile ? (
        /* ── Vista mobile: tarjetas por fila ── */
        <Box>
          {dias.map((dia,idx)=>(
            <Box key={dia.fecha} mb={1.5}>
              <Box sx={{bgcolor:COLORES_DIA[idx%COLORES_DIA.length],color:'#fff',px:2,py:0.75,borderRadius:'6px 6px 0 0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <Typography variant="subtitle2" fontWeight="bold" sx={{textTransform:'uppercase',letterSpacing:0.5,fontSize:12}}>{formatFechaHeader(dia.fecha)}</Typography>
                <Typography variant="caption" sx={{opacity:0.85}}>{dia.filas.filter(f=>f.id).length} entregas</Typography>
              </Box>
              {dia.filas.map(fila=>{
                const ben=fila.beneficiario;
                const tieneRemito=!!fila.remito;
                const dep=depositoMap[fila.depositoId];
                return (
                  <Paper key={fila.tempId} elevation={1} sx={{mb:0.75,mx:0.5,p:1.25,bgcolor:filaBg(tieneRemito,!fila.id&&!!ben),borderLeft:`3px solid ${COLORES_DIA[idx%COLORES_DIA.length]}`}}>
                    {/* Nombre + estado */}
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1} mb={0.5}>
                      <Box flex={1} minWidth={0}>
                        {ben?.programa?.nombre && (
                          <Typography variant="caption" sx={{fontSize:10,color:'text.disabled',fontStyle:'italic'}} noWrap>{ben.programa.nombre}</Typography>
                        )}
                        <Typography variant="body2" fontWeight="bold" noWrap color={ben?.nombre ? 'text.primary' : 'text.disabled'}>
                          {ben?.nombre ?? 'Sin beneficiario'}
                        </Typography>
                        {ben?.responsableNombre && (
                          <Typography variant="caption" color="text.secondary" noWrap>{ben.responsableNombre}</Typography>
                        )}
                      </Box>
                      <Box display="flex" alignItems="center" gap={0.5} flexShrink={0}>
                        {fila.saving && <CircularProgress size={12}/>}
                        {tieneRemito
                          ? <Chip label={fila.remito!.numero} size="small" color={fila.remito!.estado==='PREPARADO'?'warning':'success'} variant="outlined" icon={<ReceiptIcon sx={{fontSize:11}}/>} sx={{fontSize:10,height:20,cursor:'pointer'}} onClick={()=>handleVerRemito(fila.remito!.id)}/>
                          : fila.id ? <Chip label="PENDIENTE" size="small" variant="outlined" sx={{fontSize:10,height:20}}/> : null
                        }
                      </Box>
                    </Box>
                    {/* Info secundaria */}
                    <Box display="flex" gap={1} mb={0.75} flexWrap="wrap">
                      {fila.hora && <Typography variant="caption" color="text.secondary">⏰ {fila.hora} hs</Typography>}
                      {fila.kilos && <Typography variant="caption" color="text.secondary">📦 {fila.kilos} kg</Typography>}
                      {dep && <Chip label={dep.codigo} size="small" color={dep.codigo==='LOGISTICA'?'primary':'warning'} sx={{fontSize:10,height:18}}/>}
                      {ben?.direccion && <Typography variant="caption" color="text.secondary" noWrap>📍 {ben.direccion}</Typography>}
                    </Box>
                    {/* Observación */}
                    <TextField
                      size="small" fullWidth
                      value={fila.observacion ?? ''}
                      onChange={e=>handleField(dia.fecha,fila,'observacion',e.target.value)}
                      placeholder="Observación..."
                      variant="standard"
                      multiline maxRows={3}
                      sx={{'& textarea':{fontSize:12},'& input':{fontSize:12},mb:0.5}}
                    />
                    {/* Botones de acción */}
                    <Box display="flex" gap={0.5} flexWrap="wrap" alignItems="center" mt={0.25}>
                      {tieneRemito ? (
                        <>
                          {fila.remito!.estado==='PREPARADO' && (
                            <Tooltip title="Deshacer remito"><span>
                              <IconButton size="small" color="warning" onClick={()=>handleDeshacerRemito(dia.fecha,fila)} disabled={fila.saving}>
                                <UndoIcon sx={{fontSize:18}}/>
                              </IconButton>
                            </span></Tooltip>
                          )}
                        </>
                      ) : (
                        <>
                          <Tooltip title="Agregar a remitos"><span>
                            <IconButton size="small" color="success" onClick={()=>handleAgregarARemitos(dia.fecha,fila)} disabled={!fila.id||fila.saving}>
                              <AgregarRemitoIcon sx={{fontSize:18}}/>
                            </IconButton>
                          </span></Tooltip>
                          <Tooltip title="Crear remito completo"><span>
                            <IconButton size="small" color="primary" onClick={()=>handleGenerarRemito(dia.fecha,fila)} disabled={!fila.id||fila.saving}>
                              <ReceiptIcon sx={{fontSize:18}}/>
                            </IconButton>
                          </span></Tooltip>
                        </>
                      )}
                      {ben?.telefono && (
                        <Tooltip title={fila.avisadoWsp?'Ya avisado (reenviar)':'Avisar por WhatsApp'}><span>
                          <IconButton size="small" onClick={()=>handleAvisarWsp(dia.fecha,fila)} disabled={!fila.id||fila.saving}
                            sx={{color:fila.avisadoWsp?'#4caf50':'#25D366'}}>
                            {fila.avisadoWsp?<CheckIcon sx={{fontSize:18}}/>:<WspIcon sx={{fontSize:18}}/>}
                          </IconButton>
                        </span></Tooltip>
                      )}
                      {!tieneRemito && (
                        <Tooltip title="Eliminar"><span>
                          <IconButton size="small" color="error" onClick={()=>handleEliminar(dia.fecha,fila)} disabled={fila.saving}>
                            <DeleteIcon sx={{fontSize:18}}/>
                          </IconButton>
                        </span></Tooltip>
                      )}
                    </Box>
                  </Paper>
                );
              })}
              <Button startIcon={<AddIcon/>} size="small" onClick={()=>handleAgregarFila(dia.fecha)} sx={{ml:0.5,color:COLORES_DIA[idx%COLORES_DIA.length]}}>
                Agregar espacio
              </Button>
            </Box>
          ))}
          <Box mt={1}>
            <Button startIcon={<PasteIcon/>} variant="outlined" size="small"
              onClick={()=>{
                const ultima=dias.length>0?dias[dias.length-1].fecha:toDateStr(semanaInicio);
                const [y,m,d]=ultima.split('-').map(Number);
                const sig=toDateStr(addDays(new Date(y,m-1,d),1));
                setDias(prev=>[...prev,{fecha:sig,filas:[]}]);
              }}>
              Agregar día
            </Button>
          </Box>
        </Box>
      ) : (
        /* ── Vista desktop: grilla ── */
        <Box sx={{overflowX:'auto',mx:-1,px:1}}>
          {/* Cabecera columnas */}
          <Box sx={{display:'grid',gridTemplateColumns:GRID,bgcolor:'#1a237e',color:'#fff',borderRadius:'8px 8px 0 0',px:1,py:0.75,minWidth:MINW,position:'sticky',top:0,zIndex:10}}>
            {COLS.map((c,i)=><Typography key={i} variant="caption" fontWeight="bold" sx={{fontSize:11,px:0.5}}>{c.label}</Typography>)}
          </Box>

          {dias.map((dia,idx)=>(
            <Box key={dia.fecha} sx={{minWidth:MINW}}>
              {/* Header dia */}
              <Box sx={{display:'grid',gridTemplateColumns:'1fr auto',alignItems:'center',bgcolor:COLORES_DIA[idx%COLORES_DIA.length],color:'#fff',px:2,py:0.5}}>
                <Typography variant="subtitle2" fontWeight="bold" sx={{textTransform:'uppercase',letterSpacing:1}}>{formatFechaHeader(dia.fecha)}</Typography>
                <Typography variant="caption" sx={{opacity:0.8}}>{dia.filas.filter(f=>f.id).length} entregas</Typography>
              </Box>

              {dia.filas.map(fila=>{
                const ben=fila.beneficiario;
                const tieneRemito=!!fila.remito;
                return (
                  <Paper key={fila.tempId} elevation={0} sx={{display:'grid',gridTemplateColumns:GRID,alignItems:'center',borderBottom:`1px solid ${isDark?theme.palette.divider:'#e8e8e8'}`,bgcolor:filaBg(tieneRemito,!fila.id&&!!ben),'&:hover':{bgcolor:filaHoverBg(tieneRemito)},px:0.5,py:0.25,minHeight:44}}>
                    {/* Espacio */}
                    <Tooltip title={ben?.nombre??''} disableHoverListener={!ben} placement="top" arrow>
                    <Box px={0.5} sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 0 }}>
                      {ben?.programa?.nombre && (
                        <Typography variant="caption" sx={{ fontSize: 10, color: 'text.disabled', lineHeight: 1.2, mb: 0.2, fontStyle: 'italic' }} noWrap>
                          {ben.programa.nombre}
                        </Typography>
                      )}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Autocomplete size="small" options={bens} getOptionLabel={o=>o.nombre} value={ben}
                        onChange={(_,v)=>handleSelectBen(dia.fecha,fila,v)} disabled={tieneRemito}
                        filterOptions={(opts,{inputValue})=>opts.filter(o=>o.nombre.toLowerCase().includes(inputValue.toLowerCase()))}
                        renderInput={params=><TextField {...params} placeholder="Escribir nombre..." variant="standard" InputProps={{...params.InputProps,disableUnderline:tieneRemito}} sx={{'& input':{fontSize:13}}}/>}
                        renderOption={(props,o)=>{
                          const ult = ultimasEntregas[o.id];
                          return <li {...props} key={o.id}><Box><Typography variant="body2" fontWeight="bold">{o.nombre}</Typography><Typography variant="caption" color="text.secondary">{o.tipo}{o.programa?` · ${o.programa.nombre}`:''}{o.kilosHabitual?` · ${o.kilosHabitual}kg`:''}{ult?` · Últ: ${ult.fecha}`:''}</Typography></Box></li>;
                        }}
                        noOptionsText="Sin resultados"
                        sx={{ flex: 1 }}
                      />
                      {!tieneRemito && (
                        <Tooltip title="Crear nuevo beneficiario">
                          <IconButton size="small" onClick={() => setOpenNuevoBen(true)} sx={{ flexShrink: 0, p: 0.25 }}>
                            <PersonAddIcon sx={{ fontSize: 15 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                    </Box>
                    </Tooltip>
                    {/* Referente */}
                    <Tooltip title={ben?.responsableNombre??''} disableHoverListener={!ben?.responsableNombre} placement="top" arrow>
                      <Box px={0.5}><Typography variant="body2" fontSize={12} color={ben?'text.primary':'text.disabled'} noWrap>{ben?.responsableNombre??'—'}</Typography></Box>
                    </Tooltip>
                    {/* Hora */}
                    <Box px={0.5}>
                      <TextField size="small" value={fila.hora} onChange={e=>handleField(dia.fecha,fila,'hora',e.target.value)} placeholder="10:00" disabled={tieneRemito} variant="standard" InputProps={{disableUnderline:tieneRemito}} sx={{width:'100%','& input':{fontSize:13}}}/>
                    </Box>
                    {/* Direccion */}
                    <Tooltip title={ben?.direccion??''} disableHoverListener={!ben?.direccion} placement="top" arrow>
                      <Box px={0.5}><Typography variant="body2" fontSize={12} color={ben?'text.primary':'text.disabled'} noWrap>{ben?.direccion??'—'}</Typography></Box>
                    </Tooltip>
                    {/* Kilos */}
                    <Box px={0.5}>
                      <TextField size="small" value={fila.kilos} onChange={e=>handleField(dia.fecha,fila,'kilos',e.target.value)} placeholder="0" type="number" disabled={tieneRemito} variant="standard" InputProps={{disableUnderline:tieneRemito}} sx={{width:'100%','& input':{fontSize:13}}}/>
                    </Box>
                    {/* Telefono */}
                    <Tooltip title={ben?.telefono??''} disableHoverListener={!ben?.telefono} placement="top" arrow>
                      <Box px={0.5}><Typography variant="body2" fontSize={12} color={ben?'text.primary':'text.disabled'} noWrap>{ben?.telefono??'—'}</Typography></Box>
                    </Tooltip>
                    {/* Deposito */}
                    <Box px={0.5}>
                      <Select size="small" value={fila.depositoId} onChange={e=>{const upd={...fila,depositoId:Number(e.target.value)};setFila(dia.fecha,fila.tempId,{depositoId:Number(e.target.value)});if(fila.beneficiario)scheduleSave(dia.fecha,upd);}} disabled={tieneRemito} variant="standard" disableUnderline={tieneRemito} sx={{fontSize:13,width:'100%'}}>
                        {depositos.map(d=>(
                          <MenuItem key={d.id} value={d.id} sx={{fontSize:13}}>
                            <Chip label={d.codigo} size="small" color={d.codigo==='LOGISTICA'?'primary':'warning'} sx={{fontSize:11,height:20}}/>
                          </MenuItem>
                        ))}
                      </Select>
                    </Box>
                    {/* Responsable retiro */}
                    <Box px={0.5}>
                      <TextField size="small" value={fila.responsableRetiro} onChange={e=>handleField(dia.fecha,fila,'responsableRetiro',e.target.value)} placeholder="Nombre DNI..." disabled={tieneRemito} variant="standard" InputProps={{disableUnderline:tieneRemito}} sx={{width:'100%','& input':{fontSize:13}}}/>
                    </Box>
                    {/* Acciones */}
                    <Box display="flex" alignItems="center" gap={0.5} px={0.5}>
                      {fila.saving&&<CircularProgress size={14}/>}
                      {tieneRemito?(
                        <>
                          <Chip label={fila.remito!.numero} size="small" color={fila.remito!.estado==='PREPARADO'?'warning':'success'} variant="outlined" icon={<ReceiptIcon style={{fontSize:12}}/>} sx={{fontSize:10,height:22,cursor:'pointer'}} onClick={()=>handleVerRemito(fila.remito!.id)}/>
                          {fila.remito!.estado==='PREPARADO'&&(
                            <Tooltip title="Deshacer (quitar de remitos)"><span>
                              <IconButton size="small" color="warning" onClick={()=>handleDeshacerRemito(dia.fecha,fila)} disabled={fila.saving} sx={{ml:-0.5}}>
                                <UndoIcon sx={{fontSize:16}}/>
                              </IconButton>
                            </span></Tooltip>
                          )}
                        </>
                      ):(
                        <>
                          <Tooltip title="Agregar a remitos"><span>
                            <IconButton size="small" color="success" onClick={()=>handleAgregarARemitos(dia.fecha,fila)} disabled={!fila.id||fila.saving}>
                              <AgregarRemitoIcon fontSize="small"/>
                            </IconButton>
                          </span></Tooltip>
                          <Tooltip title="Crear remito completo"><span>
                            <IconButton size="small" color="primary" onClick={()=>handleGenerarRemito(dia.fecha,fila)} disabled={!fila.id||fila.saving} sx={{ml:-0.5}}>
                              <ReceiptIcon sx={{fontSize:16}}/>
                            </IconButton>
                          </span></Tooltip>
                        </>
                      )}
                      {ben?.telefono && (
                        <Tooltip title={fila.avisadoWsp ? 'Ya avisado por WhatsApp (clic para reenviar)' : 'Avisar por WhatsApp'}><span>
                          <IconButton size="small" onClick={()=>handleAvisarWsp(dia.fecha,fila)} disabled={!fila.id||fila.saving}
                            sx={{ color: fila.avisadoWsp ? '#4caf50' : '#25D366', ml: -0.5 }}>
                            {fila.avisadoWsp
                              ? <CheckIcon sx={{fontSize:16}}/>
                              : <WspIcon sx={{fontSize:16}}/>}
                          </IconButton>
                        </span></Tooltip>
                      )}
                      {!tieneRemito && (
                        <Tooltip title="Eliminar"><span>
                          <IconButton size="small" color="error" onClick={()=>handleEliminar(dia.fecha,fila)} disabled={fila.saving}>
                            <DeleteIcon fontSize="small"/>
                          </IconButton>
                        </span></Tooltip>
                      )}
                    </Box>
                    {/* Observación */}
                    <Box px={0.5}>
                      <TextField
                        size="small"
                        value={fila.observacion ?? ''}
                        onChange={e=>handleField(dia.fecha,fila,'observacion',e.target.value)}
                        placeholder="Observación..."
                        variant="standard"
                        multiline
                        maxRows={3}
                        sx={{width:'100%','& input':{fontSize:12},'& textarea':{fontSize:12}}}
                      />
                    </Box>
                  </Paper>
                );
              })}

              <Box sx={{borderBottom:`1px solid ${isDark?theme.palette.divider:'#e0e0e0'}`,bgcolor:isDark?'action.hover':'#fafafa'}}>
                <Button startIcon={<AddIcon/>} size="small" onClick={()=>handleAgregarFila(dia.fecha)} sx={{justifyContent:'flex-start',pl:2,py:0.5,color:COLORES_DIA[idx%COLORES_DIA.length]}}>
                  Agregar espacio
                </Button>
              </Box>
            </Box>
          ))}

          <Box mt={1}>
            <Button startIcon={<PasteIcon/>} variant="outlined" size="small"
              onClick={()=>{
                const ultima=dias.length>0?dias[dias.length-1].fecha:toDateStr(semanaInicio);
                const [y,m,d]=ultima.split('-').map(Number);
                const sig=toDateStr(addDays(new Date(y,m-1,d),1));
                setDias(prev=>[...prev,{fecha:sig,filas:[]}]);
              }}>
              Agregar dia
            </Button>
          </Box>
        </Box>
      )}

      {/* Dialog: Generar mes */}
      <Dialog open={genOpen} onClose={()=>setGenOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{fontWeight:'bold'}}>Generar cronograma mensual</DialogTitle>
        <DialogContent>
          <Box display="flex" gap={2} mt={1} mb={2}>
            <FormControl fullWidth size="small">
              <Select value={genMes} onChange={e=>{const m=Number(e.target.value);setGenMes(m);loadResumen(m,genAnio);}}>
                {MESES_NOMBRE.map((mn,i)=><MenuItem key={i+1} value={i+1}>{mn}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField
              size="small" label="Año" type="number" value={genAnio}
              onChange={e=>{const a=Number(e.target.value);setGenAnio(a);if(a>2000&&a<2100)loadResumen(genMes,a);}}
              sx={{width:100}}
            />
          </Box>

          <TextField
            size="small" fullWidth label="Límite kg por día (opcional)"
            value={genKgPorDia}
            onChange={e=>setGenKgPorDia(e.target.value)}
            type="number"
            InputProps={{endAdornment:<InputAdornment position="end">kg</InputAdornment>}}
            helperText="Si no se indica, se distribuye sin límite de capacidad"
            sx={{mb:2}}
          />

          {genLoadingResumen && <Box display="flex" justifyContent="center" my={2}><CircularProgress size={24}/></Box>}

          {genResumen && !genLoadingResumen && (
            <Alert severity={genResumen.pendientes === 0 ? 'info' : 'success'} sx={{mb:1}}>
              <Typography variant="body2"><strong>{genResumen.pendientes}</strong> entregas a crear · <strong>{genResumen.yaExisten}</strong> ya existentes</Typography>
              <Typography variant="body2">Peso total estimado: <strong>{genResumen.totalKg} kg</strong></Typography>
              {genResumen.pendientes === 0 && <Typography variant="body2" mt={0.5}>Ya están todas las entregas generadas para este mes.</Typography>}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setGenOpen(false)}>Cancelar</Button>
          <Button
            variant="contained" onClick={handleConfirmarGenerar}
            disabled={genGenerating || !genResumen || genResumen.pendientes === 0}
            startIcon={genGenerating?<CircularProgress size={16}/>:<GenerarIcon/>}
            sx={{bgcolor:'#1a237e'}}
          >
            {genGenerating ? 'Generando...' : `Generar ${genResumen?.pendientes ?? ''} entregas`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Generar remitos de la semana */}
      <Dialog open={semanaGenOpen} onClose={()=>setSemanaGenOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{fontWeight:'bold'}}>Generar remitos de la semana</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Semana: <strong>{semanaLabel}</strong>
          </Typography>
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" mb={0.5} display="block">Depósito para los remitos</Typography>
            <Select value={depDefault} onChange={e => setDepDefault(Number(e.target.value))}>
              {depositos.map(d => <MenuItem key={d.id} value={d.id}>{d.nombre} ({d.codigo})</MenuItem>)}
            </Select>
          </FormControl>
          {semanaGenLoading && <Box display="flex" justifyContent="center" my={2}><CircularProgress size={24}/></Box>}
          {semanaPreview && !semanaGenLoading && (
            <Alert severity={semanaPreview.pendientes === 0 ? 'info' : 'success'} sx={{mb:1}}>
              <Typography variant="body2"><strong>{semanaPreview.pendientes}</strong> filas sin remito — se generarán</Typography>
              <Typography variant="body2"><strong>{semanaPreview.yaGenerados}</strong> ya tienen remito generado — se omiten</Typography>
              {semanaPreview.pendientes === 0 && (
                <Typography variant="body2" mt={0.5}>Todos los remitos de esta semana ya están generados.</Typography>
              )}
            </Alert>
          )}
          {semanaPreview && semanaPreview.pendientes > 0 && (
            <Alert severity="warning" sx={{mt:1}}>
              <Typography variant="caption">Solo se generan remitos para filas con beneficiario asignado. Las filas sin plantilla de programa se omiten con error.</Typography>
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setSemanaGenOpen(false)}>Cancelar</Button>
          <Button
            variant="contained" color="success" onClick={handleConfirmarSemanaGen}
            disabled={semanaGenerating || !semanaPreview || semanaPreview.pendientes === 0}
            startIcon={semanaGenerating ? <CircularProgress size={16}/> : <ReceiptIcon/>}
          >
            {semanaGenerating ? 'Generando...' : `Generar ${semanaPreview?.pendientes ?? ''} remitos`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Exportar cronograma */}
      <Dialog open={exportOpen} onClose={() => setExportOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Exportar cronograma</DialogTitle>
        <DialogContent>
          <Box display="flex" gap={2} mt={1} mb={2}>
            <TextField
              size="small" label="Desde" type="date" value={exportDesde}
              onChange={e => setExportDesde(e.target.value)}
              InputLabelProps={{ shrink: true }} fullWidth
            />
            <TextField
              size="small" label="Hasta" type="date" value={exportHasta}
              onChange={e => setExportHasta(e.target.value)}
              InputLabelProps={{ shrink: true }} fullWidth
            />
          </Box>
          <Box display="flex" gap={2} mb={2}>
            <FormControl fullWidth size="small">
              <Typography variant="caption" color="text.secondary" mb={0.5} display="block">Depósito (opcional)</Typography>
              <Select
                value={exportDepositoId}
                onChange={e => setExportDepositoId(e.target.value as number | '')}
                displayEmpty
              >
                <MenuItem value=""><em>Todos los depósitos</em></MenuItem>
                {depositos.map(d => (
                  <MenuItem key={d.id} value={d.id}>{d.nombre} ({d.codigo})</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <Typography variant="caption" color="text.secondary" mb={0.5} display="block">Programa (opcional)</Typography>
              <Select
                value={exportProgramaId}
                onChange={e => setExportProgramaId(e.target.value as number | '')}
                displayEmpty
              >
                <MenuItem value=""><em>Todos los programas</em></MenuItem>
                {programas.map(p => (
                  <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <TextField
            size="small" fullWidth label="Email(s) adicionales (separados por coma)"
            value={exportEmailExtra}
            onChange={e => setExportEmailExtra(e.target.value)}
            placeholder="deposito@municipalidad.gob.ar"
            helperText="Opcional — si no se indica se usa el email del depósito configurado"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportOpen(false)}>Cancelar</Button>
          <Button
            variant="outlined" color="secondary" onClick={handleDescargarPdf}
            disabled={exportLoading || !exportDesde || !exportHasta}
            startIcon={exportLoading ? <CircularProgress size={16}/> : <PdfIcon/>}
          >
            {exportLoading ? 'Generando...' : 'Descargar PDF'}
          </Button>
          <Button
            variant="contained" color="primary" onClick={handleEnviarEmail}
            disabled={exportEmailLoading || !exportDesde || !exportHasta}
            startIcon={exportEmailLoading ? <CircularProgress size={16}/> : <EmailIcon/>}
          >
            {exportEmailLoading ? 'Enviando...' : 'Enviar por email'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Bloc de notas ───────────────────────────────────────────────── */}
      <Paper elevation={2} sx={{ mt: 4, mb: 2, borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ bgcolor: 'warning.light', px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid', borderColor: 'warning.main', opacity: isDark ? 0.85 : 1 }}>
          <NotaIcon sx={{ color: 'warning.dark', fontSize: 20 }} />
          <Typography variant="subtitle2" fontWeight="bold" color="warning.dark" sx={{ flex: 1 }}>
            Borrador / Notas del cronograma
          </Typography>
          {notaGuardando && <CircularProgress size={14} sx={{ color: 'warning.main' }} />}
          {notaGuardada && !notaGuardando && (
            <Box display="flex" alignItems="center" gap={0.5}>
              <SaveIcon sx={{ fontSize: 14, color: 'success.main' }} />
              <Typography variant="caption" color="success.main">Guardado</Typography>
            </Box>
          )}
          {!notaGuardando && !notaGuardada && (
            <Typography variant="caption" color="text.disabled">Guardado automático</Typography>
          )}
        </Box>
        <textarea
          ref={notaRef}
          onChange={handleNotaChange}
          placeholder={"Ej: María Rodríguez pide fecha para la semana del 21...\nComedor CCC no recibe el martes, llamar antes...\nJuan vino a la oficina a pedir turno — darle el jueves 17..."}
          rows={5}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            border: 'none',
            outline: 'none',
            resize: 'vertical',
            backgroundColor: isDark ? theme.palette.background.paper : '#fffde7',
            fontSize: 14,
            fontFamily: 'monospace',
            padding: '12px 16px',
            lineHeight: 1.6,
            color: theme.palette.text.primary,
          }}
        />
      </Paper>

      <BeneficiarioForm
        open={openNuevoBen}
        onClose={() => setOpenNuevoBen(false)}
        onSuccess={async () => {
          setOpenNuevoBen(false);
          const r = await api.get('/beneficiarios?limit=5000');
          setTodosLosBens(r.data?.data ?? r.data);
        }}
      />

      {remitoFormData && (
        <RemitoForm
          open={remitoFormOpen}
          onClose={() => { setRemitoFormOpen(false); setRemitoFormData(null); }}
          onSuccess={handleRemitoFormSuccess}
          initialData={{
            beneficiarioId: remitoFormData.fila.beneficiario?.id,
            fecha: remitoFormData.fecha,
            horaRetiro: remitoFormData.fila.hora || '11:00',
            depositoId: remitoFormData.fila.depositoId,
            programaId: remitoFormData.fila.beneficiario?.programaId ?? programaActivo?.id,
            cronogramaEntregaId: remitoFormData.fila.id,
          }}
        />
      )}

      {/* Dialog detalle remito */}
      <Dialog open={detalleOpen} onClose={() => { setDetalleOpen(false); setDetalleRemito(null); }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ReceiptIcon color="primary" />
          {detalleRemito?.numero || 'Cargando...'}
          {detalleRemito && (
            <Chip label={detalleRemito.estado} size="small" sx={{ ml: 1 }}
              color={detalleRemito.estado === 'ENTREGADO' ? 'success' : detalleRemito.estado === 'CONFIRMADO' ? 'info' : detalleRemito.estado === 'PREPARADO' ? 'warning' : 'default'} />
          )}
        </DialogTitle>
        <DialogContent dividers>
          {loadingDetalle ? (
            <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
          ) : detalleRemito ? (
            <Box>
              <Box display="grid" gridTemplateColumns="1fr 1fr" gap={1.5} mb={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Beneficiario</Typography>
                  <Typography variant="body2" fontWeight="bold">{detalleRemito.beneficiario?.nombre}</Typography>
                  {detalleRemito.beneficiario?.direccion && (
                    <Typography variant="caption" color="text.secondary">{detalleRemito.beneficiario.direccion}</Typography>
                  )}
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Deposito</Typography>
                  <Typography variant="body2" fontWeight="bold">{detalleRemito.deposito?.nombre || '—'}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {detalleRemito.totalKg?.toFixed(2)} kg
                  </Typography>
                </Box>
              </Box>

              {detalleRemito.estado === 'ENTREGADO' && (
                <Alert severity="success" sx={{ mb: 2, py: 0.5 }}>
                  Entregado{detalleRemito.entregadoAt ? ` el ${new Date(detalleRemito.entregadoAt).toLocaleDateString('es-AR')}` : ''}
                  {detalleRemito.entregadoNota && <> — {detalleRemito.entregadoNota}</>}
                </Alert>
              )}

              {detalleRemito.items?.length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.100' }}>
                        <TableCell>Articulo</TableCell>
                        <TableCell align="right">Cant.</TableCell>
                        <TableCell align="right">Kg</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {detalleRemito.items.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.articulo?.descripcion || item.articulo?.nombre || '—'}</TableCell>
                          <TableCell align="right">{item.cantidad}</TableCell>
                          <TableCell align="right">{item.pesoKg?.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow sx={{ bgcolor: 'grey.50' }}>
                        <TableCell colSpan={2}><strong>TOTAL</strong></TableCell>
                        <TableCell align="right"><strong>{detalleRemito.totalKg?.toFixed(2)} kg</strong></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="info" sx={{ py: 0.5 }}>Sin articulos cargados (PREPARADO).</Alert>
              )}
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDetalleOpen(false); setDetalleRemito(null); }}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
