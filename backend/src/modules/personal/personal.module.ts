import { Module } from '@nestjs/common';
import { PersonalService } from './personal.service';
import { PersonalController } from './personal.controller';

@Module({
  providers: [PersonalService],
  controllers: [PersonalController],
  exports: [PersonalService],
})
export class PersonalModule {}
