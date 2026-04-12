import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, Request, UseInterceptors, UploadedFiles,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { TareasService } from './tareas.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

const ALLOWED_MIMES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

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
    const secretaria = req.user.rol === 'ASISTENCIA_CRITICA' ? 'AC'
      : req.user.rol === 'LOGISTICA' || req.user.rol === 'VISOR' ? null
      : 'PA';
    return this.tareasService.findAll({
      estado,
      programaId: programaId ? parseInt(programaId) : undefined,
      prioridad,
      secretaria,
    });
  }

  @Post()
  @Roles('ADMIN', 'LOGISTICA', 'OPERADOR_PROGRAMA', 'TRABAJADORA_SOCIAL')
  @ApiOperation({ summary: 'Crear tarea (con archivos adjuntos opcionales)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('archivos', 10, {
      storage: memoryStorage(),
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIMES.includes(file.mimetype)) cb(null, true);
        else cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`), false);
      },
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB por archivo
    }),
  )
  create(
    @Body() body: any,
    @UploadedFiles() archivos?: Express.Multer.File[],
  ) {
    const data = { ...body };
    if (data.programaId) data.programaId = parseInt(data.programaId);
    return this.tareasService.create(data, archivos);
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

  @Post(':id/archivos')
  @Roles('ADMIN', 'LOGISTICA', 'OPERADOR_PROGRAMA', 'TRABAJADORA_SOCIAL')
  @ApiOperation({ summary: 'Agregar archivos a una tarea existente' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('archivos', 10, {
      storage: memoryStorage(),
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIMES.includes(file.mimetype)) cb(null, true);
        else cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`), false);
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  agregarArchivos(
    @Param('id') id: string,
    @UploadedFiles() archivos: Express.Multer.File[],
  ) {
    return this.tareasService.agregarArchivos(+id, archivos);
  }

  @Delete(':id/archivos/:archivoId')
  @Roles('ADMIN', 'LOGISTICA', 'OPERADOR_PROGRAMA', 'TRABAJADORA_SOCIAL')
  @ApiOperation({ summary: 'Eliminar archivo adjunto de una tarea' })
  eliminarArchivo(
    @Param('id') id: string,
    @Param('archivoId') archivoId: string,
  ) {
    return this.tareasService.eliminarArchivo(+id, +archivoId);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Eliminar tarea' })
  remove(@Param('id') id: string) {
    return this.tareasService.remove(+id);
  }
}
