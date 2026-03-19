import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsInt, IsOptional, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class RemitoItemDto {
  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  articuloId: number;

  @ApiProperty()
  @IsNotEmpty()
  cantidad: number;

  @ApiProperty({ required: false })
  @IsOptional()
  pesoKg?: number;
}

export class CreateRemitoDto {
  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  programaId?: number;

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  beneficiarioId: number;

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  depositoId: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  observaciones?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  fecha?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  horaRetiro?: string;

  @ApiProperty({ type: [RemitoItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RemitoItemDto)
  items: RemitoItemDto[];
}
