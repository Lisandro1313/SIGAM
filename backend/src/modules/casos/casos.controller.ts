import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, Request, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CasosService } from './casos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

const ROLES_CREAR  = ['ADMIN', 'TRABAJADORA_SOCIAL', 'ASISTENCIA_CRITICA'] as const;
const ROLES_LEER   = ['ADMIN', 'OPERADOR_PROGRAMA', 'TRABAJADORA_SOCIAL', 'ASISTENCIA_CRITICA'] as const;
const ROLES_REVISAR= ['ADMIN', 'OPERADOR_PROGRAMA'] as const;

@ApiTags('casos')
@Controller('casos')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CasosController {
  constructor(private readonly casosService: CasosService) {}

  // ── Check DNI ─────────────────────────────────────────────────────────────
  @Get('check-dni/:dni')
  @Roles(...ROLES_CREAR)
  @ApiOperation({ summary: 'Verificar si un DNI ya está en el sistema' })
  checkDni(@Param('dni') dni: string) {
    return this.casosService.checkDni(dni);
  }

  // ── Crear caso ────────────────────────────────────────────────────────────
  @Post()
  @Roles(...ROLES_CREAR)
  @ApiOperation({ summary: 'Crear caso particular' })
  create(@Body() dto: any, @Request() req) {
    return this.casosService.create(dto, req.user.id, req.user.nombre);
  }

  // ── Listar casos ──────────────────────────────────────────────────────────
  @Get()
  @Roles(...ROLES_LEER)
  @ApiOperation({ summary: 'Listar casos' })
  findAll(@Query() filtros: any, @Request() req) {
    return this.casosService.findAll(filtros, req.user.id, req.user.rol);
  }

  // ── Obtener uno ───────────────────────────────────────────────────────────
  @Get(':id')
  @Roles(...ROLES_LEER)
  @ApiOperation({ summary: 'Obtener caso por ID' })
  findOne(@Param('id') id: string) {
    return this.casosService.findOne(+id);
  }

  // ── Revisar ───────────────────────────────────────────────────────────────
  @Patch(':id/revisar')
  @Roles(...ROLES_REVISAR)
  @ApiOperation({ summary: 'Revisar caso (EN_REVISION / APROBADO / RECHAZADO)' })
  revisar(@Param('id') id: string, @Body() dto: any, @Request() req) {
    return this.casosService.revisar(+id, dto, req.user.id, req.user.nombre);
  }

  // ── Generar remito ────────────────────────────────────────────────────────
  @Post(':id/generar-remito')
  @Roles(...ROLES_REVISAR)
  @ApiOperation({ summary: 'Generar remito a partir de un caso APROBADO' })
  generarRemito(@Param('id') id: string, @Body() remitoData: any, @Request() req) {
    return this.casosService.generarRemito(+id, remitoData, req.user.id, req.user.nombre);
  }

  // ── Subir documento ───────────────────────────────────────────────────────
  @Post(':id/documentos')
  @Roles(...ROLES_CREAR)
  @UseInterceptors(FileInterceptor('archivo', { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Subir documento adjunto al caso' })
  uploadDocumento(
    @Param('id') id: string,
    @Body() body: any,
    @UploadedFile() archivo: Express.Multer.File,
  ) {
    return this.casosService.uploadDocumento(+id, archivo, body.nombre, body.tipo);
  }

  // ── Eliminar documento ────────────────────────────────────────────────────
  @Delete(':id/documentos/:docId')
  @Roles('ADMIN', 'OPERADOR_PROGRAMA')
  @ApiOperation({ summary: 'Eliminar documento de caso' })
  deleteDocumento(@Param('id') id: string, @Param('docId') docId: string) {
    return this.casosService.deleteDocumento(+id, +docId);
  }
}
