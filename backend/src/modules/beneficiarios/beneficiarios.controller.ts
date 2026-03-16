import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Request, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BeneficiariosService } from './beneficiarios.service';
import { CreateBeneficiarioDto } from './dto/create-beneficiario.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('beneficiarios')
@Controller('beneficiarios')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class BeneficiariosController {
  constructor(private readonly beneficiariosService: BeneficiariosService) {}

  @Post()
  @Roles('ADMIN', 'OPERADOR_PROGRAMA')
  @ApiOperation({ summary: 'Crear beneficiario' })
  create(@Body() createBeneficiarioDto: CreateBeneficiarioDto) {
    return this.beneficiariosService.create(createBeneficiarioDto);
  }

  @Get('localidades')
  @ApiOperation({ summary: 'Listar localidades disponibles' })
  getLocalidades() {
    return this.beneficiariosService.getLocalidades();
  }

  @Get('check-dni/:dni')
  @Roles('ADMIN', 'OPERADOR_PROGRAMA', 'TRABAJADORA_SOCIAL', 'ASISTENCIA_CRITICA')
  @ApiOperation({ summary: 'Verificar si un DNI ya está registrado como responsable de otro beneficiario' })
  checkDni(@Param('dni') dni: string) {
    return this.beneficiariosService.checkDni(dni);
  }

  @Get()
  @Roles('ADMIN', 'LOGISTICA', 'OPERADOR_PROGRAMA', 'TRABAJADORA_SOCIAL', 'VISOR')
  @ApiOperation({ summary: 'Listar beneficiarios' })
  findAll(@Query() filtros: any) {
    return this.beneficiariosService.findAll(filtros);
  }

  @Get(':id')
  @Roles('ADMIN', 'LOGISTICA', 'OPERADOR_PROGRAMA', 'TRABAJADORA_SOCIAL', 'VISOR')
  @ApiOperation({ summary: 'Obtener beneficiario por ID' })
  findOne(@Param('id') id: string) {
    return this.beneficiariosService.findOne(+id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'OPERADOR_PROGRAMA')
  @ApiOperation({ summary: 'Actualizar beneficiario' })
  update(@Param('id') id: string, @Body() updateData: any) {
    return this.beneficiariosService.update(+id, updateData);
  }

  // Endpoint exclusivo para Trabajadoras Sociales: solo actualiza observaciones
  @Patch(':id/relevamiento')
  @Roles('ADMIN', 'OPERADOR_PROGRAMA', 'TRABAJADORA_SOCIAL')
  @ApiOperation({ summary: 'Actualizar relevamiento / observaciones del beneficiario' })
  actualizarRelevamiento(
    @Param('id') id: string,
    @Body() body: { observaciones: string },
    @Request() req,
  ) {
    return this.beneficiariosService.update(+id, {
      observaciones: body.observaciones,
    });
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Desactivar beneficiario' })
  remove(@Param('id') id: string) {
    return this.beneficiariosService.remove(+id);
  }

  // ── Documentos ──────────────────────────────────────────────────────────────

  @Get(':id/documentos')
  @ApiOperation({ summary: 'Listar documentos del beneficiario' })
  getDocumentos(@Param('id') id: string) {
    return this.beneficiariosService.getDocumentos(+id);
  }

  @Post(':id/documentos')
  @Roles('ADMIN', 'OPERADOR_PROGRAMA', 'TRABAJADORA_SOCIAL')
  @UseInterceptors(FileInterceptor('archivo', { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Subir documento al beneficiario' })
  async uploadDocumento(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { nombre?: string; tipo?: string },
  ) {
    if (!file) throw new BadRequestException('No se recibió archivo');
    return this.beneficiariosService.uploadDocumento(+id, file, body.nombre || file.originalname, body.tipo);
  }

  @Patch(':id/documentos/:docId')
  @Roles('ADMIN', 'OPERADOR_PROGRAMA')
  @ApiOperation({ summary: 'Actualizar estado o nombre de un documento' })
  updateDocumento(
    @Param('docId') docId: string,
    @Body() body: { nombre?: string; estado?: string },
  ) {
    return this.beneficiariosService.updateDocumento(+docId, body);
  }

  @Delete(':id/documentos/:docId')
  @Roles('ADMIN', 'OPERADOR_PROGRAMA')
  @ApiOperation({ summary: 'Eliminar documento del beneficiario' })
  deleteDocumento(@Param('docId') docId: string) {
    return this.beneficiariosService.deleteDocumento(+docId);
  }
}
