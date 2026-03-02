import { Controller, Get, Post, Body, Query, UseGuards, Request, Param } from '@nestjs/common';
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
  obtenerTodo() {
    return this.stockService.obtenerTodoElStock();
  }

  @Get('deposito/:id')
  @ApiOperation({ summary: 'Obtener stock por depósito' })
  obtenerPorDeposito(@Param('id') id: string) {
    return this.stockService.obtenerStockPorDeposito(+id);
  }

  @Post('ingreso')
  @Roles('ADMIN', 'LOGISTICA')
  @ApiOperation({ summary: 'Registrar ingreso de mercadería' })
  registrarIngreso(@Body() body: any, @Request() req) {
    return this.stockService.registrarIngreso(
      body.articuloId,
      body.depositoId,
      body.cantidad,
      req.user.id,
      body.observaciones,
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
