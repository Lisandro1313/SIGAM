import { Module } from '@nestjs/common';
import { DepositosService } from './depositos.service';
import { DepositosController } from './depositos.controller';

@Module({
  providers: [DepositosService],
  controllers: [DepositosController],
  exports: [DepositosService],
})
export class DepositosModule {}
