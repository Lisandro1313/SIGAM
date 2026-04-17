import { Module } from '@nestjs/common';
import { PlantillasDocController } from './plantillas-doc.controller';
import { PlantillasDocService } from './plantillas-doc.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PlantillasDocController],
  providers: [PlantillasDocService],
})
export class PlantillasDocModule {}
