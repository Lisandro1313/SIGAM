import {
  Controller,
  Get,
  Post,
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
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { RemitosService } from './remitos.service';
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
  constructor(private readonly remitosService: RemitosService) {}

  @Post()
  @ApiOperation({ summary: 'Crear remito borrador' })
  @Roles('ADMIN', 'LOGISTICA', 'OPERADOR_PROGRAMA', 'ASISTENCIA_CRITICA')
  create(@Body() createRemitoDto: CreateRemitoDto, @Request() req) {
    return this.remitosService.create(createRemitoDto, req.user.id);
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

  @Get()
  @ApiOperation({ summary: 'Listar remitos con filtros' })
  findAll(@Query() query: any, @Request() req) {
    // LOGISTICA: auto-filtra por su depósito asignado
    const esLogistica = req.user.rol === 'LOGISTICA' && req.user.depositoId;
    return this.remitosService.findAll(query, esLogistica ? req.user.depositoId : undefined);
  }

  @Post(':id/entregar')
  @ApiOperation({ summary: 'Marcar remito como entregado (con foto opcional)' })
  @Roles('ADMIN', 'LOGISTICA')
  @UseInterceptors(
    FileInterceptor('foto', {
      storage: diskStorage({
        destination: join(__dirname, '..', '..', '..', '..', 'uploads', 'remitos'),
        filename: (_req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
          cb(null, `remito-${unique}${extname(file.originalname)}`);
        },
      }),
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
    const fotoPath = foto ? `uploads/remitos/${foto.filename}` : undefined;
    return this.remitosService.marcarEntregado(+id, body.nota, fotoPath);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener remito por ID' })
  findOne(@Param('id') id: string) {
    return this.remitosService.findOne(+id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar remito (solo borrador)' })
  @Roles('ADMIN', 'LOGISTICA')
  remove(@Param('id') id: string) {
    return this.remitosService.remove(+id);
  }
}
