import { PartialType } from '@nestjs/swagger';
import { CreatePersonalDto } from './create-personal.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdatePersonalDto extends PartialType(CreatePersonalDto) {
  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
