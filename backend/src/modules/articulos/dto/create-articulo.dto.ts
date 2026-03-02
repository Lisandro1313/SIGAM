import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateArticuloDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  categoria?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  pesoUnitarioKg?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  stockMinimo?: number;
}
