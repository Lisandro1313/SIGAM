// ============================================================================
// SISTEMA DE ROLES Y PERMISOS
// ============================================================================
//
// ADMIN              → Política Alimentaria - acceso total
// LOGISTICA          → Stock, depósitos, transferencias
// OPERADOR_PROGRAMA  → Beneficiarios, remitos, plantillas de su programa
// TRABAJADORA_SOCIAL → Solo relevamiento (observaciones) de beneficiarios
// ASISTENCIA_CRITICA → Solo sus propios remitos (chapas, materiales, etc.)
// VISOR              → Solo lectura: dashboard y reportes
// CHOFER             → Reparto a domicilio - solo ve sus entregas asignadas
// ============================================================================

export type Rol =
  | 'ADMIN'
  | 'LOGISTICA'
  | 'OPERADOR_PROGRAMA'
  | 'TRABAJADORA_SOCIAL'
  | 'ASISTENCIA_CRITICA'
  | 'VISOR'
  | 'CHOFER';

// Etiquetas para mostrar en UI
export const ROL_LABELS: Record<Rol, string> = {
  ADMIN: 'Política Alimentaria',
  LOGISTICA: 'Logística',
  OPERADOR_PROGRAMA: 'Operador de Programa',
  TRABAJADORA_SOCIAL: 'Trabajadora Social',
  ASISTENCIA_CRITICA: 'Asistencia Crítica',
  VISOR: 'Visor',
  CHOFER: 'Chofer',
};

// Definición de qué secciones puede ver cada rol en el menú lateral
export const MENU_POR_ROL: Record<Rol, string[]> = {
  ADMIN: [
    'dashboard',
    'programas',
    'plantillas',
    'beneficiarios',
    'articulos',
    'stock',
    'remitos',
    'cronograma',
    'mapa',
    'reportes',
    'historial-entregas',
    'tareas',
    'auditoria',
    'usuarios',
    'casos-particulares',
    'busqueda-dni',
  ],
  LOGISTICA: [
    'dashboard',
    'deposito',
    'articulos',
    'stock',
    'remitos',
    'reportes',
    'historial-entregas',
    'tareas',
  ],
  OPERADOR_PROGRAMA: [
    'dashboard',
    'programas',
    'plantillas',
    'beneficiarios',
    'remitos',
    'reportes',
    'tareas',
    'casos-particulares',
    'busqueda-dni',
  ],
  TRABAJADORA_SOCIAL: [
    'beneficiarios',
    'tareas',
    'mis-casos',
    'busqueda-dni',
  ],
  ASISTENCIA_CRITICA: [
    'dashboard',
    'programas',
    'plantillas',
    'beneficiarios',
    'articulos',
    'stock',
    'remitos',
    'cronograma',
    'mapa',
    'reportes',
    'historial-entregas',
    'tareas',
    'casos-particulares',
    'busqueda-dni',
  ],
  VISOR: [
    'dashboard',
    'programas',
    'beneficiarios',
    'reportes',
    'busqueda-dni',
  ],
  CHOFER: [
    'mis-entregas',
  ],
};

// ¿Puede este rol acceder a una sección?
export function puedeAcceder(rol: string | undefined, seccion: string): boolean {
  if (!rol) return false;
  const secciones = MENU_POR_ROL[rol as Rol] ?? [];
  return secciones.includes(seccion);
}

// ¿Puede este rol realizar una acción específica?
export const ACCIONES: Record<string, Rol[]> = {
  // Beneficiarios
  'beneficiarios.crear':        ['ADMIN', 'OPERADOR_PROGRAMA'],
  'beneficiarios.editar':       ['ADMIN', 'OPERADOR_PROGRAMA'],
  'beneficiarios.eliminar':     ['ADMIN'],
  'beneficiarios.relevamiento': ['ADMIN', 'OPERADOR_PROGRAMA', 'TRABAJADORA_SOCIAL'],

  // Artículos
  'articulos.crear':   ['ADMIN', 'LOGISTICA'],
  'articulos.editar':  ['ADMIN', 'LOGISTICA'],

  // Stock
  'stock.ingresar':    ['ADMIN', 'LOGISTICA'],
  'stock.transferir':  ['ADMIN', 'LOGISTICA'],

  // Remitos
  'remitos.crear':     ['ADMIN', 'LOGISTICA', 'OPERADOR_PROGRAMA', 'ASISTENCIA_CRITICA'],
  'remitos.confirmar': ['ADMIN', 'LOGISTICA', 'ASISTENCIA_CRITICA'],
  'remitos.eliminar':  ['ADMIN'],

  // Programas
  'programas.crear':   ['ADMIN'],
  'programas.editar':  ['ADMIN'],

  // Plantillas
  'plantillas.crear':  ['ADMIN', 'OPERADOR_PROGRAMA'],
  'plantillas.editar': ['ADMIN', 'OPERADOR_PROGRAMA'],

  // Usuarios
  'usuarios.gestionar': ['ADMIN'],

  // Entrega a domicilio
  'remitos.asignarDomicilio': ['ADMIN', 'LOGISTICA', 'OPERADOR_PROGRAMA'],
};

export function puedeHacer(rol: string | undefined, accion: string): boolean {
  if (!rol) return false;
  const rolesPermitidos = ACCIONES[accion] ?? [];
  return rolesPermitidos.includes(rol as Rol);
}
