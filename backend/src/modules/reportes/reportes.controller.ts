import { Controller, Get, Query, UseGuards, SetMetadata, BadRequestException, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportesService } from './reportes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, ROLES_KEY } from '../auth/guards/roles.guard';

const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

function parseFiltroFecha(mes?: string, anio?: string): { mes?: number; anio?: number } {
  const result: { mes?: number; anio?: number } = {};
  if (mes !== undefined) {
    const m = parseInt(mes, 10);
    if (isNaN(m) || m < 1 || m > 12) throw new BadRequestException('Mes inválido (1-12)');
    result.mes = m;
  }
  if (anio !== undefined) {
    const a = parseInt(anio, 10);
    if (isNaN(a) || a < 2000 || a > 2100) throw new BadRequestException('Año inválido');
    result.anio = a;
  }
  return result;
}

function getSecretaria(req: any): string | null {
  const rol = req.user?.rol;
  if (rol === 'ASISTENCIA_CRITICA') return 'AC';
  if (rol === 'LOGISTICA' || rol === 'VISOR') return null;
  return 'PA';
}

@ApiTags('reportes')
@Controller('reportes')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles('ADMIN', 'VISOR', 'LOGISTICA', 'OPERADOR_PROGRAMA', 'TRABAJADORA_SOCIAL')
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get('notificaciones')
  @ApiOperation({ summary: 'Notificaciones operativas para el top bar' })
  @Roles('ADMIN', 'VISOR', 'LOGISTICA', 'OPERADOR_PROGRAMA', 'TRABAJADORA_SOCIAL', 'ASISTENCIA_CRITICA')
  notificaciones(@Request() req) {
    return this.reportesService.notificaciones(getSecretaria(req));
  }

  @Get('entregas-recientes')
  @ApiOperation({ summary: 'Entregas confirmadas por depósitos en las últimas N horas (notificaciones efímeras)' })
  @Roles('ADMIN', 'VISOR', 'OPERADOR_PROGRAMA', 'TRABAJADORA_SOCIAL')
  entregasRecientes(@Query('horas') horas: string, @Request() req) {
    const h = horas ? parseInt(horas, 10) : 72;
    return this.reportesService.entregasRecientes(h, getSecretaria(req));
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard con resumen general' })
  dashboard(@Request() req) {
    return this.reportesService.dashboard(getSecretaria(req));
  }

  @Get('kilos-por-mes')
  @ApiOperation({ summary: 'Total de kilos entregados por mes' })
  kilosPorMes(@Query('mes') mes: string, @Query('anio') anio: string, @Query('programaId') programaId: string, @Request() req) {
    const { mes: m, anio: a } = parseFiltroFecha(mes, anio);
    return this.reportesService.kilosPorMes(m, a, getSecretaria(req), programaId ? parseInt(programaId) : undefined);
  }

  @Get('entregas-por-localidad')
  @ApiOperation({ summary: 'Entregas agrupadas por localidad' })
  entregasPorLocalidad(
    @Query('mes') mes: string, @Query('anio') anio: string,
    @Query('fechaDesde') fechaDesde: string, @Query('fechaHasta') fechaHasta: string,
    @Query('programaId') programaId: string,
    @Request() req,
  ) {
    const { mes: m, anio: a } = parseFiltroFecha(mes, anio);
    return this.reportesService.entregasPorLocalidad(m, a, getSecretaria(req), fechaDesde, fechaHasta, programaId ? parseInt(programaId) : undefined);
  }

  @Get('articulos-mas-distribuidos')
  @ApiOperation({ summary: 'Artículos más distribuidos' })
  articulosMasDistribuidos(
    @Query('mes') mes: string, @Query('anio') anio: string,
    @Query('fechaDesde') fechaDesde: string, @Query('fechaHasta') fechaHasta: string,
    @Query('programaId') programaId: string,
    @Request() req,
  ) {
    const { mes: m, anio: a } = parseFiltroFecha(mes, anio);
    return this.reportesService.articulosMasDistribuidos(m, a, getSecretaria(req), fechaDesde, fechaHasta, programaId ? parseInt(programaId) : undefined);
  }

  @Get('distribucion-articulos')
  @ApiOperation({ summary: 'Detalle de distribución para uno o varios artículos (espacios + casos particulares)' })
  distribucionArticulos(
    @Query('articuloIds') articuloIds: string,
    @Query('fechaDesde') fechaDesde: string, @Query('fechaHasta') fechaHasta: string,
    @Query('mes') mes: string, @Query('anio') anio: string,
    @Query('programaId') programaId: string,
    @Request() req,
  ) {
    if (!articuloIds) throw new BadRequestException('Proveer articuloIds (coma-separado)');
    const ids = articuloIds.split(',').map((s) => parseInt(s, 10)).filter((n) => !isNaN(n));
    const { mes: m, anio: a } = parseFiltroFecha(mes, anio);
    return this.reportesService.distribucionPorArticulo(
      ids,
      fechaDesde, fechaHasta,
      getSecretaria(req),
      programaId ? parseInt(programaId) : undefined,
      m, a,
    );
  }

  @Get('entregas-por-programa')
  @ApiOperation({ summary: 'Entregas por programa' })
  entregasPorPrograma(
    @Query('mes') mes: string, @Query('anio') anio: string,
    @Query('fechaDesde') fechaDesde: string, @Query('fechaHasta') fechaHasta: string,
    @Query('programaId') programaId: string,
    @Request() req,
  ) {
    const { mes: m, anio: a } = parseFiltroFecha(mes, anio);
    return this.reportesService.entregasPorPrograma(m, a, getSecretaria(req), fechaDesde, fechaHasta, programaId ? parseInt(programaId) : undefined);
  }

  @Get('stock-bajo')
  @ApiOperation({ summary: 'Artículos con stock bajo' })
  @Roles('ADMIN', 'LOGISTICA', 'VISOR')
  stockBajo() {
    return this.reportesService.stockBajo();
  }

  @Get('beneficiarios-por-programa')
  @ApiOperation({ summary: 'Beneficiarios activos agrupados por programa' })
  beneficiariosPorPrograma() {
    return this.reportesService.beneficiariosPorPrograma();
  }

  @Get('remitos-detalle')
  @ApiOperation({ summary: 'Detalle de remitos con filtros para exportación' })
  remitosDetalle(
    @Query('mes') mes: string, @Query('anio') anio: string,
    @Query('programaId') programaId: string, @Query('estado') estado: string,
    @Query('fechaDesde') fechaDesde: string, @Query('fechaHasta') fechaHasta: string,
    @Request() req,
  ) {
    const { mes: m, anio: a } = parseFiltroFecha(mes, anio);
    return this.reportesService.remitosDetalle(m, a, programaId ? parseInt(programaId) : undefined, estado, getSecretaria(req), fechaDesde, fechaHasta);
  }

  @Get('cruces-masivos')
  @ApiOperation({ summary: 'DNIs registrados en más de un programa' })
  crucesMasivos() {
    return this.reportesService.crucesMasivos();
  }

  @Get('sin-entrega')
  @ApiOperation({ summary: 'Beneficiarios activos con entrega vencida según su frecuencia' })
  beneficiariosSinEntrega(@Request() req) {
    return this.reportesService.beneficiariosSinEntregaDetalle(getSecretaria(req));
  }

  @Get('busqueda')
  @Roles('ADMIN', 'LOGISTICA', 'OPERADOR_PROGRAMA', 'TRABAJADORA_SOCIAL', 'ASISTENCIA_CRITICA', 'VISOR')
  @ApiOperation({ summary: 'Búsqueda global (beneficiarios, casos, remitos)' })
  busquedaGlobal(@Query('q') q: string, @Request() req) {
    return this.reportesService.busquedaGlobal(q, getSecretaria(req));
  }

  @Get('rendicion')
  @ApiOperation({ summary: 'Rendición ANEXO VI — beneficiarios que retiraron en el período + ingresos de mercadería' })
  rendicion(
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
    @Query('programaId') programaId: string,
    @Request() req,
  ) {
    if (!desde || !hasta) throw new BadRequestException('Proveer desde y hasta (YYYY-MM-DD)');
    return this.reportesService.rendicionAnexoVI(
      desde, hasta,
      programaId ? parseInt(programaId, 10) : undefined,
      getSecretaria(req),
    );
  }

  @Get('entregas-domicilio')
  @ApiOperation({ summary: 'Resumen de entregas a domicilio por día con estimación de combustible' })
  @Roles('ADMIN', 'VISOR', 'LOGISTICA', 'OPERADOR_PROGRAMA', 'TRABAJADORA_SOCIAL', 'ASISTENCIA_CRITICA')
  entregasDomicilio(
    @Query('mes') mes: string, @Query('anio') anio: string,
    @Query('fechaDesde') fechaDesde: string, @Query('fechaHasta') fechaHasta: string,
    @Request() req,
  ) {
    const { mes: m, anio: a } = parseFiltroFecha(mes, anio);
    return this.reportesService.entregasDomicilio(m, a, fechaDesde, fechaHasta, getSecretaria(req));
  }

  @Get('totales')
  @ApiOperation({ summary: 'Totales agregados del periodo (KPIs autoritativos sobre los remitos validos)' })
  totalesPeriodo(
    @Query('mes') mes: string, @Query('anio') anio: string,
    @Query('fechaDesde') fechaDesde: string, @Query('fechaHasta') fechaHasta: string,
    @Query('programaId') programaId: string,
    @Request() req,
  ) {
    const { mes: m, anio: a } = parseFiltroFecha(mes, anio);
    return this.reportesService.totalesPeriodo(
      m, a, fechaDesde, fechaHasta,
      programaId ? parseInt(programaId) : undefined,
      getSecretaria(req),
    );
  }

  @Get('resumen-entregas-mes')
  @ApiOperation({ summary: 'Resumen de entregas de un período: pendientes, generadas, entregadas' })
  resumenEntregasMes(
    @Query('mes') mes: string, @Query('anio') anio: string,
    @Query('fechaDesde') fechaDesde: string, @Query('fechaHasta') fechaHasta: string,
    @Query('programaId') programaId: string,
    @Request() req,
  ) {
    const { mes: m, anio: a } = parseFiltroFecha(mes, anio);
    // Requiere mes+anio OR fechaDesde+fechaHasta
    if ((!m || !a) && (!fechaDesde || !fechaHasta)) throw new BadRequestException('Proveer mes+anio o fechaDesde+fechaHasta');
    const mesFinal = m ?? new Date().getMonth() + 1;
    const anioFinal = a ?? new Date().getFullYear();
    return this.reportesService.resumenEntregasMes(mesFinal, anioFinal, getSecretaria(req), fechaDesde, fechaHasta, programaId ? parseInt(programaId) : undefined);
  }
}
