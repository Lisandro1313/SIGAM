import { Controller, Get, Post, Patch, Delete, Body, Param, Request, UseGuards, SetMetadata } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PlantillasDocService } from './plantillas-doc.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, ROLES_KEY } from '../auth/guards/roles.guard';
import { getSecretariaFromReq } from '../../shared/auth/secretaria.util';

const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

const ROLES_LECTURA = ['ADMIN', 'VISOR', 'LOGISTICA', 'OPERADOR_PROGRAMA', 'TRABAJADORA_SOCIAL', 'ASISTENCIA_CRITICA'];
const ROLES_EDICION = ['ADMIN', 'OPERADOR_PROGRAMA', 'LOGISTICA', 'ASISTENCIA_CRITICA'];

@ApiTags('plantillas-doc')
@Controller('plantillas-doc')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PlantillasDocController {
  constructor(private readonly service: PlantillasDocService) {}

  @Get()
  @Roles(...ROLES_LECTURA)
  @ApiOperation({ summary: 'Listar plantillas de documento' })
  listar(@Request() req) { return this.service.listar(getSecretariaFromReq(req)); }

  @Get(':id')
  @Roles(...ROLES_LECTURA)
  obtener(@Param('id') id: string) { return this.service.obtener(+id); }

  @Post()
  @Roles(...ROLES_EDICION)
  @ApiOperation({ summary: 'Crear nueva plantilla' })
  crear(@Body() data: any, @Request() req) {
    return this.service.crear(data, { id: req.user.id, nombre: req.user.nombre, rol: req.user.rol });
  }

  @Patch(':id')
  @Roles(...ROLES_EDICION)
  @ApiOperation({ summary: 'Actualizar plantilla' })
  actualizar(@Param('id') id: string, @Body() data: any) {
    return this.service.actualizar(+id, data);
  }

  @Post(':id/duplicar')
  @Roles(...ROLES_EDICION)
  @ApiOperation({ summary: 'Duplicar plantilla' })
  duplicar(@Param('id') id: string, @Request() req) {
    return this.service.duplicar(+id, { id: req.user.id, nombre: req.user.nombre, rol: req.user.rol });
  }

  @Delete(':id')
  @Roles('ADMIN', 'OPERADOR_PROGRAMA')
  @ApiOperation({ summary: 'Eliminar plantilla (sólo custom, no built-in)' })
  eliminar(@Param('id') id: string) { return this.service.eliminar(+id); }

  @Post('reset-defaults')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Restaurar plantillas built-in al contenido original' })
  resetDefaults() { return this.service.resetDefaults(); }

  // ─── Historial de documentos generados ───
  @Post('historial/registrar')
  @Roles(...ROLES_LECTURA)
  @ApiOperation({ summary: 'Registrar que se generó/imprimió un documento' })
  registrarGeneracion(
    @Body() data: { plantillaId?: number; plantillaTitulo: string; cantidadEspacios?: number; contexto?: any },
    @Request() req,
  ) {
    return this.service.registrarGeneracion(data, { id: req.user.id, nombre: req.user.nombre, rol: req.user.rol });
  }

  @Get('historial/listar')
  @Roles(...ROLES_LECTURA)
  @ApiOperation({ summary: 'Historial de documentos generados' })
  listarHistorial(@Request() req) {
    return this.service.historialGeneraciones(getSecretariaFromReq(req));
  }
}
