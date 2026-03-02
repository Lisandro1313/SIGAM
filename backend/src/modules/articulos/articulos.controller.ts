import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ArticulosService } from './articulos.service';
import { CreateArticuloDto } from './dto/create-articulo.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('articulos')
@Controller('articulos')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ArticulosController {
  constructor(private readonly articulosService: ArticulosService) {}

  @Post()
  @Roles('ADMIN', 'LOGISTICA')
  @ApiOperation({ summary: 'Crear artículo' })
  create(@Body() createArticuloDto: CreateArticuloDto) {
    return this.articulosService.create(createArticuloDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar artículos' })
  findAll() {
    return this.articulosService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener artículo por ID' })
  findOne(@Param('id') id: string) {
    return this.articulosService.findOne(+id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'LOGISTICA')
  @ApiOperation({ summary: 'Actualizar artículo' })
  update(@Param('id') id: string, @Body() updateData: any) {
    return this.articulosService.update(+id, updateData);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Desactivar artículo' })
  remove(@Param('id') id: string) {
    return this.articulosService.remove(+id);
  }
}
