import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CronogramaService } from './cronograma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('cronograma')
@Controller('cronograma')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CronogramaController {
  constructor(private readonly cronogramaService: CronogramaService) {}

  @Post('generar')
  @Roles('ADMIN', 'LOGISTICA')
  @ApiOperation({ summary: 'Generar cronograma automático para un mes' })
  generarCronograma(@Body() body: { mes: number; anio: number }) {
    return this.cronogramaService.generarCronogramaMensual(body.mes, body.anio);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener entregas programadas' })
  obtenerEntregas(@Query() query: any) {
    return this.cronogramaService.obtenerEntregas(query);
  }

  @Post('generar-remitos-masivos')
  @Roles('ADMIN', 'LOGISTICA')
  @ApiOperation({ summary: 'Generar remitos masivos desde cronograma' })
  generarRemitosMasivos(
    @Body() body: { mes: number; anio: number; depositoId: number },
    @Request() req,
  ) {
    return this.cronogramaService.generarRemitosMasivos(
      body.mes,
      body.anio,
      body.depositoId,
      req.user.id,
    );
  }

  @Patch(':id/fecha')
  @Roles('ADMIN', 'LOGISTICA', 'OPERADOR_PROGRAMA')
  @ApiOperation({ summary: 'Actualizar fecha de entrega' })
  actualizarFecha(@Param('id') id: string, @Body() body: { fecha: Date }) {
    return this.cronogramaService.actualizarFecha(+id, body.fecha);
  }

  @Patch(':id/cancelar')
  @Roles('ADMIN', 'LOGISTICA')
  @ApiOperation({ summary: 'Cancelar entrega programada' })
  cancelar(@Param('id') id: string) {
    return this.cronogramaService.cancelarEntrega(+id);
  }
}
