import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditoriaService } from './auditoria.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('auditoria')
@Controller('auditoria')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles('ADMIN')
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener logs de auditoría' })
  findAll(
    @Query('usuarioId') usuarioId?: string,
    @Query('metodo') metodo?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('buscar') buscar?: string,
  ) {
    return this.auditoriaService.findAll({
      usuarioId: usuarioId ? parseInt(usuarioId) : undefined,
      metodo,
      desde,
      hasta,
      buscar,
    });
  }

  @Get('usuarios')
  @ApiOperation({ summary: 'Usuarios que aparecen en el log' })
  getUsuarios() {
    return this.auditoriaService.getUsuarios();
  }
}
