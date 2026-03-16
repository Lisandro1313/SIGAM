import { Module } from '@nestjs/common';
import { ZonasService } from './zonas.service';
import { ZonasController } from './zonas.controller';

@Module({
  providers: [ZonasService],
  controllers: [ZonasController],
})
export class ZonasModule {}
