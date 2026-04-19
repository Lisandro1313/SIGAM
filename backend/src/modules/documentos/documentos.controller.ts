import {
  Controller, Get, Post, Delete, Body, Param, Query, Request,
  UseGuards, UseInterceptors, UploadedFile, SetMetadata,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DocumentosService } from './documentos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, ROLES_KEY } from '../auth/guards/roles.guard';
import { getSecretariaFromReq } from '../../shared/auth/secretaria.util';
import { assertMime, MIME_DOCUMENTS } from '../../shared/upload/upload.util';

const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

const ROLES_LECTURA = ['ADMIN', 'VISOR', 'LOGISTICA', 'OPERADOR_PROGRAMA', 'TRABAJADORA_SOCIAL', 'ASISTENCIA_CRITICA'];
const ROLES_SUBIDA  = ['ADMIN', 'LOGISTICA', 'OPERADOR_PROGRAMA', 'ASISTENCIA_CRITICA'];

@ApiTags('documentos')
@Controller('documentos')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DocumentosController {
  constructor(private readonly service: DocumentosService) {}

  @Get()
  @Roles(...ROLES_LECTURA)
  @ApiOperation({ summary: 'Listar documentos del repositorio central' })
  listar(@Query('categoria') categoria: string, @Query('q') q: string, @Request() req) {
    return this.service.listar({ categoria, q, secretaria: getSecretariaFromReq(req) });
  }

  @Post('upload')
  @Roles(...ROLES_SUBIDA)
  @UseInterceptors(FileInterceptor('archivo', { storage: memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Subir un archivo al repositorio (máx 15 MB)' })
  upload(@UploadedFile() archivo: Express.Multer.File, @Body() body: any, @Request() req) {
    assertMime(archivo, MIME_DOCUMENTS);
    return this.service.upload(archivo, body, { id: req.user.id, nombre: req.user.nombre, rol: req.user.rol });
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Eliminar un documento' })
  eliminar(@Param('id') id: string) {
    return this.service.eliminar(+id);
  }
}
