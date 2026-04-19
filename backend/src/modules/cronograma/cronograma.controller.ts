import { Controller, Get, Post, Body, Patch, Delete, Param, Query, UseGuards, Request, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CronogramaService } from './cronograma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { getSecretariaFromReq } from '../../shared/auth/secretaria.util';

@ApiTags('cronograma')
@Controller('cronograma')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CronogramaController {
  constructor(private readonly cronogramaService: CronogramaService) {}

  @Post('generar')
  @Roles('ADMIN', 'LOGISTICA')
  @ApiOperation({ summary: 'Generar cronograma automático para un mes' })
  generarCronograma(@Body() body: { mes: number; anio: number; kgPorDia?: number }) {
    return this.cronogramaService.generarCronogramaMensual(body.mes, body.anio, body.kgPorDia);
  }

  @Get('resumen-generacion')
  @ApiOperation({ summary: 'Preview de lo que generaría el cronograma del mes' })
  resumenGeneracion(@Query('mes') mes: string, @Query('anio') anio: string) {
    return this.cronogramaService.resumenGeneracion(parseInt(mes), parseInt(anio));
  }

  @Post('generar-programa')
  @Roles('ADMIN', 'LOGISTICA')
  @ApiOperation({ summary: 'Generar cronograma del mes para un programa especifico (ej: REMUCOM, L-V, por frecuencia)' })
  generarCronogramaPrograma(@Body() body: { mes: number; anio: number; programaNombre?: string; kgPorDia?: number }) {
    return this.cronogramaService.generarCronogramaPrograma(
      body.mes, body.anio, body.programaNombre || 'REMUCOM', body.kgPorDia,
    );
  }

  @Get('resumen-generacion-programa')
  @ApiOperation({ summary: 'Preview del cronograma de un programa especifico' })
  resumenGeneracionPrograma(
    @Query('mes') mes: string,
    @Query('anio') anio: string,
    @Query('programaNombre') programaNombre?: string,
  ) {
    return this.cronogramaService.resumenGeneracionPrograma(
      parseInt(mes), parseInt(anio), programaNombre || 'REMUCOM',
    );
  }

  @Get('ultimas-entregas')
  @ApiOperation({ summary: 'Últimas entregas por beneficiario' })
  ultimasEntregas() {
    return this.cronogramaService.getUltimasEntregas();
  }

  @Get()
  @ApiOperation({ summary: 'Obtener entregas programadas' })
  obtenerEntregas(@Query() query: any, @Request() req) {
    return this.cronogramaService.obtenerEntregas(query, getSecretariaFromReq(req));
  }

  @Get('preview-remitos-rango')
  @Roles('ADMIN', 'LOGISTICA', 'OPERADOR_PROGRAMA')
  @ApiOperation({ summary: 'Preview de remitos a generar para un rango de fechas' })
  previewRemitosRango(@Query('desde') desde: string, @Query('hasta') hasta: string, @Request() req) {
    return this.cronogramaService.previewRemitosRango(desde, hasta, getSecretariaFromReq(req));
  }

  @Post('generar-remitos-rango')
  @Roles('ADMIN', 'LOGISTICA', 'OPERADOR_PROGRAMA')
  @ApiOperation({ summary: 'Generar todos los remitos pendientes de un rango de fechas (ej: semana)' })
  generarRemitosRango(
    @Body() body: { desde: string; hasta: string; depositoId: number },
    @Request() req,
  ) {
    return this.cronogramaService.generarRemitosRango(body.desde, body.hasta, body.depositoId, req.user.id, req.user.rol);
  }

  // ---- EXPORTAR PDF ----

  @Get('exportar-pdf')
  @ApiOperation({ summary: 'Exportar cronograma como PDF' })
  async exportarPdf(
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
    @Query('depositoId') depositoId: string,
    @Query('programaId') programaId: string,
    @Request() req,
    @Res() res: Response,
  ) {
    const { buffer } = await this.cronogramaService.exportarPlanillaPdf(
      desde, hasta,
      depositoId ? parseInt(depositoId) : undefined,
      programaId ? parseInt(programaId) : undefined,
      getSecretariaFromReq(req),
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="cronograma_${desde}_${hasta}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Post('enviar-email')
  @Roles('ADMIN', 'LOGISTICA', 'OPERADOR_PROGRAMA')
  @ApiOperation({ summary: 'Enviar cronograma por email al depósito' })
  async enviarEmailCronograma(
    @Body() body: { desde: string; hasta: string; depositoId?: number; programaId?: number; destinatarios?: string[] },
    @Request() req,
  ) {
    await this.cronogramaService.enviarEmailCronograma(
      body.desde, body.hasta, body.depositoId, body.programaId, body.destinatarios, getSecretariaFromReq(req),
    );
    return { ok: true };
  }

  // ---- PLANILLA MANUAL ----

  @Get('planilla')
  @ApiOperation({ summary: 'Obtener planilla para rango de fechas' })
  obtenerPlanilla(
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
    @Query('programaId') programaId: string,
    @Request() req,
  ) {
    return this.cronogramaService.obtenerPlanilla(
      desde, hasta,
      programaId ? parseInt(programaId) : undefined,
      getSecretariaFromReq(req),
    );
  }

  @Post('fila')
  @Roles('ADMIN', 'LOGISTICA', 'OPERADOR_PROGRAMA')
  @ApiOperation({ summary: 'Agregar fila a la planilla' })
  agregarFila(@Body() body: any) {
    return this.cronogramaService.agregarFila(body);
  }

  @Patch('fila/:id')
  @Roles('ADMIN', 'LOGISTICA', 'OPERADOR_PROGRAMA')
  @ApiOperation({ summary: 'Actualizar fila de la planilla' })
  actualizarFila(@Param('id') id: string, @Body() body: any) {
    return this.cronogramaService.actualizarFila(+id, body);
  }

  @Delete('fila/:id')
  @Roles('ADMIN', 'LOGISTICA')
  @ApiOperation({ summary: 'Eliminar fila de la planilla' })
  eliminarFila(@Param('id') id: string) {
    return this.cronogramaService.eliminarFila(+id);
  }

  @Post('fila/:id/generar-remito')
  @Roles('ADMIN', 'LOGISTICA', 'OPERADOR_PROGRAMA')
  @ApiOperation({ summary: 'Generar remito desde fila de la planilla' })
  generarRemitoDesFila(
    @Param('id') id: string,
    @Body() body: { depositoId: number },
    @Request() req,
  ) {
    return this.cronogramaService.generarRemitoDesFila(+id, body.depositoId, req.user.id, req.user.rol);
  }

  // ---- FIN PLANILLA MANUAL ----

  @Post('generar-remitos-masivos')
  @Roles('ADMIN', 'LOGISTICA')
  @ApiOperation({ summary: 'Generar remitos masivos desde cronograma' })
  generarRemitosMasivos(
    @Body() body: { mes: number; anio: number; depositoId: number },
    @Request() req,
  ) {
    return this.cronogramaService.generarRemitosMasivos(
      body.mes,
      body.anio,
      body.depositoId,
      req.user.id,
      req.user.rol,
    );
  }

  @Patch('fila/:id/avisado-wsp')
  @Roles('ADMIN', 'LOGISTICA', 'OPERADOR_PROGRAMA')
  @ApiOperation({ summary: 'Marcar/desmarcar aviso WhatsApp' })
  toggleAvisadoWsp(@Param('id') id: string, @Body() body: { avisadoWsp: boolean }) {
    return this.cronogramaService.toggleAvisadoWsp(+id, body.avisadoWsp);
  }

  @Patch(':id/fecha')
  @Roles('ADMIN', 'LOGISTICA', 'OPERADOR_PROGRAMA')
  @ApiOperation({ summary: 'Actualizar fecha de entrega' })
  actualizarFecha(@Param('id') id: string, @Body() body: { fecha: Date }) {
    return this.cronogramaService.actualizarFecha(+id, body.fecha);
  }

  @Patch(':id/cancelar')
  @Roles('ADMIN', 'LOGISTICA')
  @ApiOperation({ summary: 'Cancelar entrega programada' })
  cancelar(@Param('id') id: string) {
    return this.cronogramaService.cancelarEntrega(+id);
  }

  // ── Bloc de notas ────────────────────────────────────────────────────────
  @Get('nota/:clave')
  @ApiOperation({ summary: 'Obtener nota/borrador por clave' })
  getNota(@Param('clave') clave: string) {
    return this.cronogramaService.getNotaBorrador(clave);
  }

  @Patch('nota/:clave')
  @ApiOperation({ summary: 'Guardar nota/borrador por clave' })
  saveNota(@Param('clave') clave: string, @Body() body: { contenido: string }) {
    return this.cronogramaService.saveNotaBorrador(clave, body.contenido);
  }
}
