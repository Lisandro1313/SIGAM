import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TareasService } from './tareas.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('tareas')
@Controller('tareas')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TareasController {
  constructor(private readonly tareasService: TareasService) {}

  @Get()
  @ApiOperation({ summary: 'Listar tareas' })
  findAll(
    @Query('estado') estado?: string,
    @Query('programaId') programaId?: string,
    @Query('prioridad') prioridad?: string,
  ) {
    return this.tareasService.findAll({
      estado,
      programaId: programaId ? parseInt(programaId) : undefined,
      prioridad,
    });
  }

  @Post()
  @Roles('ADMIN', 'LOGISTICA', 'OPERADOR_PROGRAMA', 'TRABAJADORA_SOCIAL')
  @ApiOperation({ summary: 'Crear tarea' })
  create(@Body() body: any) {
    return this.tareasService.create(body);
  }

  @Patch(':id')
  @Roles('ADMIN', 'LOGISTICA', 'OPERADOR_PROGRAMA', 'TRABAJADORA_SOCIAL')
  @ApiOperation({ summary: 'Editar tarea' })
  update(@Param('id') id: string, @Body() body: any) {
    return this.tareasService.update(+id, body);
  }

  @Post(':id/completar')
  @Roles('ADMIN', 'LOGISTICA', 'OPERADOR_PROGRAMA', 'TRABAJADORA_SOCIAL')
  @ApiOperation({ summary: 'Marcar tarea como completada' })
  completar(
    @Param('id') id: string,
    @Body() body: { completadoPorNombre?: string; completadoNota?: string },
  ) {
    return this.tareasService.completar(+id, body);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Eliminar tarea' })
  remove(@Param('id') id: string) {
    return this.tareasService.remove(+id);
  }
}
