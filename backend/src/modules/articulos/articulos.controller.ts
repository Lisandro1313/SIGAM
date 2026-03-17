import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors, UploadedFile, BadRequestException, Query, Request } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ArticulosService } from './articulos.service';
import { CreateArticuloDto } from './dto/create-articulo.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('articulos')
@Controller('articulos')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ArticulosController {
  constructor(private readonly articulosService: ArticulosService) {}

  @Post()
  @Roles('ADMIN', 'LOGISTICA')
  @ApiOperation({ summary: 'Crear artículo' })
  create(@Body() createArticuloDto: CreateArticuloDto) {
    return this.articulosService.create(createArticuloDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar artículos' })
  findAll(@Request() req) {
    const secretaria = req.user.rol === 'ASISTENCIA_CRITICA' ? 'CITA'
      : req.user.rol === 'LOGISTICA' || req.user.rol === 'VISOR' ? null
      : 'PA';
    return this.articulosService.findAll(secretaria);
  }

  @Get('vencimientos')
  @ApiOperation({ summary: 'Lotes próximos a vencer' })
  getLotesProximos(@Query('dias') dias?: string) {
    return this.articulosService.getLotesProximos(dias ? parseInt(dias) : 30);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener artículo por ID' })
  findOne(@Param('id') id: string) {
    return this.articulosService.findOne(+id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'LOGISTICA')
  @ApiOperation({ summary: 'Actualizar artículo' })
  update(@Param('id') id: string, @Body() updateData: any) {
    return this.articulosService.update(+id, updateData);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Desactivar artículo' })
  remove(@Param('id') id: string) {
    return this.articulosService.remove(+id);
  }

  // ── Foto ──────────────────────────────────────────────────────────────────

  @Post(':id/foto')
  @Roles('ADMIN', 'LOGISTICA')
  @UseInterceptors(FileInterceptor('foto', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Subir foto del artículo' })
  async uploadFoto(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No se recibió imagen');
    const url = await this.articulosService.uploadFoto(+id, file);
    return { fotoUrl: url };
  }

  // ── Lotes / Vencimientos ──────────────────────────────────────────────────

  @Get(':id/lotes')
  @ApiOperation({ summary: 'Listar lotes del artículo' })
  getLotes(@Param('id') id: string) {
    return this.articulosService.getLotes(+id);
  }

  @Post(':id/lotes')
  @Roles('ADMIN', 'LOGISTICA')
  @ApiOperation({ summary: 'Registrar lote con vencimiento' })
  createLote(
    @Param('id') id: string,
    @Body() body: { depositoId: number; cantidad: number; fechaVencimiento: string; lote?: string },
  ) {
    return this.articulosService.createLote(+id, body);
  }

  @Delete(':id/lotes/:loteId')
  @Roles('ADMIN', 'LOGISTICA')
  @ApiOperation({ summary: 'Eliminar lote' })
  deleteLote(@Param('loteId') loteId: string) {
    return this.articulosService.deleteLote(+loteId);
  }
}
