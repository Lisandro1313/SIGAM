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
  if (rol === 'ASISTENCIA_CRITICA') return 'CITA';
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

  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard con resumen general' })
  dashboard(@Request() req) {
    return this.reportesService.dashboard(getSecretaria(req));
  }

  @Get('kilos-por-mes')
  @ApiOperation({ summary: 'Total de kilos entregados por mes' })
  kilosPorMes(@Query('mes') mes: string, @Query('anio') anio: string, @Request() req) {
    const { mes: m, anio: a } = parseFiltroFecha(mes, anio);
    return this.reportesService.kilosPorMes(m, a, getSecretaria(req));
  }

  @Get('entregas-por-localidad')
  @ApiOperation({ summary: 'Entregas agrupadas por localidad' })
  entregasPorLocalidad(@Query('mes') mes: string, @Query('anio') anio: string, @Request() req) {
    const { mes: m, anio: a } = parseFiltroFecha(mes, anio);
    return this.reportesService.entregasPorLocalidad(m, a, getSecretaria(req));
  }

  @Get('articulos-mas-distribuidos')
  @ApiOperation({ summary: 'Artículos más distribuidos' })
  articulosMasDistribuidos(
    @Query('mes') mes: string, @Query('anio') anio: string,
    @Query('fechaDesde') fechaDesde: string, @Query('fechaHasta') fechaHasta: string,
    @Request() req,
  ) {
    const { mes: m, anio: a } = parseFiltroFecha(mes, anio);
    return this.reportesService.articulosMasDistribuidos(m, a, getSecretaria(req), fechaDesde, fechaHasta);
  }

  @Get('entregas-por-programa')
  @ApiOperation({ summary: 'Entregas por programa' })
  entregasPorPrograma(
    @Query('mes') mes: string, @Query('anio') anio: string,
    @Query('fechaDesde') fechaDesde: string, @Query('fechaHasta') fechaHasta: string,
    @Request() req,
  ) {
    const { mes: m, anio: a } = parseFiltroFecha(mes, anio);
    return this.reportesService.entregasPorPrograma(m, a, getSecretaria(req), fechaDesde, fechaHasta);
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

  @Get('resumen-entregas-mes')
  @ApiOperation({ summary: 'Resumen de entregas de un período: pendientes, generadas, entregadas' })
  resumenEntregasMes(
    @Query('mes') mes: string, @Query('anio') anio: string,
    @Query('fechaDesde') fechaDesde: string, @Query('fechaHasta') fechaHasta: string,
    @Request() req,
  ) {
    const { mes: m, anio: a } = parseFiltroFecha(mes, anio);
    // Requiere mes+anio OR fechaDesde+fechaHasta
    if ((!m || !a) && (!fechaDesde || !fechaHasta)) throw new BadRequestException('Proveer mes+anio o fechaDesde+fechaHasta');
    const mesFinal = m ?? new Date().getMonth() + 1;
    const anioFinal = a ?? new Date().getFullYear();
    return this.reportesService.resumenEntregasMes(mesFinal, anioFinal, getSecretaria(req), fechaDesde, fechaHasta);
  }
}
