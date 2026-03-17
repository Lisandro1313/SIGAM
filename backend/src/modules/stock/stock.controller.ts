import { Controller, Get, Post, Body, Query, UseGuards, Request, Param, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StockService } from './stock.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('stock')
@Controller('stock')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todo el stock' })
  obtenerTodo(@Request() req) {
    const secretaria = req.user.rol === 'ASISTENCIA_CRITICA' ? 'CITA'
      : req.user.rol === 'LOGISTICA' || req.user.rol === 'VISOR' ? null
      : 'PA';
    return this.stockService.obtenerTodoElStock(secretaria);
  }

  @Get('alertas')
  @ApiOperation({ summary: 'Artículos con stock por debajo del mínimo configurado' })
  obtenerAlertas() {
    return this.stockService.obtenerAlertas();
  }

  @Get('deposito/:id')
  @ApiOperation({ summary: 'Obtener stock por depósito' })
  obtenerPorDeposito(@Param('id') id: string, @Request() req) {
    const secretaria = req.user.rol === 'ASISTENCIA_CRITICA' ? 'CITA'
      : req.user.rol === 'LOGISTICA' || req.user.rol === 'VISOR' ? null
      : 'PA';
    return this.stockService.obtenerStockPorDeposito(+id, secretaria);
  }

  @Post('ingreso')
  @Roles('ADMIN', 'LOGISTICA')
  @UseInterceptors(FileInterceptor('documento', { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Registrar ingreso de mercadería (con documento opcional)' })
  registrarIngreso(
    @Body() body: any,
    @Request() req,
    @UploadedFile() documento?: Express.Multer.File,
  ) {
    return this.stockService.registrarIngreso(
      parseInt(body.articuloId),
      parseInt(body.depositoId),
      parseFloat(body.cantidad),
      req.user.id,
      body.observaciones,
      documento,
    );
  }

  @Post('transferir')
  @Roles('ADMIN', 'LOGISTICA')
  @ApiOperation({ summary: 'Transferir entre depósitos' })
  transferir(@Body() body: any, @Request() req) {
    return this.stockService.transferir(
      body.articuloId,
      body.depositoOrigenId,
      body.depositoDestinoId,
      body.cantidad,
      req.user.id,
    );
  }

  @Get('movimientos')
  @ApiOperation({ summary: 'Obtener movimientos de stock' })
  obtenerMovimientos(@Query() filtros: any) {
    return this.stockService.obtenerMovimientos(filtros);
  }
}
