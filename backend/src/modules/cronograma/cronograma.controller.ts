import { Controller, Get, Post, Body, Patch, Delete, Param, Query, UseGuards, Request, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CronogramaService } from './cronograma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

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

  @Get('ultimas-entregas')
  @ApiOperation({ summary: 'Últimas entregas por beneficiario' })
  ultimasEntregas() {
    return this.cronogramaService.getUltimasEntregas();
  }

  @Get()
  @ApiOperation({ summary: 'Obtener entregas programadas' })
  obtenerEntregas(@Query() query: any, @Request() req) {
    const secretaria = req.user.rol === 'ASISTENCIA_CRITICA' ? 'AC'
      : req.user.rol === 'LOGISTICA' || req.user.rol === 'VISOR' ? null
      : 'PA';
    return this.cronogramaService.obtenerEntregas(query, secretaria);
  }

  @Get('preview-remitos-rango')
  @Roles('ADMIN', 'LOGISTICA', 'OPERADOR_PROGRAMA')
  @ApiOperation({ summary: 'Preview de remitos a generar para un rango de fechas' })
  previewRemitosRango(@Query('desde') desde: string, @Query('hasta') hasta: string, @Request() req) {
    const secretaria = req.user.rol === 'ASISTENCIA_CRITICA' ? 'AC'
      : (req.user.rol === 'LOGISTICA' || req.user.rol === 'VISOR') ? null : 'PA';
    return this.cronogramaService.previewRemitosRango(desde, hasta, secretaria);
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
    const secretaria = req.user.rol === 'ASISTENCIA_CRITICA' ? 'AC'
      : req.user.rol === 'LOGISTICA' || req.user.rol === 'VISOR' ? null : 'PA';
    const { buffer } = await this.cronogramaService.exportarPlanillaPdf(
      desde, hasta,
      depositoId ? parseInt(depositoId) : undefined,
      programaId ? parseInt(programaId) : undefined,
      secretaria,
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
    const secretaria = req.user.rol === 'ASISTENCIA_CRITICA' ? 'AC'
      : req.user.rol === 'LOGISTICA' || req.user.rol === 'VISOR' ? null : 'PA';
    await this.cronogramaService.enviarEmailCronograma(
      body.desde, body.hasta, body.depositoId, body.programaId, body.destinatarios, secretaria,
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
    const secretaria = req.user.rol === 'ASISTENCIA_CRITICA' ? 'AC'
      : req.user.rol === 'LOGISTICA' || req.user.rol === 'VISOR' ? null
      : 'PA';
    return this.cronogramaService.obtenerPlanilla(
      desde, hasta,
      programaId ? parseInt(programaId) : undefined,
      secretaria,
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
}
