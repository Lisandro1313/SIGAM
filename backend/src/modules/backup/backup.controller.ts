import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { BackupService } from './backup.service';

@ApiTags('backup')
@Controller('backup')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Post('ejecutar')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Ejecutar backup manual y enviar por email (solo ADMIN)' })
  async ejecutarManual() {
    await this.backupService.generarYEnviarBackup();
    return { ok: true, mensaje: 'Backup enviado correctamente' };
  }
}
