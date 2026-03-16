import { Module } from '@nestjs/common';
import { AuditoriaService } from './auditoria.service';
import { AuditoriaController } from './auditoria.controller';
import { AuditoriaInterceptor } from './auditoria.interceptor';

@Module({
  providers: [AuditoriaService, AuditoriaInterceptor],
  controllers: [AuditoriaController],
  exports: [AuditoriaService, AuditoriaInterceptor],
})
export class AuditoriaModule {}
