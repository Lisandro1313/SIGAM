import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional } from 'class-validator';

export class ConfirmarRemitoDto {
  @ApiProperty({ required: false, description: 'ID del depósito (si se quiere cambiar el origen)' })
  @IsInt()
  @IsOptional()
  depositoId?: number;
}
