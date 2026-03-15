import { Module } from '@nestjs/common';
import { RemitosService } from './remitos.service';
import { RemitosController } from './remitos.controller';
import { PdfService } from './services/pdf.service';
import { EmailService } from './services/email.service';
import { StorageModule } from '../../shared/storage/storage.module';

@Module({
  imports: [StorageModule],
  providers: [RemitosService, PdfService, EmailService],
  controllers: [RemitosController],
  exports: [RemitosService],
})
export class RemitosModule {}
