import { Controller, Get, Post, Patch, Delete, Body, Param, Request, UseGuards, SetMetadata } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ListasSeguimientoService } from './listas-seguimiento.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, ROLES_KEY } from '../auth/guards/roles.guard';

const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

const ROLES_LECTURA = ['ADMIN', 'VISOR', 'LOGISTICA', 'OPERADOR_PROGRAMA', 'TRABAJADORA_SOCIAL', 'ASISTENCIA_CRITICA', 'NUTRICIONISTA'];
const ROLES_EDICION = ['ADMIN', 'OPERADOR_PROGRAMA', 'LOGISTICA', 'TRABAJADORA_SOCIAL', 'ASISTENCIA_CRITICA', 'NUTRICIONISTA'];

function getSecretaria(req: any): string | null {
  const rol = req.user?.rol;
  if (rol === 'ASISTENCIA_CRITICA') return 'AC';
  if (rol === 'LOGISTICA' || rol === 'VISOR' || rol === 'ADMIN') return null;
  return 'PA';
}

@ApiTags('listas-seguimiento')
@Controller('listas-seguimiento')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ListasSeguimientoController {
  constructor(private readonly service: ListasSeguimientoService) {}

  @Get()
  @Roles(...ROLES_LECTURA)
  @ApiOperation({ summary: 'Listar listas de seguimiento con conteo de items' })
  listar(@Request() req) { return this.service.listar(getSecretaria(req)); }

  @Get(':id')
  @Roles(...ROLES_LECTURA)
  @ApiOperation({ summary: 'Detalle de lista con sus items y beneficiarios' })
  obtener(@Param('id') id: string, @Request() req) {
    return this.service.obtener(+id, getSecretaria(req));
  }

  @Post()
  @Roles(...ROLES_EDICION)
  @ApiOperation({ summary: 'Crear lista' })
  crear(@Body() data: any, @Request() req) {
    return this.service.crear(data, { id: req.user.id, nombre: req.user.nombre, rol: req.user.rol });
  }

  @Patch(':id')
  @Roles(...ROLES_EDICION)
  @ApiOperation({ summary: 'Actualizar lista' })
  actualizar(@Param('id') id: string, @Body() data: any) {
    return this.service.actualizar(+id, data);
  }

  @Delete(':id')
  @Roles(...ROLES_EDICION)
  @ApiOperation({ summary: 'Eliminar lista' })
  eliminar(@Param('id') id: string) { return this.service.eliminar(+id); }

  @Post('reordenar')
  @Roles(...ROLES_EDICION)
  @ApiOperation({ summary: 'Reordenar listas (bulk)' })
  reordenar(@Body() body: { orden: Array<{ id: number; orden: number }> }) {
    return this.service.reordenar(body.orden ?? []);
  }

  // ─── Items ────────────────────────────────────────────────
  @Post(':id/items')
  @Roles(...ROLES_EDICION)
  @ApiOperation({ summary: 'Agregar beneficiarios a una lista (bulk)' })
  agregarItems(@Param('id') id: string, @Body() body: { beneficiarioIds: number[] }, @Request() req) {
    return this.service.agregarItems(+id, body.beneficiarioIds ?? [], { nombre: req.user.nombre });
  }

  @Patch(':id/items/:itemId')
  @Roles(...ROLES_EDICION)
  @ApiOperation({ summary: 'Actualizar valores/notas de un item' })
  actualizarItem(@Param('itemId') itemId: string, @Body() data: any, @Request() req) {
    return this.service.actualizarItem(+itemId, data, { nombre: req.user.nombre });
  }

  @Delete(':id/items/:itemId')
  @Roles(...ROLES_EDICION)
  @ApiOperation({ summary: 'Quitar item de la lista' })
  eliminarItem(@Param('itemId') itemId: string) { return this.service.eliminarItem(+itemId); }

  @Post(':id/items/bulk-delete')
  @Roles(...ROLES_EDICION)
  @ApiOperation({ summary: 'Quitar varios items en batch' })
  bulkDelete(@Param('id') id: string, @Body() body: { itemIds: number[] }) {
    return this.service.eliminarItemsBulk(+id, body.itemIds ?? []);
  }
}
