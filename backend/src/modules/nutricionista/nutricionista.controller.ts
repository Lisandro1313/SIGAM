import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, Request, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NutricionistaService } from './nutricionista.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

const ROLES_NUTRI = ['ADMIN', 'NUTRICIONISTA'] as const;

@ApiTags('nutricionista')
@Controller('nutricionista')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class NutricionistaController {
  constructor(private readonly svc: NutricionistaService) {}

  // ── Dashboard ─────────────────────────────────────────────────────────────
  @Get('dashboard')
  @Roles(...ROLES_NUTRI)
  @ApiOperation({ summary: 'Dashboard del nutricionista' })
  dashboard(@Request() req) {
    return this.svc.dashboard(req.user.id, req.user.rol);
  }

  // ── Subir foto ────────────────────────────────────────────────────────────
  @Post('upload')
  @Roles(...ROLES_NUTRI)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  @ApiOperation({ summary: 'Subir foto para relevamiento/actividad' })
  async upload(@UploadedFile() file: Express.Multer.File) {
    const url = await this.svc.subirFoto(file);
    return { url };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RELEVAMIENTOS
  // ═══════════════════════════════════════════════════════════════════════════

  @Post('relevamientos')
  @Roles(...ROLES_NUTRI)
  @ApiOperation({ summary: 'Crear relevamiento nutricional' })
  crearRelevamiento(@Body() dto: any, @Request() req) {
    return this.svc.crearRelevamiento(dto, req.user.id);
  }

  @Get('relevamientos')
  @Roles(...ROLES_NUTRI)
  @ApiOperation({ summary: 'Listar relevamientos' })
  listarRelevamientos(@Query() filtros: any, @Request() req) {
    return this.svc.listarRelevamientos(filtros, req.user.id, req.user.rol);
  }

  @Get('relevamientos/beneficiario/:beneficiarioId')
  @Roles('ADMIN', 'NUTRICIONISTA', 'OPERADOR_PROGRAMA')
  @ApiOperation({ summary: 'Relevamientos por beneficiario (pestaña Nutrición)' })
  relevamientosPorBeneficiario(@Param('beneficiarioId') beneficiarioId: string) {
    return this.svc.relevamientosPorBeneficiario(+beneficiarioId);
  }

  @Get('relevamientos/:id')
  @Roles(...ROLES_NUTRI)
  @ApiOperation({ summary: 'Obtener relevamiento por ID' })
  obtenerRelevamiento(@Param('id') id: string) {
    return this.svc.obtenerRelevamiento(+id);
  }

  @Patch('relevamientos/:id')
  @Roles(...ROLES_NUTRI)
  @ApiOperation({ summary: 'Actualizar relevamiento' })
  actualizarRelevamiento(@Param('id') id: string, @Body() dto: any, @Request() req) {
    return this.svc.actualizarRelevamiento(+id, dto, req.user.id, req.user.rol);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PROGRAMAS DE TERRENO
  // ═══════════════════════════════════════════════════════════════════════════

  @Post('programas-terreno')
  @Roles(...ROLES_NUTRI)
  @ApiOperation({ summary: 'Crear programa de terreno' })
  crearProgramaTerreno(@Body() dto: any, @Request() req) {
    return this.svc.crearProgramaTerreno(dto, req.user.id);
  }

  @Get('programas-terreno')
  @Roles(...ROLES_NUTRI)
  @ApiOperation({ summary: 'Listar programas de terreno' })
  listarProgramasTerreno(@Query() filtros: any, @Request() req) {
    return this.svc.listarProgramasTerreno(filtros, req.user.id, req.user.rol);
  }

  @Get('programas-terreno/beneficiario/:beneficiarioId')
  @Roles('ADMIN', 'NUTRICIONISTA', 'OPERADOR_PROGRAMA')
  @ApiOperation({ summary: 'Programas de terreno por beneficiario (pestaña Nutrición)' })
  programasTerrenoPorBeneficiario(@Param('beneficiarioId') beneficiarioId: string) {
    return this.svc.programasTerrenoPorBeneficiario(+beneficiarioId);
  }

  @Get('programas-terreno/:id')
  @Roles(...ROLES_NUTRI)
  @ApiOperation({ summary: 'Obtener programa de terreno por ID' })
  obtenerProgramaTerreno(@Param('id') id: string) {
    return this.svc.obtenerProgramaTerreno(+id);
  }

  @Patch('programas-terreno/:id')
  @Roles(...ROLES_NUTRI)
  @ApiOperation({ summary: 'Actualizar programa de terreno' })
  actualizarProgramaTerreno(@Param('id') id: string, @Body() dto: any, @Request() req) {
    return this.svc.actualizarProgramaTerreno(+id, dto, req.user.id, req.user.rol);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIVIDADES
  // ═══════════════════════════════════════════════════════════════════════════

  @Post('programas-terreno/:programaId/actividades')
  @Roles(...ROLES_NUTRI)
  @ApiOperation({ summary: 'Crear actividad en un programa de terreno' })
  crearActividad(@Param('programaId') programaId: string, @Body() dto: any, @Request() req) {
    return this.svc.crearActividad(+programaId, dto, req.user.id, req.user.rol);
  }

  @Patch('actividades/:id')
  @Roles(...ROLES_NUTRI)
  @ApiOperation({ summary: 'Actualizar actividad' })
  actualizarActividad(@Param('id') id: string, @Body() dto: any, @Request() req) {
    return this.svc.actualizarActividad(+id, dto, req.user.id, req.user.rol);
  }

  @Delete('actividades/:id')
  @Roles(...ROLES_NUTRI)
  @ApiOperation({ summary: 'Eliminar actividad' })
  eliminarActividad(@Param('id') id: string, @Request() req) {
    return this.svc.eliminarActividad(+id, req.user.id, req.user.rol);
  }
}
