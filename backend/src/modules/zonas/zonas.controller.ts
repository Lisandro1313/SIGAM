import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ZonasService } from './zonas.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('zonas')
@Controller('zonas')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ZonasController {
  constructor(private readonly zonasService: ZonasService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todas las zonas activas' })
  findAll() {
    return this.zonasService.findAll();
  }

  @Post()
  @Roles('ADMIN', 'LOGISTICA')
  @ApiOperation({ summary: 'Crear zona' })
  create(@Body() body: { nombre: string; color?: string; geojson: string }) {
    return this.zonasService.create(body);
  }

  @Patch(':id')
  @Roles('ADMIN', 'LOGISTICA')
  @ApiOperation({ summary: 'Actualizar zona' })
  update(@Param('id') id: string, @Body() body: { nombre?: string; color?: string; geojson?: string }) {
    return this.zonasService.update(+id, body);
  }

  @Delete(':id')
  @Roles('ADMIN', 'LOGISTICA')
  @ApiOperation({ summary: 'Eliminar zona (soft delete)' })
  remove(@Param('id') id: string) {
    return this.zonasService.remove(+id);
  }
}
