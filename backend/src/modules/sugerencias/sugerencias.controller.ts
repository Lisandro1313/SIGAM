import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SugerenciasService } from './sugerencias.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, ROLES_KEY } from '../auth/guards/roles.guard';
import { SetMetadata } from '@nestjs/common';

const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

@ApiTags('sugerencias')
@Controller('sugerencias')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles('ADMIN', 'VISOR', 'LOGISTICA', 'OPERADOR_PROGRAMA')
export class SugerenciasController {
  constructor(private readonly service: SugerenciasService) {}

  @Get()
  @ApiOperation({ summary: 'Sugerencias inteligentes generadas a partir del estado actual del sistema' })
  listar(@Request() req) {
    const rol = req.user?.rol;
    const secretaria = rol === 'ASISTENCIA_CRITICA' ? 'AC' : (rol === 'LOGISTICA' || rol === 'VISOR' ? null : 'PA');
    return this.service.generar(secretaria);
  }
}
