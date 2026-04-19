import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Request, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BeneficiariosService } from './beneficiarios.service';
import { CreateBeneficiarioDto } from './dto/create-beneficiario.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { getSecretariaFromReq } from '../../shared/auth/secretaria.util';
import { assertMime, MIME_DOCUMENTS } from '../../shared/upload/upload.util';

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
  checkDni(@Param('dni') dni: string, @Query('excludeId') excludeId?: string) {
    return this.beneficiariosService.checkDni(dni, excludeId ? +excludeId : undefined);
  }

  @Get('buscar-dni')
  @Roles('ADMIN', 'LOGISTICA', 'OPERADOR_PROGRAMA', 'TRABAJADORA_SOCIAL', 'ASISTENCIA_CRITICA', 'VISOR')
  @ApiOperation({ summary: 'Búsqueda global por DNI (beneficiarios, casos, integrantes)' })
  searchByDni(@Query('dni') dni: string) {
    if (!dni) throw new BadRequestException('dni es requerido');
    return this.beneficiariosService.searchByDni(dni);
  }

  @Get()
  @Roles('ADMIN', 'LOGISTICA', 'OPERADOR_PROGRAMA', 'TRABAJADORA_SOCIAL', 'VISOR', 'NUTRICIONISTA')
  @ApiOperation({ summary: 'Listar beneficiarios' })
  findAll(@Query() filtros: any, @Request() req) {
    // NUTRICIONISTA accede cross-secretaria para evaluaciones nutricionales.
    const secretaria = req.user?.rol === 'NUTRICIONISTA' ? null : getSecretariaFromReq(req);
    return this.beneficiariosService.findAll(filtros, secretaria);
  }

  // ── Integrantes de espacio/comedor ──────────────────────────────────────────

  @Get(':id/integrantes')
  @Roles('ADMIN', 'LOGISTICA', 'OPERADOR_PROGRAMA', 'TRABAJADORA_SOCIAL', 'ASISTENCIA_CRITICA', 'VISOR', 'NUTRICIONISTA')
  @ApiOperation({ summary: 'Listar integrantes del espacio/comedor' })
  getIntegrantes(@Param('id') id: string) {
    return this.beneficiariosService.getIntegrantes(+id);
  }

  @Post(':id/integrantes')
  @Roles('ADMIN', 'OPERADOR_PROGRAMA', 'TRABAJADORA_SOCIAL')
  @ApiOperation({ summary: 'Agregar integrante al espacio/comedor' })
  addIntegrante(@Param('id') id: string, @Body() body: { nombre: string; dni?: string; direccion?: string }) {
    return this.beneficiariosService.addIntegrante(+id, body);
  }

  @Post(':id/integrantes/bulk')
  @Roles('ADMIN', 'OPERADOR_PROGRAMA', 'TRABAJADORA_SOCIAL')
  @ApiOperation({ summary: 'Importar lista de integrantes (bulk)' })
  bulkIntegrantes(@Param('id') id: string, @Body() body: { integrantes: { nombre: string; dni?: string; direccion?: string }[] }) {
    return this.beneficiariosService.bulkIntegrantes(+id, body.integrantes);
  }

  @Delete(':id/integrantes/:integranteId')
  @Roles('ADMIN', 'OPERADOR_PROGRAMA', 'TRABAJADORA_SOCIAL')
  @ApiOperation({ summary: 'Eliminar integrante del espacio/comedor' })
  removeIntegrante(@Param('id') id: string, @Param('integranteId') integranteId: string) {
    return this.beneficiariosService.removeIntegrante(+id, +integranteId);
  }

  @Get(':id')
  @Roles('ADMIN', 'LOGISTICA', 'OPERADOR_PROGRAMA', 'TRABAJADORA_SOCIAL', 'VISOR', 'NUTRICIONISTA')
  @ApiOperation({ summary: 'Obtener beneficiario por ID' })
  findOne(@Param('id') id: string) {
    return this.beneficiariosService.findOne(+id);
  }

  @Get(':id/cruce-programas')
  @Roles('ADMIN', 'LOGISTICA', 'OPERADOR_PROGRAMA', 'TRABAJADORA_SOCIAL', 'ASISTENCIA_CRITICA', 'VISOR')
  @ApiOperation({ summary: 'Cruce de programas y casos por DNI del responsable' })
  getCruceProgramas(@Param('id') id: string) {
    return this.beneficiariosService.getCruceProgramas(+id);
  }

  @Get(':id/proxima-entrega')
  @Roles('ADMIN', 'LOGISTICA', 'OPERADOR_PROGRAMA', 'TRABAJADORA_SOCIAL', 'VISOR')
  @ApiOperation({ summary: 'Próxima entrega programada y última entrega efectiva' })
  getProximaEntrega(@Param('id') id: string) {
    return this.beneficiariosService.getProximaEntrega(+id);
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
    assertMime(file, MIME_DOCUMENTS);
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
