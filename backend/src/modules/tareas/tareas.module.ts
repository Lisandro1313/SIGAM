import { Module } from '@nestjs/common';
import { TareasService } from './tareas.service';
import { TareasController } from './tareas.controller';
import { StorageModule } from '../../shared/storage/storage.module';

@Module({
  imports: [StorageModule],
  providers: [TareasService],
  controllers: [TareasController],
})
export class TareasModule {}
