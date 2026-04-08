import { Module } from '@nestjs/common';
import { NutricionistaService } from './nutricionista.service';
import { NutricionistaController } from './nutricionista.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { StorageModule } from '../../shared/storage/storage.module';

@Module({
  imports: [PrismaModule, StorageModule],
  providers: [NutricionistaService],
  controllers: [NutricionistaController],
})
export class NutricionistaModule {}
