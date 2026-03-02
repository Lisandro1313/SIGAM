import { Module } from '@nestjs/common';
import { ProgramasService } from './programas.service';
import { ProgramasController } from './programas.controller';

@Module({
  providers: [ProgramasService],
  controllers: [ProgramasController],
  exports: [ProgramasService],
})
export class ProgramasModule {}
