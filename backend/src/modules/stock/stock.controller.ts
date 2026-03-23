import { Controller, Get, Post, Patch, Delete, Body, Query, UseGuards, Request, Param, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
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
    const secretaria = req.user.rol === 'ASISTENCIA_CRITICA' ? 'AC'
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
    const secretaria = req.user.rol === 'ASISTENCIA_CRITICA' ? 'AC'
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
    const articuloId = parseInt(body.articuloId, 10);
    const depositoId = parseInt(body.depositoId, 10);
    const cantidad = parseFloat(body.cantidad);
    if (isNaN(articuloId) || isNaN(depositoId) || isNaN(cantidad) || cantidad <= 0) {
      throw new BadRequestException('articuloId, depositoId y cantidad son requeridos y deben ser números válidos');
    }
    return this.stockService.registrarIngreso(
      articuloId,
      depositoId,
      cantidad,
      req.user.id,
      body.observaciones,
      documento,
    );
  }

  @Post('ajuste')
  @Roles('ADMIN', 'LOGISTICA')
  @ApiOperation({ summary: 'Ajuste / reconciliación de stock a una cantidad real' })
  ajustarStock(@Body() body: any, @Request() req) {
    const articuloId = parseInt(body.articuloId, 10);
    const depositoId = parseInt(body.depositoId, 10);
    const cantidadReal = parseFloat(body.cantidadReal);
    if (isNaN(articuloId) || isNaN(depositoId) || isNaN(cantidadReal)) {
      throw new BadRequestException('articuloId, depositoId y cantidadReal son requeridos');
    }
    return this.stockService.ajustarStock(articuloId, depositoId, cantidadReal, req.user.id, body.observaciones);
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

  // ── Lotes ──────────────────────────────────────────────────────────────────

  @Get('lotes')
  @ApiOperation({ summary: 'Listar lotes de artículos' })
  getLotes(@Query('depositoId') depositoId?: string, @Query('articuloId') articuloId?: string) {
    return this.stockService.getLotes(
      depositoId ? +depositoId : undefined,
      articuloId ? +articuloId : undefined,
    );
  }

  @Post('lotes')
  @Roles('ADMIN', 'LOGISTICA')
  @ApiOperation({ summary: 'Crear lote de artículo' })
  createLote(@Body() body: { articuloId: number; depositoId: number; cantidad: number; fechaVencimiento: string; lote?: string }) {
    if (!body.articuloId || !body.depositoId || !body.cantidad || !body.fechaVencimiento) {
      throw new BadRequestException('articuloId, depositoId, cantidad y fechaVencimiento son requeridos');
    }
    return this.stockService.createLote(body);
  }

  @Patch('lotes/:id')
  @Roles('ADMIN', 'LOGISTICA')
  @ApiOperation({ summary: 'Actualizar lote' })
  updateLote(@Param('id') id: string, @Body() body: { cantidad?: number; fechaVencimiento?: string; lote?: string }) {
    return this.stockService.updateLote(+id, body);
  }

  @Delete('lotes/:id')
  @Roles('ADMIN', 'LOGISTICA')
  @ApiOperation({ summary: 'Eliminar lote' })
  deleteLote(@Param('id') id: string) {
    return this.stockService.deleteLote(+id);
  }
}
