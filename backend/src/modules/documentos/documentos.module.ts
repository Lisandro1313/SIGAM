import { Module } from '@nestjs/common';
import { DocumentosController } from './documentos.controller';
import { DocumentosService } from './documentos.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { StorageModule } from '../../shared/storage/storage.module';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [DocumentosController],
  providers: [DocumentosService],
})
export class DocumentosModule {}
