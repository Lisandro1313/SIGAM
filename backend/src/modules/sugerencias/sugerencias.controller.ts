import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SugerenciasService } from './sugerencias.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, ROLES_KEY } from '../auth/guards/roles.guard';
import { SetMetadata } from '@nestjs/common';
import { getSecretariaFromReq } from '../../shared/auth/secretaria.util';

const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

@ApiTags('sugerencias')
@Controller('sugerencias')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles('ADMIN', 'VISOR', 'LOGISTICA', 'OPERADOR_PROGRAMA', 'ASISTENCIA_CRITICA')
export class SugerenciasController {
  constructor(private readonly service: SugerenciasService) {}

  @Get()
  @ApiOperation({ summary: 'Sugerencias inteligentes generadas a partir del estado actual del sistema' })
  listar(@Request() req) {
    return this.service.generar(getSecretariaFromReq(req));
  }

  @Get('historial-acciones')
  @ApiOperation({ summary: 'Sugerencias marcadas como hechas o descartadas recientemente' })
  historial(@Request() req) {
    return this.service.historialAcciones(getSecretariaFromReq(req));
  }

  @Post(':clave/accion')
  @ApiOperation({ summary: 'Marcar sugerencia como hecha o descartada' })
  accion(@Param('clave') clave: string, @Body() body: { accion: 'HECHA' | 'DESCARTADA'; dias?: number }, @Request() req) {
    const accion = body.accion === 'DESCARTADA' ? 'DESCARTADA' : 'HECHA';
    const dias = Math.max(1, Math.min(90, body.dias ?? (accion === 'HECHA' ? 14 : 30)));
    return this.service.accion(clave, accion, dias, { id: req.user.id, nombre: req.user.nombre, rol: req.user.rol });
  }

  @Post(':clave/reactivar')
  @ApiOperation({ summary: 'Volver a mostrar una sugerencia oculta' })
  reactivar(@Param('clave') clave: string, @Request() req) {
    return this.service.reactivar(clave, { rol: req.user.rol });
  }
}
