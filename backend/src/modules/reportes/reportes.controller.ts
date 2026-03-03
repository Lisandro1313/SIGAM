import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportesService } from './reportes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('reportes')
@Controller('reportes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
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
    return this.reportesService.kilosPorMes(
      mes ? parseInt(mes) : undefined,
      anio ? parseInt(anio) : undefined,
    );
  }

  @Get('entregas-por-localidad')
  @ApiOperation({ summary: 'Entregas agrupadas por localidad' })
  entregasPorLocalidad(@Query('mes') mes?: string, @Query('anio') anio?: string) {
    return this.reportesService.entregasPorLocalidad(
      mes ? parseInt(mes) : undefined,
      anio ? parseInt(anio) : undefined,
    );
  }

  @Get('articulos-mas-distribuidos')
  @ApiOperation({ summary: 'Artículos más distribuidos' })
  articulosMasDistribuidos(@Query('mes') mes?: string, @Query('anio') anio?: string) {
    return this.reportesService.articulosMasDistribuidos(
      mes ? parseInt(mes) : undefined,
      anio ? parseInt(anio) : undefined,
    );
  }

  @Get('entregas-por-programa')
  @ApiOperation({ summary: 'Entregas por programa' })
  entregasPorPrograma(@Query('mes') mes?: string, @Query('anio') anio?: string) {
    return this.reportesService.entregasPorPrograma(
      mes ? parseInt(mes) : undefined,
      anio ? parseInt(anio) : undefined,
    );
  }

  @Get('stock-bajo')
  @ApiOperation({ summary: 'Artículos con stock bajo' })
  stockBajo() {
    return this.reportesService.stockBajo();
  }
}
