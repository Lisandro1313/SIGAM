import { Module } from '@nestjs/common';
import { ListasSeguimientoController } from './listas-seguimiento.controller';
import { ListasSeguimientoService } from './listas-seguimiento.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ListasSeguimientoController],
  providers: [ListasSeguimientoService],
})
export class ListasSeguimientoModule {}
