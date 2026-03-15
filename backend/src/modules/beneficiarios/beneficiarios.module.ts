import { Module } from '@nestjs/common';
import { BeneficiariosService } from './beneficiarios.service';
import { BeneficiariosController } from './beneficiarios.controller';
import { StorageModule } from '../../shared/storage/storage.module';

@Module({
  imports: [StorageModule],
  providers: [BeneficiariosService],
  controllers: [BeneficiariosController],
  exports: [BeneficiariosService],
})
export class BeneficiariosModule {}
