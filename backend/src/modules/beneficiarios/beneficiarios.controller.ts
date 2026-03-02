import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BeneficiariosService } from './beneficiarios.service';
import { CreateBeneficiarioDto } from './dto/create-beneficiario.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('beneficiarios')
@Controller('beneficiarios')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class BeneficiariosController {
  constructor(private readonly beneficiariosService: BeneficiariosService) {}

  @Post()
  @Roles('ADMIN', 'OPERADOR_PROGRAMA')
  @ApiOperation({ summary: 'Crear beneficiario' })
  create(@Body() createBeneficiarioDto: CreateBeneficiarioDto) {
    return this.beneficiariosService.create(createBeneficiarioDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar beneficiarios' })
  findAll(@Query() filtros: any) {
    return this.beneficiariosService.findAll(filtros);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener beneficiario por ID' })
  findOne(@Param('id') id: string) {
    return this.beneficiariosService.findOne(+id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'OPERADOR_PROGRAMA')
  @ApiOperation({ summary: 'Actualizar beneficiario' })
  update(@Param('id') id: string, @Body() updateData: any) {
    return this.beneficiariosService.update(+id, updateData);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Desactivar beneficiario' })
  remove(@Param('id') id: string) {
    return this.beneficiariosService.remove(+id);
  }
}
