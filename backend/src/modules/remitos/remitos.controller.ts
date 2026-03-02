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
} from '@nestjs/common';
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
  @Roles('ADMIN', 'LOGISTICA', 'OPERADOR_PROGRAMA')
  create(@Body() createRemitoDto: CreateRemitoDto, @Request() req) {
    return this.remitosService.create(createRemitoDto, req.user.id);
  }

  @Post(':id/confirmar')
  @ApiOperation({ summary: 'Confirmar remito y descontar stock' })
  @Roles('ADMIN', 'LOGISTICA')
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
  @Roles('ADMIN', 'LOGISTICA')
  enviar(@Param('id') id: string) {
    return this.remitosService.enviarPorEmail(+id);
  }

  @Get()
  @ApiOperation({ summary: 'Listar remitos con filtros' })
  findAll(@Query() query: any) {
    return this.remitosService.findAll(query);
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
