import { Module } from '@nestjs/common';
import { CronogramaService } from './cronograma.service';
import { CronogramaController } from './cronograma.controller';
import { RemitosModule } from '../remitos/remitos.module';
import { PlantillasModule } from '../plantillas/plantillas.module';

@Module({
  imports: [RemitosModule, PlantillasModule],
  providers: [CronogramaService],
  controllers: [CronogramaController],
  exports: [CronogramaService],
})
export class CronogramaModule {}
