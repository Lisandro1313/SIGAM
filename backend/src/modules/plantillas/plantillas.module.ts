import { Module } from '@nestjs/common';
import { PlantillasService } from './plantillas.service';
import { PlantillasController } from './plantillas.controller';

@Module({
  providers: [PlantillasService],
  controllers: [PlantillasController],
  exports: [PlantillasService],
})
export class PlantillasModule {}
