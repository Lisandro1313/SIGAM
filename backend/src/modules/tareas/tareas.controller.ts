import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, Request, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TareasService } from './tareas.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { getSecretariaFromReq } from '../../shared/auth/secretaria.util';
import { assertMime, MIME_DOCUMENTS } from '../../shared/upload/upload.util';

@ApiTags('tareas')
@Controller('tareas')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TareasController {
  constructor(private readonly tareasService: TareasService) {}

  @Get()
  @ApiOperation({ summary: 'Listar tareas' })
  findAll(
    @Query('estado') estado: string,
    @Query('programaId') programaId: string,
    @Query('prioridad') prioridad: string,
    @Request() req,
  ) {
    return this.tareasService.findAll({
      estado,
      programaId: programaId ? parseInt(programaId) : undefined,
      prioridad,
      secretaria: getSecretariaFromReq(req),
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

  // ── Documentos adjuntos ─────────────────────────────────────────────────────

  @Get(':id/documentos')
  @ApiOperation({ summary: 'Listar documentos adjuntos de la tarea' })
  getDocumentos(@Param('id') id: string) {
    return this.tareasService.getDocumentos(+id);
  }

  @Post(':id/documentos')
  @Roles('ADMIN', 'LOGISTICA', 'OPERADOR_PROGRAMA', 'TRABAJADORA_SOCIAL')
  @UseInterceptors(FileInterceptor('archivo', { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Adjuntar documento a la tarea' })
  async uploadDocumento(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { nombre?: string; tipo?: string },
  ) {
    assertMime(file, MIME_DOCUMENTS);
    return this.tareasService.uploadDocumento(+id, file, body.nombre || file.originalname, body.tipo);
  }

  @Delete(':id/documentos/:docId')
  @Roles('ADMIN', 'LOGISTICA', 'OPERADOR_PROGRAMA', 'TRABAJADORA_SOCIAL')
  @ApiOperation({ summary: 'Eliminar documento adjunto' })
  deleteDocumento(@Param('docId') docId: string) {
    return this.tareasService.deleteDocumento(+docId);
  }
}
