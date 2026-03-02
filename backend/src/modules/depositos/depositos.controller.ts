import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DepositosService } from './depositos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('depositos')
@Controller('depositos')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DepositosController {
  constructor(private readonly depositosService: DepositosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar depósitos' })
  findAll() {
    return this.depositosService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener depósito por ID' })
  findOne(@Param('id') id: string) {
    return this.depositosService.findOne(+id);
  }
}
