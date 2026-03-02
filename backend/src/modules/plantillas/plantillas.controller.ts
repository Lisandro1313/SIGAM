import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PlantillasService } from './plantillas.service';
import { CreatePlantillaDto } from './dto/create-plantilla.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('plantillas')
@Controller('plantillas')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PlantillasController {
  constructor(private readonly plantillasService: PlantillasService) {}

  @Post()
  @Roles('ADMIN', 'OPERADOR_PROGRAMA')
  @ApiOperation({ summary: 'Crear plantilla de entrega' })
  create(@Body() createPlantillaDto: CreatePlantillaDto) {
    return this.plantillasService.create(createPlantillaDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar plantillas' })
  findAll(@Query('programaId') programaId?: string) {
    return this.plantillasService.findAll(programaId ? +programaId : undefined);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener plantilla por ID' })
  findOne(@Param('id') id: string) {
    return this.plantillasService.findOne(+id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'OPERADOR_PROGRAMA')
  @ApiOperation({ summary: 'Actualizar plantilla' })
  update(@Param('id') id: string, @Body() updateData: any) {
    return this.plantillasService.update(+id, updateData);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Desactivar plantilla' })
  remove(@Param('id') id: string) {
    return this.plantillasService.remove(+id);
  }
}
