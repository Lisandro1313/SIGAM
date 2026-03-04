import { Module } from '@nestjs/common';
import { RemitosService } from './remitos.service';
import { RemitosController } from './remitos.controller';
import { PdfService } from './services/pdf.service';
import { EmailService } from './services/email.service';
import { StorageService } from './services/storage.service';

@Module({
  providers: [RemitosService, PdfService, EmailService, StorageService],
  controllers: [RemitosController],
  exports: [RemitosService],
})
export class RemitosModule {}
