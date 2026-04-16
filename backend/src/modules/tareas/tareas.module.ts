import { Module } from '@nestjs/common';
import { TareasService } from './tareas.service';
import { TareasController } from './tareas.controller';
import { StorageModule } from '../../shared/storage/storage.module';
import { RemitosModule } from '../remitos/remitos.module';

@Module({
  imports: [StorageModule, RemitosModule],
  providers: [TareasService],
  controllers: [TareasController],
})
export class TareasModule {}
