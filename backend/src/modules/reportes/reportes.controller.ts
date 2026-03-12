import { Controller, Get, Query, UseGuards, SetMetadata, BadRequestException } from '@nestjs/common';
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

@ApiTags('reportes')
@Controller('reportes')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles('ADMIN', 'VISOR', 'LOGISTICA', 'OPERADOR_PROGRAMA', 'TRABAJADORA_SOCIAL')
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard con resumen general' })
  dashboard() {
    return this.reportesService.dashboard();
  }

  @Get('kilos-por-mes')
  @ApiOperation({ summary: 'Total de kilos entregados por mes' })
  kilosPorMes(@Query('mes') mes?: string, @Query('anio') anio?: string) {
    const { mes: m, anio: a } = parseFiltroFecha(mes, anio);
    return this.reportesService.kilosPorMes(m, a);
  }

  @Get('entregas-por-localidad')
  @ApiOperation({ summary: 'Entregas agrupadas por localidad' })
  entregasPorLocalidad(@Query('mes') mes?: string, @Query('anio') anio?: string) {
    const { mes: m, anio: a } = parseFiltroFecha(mes, anio);
    return this.reportesService.entregasPorLocalidad(m, a);
  }

  @Get('articulos-mas-distribuidos')
  @ApiOperation({ summary: 'Artículos más distribuidos' })
  articulosMasDistribuidos(@Query('mes') mes?: string, @Query('anio') anio?: string) {
    const { mes: m, anio: a } = parseFiltroFecha(mes, anio);
    return this.reportesService.articulosMasDistribuidos(m, a);
  }

  @Get('entregas-por-programa')
  @ApiOperation({ summary: 'Entregas por programa' })
  entregasPorPrograma(@Query('mes') mes?: string, @Query('anio') anio?: string) {
    const { mes: m, anio: a } = parseFiltroFecha(mes, anio);
    return this.reportesService.entregasPorPrograma(m, a);
  }

  @Get('stock-bajo')
  @ApiOperation({ summary: 'Artículos con stock bajo' })
  @Roles('ADMIN', 'LOGISTICA', 'VISOR')
  stockBajo() {
    return this.reportesService.stockBajo();
  }
}
