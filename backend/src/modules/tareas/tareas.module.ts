import { Module } from '@nestjs/common';
import { TareasService } from './tareas.service';
import { TareasController } from './tareas.controller';

@Module({
  providers: [TareasService],
  controllers: [TareasController],
})
export class TareasModule {}
