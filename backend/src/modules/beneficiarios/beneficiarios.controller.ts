import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Request } from '@nestjs/common';
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

  @Get('localidades')
  @ApiOperation({ summary: 'Listar localidades disponibles' })
  getLocalidades() {
    return this.beneficiariosService.getLocalidades();
  }

  @Get()
  @Roles('ADMIN', 'LOGISTICA', 'OPERADOR_PROGRAMA', 'TRABAJADORA_SOCIAL', 'VISOR')
  @ApiOperation({ summary: 'Listar beneficiarios' })
  findAll(@Query() filtros: any) {
    return this.beneficiariosService.findAll(filtros);
  }

  @Get(':id')
  @Roles('ADMIN', 'LOGISTICA', 'OPERADOR_PROGRAMA', 'TRABAJADORA_SOCIAL', 'VISOR')
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

  // Endpoint exclusivo para Trabajadoras Sociales: solo actualiza observaciones
  @Patch(':id/relevamiento')
  @Roles('ADMIN', 'OPERADOR_PROGRAMA', 'TRABAJADORA_SOCIAL')
  @ApiOperation({ summary: 'Actualizar relevamiento / observaciones del beneficiario' })
  actualizarRelevamiento(
    @Param('id') id: string,
    @Body() body: { observaciones: string },
    @Request() req,
  ) {
    return this.beneficiariosService.update(+id, {
      observaciones: body.observaciones,
    });
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Desactivar beneficiario' })
  remove(@Param('id') id: string) {
    return this.beneficiariosService.remove(+id);
  }
}
