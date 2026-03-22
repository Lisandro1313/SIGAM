import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateProgramaDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tipo: string; // REGULAR, PARTICULAR, DIARIO

  @ApiProperty({ default: false })
  @IsBoolean()
  @IsOptional()
  usaCronograma?: boolean;

  @ApiProperty({ default: true })
  @IsBoolean()
  @IsOptional()
  usaPlantilla?: boolean;

  @ApiProperty({ default: true })
  @IsBoolean()
  @IsOptional()
  descuentaStock?: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  mensajeWhatsapp?: string;
}
