import { Controller, Post, Headers, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { BackupService } from './backup.service';

@ApiTags('backup')
@Controller('backup')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Post('ejecutar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ejecutar backup manual y enviar por email (solo ADMIN)' })
  async ejecutarManual() {
    try {
      await this.backupService.generarYEnviarBackup();
      return { ok: true, mensaje: 'Backup enviado correctamente' };
    } catch (err: any) {
      return { ok: false, error: err?.message ?? String(err) };
    }
  }

  /**
   * Endpoint para cron externo (cron-job.org, UptimeRobot, GitHub Actions).
   * Protegido por BACKUP_SECRET en variables de entorno de Render.
   * Llamar con header: x-backup-secret: <valor de BACKUP_SECRET>
   */
  @Post('cron')
  @SkipThrottle()
  @ApiOperation({ summary: 'Trigger de backup por cron externo (secreto)' })
  async ejecutarCronExterno(@Headers('x-backup-secret') secret: string) {
    const expected = process.env.BACKUP_SECRET;
    if (!expected || secret !== expected) {
      throw new UnauthorizedException('Secreto inválido');
    }
    try {
      await this.backupService.generarYEnviarBackup();
      return { ok: true, mensaje: 'Backup ejecutado' };
    } catch (err: any) {
      return { ok: false, error: err?.message ?? String(err) };
    }
  }
}
