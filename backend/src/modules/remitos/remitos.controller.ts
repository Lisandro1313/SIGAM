import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  Res,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { RemitosService } from './remitos.service';
import { StorageService } from '../../shared/storage/storage.service';
import { CreateRemitoDto } from './dto/create-remito.dto';
import { ConfirmarRemitoDto } from './dto/confirmar-remito.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('remitos')
@Controller('remitos')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RemitosController {
  constructor(
    private readonly remitosService: RemitosService,
    private readonly storageService: StorageService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear remito borrador' })
  @Roles('ADMIN', 'LOGISTICA', 'OPERADOR_PROGRAMA', 'ASISTENCIA_CRITICA')
  create(@Body() createRemitoDto: CreateRemitoDto, @Request() req) {
    return this.remitosService.create(createRemitoDto, { id: req.user.id, rol: req.user.rol });
  }

  @Post(':id/confirmar')
  @ApiOperation({ summary: 'Confirmar remito y descontar stock' })
  @Roles('ADMIN', 'LOGISTICA', 'ASISTENCIA_CRITICA')
  confirmar(
    @Param('id') id: string,
    @Body() confirmarDto: ConfirmarRemitoDto,
    @Request() req,
  ) {
    return this.remitosService.confirmar(+id, confirmarDto, req.user.id);
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Descargar PDF del remito' })
  async descargarPdf(@Param('id') id: string, @Res() res: Response) {
    const pdfBuffer = await this.remitosService.generarPdf(+id);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=remito-${id}.pdf`,
      'Content-Length': pdfBuffer.length,
    });
    
    res.status(HttpStatus.OK).send(pdfBuffer);
  }

  @Post(':id/enviar')
  @ApiOperation({ summary: 'Enviar remito por email al depósito' })
  @Roles('ADMIN', 'LOGISTICA', 'OPERADOR_PROGRAMA')
  enviar(
    @Param('id') id: string,
    @Body() body: { asunto?: string; destinatarios?: string[]; textoExtra?: string } = {},
  ) {
    return this.remitosService.enviarPorEmail(+id, body);
  }

  @Get('historial-pdf')
  @ApiOperation({ summary: 'Exportar historial de entregas como PDF' })
  @Roles('ADMIN', 'VISOR', 'LOGISTICA', 'OPERADOR_PROGRAMA', 'TRABAJADORA_SOCIAL', 'ASISTENCIA_CRITICA')
  async historialPdf(@Query() query: any, @Request() req, @Res() res: Response) {
    const esLogistica = req.user.rol === 'LOGISTICA' && req.user.depositoId;
    const esCita = req.user.rol === 'ASISTENCIA_CRITICA';
    const secretaria = req.user.rol === 'ASISTENCIA_CRITICA' ? 'CITA'
      : req.user.rol === 'LOGISTICA' || req.user.rol === 'VISOR' ? null
      : 'PA';
    const pdf = await this.remitosService.historialPdf(
      query,
      esLogistica ? req.user.depositoId : undefined,
      esCita ? 'CITA' : undefined,
      secretaria,
    );
    const desde = query.entregadoDesde ?? 'historial';
    const hasta = query.entregadoHasta ?? '';
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=historial_${desde}_${hasta}.pdf`,
      'Content-Length': pdf.length,
    });
    res.status(HttpStatus.OK).send(pdf);
  }

  @Get()
  @ApiOperation({ summary: 'Listar remitos con filtros' })
  findAll(@Query() query: any, @Request() req) {
    // LOGISTICA con depósito: auto-filtra por su depósito asignado
    const esLogistica = req.user.rol === 'LOGISTICA' && req.user.depositoId;
    // ASISTENCIA_CRITICA: auto-filtra al depósito CITA
    const esCita = req.user.rol === 'ASISTENCIA_CRITICA';
    // Determinar secretaría por rol
    const secretaria = req.user.rol === 'ASISTENCIA_CRITICA' ? 'CITA'
      : req.user.rol === 'LOGISTICA' || req.user.rol === 'VISOR' ? null
      : 'PA';
    return this.remitosService.findAll(
      query,
      esLogistica ? req.user.depositoId : undefined,
      esCita ? 'CITA' : undefined,
      secretaria,
    );
  }

  @Post(':id/entregar')
  @ApiOperation({ summary: 'Marcar remito como entregado (con foto opcional)' })
  @Roles('ADMIN', 'LOGISTICA', 'ASISTENCIA_CRITICA')
  @UseInterceptors(
    FileInterceptor('foto', {
      storage: memoryStorage(),
      fileFilter: (_req, file, cb) => {
        const allowed = /jpeg|jpg|png|webp|pdf/;
        if (allowed.test(extname(file.originalname).toLowerCase())) {
          cb(null, true);
        } else {
          cb(new Error('Solo se permiten imágenes o PDF'), false);
        }
      },
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    }),
  )
  async entregar(
    @Param('id') id: string,
    @UploadedFile() foto: Express.Multer.File,
    @Body() body: { nota?: string },
  ) {
    let fotoUrl: string | undefined;
    if (foto) {
      const filename = `remito-${Date.now()}-${Math.round(Math.random() * 1e6)}${extname(foto.originalname)}`;
      fotoUrl = await this.storageService.uploadFoto(foto.buffer, filename, foto.mimetype);
    }
    return this.remitosService.marcarEntregado(+id, body.nota, fotoUrl);
  }

  @Patch(':id/entrega')
  @ApiOperation({ summary: 'Editar datos de entrega ya registrada (nota, foto, fecha)' })
  @Roles('ADMIN', 'LOGISTICA', 'ASISTENCIA_CRITICA')
  @UseInterceptors(
    FileInterceptor('foto', {
      storage: memoryStorage(),
      fileFilter: (_req, file, cb) => {
        const allowed = /jpeg|jpg|png|webp|pdf/;
        cb(null, allowed.test(extname(file.originalname).toLowerCase()));
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async actualizarEntrega(
    @Param('id') id: string,
    @UploadedFile() foto: Express.Multer.File,
    @Body() body: { nota?: string; fecha?: string },
  ) {
    let fotoUrl: string | undefined;
    if (foto) {
      const filename = `remito-${Date.now()}-${Math.round(Math.random() * 1e6)}${extname(foto.originalname)}`;
      fotoUrl = await this.storageService.uploadFoto(foto.buffer, filename, foto.mimetype);
    }
    return this.remitosService.actualizarEntrega(+id, body.nota, fotoUrl, body.fecha);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener remito por ID' })
  findOne(@Param('id') id: string) {
    return this.remitosService.findOne(+id);
  }

  @Patch(':id/reprogramar')
  @ApiOperation({ summary: 'Reprogramar fecha/hora de un remito' })
  @Roles('ADMIN', 'LOGISTICA')
  reprogramar(@Param('id') id: string, @Body() body: { fecha: string; horaRetiro?: string }) {
    return this.remitosService.reprogramar(+id, body.fecha, body.horaRetiro);
  }

  @Delete(':id/anular')
  @ApiOperation({ summary: 'Anular remito (revierte stock si estaba confirmado)' })
  @Roles('ADMIN', 'LOGISTICA')
  anular(@Param('id') id: string) {
    return this.remitosService.anular(+id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar remito (solo borrador)' })
  @Roles('ADMIN', 'LOGISTICA')
  remove(@Param('id') id: string) {
    return this.remitosService.remove(+id);
  }
}
